# Infiknit guide

This is the full guide. The short operating card is `infiknit://skill` (the installed `Infiknit` skill). Read this guide for connection semantics, workflow patterns, errors and quick generation.

Connect using Settings → MCP Connect in the desktop app. The server starts with Infiknit and keeps running when the window is closed: macOS leaves Infiknit in the menu bar, and Windows leaves it in the system tray. Closing the window or pressing Command+Q (Ctrl+Q on Windows) does the same thing. Right-click that icon to open the window or choose Quit Infiknit. Quitting from that icon stops MCP. Turn on your agent to install its connection, or use Copy MCP config for manual setup, then reload the client. Install agent skill adds the operating card as `Infiknit` and this guide as `GUIDE.md` in the same folder; the card is also `infiknit://skill`, and this guide is `infiknit://guide`. The transport is Streamable HTTP with a Bearer token on the same computer as Infiknit; cloud agents cannot reach this loopback URL directly. Keep the token private; replacing it refreshes selected agents but requires updating manual connections.

## Where the work goes

Do Infiknit work on the canvas. Call `getAppPresence` before the first Infiknit action in a task. It returns `mode`, `canvasReady`, `restoring`, and `platform`.

| `mode` | Meaning | What to do |
| --- | --- | --- |
| `open` | The window is visible. | Use the current canvas. Do not ask where the work should go. |
| `headless` | The window is hidden. On `darwin` the app is in the menu bar. On `win32` it is in the system tray. The canvas stays loaded. | If the user already said the result belongs on the canvas, or already said it belongs only in the coding project, follow that and do not ask. If the request does not say, ask once: put this on the Infiknit canvas, or only in the codebase? When the answer is Infiknit, or when they do not choose, put the work on the canvas. It is there when they open the window. |
| `closed` | No window is loaded. | The canvas is not available. Do not switch to quick generation unless they already said they do not want the canvas. Ask them to open Infiknit. |

`canvasReady: false` means the canvas cannot be edited yet. If `restoring` is true, Infiknit is still loading the last project at startup or after a sign-in: wait a few seconds and call `getAppPresence` again. Otherwise tell the user it is not ready. Do not treat that as permission to write files into the codebase.

`importCanvasFile` places an existing PNG, JPEG, WebP, or GIF on the canvas. Pass absolute `filePath`, the current `workflowId`, and your `clientId`. Optional `clientRef`, `title`, and `x`/`y` (pass both coordinates, or neither to let the app place the image in free space). It does not generate a new image. Use the returned node id or `clientRef` for later connections.

`listGenerationModels`, `generateMedia`, and `getGeneration` write media into a coding project and create no canvas nodes. Use them only when the user specifically says they do not want the canvas, such as "don't use the canvas", "just the file in this repo", or "API only". Generating, editing, uploading, or arranging media is a canvas action in every other case.

## Quick generation into the agent's project

Use quick generation only when the user has specifically said the work should stay out of the canvas. It uses API keys saved and validated in Infiknit, or the selected SuperGrok OAuth connection for xAI. Credentials remain inside the app and are never returned to the agent. These calls do not create canvas nodes.

1. Call `listGenerationModels`, optionally filtering `type` to `image` or `video`. Choose exact IDs and supported settings from the returned connected providers. Check each provider's `credentialSource`: `desktop-local-api-key` or `supergrok-oauth`. Connection does not guarantee model permissions, remaining usage or current availability. Follow the specific unavailable-provider detail: validate a saved API key, or reconnect/select SuperGrok as appropriate. Do not ask an OAuth user to paste an API key merely because no API key is saved. `getCapabilities` lists canvas models, including managed models that quick generation does not use.
2. Call `generateMedia` with `type`, `modelId`, `prompt`, a unique `requestId`, and the absolute path to the coding agent's existing `workingDirectory` on this computer. Set `outputName` only to a filename stem. Use that same directory for any reference files; relative reference paths resolve inside it. Do not send API keys or use a cloud agent's remote path as a local directory.
3. Keep the returned `jobId` and poll `getGeneration` until the job succeeds or fails. Running is not completion. Succeeded jobs return `files`; inspect those saved outputs before reporting success. Existing project files are not overwritten. A `save_failed` job has generated media that could not be saved; correct the reported filesystem problem and poll the same `jobId` to retry saving without another generation. If the submission response is uncertain, reuse the same `requestId` with identical inputs to recover the job instead of creating another paid request.

