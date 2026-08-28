'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PRACTICE = path.join(ROOT, 'rhcsa-practice');
const Core = require(path.join(PRACTICE, 'practice-core.js'));
const manifest = JSON.parse(fs.readFileSync(path.join(PRACTICE, 'manifest.json'), 'utf8'));

function loadConfig(task) {
  const folder = `${String(task.number).padStart(2, '0')}-${task.slug}`;
  const source = fs.readFileSync(path.join(PRACTICE, folder, 'config.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: `${folder}/config.js` });
  return sandbox.window.RCW_RHCSA_PRACTICE;
}

assert.strictEqual(manifest.tasks.length, 62, 'expected 62 task configurations');

for (const task of manifest.tasks) {
  const config = loadConfig(task);
  let session = Core.createSession(config);
  assert.strictEqual(Core.score(session), 0, `${config.id}: initial score`);
  assert.strictEqual(Core.isComplete(session), false, `${config.id}: initial completion`);

  const finalCommand = config.workflow[config.workflow.length - 1].command;
  const earlyValidation = Core.execute(session, finalCommand);
  assert.strictEqual(earlyValidation.kind, 'blocked', `${config.id}: final validation must require implemented state`);
  assert.strictEqual(Core.score(session), 0, `${config.id}: blocked command must not award points`);

  session = Core.createSession(config);
  for (const item of config.workflow) {
    if (item.edit) {
      const result = Core.saveFile(session, item.edit, item.content);
      assert.strictEqual(result.ok, true, `${config.id}: valid modeled file must save`);
    } else {
      const result = Core.execute(session, item.command);
      assert.notStrictEqual(result.kind, 'unknown', `${config.id}: workflow command is recognised: ${item.command}`);
      assert.notStrictEqual(result.kind, 'blocked', `${config.id}: workflow command state is satisfied: ${item.command}`);
    }
  }
  assert.strictEqual(Core.score(session), 100, `${config.id}: valid workflow score`);
  assert.strictEqual(Core.isComplete(session), true, `${config.id}: valid workflow completion`);
  assert.ok(Core.objectiveState(session).every(item => item.complete), `${config.id}: all objectives complete`);

  if (config.editableFiles.length) {
    const file = config.editableFiles[0];
    const invalid = Core.saveFile(session, file.path, '#!/bin/bash\necho incomplete\n');
    assert.strictEqual(invalid.ok, false, `${config.id}: incomplete modeled file must fail structural validation`);
    assert.ok(Core.score(session) < 100, `${config.id}: invalid file content must revoke score`);
  }

  const reset = Core.execute(session, 'reset');
  assert.strictEqual(reset.kind, 'reset', `${config.id}: reset command`);
  assert.strictEqual(Core.score(session), 0, `${config.id}: reset revokes score`);
  assert.strictEqual(Core.isComplete(session), false, `${config.id}: reset revokes completion`);

  const unknown = Core.execute(session, 'definitely-not-a-real-command');
  assert.strictEqual(unknown.kind, 'unknown', `${config.id}: unknown command handling`);
  assert.strictEqual(Core.score(session), 0, `${config.id}: unknown command must not award points`);
}

console.log('All 62 RHCSA practice workflows reach 100 points; ordering, invalid input, revocation, reset and unknown-command checks passed.');
