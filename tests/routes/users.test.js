process.env.NODE_ENV = 'test';

jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = {
      id: 'u1',
      full_name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      is_email_verified: true,
      is_active: true,
    };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const usersRouter = require('../../src/routes/users');

const app = express();
app.use(express.json());
app.use('/api/v1/users', usersRouter);

describe('GET /api/v1/users/me', () => {
  it('returns current user profile', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: 'u1',
      full_name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      is_email_verified: true,
      is_active: true,
    });
  });
});
