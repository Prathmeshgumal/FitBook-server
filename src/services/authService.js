const { hashPassword, verifyPassword, generateOpaqueToken, hashToken } = require('../utils/hashing');
const { createAccessToken } = require('../utils/jwt');
const { config } = require('../config');

async function getUserByEmail(sql, email) {
  const [user] = await sql`SELECT * FROM users WHERE email = ${email} AND is_active = TRUE`;
  return user || null;
}

async function getUserById(sql, userId) {
  const [user] = await sql`SELECT * FROM users WHERE id = ${userId} AND is_active = TRUE`;
  return user || null;
}

async function createUser(sql, { fullName, email, phone, password }) {
  const existing = await getUserByEmail(sql, email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const [user] = await sql`
    INSERT INTO users (full_name, email, phone, password_hash)
    VALUES (${fullName}, ${email}, ${phone}, ${passwordHash})
    RETURNING *
  `;
  return user;
}

async function markEmailVerified(sql, email) {
  await sql`UPDATE users SET is_email_verified = TRUE WHERE email = ${email}`;
}

async function authenticateUser(sql, email, password) {
  const user = await getUserByEmail(sql, email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  if (!user.is_email_verified) {
    const err = new Error('Email not verified');
    err.status = 403;
    throw err;
  }
  return user;
}

async function issueTokenPair(sql, userId, email) {
  // email passed from login/signup flows. For token refresh, resolve from DB (only once per refresh).
  const resolvedEmail = email ?? (await sql`SELECT email FROM users WHERE id = ${userId}`)[0]?.email ?? '';
  const accessToken = createAccessToken(String(userId), resolvedEmail);
  const rawRefresh = generateOpaqueToken();
  const refreshHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + config.refreshTokenExpireDays * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${refreshHash}, ${expiresAt})
  `;

  return { accessToken, refreshToken: rawRefresh };
}

async function refreshTokenPair(sql, rawRefresh) {
  const refreshHash = hashToken(rawRefresh);
  const [row] = await sql`
    SELECT id, user_id, expires_at, revoked_at
    FROM refresh_tokens
    WHERE token_hash = ${refreshHash}
  `;

  if (!row) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
  if (row.revoked_at) {
    const err = new Error('Refresh token revoked');
    err.status = 401;
    throw err;
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('Refresh token expired');
    err.status = 401;
    throw err;
  }

  let tokens;
  await sql.begin(async (tx) => {
    await tx`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${row.id}`;
    tokens = await issueTokenPair(tx, String(row.user_id));
  });
  return tokens;
}

async function revokeRefreshToken(sql, rawRefresh) {
  const refreshHash = hashToken(rawRefresh);
  await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ${refreshHash}`;
}

async function issuePasswordResetToken(sql, email) {
  const user = await getUserByEmail(sql, email);
  if (!user) return null;   // caller handles null — do not expose whether email exists

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.passwordResetTokenExpireMinutes * 60 * 1000);

  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${tokenHash}, ${expiresAt})
  `;

  return rawToken;
}

async function resetPassword(sql, rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);
  const [row] = await sql`
    SELECT id, user_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
  `;

  if (!row) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  if (row.used_at) {
    const err = new Error('Reset token already used');
    err.status = 400;
    throw err;
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('Reset token expired');
    err.status = 400;
    throw err;
  }

  const newHash = await hashPassword(newPassword);

  await sql.begin(async (tx) => {
    await tx`UPDATE users SET password_hash = ${newHash} WHERE id = ${row.user_id}`;
    await tx`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${row.id}`;
    await tx`
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = ${row.user_id} AND revoked_at IS NULL
    `;
  });
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  markEmailVerified,
  authenticateUser,
  issueTokenPair,
  refreshTokenPair,
  revokeRefreshToken,
  issuePasswordResetToken,
  resetPassword,
};
