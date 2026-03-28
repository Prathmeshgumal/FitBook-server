process.env.NODE_ENV = 'test';

const { createOtp, verifyOtp } = require('../../src/services/otpService');
const { hashOtp } = require('../../src/utils/hashing');
const { config } = require('../../src/config');

function makeSql(...responses) {
  let i = 0;
  const fn = jest.fn().mockImplementation(() => Promise.resolve(responses[i++] ?? []));
  fn.begin = jest.fn(async (cb) => cb(fn));  // pass same mock into transaction callback
  return fn;
}

describe('createOtp', () => {
  it('returns a 6-digit string OTP', async () => {
    const sql = makeSql([], []);
    const otp = await createOtp(sql, 'test@example.com', 'email_verification');
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('wraps both sql calls in a transaction', async () => {
    const sql = makeSql([], []);
    await createOtp(sql, 'test@example.com', 'email_verification');
    expect(sql.begin).toHaveBeenCalledTimes(1);
    expect(sql).toHaveBeenCalledTimes(2); // UPDATE + INSERT via tx (same fn)
  });
});

describe('verifyOtp', () => {
  it('throws 400 when no OTP row found', async () => {
    const sql = makeSql([]);
    await expect(verifyOtp(sql, 'test@example.com', '123456', 'email_verification'))
      .rejects.toMatchObject({ status: 400, message: 'Invalid or expired OTP' });
  });

  it('throws 400 when OTP is expired', async () => {
    const otp = '123456';
    const otpHash = hashOtp(otp, config.otpHmacSecret);
    const row = { id: 1, otp_hash: otpHash, expires_at: new Date(Date.now() - 1000), used_at: null };
    const sql = makeSql([row]);
    await expect(verifyOtp(sql, 'test@example.com', otp, 'email_verification'))
      .rejects.toMatchObject({ status: 400, message: 'OTP has expired' });
  });

  it('throws 400 when OTP hash does not match', async () => {
    const otpHash = hashOtp('999999', config.otpHmacSecret);
    const row = { id: 1, otp_hash: otpHash, expires_at: new Date(Date.now() + 60000), used_at: null };
    const sql = makeSql([row]);
    await expect(verifyOtp(sql, 'test@example.com', '123456', 'email_verification'))
      .rejects.toMatchObject({ status: 400, message: 'Invalid OTP' });
  });

  it('marks OTP as used when valid', async () => {
    const otp = '123456';
    const otpHash = hashOtp(otp, config.otpHmacSecret);
    const row = { id: 1, otp_hash: otpHash, expires_at: new Date(Date.now() + 60000), used_at: null };
    const sql = makeSql([row], []);
    await expect(verifyOtp(sql, 'test@example.com', otp, 'email_verification'))
      .resolves.toBeUndefined();
    expect(sql).toHaveBeenCalledTimes(2);
  });
});
