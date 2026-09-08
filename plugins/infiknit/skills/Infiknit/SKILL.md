---
name: Infiknit
description: Create AI images, videos, ads and connected canvas workflows in Infiknit, or generate media into a coding project. Covers node connections, reusable references, efficient generation, iteration and output review through MCP.
---

# Infiknit

Connect using Settings → MCP Connect in the desktop app. The server starts with Infiknit. Turn on your agent to install its connection, or use Copy MCP config for manual setup, then reload the client. Install agent skill adds this guide as `Infiknit`. The transport is Streamable HTTP with a Bearer token on the same computer as Infiknit; cloud agents cannot reach this loopback URL directly. Keep Infiknit open. Keep the token private; replacing it refreshes selected agents but requires updating manual connections.

## Quick generation into the agent's project

Use quick generation when the user wants media files in their coding workspace. It uses API keys saved and validated in Infiknit, or the selected SuperGrok OAuth connection for xAI. Credentials remain inside the app and are never returned to the agent. These calls do not require canvas nodes. Use the canvas tools instead when the user asks to build a connected workflow in Infiknit.

1. Call `listGenerationModels`, optionally filtering `type` to `image` or `video`. Choose exact IDs and supported settings from the returned connected providers. Check each provider's `credentialSource`: `desktop-local-api-key` or `supergrok-oauth`. Connection does not guarantee model permissions, remaining usage or current availability. Follow the specific unavailable-provider detail: validate a saved API key, or reconnect/select SuperGrok as appropriate. Do not ask an OAuth user to paste an API key merely because no API key is saved. `getCapabilities` lists canvas models, including managed models that quick generation does not use.
2. Call `generateMedia` with `type`, `modelId`, `prompt`, a unique `requestId`, and the absolute path to the coding agent's existing `workingDirectory` on this computer. Set `outputName` only to a filename stem. Use that same directory for any reference files; relative reference paths resolve inside it. Do not send API keys or use a cloud agent's remote path as a local directory.
3. Keep the returned `jobId` and poll `getGeneration` until the job succeeds or fails. Running is not completion. Succeeded jobs return `files`; inspect those saved outputs before reporting success. Existing project files are not overwritten. A `save_failed` job has generated media that could not be saved; correct the reported filesystem problem and poll the same `jobId` to retry saving without another generation. If the submission response is uncertain, reuse the same `requestId` with identical inputs to recover the job instead of creating another paid request.

Generate only media authorized by the user's request. Choose a new `requestId` when the user requests another generation or changes the input. On a provider error, use the returned error to correct the request or ask for the missing provider setup; do not silently switch keys or retry paid requests with new IDs.

xAI follows the API Key or SuperGrok route selected in Settings when a job is accepted. Recovery retains that credential type even if the selection changes later; reconnect the original route if it becomes unavailable. Quick generation never falls back to Infiknit managed credits or unrelated environment keys.

## Canvas: start with live state

Saved canvas projects use `listProjects`, `createProject`, and `openProject`. `listProjects` lists projects accessible to the signed-in account without saving or switching the canvas; use `limit` (1–100), `offset`, and the returned pagination to browse. Each summary includes `projectId`, title, node count, timestamps, and whether it is active. These are the app's saved projects, not coding workspace directories or video continuity capsules.

To create or switch projects, first call `getCanvas` and pass its current `workflowId` as the source guard. Use `createProject({ title, workflowId })` with a nonempty title up to 200 characters to save and open a blank project, or `openProject({ projectId, workflowId })` with a saved ID from `listProjects`. Both save the current canvas first and stop if saving fails, work is active, or the account/canvas changes. Follow the returned target `workflowId` for subsequent tools and read `getCanvas` after switching; old `clientRef` aliases are reset. Neither operation generates media. If a response is uncertain, inspect `listProjects` and `getCanvas` before retrying creation to avoid duplicates.

Call `getCanvas` before editing. It returns a compact, paginated overview: the current `workflowId`, node IDs, titles, types, positions, selection, connections and statuses. Use `getNodeDetails` for prompts, settings and output URLs of specific nodes, up to 20 per call. Reuse the `workflowId` on subsequent calls so an unexpected canvas switch cannot redirect an edit. If a call reports a workflow mismatch, read the canvas again and establish whether the newly open canvas is the intended target before continuing.

Choose one unique `clientId` per external conversation and reuse it across calls. This isolates `clientRef` aliases from other agents. Use existing node IDs from live state; use unique `clientRef` names for new nodes and the IDs/aliases returned by successful edits for follow-up operations.

Use `getCapabilities` to discover available models, filtering by `type` or `providerId`. Request `modelIds` for exact controls on selected models; the default view is a compact summary. Reference assets are included in capabilities. Follow pagination when needed. Do not infer availability from a model's name or remembered provider documentation. `loadSkill` exposes trusted model, craft, and Infiknit platform guidance; use `skill-index` to discover guidance, then load the relevant skill.

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

For Video nodes, two image inputs normally act as first/last frames; three or more select reference behavior. Set `videoMode: reference` explicitly when one or two inputs should be references rather than frames, and verify model support. A reference asset's type alone does not give it a special video input slot. Avoid mixing extra identity references into a first/last-frame pair. For AI editing of a video frame, use Video → extracted Image → generated Image.

Stay within the selected model's input limits. Image generation uses at most eight image inputs and may use fewer when the model limit is lower; additional inputs can be omitted. Video reference limits vary by input type and total count. The canvas allows at most three video-source parents per Video. Current `createNodes` supports Text, Image, Video, Video Trim and the four reference types; Audio and Audio Trim must already exist on the canvas.

