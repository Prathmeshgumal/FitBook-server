process.env.NODE_ENV = 'test';

const {
  hashPassword,
  verifyPassword,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateOpaqueToken,
  hashToken,
} = require('../../src/utils/hashing');

describe('hashPassword / verifyPassword', () => {
  it('returns a bcrypt hash', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('zero-pads numbers below 100000', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp();
      expect(otp.length).toBe(6);
    }
  });
});

describe('hashOtp / verifyOtpHash', () => {
  const secret = 'test-secret';

  it('produces consistent hash for same input', () => {
    expect(hashOtp('123456', secret)).toBe(hashOtp('123456', secret));
  });

  it('verifies matching otp', () => {
    const hash = hashOtp('123456', secret);
    expect(verifyOtpHash('123456', hash, secret)).toBe(true);
  });

  it('rejects wrong otp', () => {
    const hash = hashOtp('123456', secret);
    expect(verifyOtpHash('999999', hash, secret)).toBe(false);
  });

  it('returns false on malformed stored hash', () => {
    expect(verifyOtpHash('123456', 'not-a-valid-hex-hash', 'test-secret')).toBe(false);
  });
});

describe('generateOpaqueToken / hashToken', () => {
  it('generates a URL-safe base64 string', () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(80);
  });

  it('produces consistent SHA-256 hash', () => {
    const token = 'some-token';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});
