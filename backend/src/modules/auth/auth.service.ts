import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/ApiError";
import { authRepository } from "./auth.repository";
import { addressService } from "../addresses/address.service";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  decodePasswordResetToken,
  verifyPasswordResetToken,
  signEmailVerifyToken,
  verifyEmailVerifyToken,
} from "./auth.tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../config/mailer";
import { env } from "../../config/env";
import type {
  LoginInput,
  RegisterInput,
  CustomerLoginInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from "./auth.validators";

function publicUser(user: {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: "customer" | "admin";
}) {
  return { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role };
}

export const authService = {
  /**
   * Admin login. Uses the same generic error for unknown email and wrong
   * password so callers can't probe which accounts exist.
   */
  async login(input: LoginInput) {
    const invalid = ApiError.unauthorized("Invalid email or password");

    const user = await authRepository.findByEmail(input.email);
    if (!user || !user.isActive) throw invalid;

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw invalid;

    if (user.role !== "admin") {
      throw ApiError.forbidden("This account is not an admin");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
    return { user: publicUser(user), accessToken, refreshToken };
  },

  /**
   * Customer self-registration. Phone is the unique login handle. Password is
   * hashed with bcrypt (cost 12). The account starts unverified: a
   * verification link is emailed, and login is blocked until it's clicked —
   * so no tokens are issued here.
   */
  async registerCustomer(input: RegisterInput) {
    const existingPhone = await authRepository.findByPhone(input.phone);
    if (existingPhone) throw ApiError.conflict("An account with this mobile number already exists.");
    const existingEmail = await authRepository.findByEmail(input.email);
    if (existingEmail) throw ApiError.conflict("An account with this email already exists.");

    // Validate the location chain BEFORE creating the user so a bad request
    // can't leave an orphaned account with no address.
    await addressService.validateLocationChain(input.divisionId, input.districtId, input.upazilaId);

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await authRepository.createCustomer({
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      passwordHash,
    });

    // Seed the customer's default shipping address from the registration data
    // so their dashboard is prefilled (and editable) right away. Validates the
    // division → district → upazila chain (throws on mismatch).
    await addressService.saveMine(user.id, {
      fullName: input.fullName,
      divisionId: input.divisionId,
      districtId: input.districtId,
      upazilaId: input.upazilaId,
      phone: input.phone,
      addressLine1: input.area,
    });

    const token = signEmailVerifyToken(user.id);
    const verifyLink = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(input.email, verifyLink, user.fullName);

    return { user: publicUser(user) };
  },

  /**
   * Customer login by mobile number OR email. An identifier matching the BD
   * phone format is looked up by phone; otherwise it's treated as an email
   * (case-insensitive). Same generic error for unknown identifier and wrong
   * password so callers can't probe which accounts exist. Any active account
   * may sign in to the storefront (role is not restricted here).
   */
  async loginByPhone(input: CustomerLoginInput) {
    const invalid = ApiError.unauthorized("Invalid mobile number/email or password");

    const identifier = input.identifier.trim();
    const isPhone = /^01[3-9]\d{8}$/.test(identifier);
    const user = isPhone
      ? await authRepository.findByPhone(identifier)
      : await authRepository.findByEmailInsensitive(identifier);
    if (!user || !user.isActive) throw invalid;

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw invalid;

    // Only checked AFTER the password matches, so this message never leaks
    // account state to someone who doesn't know the credentials.
    if (user.role !== "admin" && !user.emailVerified) {
      throw ApiError.forbidden(
        "Please verify your email before logging in. Check your inbox for the verification link."
      );
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
    return { user: publicUser(user), accessToken, refreshToken };
  },

  /** Flip emailVerified from an emailed link's token. Idempotent. */
  async verifyEmail(token: string) {
    const invalid = () =>
      ApiError.badRequest("This verification link is invalid or has expired. Please request a new one.");

    let payload;
    try {
      payload = verifyEmailVerifyToken(token);
    } catch {
      throw invalid();
    }

    const user = await authRepository.findById(payload.userId);
    if (!user || !user.isActive) throw invalid();

    if (!user.emailVerified) {
      await db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  },

  /**
   * Re-send the verification link (login page offers this when a customer is
   * blocked by the verification check). Accepts phone or email — same lookup
   * as login. Always resolves silently: no account enumeration.
   */
  async resendVerification(identifier: string) {
    const isPhone = /^01[3-9]\d{8}$/.test(identifier);
    const user = isPhone
      ? await authRepository.findByPhone(identifier)
      : await authRepository.findByEmailInsensitive(identifier);
    if (!user || !user.isActive || !user.email || user.emailVerified) return;

    const token = signEmailVerifyToken(user.id);
    const verifyLink = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(user.email, verifyLink, user.fullName);
  },

  /** Current authenticated user (for the storefront account/dashboard). */
  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user || !user.isActive) throw ApiError.unauthorized("Authentication required");
    return publicUser(user);
  },

  /** Issue a fresh access token from a valid, current refresh token. */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw ApiError.unauthorized("Missing refresh token");

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const user = await authRepository.findById(payload.userId);
    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
      throw ApiError.unauthorized("Session no longer valid");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    return { user: publicUser(user), accessToken };
  },

  /**
   * Change password after verifying the current one. Bumps tokenVersion to
   * invalidate all previously issued refresh tokens, then mints a fresh one
   * so the current session stays signed in.
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await authRepository.findById(userId);
    if (!user) throw ApiError.unauthorized("Authentication required");

    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) throw ApiError.badRequest("Current password is incorrect");

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const newVersion = user.tokenVersion + 1;
    await db
      .update(users)
      .set({ passwordHash, tokenVersion: newVersion, updatedAt: new Date() })
      .where(eq(users.id, userId));

    const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: newVersion });
    return { refreshToken };
  },

  /**
   * Email a password-reset link. Always resolves without revealing whether the
   * email belongs to an account (no user enumeration) — the caller responds
   * with the same generic message either way.
   */
  async forgotPassword(email: string) {
    const user = await authRepository.findByEmailInsensitive(email);
    if (!user || !user.isActive || !user.email) return;

    const token = signPasswordResetToken(user.id, user.passwordHash);
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, resetLink, user.fullName);
  },

  /**
   * Set a new password from an emailed reset link. The token is signed with
   * the user's current password hash, so it's single-use and every issued
   * link dies the moment the password changes. Bumps tokenVersion so all
   * existing sessions are signed out.
   */
  async resetPassword(input: ResetPasswordInput) {
    const invalid = () =>
      ApiError.badRequest("This reset link is invalid or has expired. Please request a new one.");

    const payload = decodePasswordResetToken(input.token);
    if (!payload) throw invalid();

    const user = await authRepository.findById(payload.userId);
    if (!user || !user.isActive) throw invalid();

    try {
      verifyPasswordResetToken(input.token, user.passwordHash);
    } catch {
      throw invalid();
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, tokenVersion: user.tokenVersion + 1, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  },
};
