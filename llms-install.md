# Install Infiknit MCP

Infiknit is a local desktop canvas. This plugin does not start a remote server.

1. Install Infiknit from https://infiknit.app/downloads and keep it open.
2. From this repository, connect with stdio:

```json
{
  "mcpServers": {
    "Infiknit": {
      "command": "node",
      "args": ["plugins/infiknit/bin/infiknit-mcp.cjs"]
    }
  }
}
```

3. Reload the agent. The launcher reads the local Infiknit token from the desktop app. Do not paste provider API keys.
4. If connection fails, open Infiknit → Settings → MCP Connect and confirm the server is running on this computer.
