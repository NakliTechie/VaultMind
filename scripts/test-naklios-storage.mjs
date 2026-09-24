import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /id="storage-switch"/);
assert.match(html, /Browser \/ ZIP/);
assert.match(html, /label:'Folder'/);
assert.match(html, /label:'Crate'/);
assert.match(html, /window\.naklios\.fs\.useBackend\(backend\)/);
assert.match(html, /window\.naklios\.fs\.list\(prefix\)/);
assert.match(html, /window\.naklios\.fs\.read\(path\)/);
assert.match(html, /window\.naklios\.fs\.write\(path, data\)/);
assert.match(html, /window\.naklios\.fs\.delete\(path\)/);
assert.match(html, /window\.naklios\.beforeClose/);
assert.match(html, /storageWrite\(note\.path, fileContent\)/);
// DUR (2026-09-24): note autosave rides naklios.fs.autosave. The note is captured before the first
// await (switching notes mid-save saves the right one); the "Saved" label has its own timer (it used
// to share the autosave's handle and cancel a save queued during a save); leaving a note with
// autosave on writes it; no app-level beforeunload save.
const appCode = html.replace(/\/\* naklios-sdk:begin[\s\S]*?naklios-sdk:end \*\//, '');
assert.notEqual(appCode, html, 'the vendored SDK block was found and stripped');
assert.match(html, /autosave: function \(opts\)/, 'the vendored SDK carries naklios.fs.autosave');
assert.match(appCode, /async function saveNoteEdit\(\) \{\n  const note = _editNote;/, 'the save captures its note up front');
assert.match(appCode, /if \(!autosaveOn\(\)\) return;\n  noteSaver\(\)\.markDirty\(\);/, 'keystrokes reach the SDK autosave when autosave is on');
assert.match(appCode, /window\.naklios\.fs\.autosave\(\{[\s\S]{0,400}delay: 1500,/, 'the SDK owns the 1.5 s timing');
assert.doesNotMatch(appCode, /_autosaveTimer/, 'no hand-rolled autosave timer is left');
assert.match(appCode, /clearTimeout\(_savedLabelTimer\);/, 'the Saved label has its own timer');
assert.doesNotMatch(appCode, /addEventListener\(\s*['"]beforeunload['"]/, 'no app-level beforeunload save');
assert.match(html, /storageWrite\('index\.md', buildIndexMd\(\)\)/);
assert.match(html, /apps\/vaultmind\//);

console.log('VaultMind Browser, Folder, Crate, and durable-write contract: PASS');
