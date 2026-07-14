import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { authService } from "./auth.service";
import { loginSchema, registerSchema, customerLoginSchema, changePasswordSchema } from "./auth.validators";
import { REFRESH_COOKIE, refreshCookieOptions } from "./auth.tokens";

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.login(input);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  sendSuccess(res, { user, accessToken });
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.registerCustomer(input);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  sendSuccess(res, { user, accessToken }, 201);
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
