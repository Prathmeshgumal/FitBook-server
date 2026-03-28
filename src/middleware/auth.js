const { decodeToken } = require('../utils/jwt');
const { getUserById } = require('../services/authService');
const sql = require('../db');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = decodeToken(token, 'access');
    if (!payload.sub) {
      return res.status(401).json({ success: false, error: 'Invalid token payload' });
    }
    const user = await getUserById(sql, payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired access token' });
  }
}

module.exports = { requireAuth };
