#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readConfig(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    if (parsed.enabled === false) return null;
    return { file, token, enabled: parsed.enabled !== false };
  } catch {
    return null;
  }
}

function configFiles(home = os.homedir(), env = process.env, platform = process.platform) {
  const files = [];
  if (env.INFIKNIT_CONFIG_DIR) files.push(path.join(env.INFIKNIT_CONFIG_DIR, 'mcp.json'));
  const names = ['Infiknit', 'Infiknit Dev'];
  if (platform === 'darwin') {
    for (const name of names) files.push(path.join(home, 'Library', 'Application Support', name, 'config', 'mcp.json'));
  } else if (platform === 'win32') {
    const appdata = env.APPDATA || path.join(home, 'AppData', 'Roaming');
    for (const name of names) files.push(path.join(appdata, name, 'config', 'mcp.json'));
  } else {
    for (const name of names) files.push(path.join(home, '.config', name, 'config', 'mcp.json'));
  }
  return files;
}

function portFor(file, env = process.env) {
  if (env.INFIKNIT_MCP_PORT) return Number(env.INFIKNIT_MCP_PORT);
  return file.includes(`${path.sep}Infiknit Dev${path.sep}`) ? 31416 : 31415;
}

function discover({ home = os.homedir(), env = process.env, platform = process.platform } = {}) {
  const envUrl = env.INFIKNIT_MCP_URL;
  const envToken = env.INFIKNIT_MCP_TOKEN;
  if (envUrl && envToken) return { url: envUrl, token: envToken, source: 'env' };
  if (envUrl || envToken) {
    throw new Error('Set both INFIKNIT_MCP_URL and INFIKNIT_MCP_TOKEN, or leave both unset so Infiknit can be discovered locally.');
  }
  for (const file of configFiles(home, env, platform)) {
    const config = readConfig(file);
    if (!config) continue;
    return {
      url: `http://127.0.0.1:${portFor(file, env)}/mcp`,
      token: config.token,
      source: file,
    };
  }
  throw new Error('Infiknit is not connected on this computer. Open Infiknit, keep it running, then retry. Download: https://infiknit.app/downloads');
}

function assertLocal(url, token) {
  let endpoint;
  try { endpoint = new URL(url); } catch {
    throw new Error('Invalid Infiknit MCP URL. Reconnect in Settings → MCP Connect.');
  }
  if (endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1' || endpoint.pathname !== '/mcp' || endpoint.search || !token || token.length < 32) {
    throw new Error('Invalid Infiknit MCP connection. Reconnect this agent in Infiknit.');
  }
  return endpoint;
}

if (require.main === module) {
  try {
    const connection = discover();
    assertLocal(connection.url, connection.token);
    process.env.INFIKNIT_MCP_URL = connection.url;
    process.env.INFIKNIT_MCP_TOKEN = connection.token;
    require('./stdio-bridge.cjs');
  } catch (error) {
    fail(error.message);
  }
} else {
  module.exports = { discover, configFiles, assertLocal };
}
