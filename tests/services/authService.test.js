process.env.NODE_ENV = 'test';

const authService = require('../../src/services/authService');
const { hashPassword } = require('../../src/utils/hashing');

function makeSql(...responses) {
  let i = 0;
  const fn = jest.fn().mockImplementation(() => Promise.resolve(responses[i++] ?? []));
  fn.begin = jest.fn(async (cb) => cb(fn));
  return fn;
}

describe('getUserByEmail', () => {
  it('returns user when found', async () => {
    const user = { id: '1', email: 'a@b.com', is_active: true };
    const sql = makeSql([user]);
    const result = await authService.getUserByEmail(sql, 'a@b.com');
    expect(result).toEqual(user);
  });

  it('returns null when not found', async () => {
    const sql = makeSql([]);
    const result = await authService.getUserByEmail(sql, 'missing@b.com');
    expect(result).toBeNull();
  });
});

describe('createUser', () => {
  it('throws 409 when email already taken', async () => {
    const existing = { id: '1', email: 'a@b.com', is_active: true };
    const sql = makeSql([existing]);
    await expect(
      authService.createUser(sql, { fullName: 'A', email: 'a@b.com', phone: '1234567890', password: 'pass123' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('creates and returns user when email is free', async () => {
    const newUser = { id: '2', email: 'new@b.com', full_name: 'New', phone: '0987654321' };
    const sql = makeSql([], [newUser]);
    const result = await authService.createUser(sql, {
      fullName: 'New', email: 'new@b.com', phone: '0987654321', password: 'pass123',
    });
    expect(result).toEqual(newUser);
  });
});

describe('authenticateUser', () => {
  it('throws 401 when user not found', async () => {
    const sql = makeSql([]);
    await expect(authService.authenticateUser(sql, 'missing@b.com', 'pass'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when password is wrong', async () => {
    const hash = await hashPassword('correct');
    const user = { id: '1', email: 'a@b.com', password_hash: hash, is_email_verified: true, is_active: true };
    const sql = makeSql([user]);
    await expect(authService.authenticateUser(sql, 'a@b.com', 'wrong'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 403 when email not verified', async () => {
    const hash = await hashPassword('pass123');
    const user = { id: '1', email: 'a@b.com', password_hash: hash, is_email_verified: false, is_active: true };
    const sql = makeSql([user]);
    await expect(authService.authenticateUser(sql, 'a@b.com', 'pass123'))
      .rejects.toMatchObject({ status: 403 });
  });

  it('returns user on valid credentials', async () => {
    const hash = await hashPassword('pass123');
    const user = { id: '1', email: 'a@b.com', password_hash: hash, is_email_verified: true, is_active: true };
    const sql = makeSql([user]);
    const result = await authService.authenticateUser(sql, 'a@b.com', 'pass123');
    expect(result.id).toBe('1');
  });
});

describe('issueTokenPair', () => {
  it('returns accessToken and refreshToken strings', async () => {
    const sql = makeSql([]);
    const tokens = await authService.issueTokenPair(sql, 'user-1');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
  });
});

describe('refreshTokenPair', () => {
  it('throws 401 when token not found', async () => {
    const sql = makeSql([]);
    await expect(authService.refreshTokenPair(sql, 'bad-token'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when token is revoked', async () => {
    const row = { id: 1, user_id: 'u1', expires_at: new Date(Date.now() + 60000), revoked_at: new Date() };
    const sql = makeSql([row]);
    await expect(authService.refreshTokenPair(sql, 'some-token'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when token is expired', async () => {
    const row = { id: 1, user_id: 'u1', expires_at: new Date(Date.now() - 1000), revoked_at: null };
    const sql = makeSql([row]);
    await expect(authService.refreshTokenPair(sql, 'some-token'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('issues new token pair on valid refresh token', async () => {
    const row = { id: 1, user_id: 'u1', expires_at: new Date(Date.now() + 60000), revoked_at: null };
    // makeSql responses: SELECT refresh_token, UPDATE revoke old, INSERT new refresh_token
    const sql = makeSql([row], [], []);
    const tokens = await authService.refreshTokenPair(sql, 'valid-raw-token');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(sql).toHaveBeenCalledTimes(3);
  });
});