Generate only media authorized by the user's request. Choose a new `requestId` when the user requests another generation or changes the input. On a provider error, use the returned error to correct the request or ask for the missing provider setup; do not silently switch keys or retry paid requests with new IDs.

xAI follows the API Key or SuperGrok route selected in Settings when a job is accepted. Recovery retains that credential type even if the selection changes later; reconnect the original route if it becomes unavailable. Quick generation never falls back to Infiknit managed credits or unrelated environment keys.

## Canvas: start with live state

Saved canvas projects use `listProjects`, `createProject`, and `openProject`. `listProjects` lists projects accessible to the signed-in account without saving or switching the canvas; use `limit` (1–100), `offset`, and the returned pagination to browse. Each summary includes `projectId`, title, node count, timestamps, and whether it is active. These are the app's saved projects, not coding workspace directories or video continuity capsules.

To create or switch projects, first call `getCanvas` and pass its current `workflowId` as the source guard. Use `createProject({ title, workflowId })` with a nonempty title up to 200 characters to save and open a blank project, or `openProject({ projectId, workflowId })` with a saved ID from `listProjects`. Both save the current canvas first and stop if saving fails, work is active, or the account/canvas changes. Follow the returned target `workflowId` for subsequent tools and read `getCanvas` after switching; old `clientRef` aliases are reset. Neither operation generates media. If a response is uncertain, inspect `listProjects` and `getCanvas` before retrying creation to avoid duplicates.

Call `getCanvas` before editing. It returns a compact, paginated overview in a deterministic order (y, then x, then id): the current `workflowId`, a `revision`, node IDs, titles, types, positions, selection, connections and statuses. Pass `since: <revision>` to receive only changed nodes plus `removedNodeIds`; the response is `unchanged: true` when nothing changed, or `sinceUnknown: true` after an app restart (then read the full canvas). Use `getNodeDetails` for settings and output URLs of specific nodes, up to 20 per call. It always returns `promptLength` and `promptHash`; the prompt text is omitted unless you pass `includePrompt: true`. Pass `fields: [...]` to select only the fields you need. A long string ends with `…[truncated: N more chars]` and its field is listed in `truncated`; the stored value is never cut.

### The workflow guard and resync

Reuse the `workflowId` on every call so an unexpected canvas switch cannot redirect an edit. Read tools (`getCanvas`, `getCapabilities`, `getNodeDetails`, `listProjects`, `read_image`, `analyze_video`, `transcribe_audio`) accept a stale `workflowId`: they return the data plus `activeWorkflowId` and `workflowMismatch`. Mutations with a stale `workflowId` are rejected with `WORKFLOW_MISMATCH`. The resync is `getCanvas` with no `workflowId`; confirm the newly open canvas is the intended target before continuing. `loadSkill` and `getProjectState` need no canvas.

### Error codes

Failures are structured as `{ ok: false, code, error, details? }`. Branch on `code`, not on the message text.

| Code | Meaning | Next action |
| --- | --- | --- |
| `WORKFLOW_MISMATCH` | A mutation named a `workflowId` that is not the open canvas. `details` has `activeWorkflowId`, `requestedWorkflowId` and `next`. | Call `getCanvas` with no `workflowId`, confirm the target, then retry with `activeWorkflowId`. |
| `ACCOUNT_CHANGED` | The signed-in account changed after the request was made. | Re-read `getCanvas`; client aliases were reset. Do not replay the old edit blindly. |
| `NOT_AUTHENTICATED` | Nobody is signed in to Infiknit. | Ask the user to sign in, then call `getCanvas`. |
| `REQUEST_EXPIRED` | The request waited past its deadline and was not applied. | Inspect live state with `getCanvas`, then retry if the change is absent. |
| `CANVAS_BUSY` | An active generation or project switch blocks the edit. | Wait with `waitForQueueRun` or retry later; edit an unrelated branch if possible. |
| `CANVAS_NOT_READY` | The window has no loaded canvas yet, or the startup restore is still running (`restoring`). | Call `getAppPresence`, wait for `canvasReady`, retry. |
| `UNKNOWN_NODE` | `details.unknownNodeIds` lists IDs that do not exist. | Re-read `getCanvas`; use returned IDs or `clientRef` aliases. |
| `INVALID_INPUT` | The input failed validation. `error` shows the first three issues and `details.issueCount` the total. | Fix the listed fields and retry once. |
| `MODEL_MODE_UNSUPPORTED` | A Video node's model cannot run the mode implied by its inputs (reported per node when queueing). | Pick a model from the `suggestedModelIds` of the earlier warning, or from `verifyNodes`, and `updateNodes`. |
| `BRIDGE_UNREACHABLE` | The Pi wrapper cannot reach the app. | Ask the user to start Infiknit; call `getAppPresence`. |

