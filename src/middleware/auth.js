const { decodeToken } = require('../utils/jwt');

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
    // No DB call — user data comes from the verified JWT payload
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired access token' });
  }
}

module.exports = { requireAuth };
