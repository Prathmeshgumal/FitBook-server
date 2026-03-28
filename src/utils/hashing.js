const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashOtp(otp, secret) {
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

function verifyOtpHash(otp, storedHash, secret) {
  try {
    const expected = hashOtp(otp, secret);
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

function generateOpaqueToken() {
  return crypto.randomBytes(64).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateOpaqueToken,
  hashToken,
};
