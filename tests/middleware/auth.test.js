process.env.NODE_ENV = 'test';

jest.mock('../../src/db', () => jest.fn());
jest.mock('../../src/services/authService');

const { requireAuth } = require('../../src/middleware/auth');
const { createAccessToken } = require('../../src/utils/jwt');
const authService = require('../../src/services/authService');

function makeReqRes(token) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('requireAuth', () => {
  it('returns 401 when no Authorization header', async () => {
    const { req, res, next } = makeReqRes(null);
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    const { req, res, next } = makeReqRes('bad.token.here');
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user not found in db', async () => {
    authService.getUserById.mockResolvedValue(null);
    const token = createAccessToken('missing-user');
    const { req, res, next } = makeReqRes(token);
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user when valid', async () => {
    const user = { id: 'user-1', email: 'a@b.com', is_active: true };
    authService.getUserById.mockResolvedValue(user);
    const token = createAccessToken('user-1');
    const { req, res, next } = makeReqRes(token);
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(user);
  });
});
