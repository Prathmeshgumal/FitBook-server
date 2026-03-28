const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  const { id, full_name, email, phone, is_email_verified, is_active } = req.user;
  res.json({
    success: true,
    data: { id: String(id), full_name, email, phone, is_email_verified, is_active },
  });
});

module.exports = router;