Unknown model ids are rejected by name with the list of enabled ids. Never retry an unchanged request after `INVALID_INPUT`.

Choose one unique `clientId` per external conversation and reuse it across calls. This isolates `clientRef` aliases from other agents. Use existing node IDs from live state; use unique `clientRef` names for new nodes and the IDs/aliases returned by successful edits for follow-up operations.

Use `getCapabilities` to discover available models, filtering by `type` or `providerId`. Request `modelIds` for exact controls on selected models; the default view is a compact summary. Reference assets are included in capabilities. Follow pagination when needed. Do not infer availability from a model's name or remembered provider documentation. Never invent a model id: an unknown id is rejected by name with the enabled list. Models marked `availability: "legacy"` are still accepted, with a `legacyModel` warning: Infiknit cannot warrant that they work, so prefer ids in `enabledModelIds`. Explicit settings always win, and MCP calls never infer controls (duration, aspect, resolution, mode) from prompt text, so set every control that matters in structured settings. `loadSkill` exposes trusted model, craft, and Infiknit platform guidance; use `skill-index` to discover guidance, then load the relevant skill.

## What nodes and connections do

Infiknit is a visual workflow: each node holds text, media, a reference asset, or a media operation. A connection makes the source a parent of the target. The target reads usable parent inputs when it runs. Connecting does not generate, combine clips into a timeline, or automatically regenerate children after a parent changes. Explicitly queue the intended outputs.

| Connection | Meaning and useful application |
| --- | --- |
| Text → Image or Video | Adds the Text prompt to the target's prompt. Use a shared Text node for a brief or constraints used by several shots; keep each shot's action in its own node. |
| Image → Image | Supplies visual input for editing or a related variation, if the target image model supports it. The child prompt describes the requested change and what to preserve. |
| Image → Video | Supplies an image for animation. Prefer a reviewed still when composition, product appearance or character identity matters. Describe motion in the Video prompt. |
| Style / Character / Product / Background → Image or Video | Supplies an existing asset's available media and prompt guidance. Useful for reusable visual references; the target model's input support and limits still apply. |
| Two Images → Video | Can supply first/last frames when `videoMode: frame-to-frame` and the model supports that mode. It is not automatically a two-image montage. |
| Video → Video | Can supply source footage for supported extension, editing, motion-reference or reference workflows. Choose the model and mode for the intended operation; a connection alone does not select it reliably. |
| Video → Image | A fresh Image child can extract a selected frame. Use `selectedVideoFrameSourceNodeId` and `selectedVideoFrameTime` in seconds for an intentional frame; a new connection defaults to time zero. Queuing this child extracts a frame, without an AI image call. |
| Existing Audio + Image/Video → Video | Can supply an audio reference with companion visual input on a compatible reference-video model. Audio alone is insufficient. `generateAudio` is a separate output-audio control. |
| Video → Video Trim | Produces a trim of an existing clip with `trimStart` and `trimEnd`; prefer this to regenerating content just to shorten it. |

Text-parent prompts, reference-parent prompts, prompt chips and the target prompt are combined; ordinary Image/Video parent prompts are not inherited. Do not paste the same long brief into every node or give the shared brief instructions that conflict with individual shots. A prompt-only Character request should start as an Image node; reference nodes require a real `referenceAssetId` from `getCapabilities`.

An Image parent normally contributes its active output, not every carousel variation. Check `getNodeDetails` and inspect the intended output before connecting it; a failed selected variation can resolve to another successful output. Video inputs may use actual footage or an extracted frame depending on mode. Do not assume every edge sends the whole video or all outputs.

