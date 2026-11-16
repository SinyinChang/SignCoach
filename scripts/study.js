import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { build, preview } from 'vite';

const tunnelUrl = /https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/;
const serverOptions = { host: '127.0.0.1' };
const windowsInstall = process.platform === 'win32'
  ? [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]
    .filter(Boolean)
    .map((folder) => join(folder, 'cloudflared', 'cloudflared.exe'))
    .find(existsSync)
  : undefined;

await build();
const server = await preview({ preview: serverOptions });
const { port } = server.httpServer.address();
const tunnel = spawn(windowsInstall ?? 'cloudflared', [
  'tunnel',
  '--url', `http://127.0.0.1:${port}`,
  '--http-host-header', 'localhost',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stopping = false;
let announced = false;
let output = '';

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  clearTimeout(startupTimeout);
  tunnel.kill();
  server.httpServer.close();
  server.httpServer.closeAllConnections();
}

function readOutput(chunk) {
  if (announced) return;
  output = (output + chunk).slice(-8192);
  const url = output.match(tunnelUrl)?.[0];
  if (!url) return;
  announced = true;
  clearTimeout(startupTimeout);
  console.log(`\n  Participant URL to share: ${url}\n`);
}

const startupTimeout = setTimeout(() => {
  console.error('Cloudflare did not provide a participant URL within 60 seconds.');
  console.error(output.trim());
  stop(1);
}, 60_000);
tunnel.stdout.setEncoding('utf8').on('data', readOutput);
tunnel.stderr.setEncoding('utf8').on('data', readOutput);
tunnel.once('error', (error) => {
  console.error(error.code === 'ENOENT'
    ? 'cloudflared was not found. Install it with winget install --id Cloudflare.cloudflared -e, then reopen PowerShell.'
    : error.message);
  stop(1);
});
tunnel.once('close', (code) => {
  if (stopping) return;
  console.error(`Cloudflare Tunnel stopped (exit code ${code}).`);
  if (!announced) console.error(output.trim());
  stop(1);
});
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
