/**
 * dev.js — starts Express + opens an ngrok tunnel
 *
 * Usage: node scripts/dev.js
 *
 * What it does:
 *  1. Starts the Express server on PORT (default 3001)
 *  2. Opens an ngrok HTTPS tunnel to that port
 *  3. Prints the public URL + the exact redirect URI to paste in TikTok Partner Center
 *  4. Writes NGROK_URL into .env.local so the server can reference it if needed
 *
 * Prerequisites:
 *  npm install --save-dev @ngrok/ngrok
 *  Set NGROK_AUTHTOKEN in .env  (get one free at https://dashboard.ngrok.com)
 */

require('dotenv').config();
const ngrok = require('@ngrok/ngrok');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3001', 10);
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;

if (!NGROK_AUTHTOKEN) {
  console.error('\n❌  NGROK_AUTHTOKEN is not set in .env');
  console.error('    Get a free token at https://dashboard.ngrok.com/get-started/your-authtoken\n');
  process.exit(1);
}

// ─── Start Express ────────────────────────────────────────────────────────────
const server = spawn('node', ['index.js'], {
  env: { ...process.env },
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Give Express a moment to bind before opening the tunnel
setTimeout(async () => {
  try {
    // ─── Open ngrok tunnel ────────────────────────────────────────────────────
    const listener = await ngrok.forward({
      addr: PORT,
      authtoken: NGROK_AUTHTOKEN,
    });

    const publicUrl = listener.url();
    const redirectUri = `${publicUrl}/auth/callback`;

    console.log('\n════════════════════════════════════════════════════════');
    console.log('  ngrok tunnel open');
    console.log(`  Public URL   : ${publicUrl}`);
    console.log(`  Redirect URI : ${redirectUri}`);
    console.log('\n  → Paste the Redirect URI above into:');
    console.log('    TikTok Partner Center → My Apps → Your App → Redirect URI');
    console.log('\n  → Also update REDIRECT_URI in your .env to:');
    console.log(`    REDIRECT_URI=${redirectUri}`);
    console.log('════════════════════════════════════════════════════════\n');

    // Optionally write to .env.local so the running process can pick it up
    const envLocalPath = path.resolve(__dirname, '../.env.local');
    fs.writeFileSync(envLocalPath, `REDIRECT_URI=${redirectUri}\nNGROK_URL=${publicUrl}\n`);
    console.log(`  .env.local updated with current ngrok URL\n`);

  } catch (err) {
    console.error('ngrok error:', err.message);
    server.kill();
    process.exit(1);
  }
}, 2000);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await ngrok.disconnect();
  server.kill();
  process.exit(0);
});
