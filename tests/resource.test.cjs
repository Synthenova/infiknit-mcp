#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const readme = read('README.md');
assert.match(readme, /examples\/three-shot-ugc-product-ad\.md/);

const doc = read('examples/three-shot-ugc-product-ad.md');
for (const heading of ['Sample inputs', 'Reproducible MCP steps', 'Expected outputs', 'Local connection limits']) {
  assert.match(doc, new RegExp(`## ${heading}`));
}
assert.match(doc, /creative-workflow-blueprint\.json/);
assert.match(doc, /cloud-hosted agents cannot reach/i);

const blueprint = JSON.parse(read('examples/creative-workflow-blueprint.json'));
assert.equal(blueprint.resourceVersion, '2026-09-15');
assert.ok(blueprint.sampleInputs?.product);
assert.ok(blueprint.sampleInputs?.workingDirectory);
assert.ok(Array.isArray(blueprint.workflow?.nodes));
assert.ok(blueprint.workflow.nodes.length >= 6);
assert.ok(blueprint.workflow.nodes.some((node) => node.type === 'Text'));
assert.ok(blueprint.workflow.nodes.some((node) => node.type === 'Image'));
assert.ok(blueprint.workflow.nodes.some((node) => node.type === 'Video'));
assert.ok(Array.isArray(blueprint.workflow?.connections));
assert.ok(blueprint.workflow.connections.length >= 3);
assert.ok(Array.isArray(blueprint.expectedOutputs));
assert.ok(blueprint.expectedOutputs.length >= 3);
assert.ok(Array.isArray(blueprint.localConnectionLimits));
assert.ok(blueprint.localConnectionLimits.some((limit) => /same computer/i.test(limit)));

console.log('resource tests passed');
