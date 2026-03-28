process.env.NODE_ENV = 'test';

jest.mock('../../src/db', () => jest.fn());
jest.mock('../../src/services/authService');
jest.mock('../../src/services/otpService');
jest.mock('../../src/services/emailService');
jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'u1' }; next(); },
}));

const request = require('supertest');
const express = require('express');
const authRouter = require('../../src/routes/auth');
const authService = require('../../src/services/authService');
const otpService = require('../../src/services/otpService');
const emailService = require('../../src/services/emailService');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

describe('POST /api/v1/auth/signup/request-onboarder-otp', () => {
  it('returns 200 with message on valid email', async () => {
    otpService.createOtp.mockResolvedValue('123456');
    emailService.sendOnboarderOtpEmail.mockResolvedValue();
    const res = await request(app)
      .post('/api/v1/auth/signup/request-onboarder-otp')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 on invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/request-onboarder-otp')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/signup/register', () => {
  it('returns 201 on valid registration', async () => {
    otpService.verifyOtp.mockResolvedValue();
    authService.createUser.mockResolvedValue({ id: '1' });
    otpService.createOtp.mockResolvedValue('654321');
    emailService.sendEmailVerificationOtp.mockResolvedValue();
    const res = await request(app)
      .post('/api/v1/auth/signup/register')
      .send({ full_name: 'Test User', phone: '1234567890', email: 'test@example.com', password: 'pass123', onboarder_otp: '123456' });
    expect(res.status).toBe(201);
  });

  it('returns 422 on short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/register')
      .send({ full_name: 'Test', phone: '1234567890', email: 'test@example.com', password: '12', onboarder_otp: '123456' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    authService.authenticateUser.mockResolvedValue({ id: 'u1' });
    authService.issueTokenPair.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ access_token: 'at', refresh_token: 'rt' });
  });

  it('returns 401 on bad credentials', async () => {
    const err = new Error('Invalid credentials');
    err.status = 401;
    authService.authenticateUser.mockRejectedValue(err);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/token/refresh', () => {
  it('returns new tokens on valid refresh token', async () => {
    authService.refreshTokenPair.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });
    const res = await request(app)
      .post('/api/v1/auth/token/refresh')
      .send({ refresh_token: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBe('new-at');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 on successful logout', async () => {
    authService.revokeRefreshToken.mockResolvedValue();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer valid-token')
      .send({ refresh_token: 'rt' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/auth/forgot-password/request', () => {
  it('returns 200 regardless of whether email exists (privacy)', async () => {
    authService.getUserByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/forgot-password/request')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/auth/forgot-password/reset', () => {
  it('returns 200 on successful reset', async () => {
    authService.resetPassword.mockResolvedValue();
    const res = await request(app)
      .post('/api/v1/auth/forgot-password/reset')
      .send({ reset_token: 'token', new_password: 'newpass123' });
    expect(res.status).toBe(200);
  });

  it('returns 422 on short new password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password/reset')
      .send({ reset_token: 'token', new_password: '12' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/signup/verify-email', () => {
  it('returns tokens on valid OTP', async () => {
    otpService.verifyOtp.mockResolvedValue();
    authService.markEmailVerified.mockResolvedValue();
    authService.getUserByEmail.mockResolvedValue({ id: 'u1' });
    authService.issueTokenPair.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    const res = await request(app)
      .post('/api/v1/auth/signup/verify-email')
      .send({ email: 'test@example.com', otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ access_token: 'at', refresh_token: 'rt' });
  });

  it('returns 422 on missing otp', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/verify-email')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/forgot-password/verify-otp', () => {
  it('returns reset_token when email exists', async () => {
    otpService.verifyOtp.mockResolvedValue();
    authService.issuePasswordResetToken.mockResolvedValue('reset-token-abc');
    const res = await request(app)
      .post('/api/v1/auth/forgot-password/verify-otp')
      .send({ email: 'test@example.com', otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.data.reset_token).toBe('reset-token-abc');
  });

  it('returns 200 with message when issuePasswordResetToken returns null', async () => {
    otpService.verifyOtp.mockResolvedValue();
    authService.issuePasswordResetToken.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/forgot-password/verify-otp')
      .send({ email: 'test@example.com', otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.data.reset_token).toBeUndefined();
    expect(res.body.data.message).toBeDefined();
  });
});