`inputRole` accepts `prompt`, `image`, `video`, `style`, `character`, `product` and `background`; it is not a start/end-frame selector. Actual behavior depends on source types, connected inputs, model capabilities and node controls. For first/last-frame work, check existing frame ordering rather than inventing `start_frame` or `end_frame` roles. Never assume that connection order overrides a user's frame selection. The current MCP patch schema does not expose `carouselIndex` or `frameInputs`; do not invent those settings. If the wrong take or frame order is selected and it cannot be expressed through supported nodes/connections, ask the user to select it in the canvas.

For Video nodes, a model that cannot run the mode implied by the inputs is never swapped silently. `connectNodes` returns a warning with code `modelModeUnsupported` and `suggestedModelIds`; queueing that node fails with `MODEL_MODE_UNSUPPORTED`. Change the model or inputs deliberately. For Video nodes, two image inputs normally act as first/last frames; three or more select reference behavior. Set `videoMode: reference` explicitly when one or two inputs should be references rather than frames, and verify model support. A reference asset's type alone does not give it a special video input slot. Avoid mixing extra identity references into a first/last-frame pair. For AI editing of a video frame, use Video → extracted Image → generated Image.

Stay within the selected model's input limits. Image generation uses at most eight image inputs and may use fewer when the model limit is lower; additional inputs can be omitted. Video reference limits vary by input type and total count. The canvas allows at most three video-source parents per Video. Current `createNodes` supports Text, Image, Video, Video Trim and the four reference types; Audio and Audio Trim must already exist on the canvas.

## Preferred workflow patterns

These are practical defaults, not mandatory templates. Use the smallest graph that gives the requested control.

| Goal | Preferred combination | Why / when to choose it |
| --- | --- | --- |
| One image or video to see in Infiknit | Image or Video on the current canvas | The canvas is the default place for generated media. |
| One image or video the user explicitly wants only in the coding project | Quick `generateMedia` → `getGeneration` | Use only when they said they do not want the canvas. |
| One independent canvas image | Image with its own prompt | A separate Text node adds little when the brief is not reused. |
| Several images with a consistent brief | Shared Text + available Product/Character/Style references → separate Images | Reuses common inputs while allowing distinct compositions and independent generation. |
| Controlled product or character shot | References → Image → review → Video | Establishes identity, framing and appearance before animating. Use an existing good still instead of generating another. |
| Fast exploratory motion, no exact visual anchor required | Video with a text prompt on a text-to-video model | Avoids an unnecessary still-generation stage; less control over the initial composition. |
| Several video shots or ad variants | Shared brief/references → one Image/Video branch per shot | Makes failures and revisions local to a shot; independent branches can run together within the app's limits. |
| A deliberate transition between two compositions | Reviewed start/end Images → frame-to-frame Video | Use only with supported controls and verified frame order. |
| A revised take | Good output → supported edit child, or duplicate the generated node | Preserve useful work and change the specific failure instead of rebuilding the graph. |

Connect only references relevant to that output. More inputs do not guarantee better consistency and can exceed model limits. Do not chain independent shots together merely to show their narrative order: that would change their generation inputs and dependencies. Store sequence order and accepted takes in `updateVideoProjectState` instead.

### Example: a short UGC-style product ad

1. Extract the actual brief: product, audience, format, required message, visual references, audio needs and requested deliverable. Use the user's existing constraints; ask only for a missing detail that changes the output materially.
2. Make a compact shot plan, such as hook, demonstration and payoff. Use one shared Text brief only if it helps all shots. Reuse available product/person assets; do not fabricate reference asset IDs.
3. For shots requiring consistent appearance, create image branches and generate their stills first. Inspect them together with `readImageNodes` (up to four). Correct identity, product details, composition and unwanted text before animation.
4. Connect the usable still for each shot to its own Video node. Set supported duration, aspect, resolution, mode and audio controls explicitly. Give each clip one clear action and camera movement. Keep exact dialogue or audio instructions within what its model supports.
5. Queue the ready video shots in one call, wait for their receipt to settle, then inspect results. Keep successful takes and revise only the failed shot. Report which clips are ready and which still need work.

