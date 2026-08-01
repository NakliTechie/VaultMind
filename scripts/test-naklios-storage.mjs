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
assert.match(html, /storageWrite\(_editNote\.path, fileContent\)/);
assert.match(html, /storageWrite\('index\.md', buildIndexMd\(\)\)/);
assert.match(html, /apps\/vaultmind\//);

console.log('VaultMind Browser, Folder, Crate, and durable-write contract: PASS');
