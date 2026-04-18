require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./lib/db');
const { router: authRouter } = require('./routes/auth');
const shopRouter = require('./routes/shop');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/shop', shopRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Init DB then start server ────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`TikTok Shop server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise DB:', err.message);
    process.exit(1);
  });