This MCP surface produces and inspects clips; it does not expose a general timeline editor, clip-concatenation tool, caption compositor or final-ad assembly tool. Do not call a set of generated clips a finished edited ad. State any remaining assembly work, or use another authorized editing tool if the user requested that deliverable.

## Work faster with fewer calls and retries

- Start with `getCanvas` once. Fetch details only for nodes you need and refresh after a canvas change, uncertain mutation or meaningful state change. Keep IDs returned by successful calls instead of rediscovering the whole canvas after every edit.
- Filter the model inventory first, then request exact controls for shortlisted `modelIds`. Retain the user's chosen model when compatible. Check input types/counts, mode, duration, aspect, resolution and audio before spending on generation; prompts do not override controls.
- Load only the model or craft guidance needed for the task through `loadSkill`. Use `skill-index` for discovery and `infiknit-platform` for app navigation. Do not load every model profile or repeat full catalogs in planning messages.
- Prefer one `applyCanvasTransaction` for a whole graph (see Build and execute). Otherwise batch related nodes in one `createNodes`, related edges in one `connectNodes`, and independent ready targets in one `queueNodes`. Use stable `clientRef` names and short shot titles. Omit `position` and let placement choose free space, or use `layoutNodes` afterward. Follow returned positions/IDs when the app adjusts placement.
- Overlapping canvas calls wait in arrival order; they do not run in parallel. Keep dependent edits sequential and prefer batched calls. Waiting counts toward the request deadline. Cancelled or stale calls are not replayed later. Quick generation and queue observation remain independent.
- Spend on the next decision: use one take initially when it can establish feasibility; use supported image variations when the user wants alternatives. Do not multiply all combinations of models, prompts and references without a reason. Choose resolution and duration for the deliverable rather than always maximizing them; no fixed price or speed ranking is assumed.
- Insert a review checkpoint before costly downstream work when an upstream result could change the plan. Use a full dependency queue when the inputs are trusted enough to proceed without that checkpoint. `dependency_graph` reuses completed, unrequested ancestors; explicitly targeting a completed node can generate it again. Text and reference assets are inputs, not queued generation targets. Prefer `halt_dependents` when failed inputs would invalidate later shots; `continue_independent` is useful for unrelated branches.
- Use bounded `waitForQueueRun` calls, not repeated full canvas snapshots. Carry `afterRevision`; a timeout means continue observing the same receipt. Keep wait commentary short. No external agent receives a special automatic wakeup.
- Inspect native image previews first. Use `read_image`, `analyze_video` or model-assisted take review when additional evidence is needed; these use managed services and normal usage. Check identity, product shape, composition, motion continuity, text and audio relevant to the brief.
- Preserve good results. `updateNodes` normally edits Images in place; use `resultHandling: duplicate` for a separate image take. A prompt change to an already-generated Video normally duplicates it. Follow the returned target IDs and update only downstream work affected by the change.

## Build and execute

