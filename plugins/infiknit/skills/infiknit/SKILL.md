---
name: infiknit
description: Create AI images, videos, ads and connected canvas workflows in Infiknit, or generate media into a coding project. Covers node connections, reusable references, efficient generation, iteration and output review through MCP.
---

# Infiknit operating card

Do Infiknit work on the canvas, not as files in the codebase.

1. `getAppPresence`: `closed` means ask the user to open Infiknit; `restoring:true` means wait and call again.
2. `getCanvas`: take `workflowId`; choose one `clientId` per conversation.
3. `getCapabilities` with `modelIds` for exact controls. Never invent model ids.
4. `applyCanvasTransaction({ workflowId, clientId, operations })`: ordered, all-or-nothing; later ops may use earlier `clientRef`s. Creating never generates.
5. `verifyNodes({ nodeIds, expect })` when controls matter, then `queueNodes` and `waitForQueueRun` (carry `afterRevision`). Queue only what the user authorized. `verifyNodes` returns `ok:false` with `summary.dispatchBlocked` when a Video node's model cannot run its connected inputs; fix the model before queueing.

Guard: send `workflowId` always. Reads tolerate a stale id and return `activeWorkflowId`; mutations fail with WORKFLOW_MISMATCH. Resync with `getCanvas` and no `workflowId`.

Errors `{ ok:false, code, error, details? }`:

| Code | Next action |
| --- | --- |
| WORKFLOW_MISMATCH | Resync, retry with `activeWorkflowId` |
| ACCOUNT_CHANGED | `getCanvas`; aliases were reset |
| NOT_AUTHENTICATED | Ask the user to sign in |
| REQUEST_EXPIRED | `getCanvas`; retry only if not applied |
| CANVAS_BUSY | `waitForQueueRun`, then retry |
| CANVAS_NOT_READY | `getAppPresence`, wait, retry |
| UNKNOWN_NODE | `getCanvas`; fix `details.unknownNodeIds` |
| INVALID_INPUT | Fix the listed issues; never resend unchanged |
| MODEL_MODE_UNSUPPORTED | Pick from `suggestedModelIds`; no auto swap |
| MODEL_NOT_ENABLED | Pick an exact id from `suggestions` |
| REFERENCE_ASSET_MISSING | Use a `referenceAssetId` from `getCapabilities` |
| CONNECTION_INVALID | Check source/target types and model input limits |
| QUEUE_TARGET_INVALID | Queue only Image/Video/media-op nodes |
| CLIENT_REF_DUPLICATE | Use a fresh `clientRef` |
| VERIFY_FAILED | Read `summary`; fix mismatches or the model, then retry |

Settings: explicit settings win; prompt text never sets controls. Put model, duration, aspect, resolution, audio and `videoMode` in settings. Heed `modelModeUnsupported` warnings and `appliedNodeControls[].adjusted`.

Placement: omit `position` (`placement:'auto'`); use `'explicit'` only when coordinates matter (`placementNudged` warns). Tidy with `layoutNodes`.

Reads: `getNodeDetails` omits prompts unless `includePrompt:true`. `getCanvas` with `since:<revision>` returns changes only.

Quick generation (`generateMedia`, `getGeneration`) writes to the coding project with no nodes: use only when the user said no canvas.

Full guide: read resource `infiknit://guide` or `loadSkill infiknit-platform`.
