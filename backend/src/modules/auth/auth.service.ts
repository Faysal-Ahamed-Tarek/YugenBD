import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/ApiError";
import { authRepository } from "./auth.repository";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./auth.tokens";
import type { LoginInput, RegisterInput, CustomerLoginInput, ChangePasswordInput } from "./auth.validators";

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
   * Customer self-registration. Phone is the unique login handle; email is
   * optional. Password is hashed with bcrypt (cost 12). Returns tokens so the
   * new user is signed in immediately.
   */
  async registerCustomer(input: RegisterInput) {
    const existingPhone = await authRepository.findByPhone(input.phone);
    if (existingPhone) throw ApiError.conflict("An account with this mobile number already exists.");
    if (input.email) {
      const existingEmail = await authRepository.findByEmail(input.email);
      if (existingEmail) throw ApiError.conflict("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await authRepository.createCustomer({
      fullName: input.fullName,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash,
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
    return { user: publicUser(user), accessToken, refreshToken };
  },

  /**
   * Customer login by phone number. Same generic error for unknown phone and
   * wrong password so callers can't probe which accounts exist. Any active
   * account may sign in to the storefront (role is not restricted here).
   */
  async loginByPhone(input: CustomerLoginInput) {
    const invalid = ApiError.unauthorized("Invalid mobile number or password");

    const user = await authRepository.findByPhone(input.phone);
    if (!user || !user.isActive) throw invalid;

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw invalid;

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
    return { user: publicUser(user), accessToken, refreshToken };
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
};
