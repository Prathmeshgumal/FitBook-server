const jwt = require('jsonwebtoken');
const { config } = require('../config');

function createAccessToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'access' },
    config.jwtSecretKey,
    { algorithm: config.jwtAlgorithm, expiresIn: `${config.accessTokenExpireMinutes}m` }
  );
}

function createPasswordResetToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'password_reset' },
    config.jwtSecretKey,
    { algorithm: config.jwtAlgorithm, expiresIn: `${config.passwordResetTokenExpireMinutes}m` }
  );
}

function decodeToken(token, expectedType) {
  const payload = jwt.verify(token, config.jwtSecretKey, { algorithms: [config.jwtAlgorithm] });
  if (payload.type !== expectedType) {
    throw new Error('Invalid token');
  }
  return payload;
}

module.exports = { createAccessToken, createPasswordResetToken, decodeToken };
