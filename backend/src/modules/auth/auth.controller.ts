import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { authService } from "./auth.service";
import {
  loginSchema,
  registerSchema,
  customerLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "./auth.validators";
import { REFRESH_COOKIE, refreshCookieOptions } from "./auth.tokens";

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.login(input);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  sendSuccess(res, { user, accessToken });
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  // No session yet — the account must be verified via the emailed link first.
  const { user } = await authService.registerCustomer(input);
  sendSuccess(
    res,
    { user, message: "Account created. Check your email for the verification link." },
    201
  );
}

export async function verifyEmail(req: Request, res: Response) {
  const input = verifyEmailSchema.parse(req.body);
  await authService.verifyEmail(input.token);
  sendSuccess(res, { message: "Email verified. You can now log in." });
}

export async function resendVerification(req: Request, res: Response) {
  const input = resendVerificationSchema.parse(req.body);
  await authService.resendVerification(input.identifier);
  // Same response either way — no account enumeration.
  sendSuccess(res, {
    message: "If an unverified account matches, a new verification link has been sent.",
  });
}

export async function customerLogin(req: Request, res: Response) {
  const input = customerLoginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.loginByPhone(input);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  sendSuccess(res, { user, accessToken });
}

export async function me(req: Request, res: Response) {
  const user = await authService.me(req.user!.userId);
  sendSuccess(res, { user });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { user, accessToken } = await authService.refresh(token);
  sendSuccess(res, { user, accessToken });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
  sendSuccess(res, { message: "Logged out" });
}

export async function changePassword(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);
  const { refreshToken } = await authService.changePassword(req.user!.userId, input);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  sendSuccess(res, { message: "Password updated" });
}

export async function forgotPassword(req: Request, res: Response) {
  const input = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(input.email);
  // Same response whether or not the email exists — no account enumeration.
  sendSuccess(res, {
    message: "If an account exists for that email, a reset link has been sent.",
  });
}

export async function resetPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(input);
  sendSuccess(res, { message: "Password has been reset. You can now log in." });
}
