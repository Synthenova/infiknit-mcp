// Local transport adapter for MCP hosts that launch stdio servers (Claude Desktop).
const readline = require('node:readline');
const endpoint = new URL(process.env.INFIKNIT_MCP_URL);
const token = process.env.INFIKNIT_MCP_TOKEN;
if (endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1' || endpoint.pathname !== '/mcp' || endpoint.search || !token || token.length < 32) {
  throw new Error('Invalid Infiknit MCP connection. Reconnect this agent in Infiknit.');
}
const pending = new Map();
let lineBytes = 0;
process.stdin.on('data', (chunk) => {
  const parts = chunk.toString().split('\n');
  for (let index = 0; index < parts.length; index++) {
    lineBytes += Buffer.byteLength(parts[index]);
    if (lineBytes > 1024 * 1024) return process.stdin.destroy();
    if (index < parts.length - 1) lineBytes = 0;
  }
});
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const lines = readline.createInterface({ input: process.stdin });
lines.on('line', async (line) => {
  let message;
  try {
    if (Buffer.byteLength(line) > 1024 * 1024) throw new Error('Request too large');
    message = JSON.parse(line);
    if (message.method === 'notifications/cancelled') {
      pending.get(message.params?.requestId)?.abort();
      return;
    }
    if (pending.size >= 16) throw new Error('Too many requests');
    const controller = new AbortController();
    if (message.id !== undefined) pending.set(message.id, controller);
    const response = await fetch(endpoint, {
      method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
      body: line,
    });
    if (response.status === 202 && message.id === undefined) return;
    if (!response.ok) throw new Error('Infiknit MCP request failed');
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const stream = readline.createInterface({ input: require('node:stream').Readable.fromWeb(response.body) });
      let data = [];
      for await (const row of stream) {
        if (row.startsWith('data:')) data.push(row.slice(5).trimStart());
        else if (!row && data.length) { send(JSON.parse(data.join('\n'))); data = []; }
      }
      if (data.length) send(JSON.parse(data.join('\n')));
    } else send(await response.json());
  } catch {
    if (message?.id !== undefined) send({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: 'Infiknit is unavailable or the request was cancelled. Keep Infiknit open and reconnect the agent in its MCP settings.' } });
  } finally { if (message?.id !== undefined) pending.delete(message.id); }
});
lines.on('close', () => { for (const controller of pending.values()) controller.abort(); });