- `importCanvasFile` places a local PNG, JPEG, WebP, or GIF on the canvas as an uploaded image. Pass an absolute `filePath`. It does not call an image model.
- `applyCanvasTransaction({ workflowId, clientId, operations })` runs an ordered, all-or-nothing list of `createNodes`, `updateNodes`, `connectNodes`, `disconnectNodes`, `deleteNodes`, `mediaOperations`, `layoutNodes` and `queueNodes` operations. A `clientRef` created by an earlier operation can be used by later ones. If any operation fails, nothing is applied. Use it for any graph of more than a few nodes: one call replaces many.
- `createNodes` creates nodes without generating. Set concise titles. `position` is optional. `placement` is set per operation: `auto` (default) places the batch in free space beside the existing graph; `explicit` uses your coordinates. When explicit coordinates overlap, nodes are nudged and the result carries a `placementNudged` warning. Put model, duration, aspect ratio, resolution, audio, and video mode in structured settings, using only fields valid for the node type. Each `appliedNodeControls` entry may list `adjusted` fields that the app changed to fit the model; read it.
- `layoutNodes({ operations })` arranges existing nodes without touching content: `{ kind: 'move', target, x, y }`, `{ kind: 'align', targets, mode: 'row' | 'column' | 'grid', gap?, columns?, anchor? }`, or `{ kind: 'arrangeByDepth', targets? }` (inputs left, outputs right).
- `verifyNodes({ nodeIds, expect? })` reports, per node, the effective controls, `mismatches` against `expect`, and `dispatch { ok, mode, reason, suggestedModelIds }` (whether the model can run the node's mode). Run it before an expensive queue when controls matter instead of fetching full details.
- Create Style, Character, Product, or Background reference nodes only with an existing `referenceAssetId` from capabilities. A text description of a character normally belongs in an Image prompt.
- `updateNodes` expects the target's current `nodeType`. Leave `resultHandling` as `auto` unless the user requested a specific behavior: editing a generated video's prompt normally duplicates it and preserves the previous take. Follow the returned target mapping when connecting or queuing the revised node. Changing `imageModel` or `videoModel` refits the controls the patch leaves out (aspect ratio, resolution, duration, audio) to the new model; the receipt lists them in a `controlsRefit` warning and in `appliedNodeControls[].adjusted`. A control named in the patch is explicit and is rejected, not moved, when the new model cannot take it.
- `connectNodes` adds parent inputs; use supported source/target types and target model controls as described above. Use `disconnectNodes` to remove specified connections. Self-links, cycles and unsupported input combinations are rejected.
- `queueNodes` starts the app's generation pipeline using the user's configured providers and normal usage limits. Use `targets_only` for independent ready nodes or `dependency_graph` when incomplete ancestors must run first. Queue only the generation work authorized by the user's request; a request to prepare a workflow does not authorize running it. Generated nodes record provenance in `providerGeneration`: `requestedModelId` and `trigger { source: user|agent|mcp|cli|auto, at, queueRunId, clientId }`; read it with `getNodeDetails` to see what was requested and who triggered it.
- `cancelGeneration` stops one active node generation. Call it only when the user explicitly asks to cancel; do not ask for another confirmation. Set zero-based `variationIndex` to stop one active image variation, or omit it to stop the whole node attempt. Success means the durable cancellation was acknowledged and late output will not be applied; a submitted provider task may still finish.
- Keep the `queueRunId` returned by `queueNodes`. Acceptance is not completion. Call `waitForQueueRun` with the same `workflowId` and `clientId` for a bounded wait (up to 25 seconds), carrying the last `revision` as `afterRevision` on subsequent calls. `getQueueRun` gives an immediate snapshot. Check `terminal`, counts and errors across the whole queue, even when jobs are paginated. A held queue requires user action; do not requeue it. These observations remain available after the canvas changes. Release held nodes from one existing run per call; do not mix them with new queued nodes. After an uncertain submission outcome, inspect live state before retrying to avoid duplicate work and charges.

All external agents, including Pi, use these same explicit observation calls. The Pi extension supplies MCP tools and compact rendering only; it does not poll in the background, persist watches, or inject completion turns. Infiknit can stay in the menu bar or system tray while you inspect the returned status. A cancelled observation does not cancel provider work.

Canvas mutations run immediately. Infie's Request/YOLO mode and confirmation cards do not apply to MCP. Follow the external agent's normal approval process and the user's existing authorization; do not assume an Infie prompt will approve your actions. `deleteNodes` removes the specified nodes immediately.

## Inspect and continue

Use `readImageNodes` for bounded image outputs delivered as native MCP image blocks that your agent can inspect directly. Use `read_image` for managed image perception and `analyze_video` for temporal evidence; these perception calls use the app's managed services and normal usage enforcement. Inspect actual outputs before claiming that a generation matches the requested content.

For video sequences, persist continuity decisions with `updateVideoProjectState`, record actual take evaluations with `reviewGeneratedTake`, and retrieve that MCP state using `getProjectState`. This is video continuity memory within a canvas, separate from Infie's conversations; it does not list, create, or open saved projects. Use `focusNodes` to select and frame all the nodes you worked on, with padding inside the visible canvas. It fits within the app's 10–100% zoom range; focus smaller groups when a very wide graph cannot fit at 10%.

If the canvas is unavailable, call `getAppPresence`. `closed` or `canvasReady: false` means open Infiknit and wait for the canvas. `headless` still has the canvas loaded. If a provider or generation fails, inspect the returned error and live status before changing settings. Provider setup is Settings → API Providers. Never request or store provider secrets in this skill or in the MCP connection configuration.
