#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { discover, configFiles, assertLocal } = require('../plugins/infiknit/bin/infiknit-mcp.cjs');

const token = 'a'.repeat(64);
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'infiknit-mcp-'));

function write(rel, data) {
  const file = path.join(home, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
  return file;
}

const mac = configFiles(home, {}, 'darwin');
assert.equal(mac[0], path.join(home, 'Library', 'Application Support', 'Infiknit', 'config', 'mcp.json'));
assert.equal(mac[1], path.join(home, 'Library', 'Application Support', 'Infiknit Dev', 'config', 'mcp.json'));

const win = configFiles(home, { APPDATA: path.join(home, 'AppData', 'Roaming') }, 'win32');
assert.ok(win[0].endsWith(path.join('Infiknit', 'config', 'mcp.json')));

assert.throws(() => discover({ home, env: {}, platform: 'darwin' }), /Download: https:\/\/infiknit.app\/downloads/);
assert.throws(() => discover({ home, env: { INFIKNIT_MCP_URL: 'http://127.0.0.1:31415/mcp' }, platform: 'darwin' }), /both INFIKNIT_MCP_URL/);

const env = discover({ home, env: { INFIKNIT_MCP_URL: 'http://127.0.0.1:31415/mcp', INFIKNIT_MCP_TOKEN: token }, platform: 'darwin' });
assert.equal(env.source, 'env');
assert.equal(env.url, 'http://127.0.0.1:31415/mcp');
assertLocal(env.url, env.token);
assert.throws(() => assertLocal('https://example.com/mcp', token), /Invalid Infiknit MCP connection/);

write(path.join('Library', 'Application Support', 'Infiknit Dev', 'config', 'mcp.json'), { enabled: true, token, enabledAgents: [] });
const dev = discover({ home, env: {}, platform: 'darwin' });
assert.equal(dev.url, 'http://127.0.0.1:31416/mcp');

write(path.join('Library', 'Application Support', 'Infiknit', 'config', 'mcp.json'), { enabled: true, token: 'b'.repeat(64), enabledAgents: [] });
const prod = discover({ home, env: {}, platform: 'darwin' });
assert.equal(prod.url, 'http://127.0.0.1:31415/mcp');
assert.equal(prod.token, 'b'.repeat(64));

write(path.join('Library', 'Application Support', 'Infiknit', 'config', 'mcp.json'), { enabled: false, token: 'b'.repeat(64) });
const fallback = discover({ home, env: {}, platform: 'darwin' });
assert.equal(fallback.url, 'http://127.0.0.1:31416/mcp');

const customDir = path.join(home, 'custom-config');
write(path.join('custom-config', 'mcp.json'), { enabled: true, token: 'c'.repeat(64) });
const custom = discover({ home, env: { INFIKNIT_CONFIG_DIR: customDir }, platform: 'darwin' });
assert.equal(custom.token, 'c'.repeat(64));
assert.equal(custom.url, 'http://127.0.0.1:31415/mcp');

console.log('discover tests passed');
