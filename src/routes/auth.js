const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const sql = require('../db');
const authService = require('../services/authService');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

const passThrough = (req, res, next) => next();
const fivePerMin = process.env.NODE_ENV === 'test'
  ? passThrough
  : rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false });
const tenPerMin = process.env.NODE_ENV === 'test'
  ? passThrough
  : rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

const RequestOnboarderOTPSchema = z.object({ email: z.string().email() });

const SignupSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  onboarder_otp: z.string().regex(/^\d{6}$/, 'Onboarder OTP must be exactly 6 digits'),
});

const VerifyEmailOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});
const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const RefreshTokenSchema = z.object({ refresh_token: z.string() });
const LogoutSchema = z.object({ refresh_token: z.string() });
const ForgotPasswordSchema = z.object({ email: z.string().email() });
const VerifyForgotPasswordOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});
const ResetPasswordSchema = z.object({
  reset_token: z.string(),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

function validate(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: parsed.error.errors[0].message });
    return null;
  }
  return parsed.data;
}

router.post('/signup/request-onboarder-otp', fivePerMin, asyncHandler(async (req, res) => {
  const data = validate(RequestOnboarderOTPSchema, req.body, res);
  if (!data) return;
  const otp = await otpService.createOtp(sql, data.email, 'onboarder');
  await emailService.sendOnboarderOtpEmail(otp, data.email);
  res.json({ success: true, data: { message: 'Onboarder OTP sent to admin. Ask your onboarder for the code.' } });
}));

router.post('/signup/register', asyncHandler(async (req, res) => {
  const data = validate(SignupSchema, req.body, res);
  if (!data) return;
  await otpService.verifyOtp(sql, data.email, data.onboarder_otp, 'onboarder');
  await authService.createUser(sql, { fullName: data.full_name, email: data.email, phone: data.phone, password: data.password });
  const otp = await otpService.createOtp(sql, data.email, 'email_verification');
  await emailService.sendEmailVerificationOtp(data.email, otp);
  res.status(201).json({ success: true, data: { message: 'Account created. Check your email for the verification code.' } });
}));

router.post('/signup/verify-email', fivePerMin, asyncHandler(async (req, res) => {
  const data = validate(VerifyEmailOTPSchema, req.body, res);
  if (!data) return;
  await otpService.verifyOtp(sql, data.email, data.otp, 'email_verification');
  await authService.markEmailVerified(sql, data.email);
  const user = await authService.getUserByEmail(sql, data.email);
  const tokens = await authService.issueTokenPair(sql, user.id);
  res.json({ success: true, data: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, token_type: 'bearer' } });
}));

router.post('/login', tenPerMin, asyncHandler(async (req, res) => {
  const data = validate(LoginSchema, req.body, res);
  if (!data) return;
  const user = await authService.authenticateUser(sql, data.email, data.password);
  const tokens = await authService.issueTokenPair(sql, user.id);
  res.json({ success: true, data: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, token_type: 'bearer' } });
}));

router.post('/token/refresh', asyncHandler(async (req, res) => {
  const data = validate(RefreshTokenSchema, req.body, res);
  if (!data) return;
  const tokens = await authService.refreshTokenPair(sql, data.refresh_token);
  res.json({ success: true, data: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, token_type: 'bearer' } });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const data = validate(LogoutSchema, req.body, res);
  if (!data) return;
  await authService.revokeRefreshToken(sql, data.refresh_token);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}));

router.post('/forgot-password/request', fivePerMin, asyncHandler(async (req, res) => {
  const data = validate(ForgotPasswordSchema, req.body, res);
  if (!data) return;
  const user = await authService.getUserByEmail(sql, data.email);
  if (user) {
    const otp = await otpService.createOtp(sql, data.email, 'forgot_password');
    await emailService.sendForgotPasswordOtp(data.email, otp);
  }
  res.json({ success: true, data: { message: 'If that email is registered, a reset code has been sent.' } });
}));

router.post('/forgot-password/verify-otp', fivePerMin, asyncHandler(async (req, res) => {
  const data = validate(VerifyForgotPasswordOTPSchema, req.body, res);
  if (!data) return;
  await otpService.verifyOtp(sql, data.email, data.otp, 'forgot_password');
  const resetToken = await authService.issuePasswordResetToken(sql, data.email);
  // issuePasswordResetToken returns null when email not found — still respond 200 to avoid enumeration
  res.json({ success: true, data: resetToken ? { reset_token: resetToken } : { message: 'If that email exists, a reset token was issued' } });
}));

router.post('/forgot-password/reset', asyncHandler(async (req, res) => {
  const data = validate(ResetPasswordSchema, req.body, res);
  if (!data) return;
  await authService.resetPassword(sql, data.reset_token, data.new_password);
  res.json({ success: true, data: { message: 'Password reset successfully. Please sign in.' } });
}));

module.exports = router;