## Preferred workflow patterns

These are practical defaults, not mandatory templates. Use the smallest graph that gives the requested control.

| Goal | Preferred combination | Why / when to choose it |
| --- | --- | --- |
| One image or video for a website, app or document | Quick `generateMedia` → `getGeneration` | Saves files directly into the coding workspace without creating a canvas solely for export. |
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
- Batch related nodes in one `createNodes`, related edges in one `connectNodes`, and independent ready targets in one `queueNodes`. Use stable `clientRef` names, short shot titles and free canvas space, with inputs to the left and outputs to the right. Follow returned positions/IDs when the app adjusts placement.
- Overlapping canvas calls wait in arrival order; they do not run in parallel. Keep dependent edits sequential and prefer batched calls. Waiting counts toward the request deadline. Cancelled or stale calls are not replayed later. Quick generation and queue observation remain independent.
- Spend on the next decision: use one take initially when it can establish feasibility; use supported image variations when the user wants alternatives. Do not multiply all combinations of models, prompts and references without a reason. Choose resolution and duration for the deliverable rather than always maximizing them; no fixed price or speed ranking is assumed.
- Insert a review checkpoint before costly downstream work when an upstream result could change the plan. Use a full dependency queue when the inputs are trusted enough to proceed without that checkpoint. `dependency_graph` reuses completed, unrequested ancestors; explicitly targeting a completed node can generate it again. Text and reference assets are inputs, not queued generation targets. Prefer `halt_dependents` when failed inputs would invalidate later shots; `continue_independent` is useful for unrelated branches.
- Use bounded `waitForQueueRun` calls, not repeated full canvas snapshots. Carry `afterRevision`; a timeout means continue observing the same receipt. Keep wait commentary short. No external agent receives a special automatic wakeup.
- Inspect native image previews first. Use `read_image`, `analyze_video` or model-assisted take review when additional evidence is needed; these use managed services and normal usage. Check identity, product shape, composition, motion continuity, text and audio relevant to the brief.
- Preserve good results. `updateNodes` normally edits Images in place; use `resultHandling: duplicate` for a separate image take. A prompt change to an already-generated Video normally duplicates it. Follow the returned target IDs and update only downstream work affected by the change.

## Build and execute

- `createNodes` creates nodes without generating. Set concise titles and explicit positions in free canvas space. Put model, duration, aspect ratio, resolution, audio, and video mode in structured settings, using only fields valid for the node type.
- Create Style, Character, Product, or Background reference nodes only with an existing `referenceAssetId` from capabilities. A text description of a character normally belongs in an Image prompt.
- `updateNodes` expects the target's current `nodeType`. Leave `resultHandling` as `auto` unless the user requested a specific behavior: editing a generated video's prompt normally duplicates it and preserves the previous take. Follow the returned target mapping when connecting or queuing the revised node.
- `connectNodes` adds parent inputs; use supported source/target types and target model controls as described above. Use `disconnectNodes` to remove specified connections. Self-links, cycles and unsupported input combinations are rejected.
- `queueNodes` starts the app's generation pipeline using the user's configured providers and normal usage limits. Use `targets_only` for independent ready nodes or `dependency_graph` when incomplete ancestors must run first. Queue only the generation work authorized by the user's request; a request to prepare a workflow does not authorize running it.
- Keep the `queueRunId` returned by `queueNodes`. Acceptance is not completion. Call `waitForQueueRun` with the same `workflowId` and `clientId` for a bounded wait (up to 25 seconds), carrying the last `revision` as `afterRevision` on subsequent calls. `getQueueRun` gives an immediate snapshot. Check `terminal`, counts and errors across the whole queue, even when jobs are paginated. A held queue requires user action; do not requeue it. These observations remain available after the canvas changes. Release held nodes from one existing run per call; do not mix them with new queued nodes. After an uncertain submission outcome, inspect live state before retrying to avoid duplicate work and charges.

All external agents, including Pi, use these same explicit observation calls. The Pi extension supplies MCP tools and compact rendering only; it does not poll in the background, persist watches, or inject completion turns. Keep Infiknit open and inspect the returned status before continuing. A cancelled observation does not cancel provider work.

Canvas mutations run immediately. Infie's Request/YOLO mode and confirmation cards do not apply to MCP. Follow the external agent's normal approval process and the user's existing authorization; do not assume an Infie prompt will approve your actions. `deleteNodes` removes the specified nodes immediately.

## Inspect and continue

Use `readImageNodes` for bounded image outputs delivered as native MCP image blocks that your agent can inspect directly. Use `read_image` for managed image perception and `analyze_video` for temporal evidence; these perception calls use the app's managed services and normal usage enforcement. Inspect actual outputs before claiming that a generation matches the requested content.

For video sequences, persist continuity decisions with `updateVideoProjectState`, record actual take evaluations with `reviewGeneratedTake`, and retrieve that MCP state using `getProjectState`. This is video continuity memory within a canvas, separate from Infie's conversations; it does not list, create, or open saved projects. Use `focusNodes` to select and frame all the nodes you worked on, with padding inside the visible canvas. It fits within the app's 10–100% zoom range; focus smaller groups when a very wide graph cannot fit at 10%.

If the canvas is unavailable, ensure Infiknit is open and unlocked with a canvas loaded. If a provider or generation fails, inspect the returned error and live status before changing settings. Provider setup is Settings → API Providers. Never request or store provider secrets in this skill or in the MCP connection configuration.
