# Infiknit for agents

Give Claude Code, Codex, Cursor, Grok Build, and other local agents Infiknit: generate images and videos into a project, or build connected canvas workflows while you watch.

Infiknit is a desktop app. This plugin connects to the copy running on **this computer**. Cloud agents cannot reach it.

## Before you install

1. [Download Infiknit](https://infiknit.app/downloads) for macOS or Windows.
2. Open Infiknit and keep it running.
3. Optional: **Settings → MCP Connect** already one-click installs the same connection. Use this plugin when you want Infiknit to show up in an agent marketplace.

The launcher reads Infiknit’s local token from the desktop app. It never asks for provider API keys.

## Install

### Claude Code

```text
/plugin marketplace add Synthenova/infiknit-mcp
/plugin install infiknit@infiknit
```

### Codex

```sh
codex plugin marketplace add Synthenova/infiknit-mcp
codex plugin add infiknit@infiknit
```

### Grok Build

```sh
grok plugin marketplace add Synthenova/infiknit-mcp
grok plugin install infiknit --trust
```

### Cursor, Copilot, Windsurf, Cline

Add this local stdio server (the launcher finds Infiknit on the same machine):

```json
{
  "mcpServers": {
    "Infiknit": {
      "command": "node",
      "args": ["/absolute/path/to/infiknit-mcp/plugins/infiknit/bin/infiknit-mcp.cjs"]
    }
  }
}
```

Or clone this repo and point `args` at `plugins/infiknit/bin/infiknit-mcp.cjs`. Reload the agent after installing.

## What it does

- Generate an image or video into the agent’s project folder using keys already saved in Infiknit.
- Create, connect, and queue canvas nodes for ads, product shots, and multi-shot workflows.
- Inspect results without leaving the agent.

Keep Infiknit open while work runs. Replacing the token in **Settings → MCP Connect** refreshes one-click agent installs; this plugin rereads the new token on the next launch.

## Security

- Talks only to `http://127.0.0.1:31415/mcp` (or `31416` for Infiknit Dev).
- Uses the local bearer token stored by Infiknit. The token never leaves this computer.
- Does not read provider keys, `.env` files, or SSH credentials.
- Cloud ChatGPT, Claude.ai custom connectors, and Cursor Cloud Agents cannot use this loopback server.

Privacy: https://infiknit.app/privacy  
Terms: https://infiknit.app/terms

## Manual env override

If you copied MCP config from Infiknit, you can skip discovery:

```sh
export INFIKNIT_MCP_URL=http://127.0.0.1:31415/mcp
export INFIKNIT_MCP_TOKEN=your-local-token
```

Set both or neither.
