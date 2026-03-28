const { generateOtp, hashOtp, verifyOtpHash } = require('../utils/hashing');
const { config } = require('../config');

async function createOtp(sql, email, purpose) {
  const otp = generateOtp();
  const otpHash = hashOtp(otp, config.otpHmacSecret);
  const expiresAt = new Date(Date.now() + config.otpExpireMinutes * 60 * 1000);

  await sql.begin(async (tx) => {
    await tx`
      UPDATE otps
      SET used_at = NOW()
      WHERE email = ${email}
        AND purpose = ${purpose}
        AND used_at IS NULL
        AND expires_at > NOW()
    `;

    await tx`
      INSERT INTO otps (email, otp_hash, purpose, expires_at)
      VALUES (${email}, ${otpHash}, ${purpose}, ${expiresAt})
    `;
  });

  return otp;
}

async function verifyOtp(sql, email, otp, purpose) {
  const [row] = await sql`
    SELECT id, otp_hash, expires_at, used_at
    FROM otps
    WHERE email = ${email}
      AND purpose = ${purpose}
      AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!row) {
    const err = new Error('Invalid or expired OTP');
    err.status = 400;
    throw err;
  }
  if (!verifyOtpHash(otp, row.otp_hash, config.otpHmacSecret)) {
    const err = new Error('Invalid OTP');
    err.status = 400;
    throw err;
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('OTP has expired');
    err.status = 400;
    throw err;
  }

  await sql`UPDATE otps SET used_at = NOW() WHERE id = ${row.id}`;
}

module.exports = { createOtp, verifyOtp };
