process.env.NODE_ENV = 'test';

const { createAccessToken, createPasswordResetToken, decodeToken } = require('../../src/utils/jwt');

describe('createAccessToken / decodeToken', () => {
  it('creates a token that decodes with correct sub and type', () => {
    const token = createAccessToken('user-123');
    const payload = decodeToken(token, 'access');
    expect(payload.sub).toBe('user-123');
    expect(payload.type).toBe('access');
  });

  it('throws on wrong token type', () => {
    const token = createAccessToken('user-123');
    expect(() => decodeToken(token, 'password_reset')).toThrow();
  });

  it('throws on tampered token', () => {
    const token = createAccessToken('user-123');
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(() => decodeToken(tampered, 'access')).toThrow();
  });

  it('throws on expired token', () => {
    jest.useFakeTimers();
    const token = createAccessToken('user-123');
    // advance past 15-minute expiry
    jest.advanceTimersByTime(16 * 60 * 1000);
    expect(() => decodeToken(token, 'access')).toThrow();
    jest.useRealTimers();
  });
});

describe('createPasswordResetToken', () => {
  it('creates a token with type password_reset', () => {
    const token = createPasswordResetToken('user-456');
    const payload = decodeToken(token, 'password_reset');
    expect(payload.sub).toBe('user-456');
    expect(payload.type).toBe('password_reset');
  });
});
