# Tested creative MCP workflow: three-shot UGC product ad

Resource version: `2026-09-15`  
Blueprint: [`creative-workflow-blueprint.json`](creative-workflow-blueprint.json)

This resource gives editors and agent users a reproducible Infiknit MCP workflow to inspect: a short product-ad canvas with a shared brief, three image stills, three video clips, explicit connections, expected outputs, and local connection limits.

## Sample inputs

- Product: `32 oz stainless insulated tumbler`
- Audience: `commuters who want coffee to stay hot through the morning`
- Format: `vertical 9:16 social ad`
- Visual constraint: `matte sage green product finish`
- Working directory example: `/Users/alex/projects/tumbler-campaign`
- Optional reference: one product photo or existing Infiknit Product reference asset

Do not add unsupported performance claims, fake testimonials, or readable brand copy unless the user supplies them.

## Reproducible MCP steps

1. Open Infiknit on the same computer as the agent, then connect the agent from **Settings -> MCP Connect** or this marketplace plugin.
2. Call `getAppPresence`, then `getCanvas` and keep the returned `workflowId`.
3. Call `createProject` with the current `workflowId`, `clientId: "editorial-demo-2026-09-15"`, and `title: "UGC product ad - insulated tumbler"`.
4. Call `getCapabilities` for exact image and video model IDs and controls. Do not infer model settings from this example.
5. Create the Text, Image, and Video nodes from the JSON blueprint and the six listed edges in ONE `applyCanvasTransaction` (a `createNodes` operation followed by a `connectNodes` operation that references the new `clientRef`s), using real model IDs and the `controls` from step 4. Put duration, aspect ratio and resolution in structured settings; prompt text never sets them.
6. Call `verifyNodes` on the three video nodes and check `summary.dispatchBlocked` is 0 before spending anything.
7. Queue only the image nodes first with `queueNodes`. Use `waitForQueueRun` or `getQueueRun` until the queue is terminal.
8. Inspect stills with `readImageNodes`. Fix product shape, finish, composition, or unwanted text before spending on video.
9. Queue the three video nodes only after the stills are usable. Keep the returned `queueRunId` and observe it until terminal.
10. Use `getNodeDetails` and media inspection to report which clips are ready and which need revision.

## Expected outputs

- One saved Infiknit canvas project containing a shared brief, three still branches, and three video branches.
- Three reviewed image stills before video generation.
- Up to three short vertical clips for later assembly in an editing tool.

The MCP surface does not provide a general timeline editor, caption compositor, or clip-concatenation tool, so do not call the result a finished edited ad.

## Local connection limits

- Infiknit must stay open on the same computer as the agent.
- The plugin uses Infiknit's local loopback MCP server and bearer token. Cloud-hosted agents cannot reach that server directly.
- Provider keys and OAuth sessions remain inside Infiknit.
- A successful connection does not guarantee provider permissions, quota, model availability, or generation success.

## Verification

This resource is covered by `tests/resource.test.cjs`, which checks that the README links the resource and that the JSON blueprint keeps sample inputs, versioning, workflow nodes, expected outputs, and local connection limits present.
