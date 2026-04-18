const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

/**
 * POST /auth/local/login
 * Body: { password: string }
 * Returns: { token: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
      return res.status(500).json({ error: 'Server auth not configured' });
    }

    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /auth/local/me
 * Verifies the current token is still valid.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ role: req.user.role });
});

module.exports = router;
