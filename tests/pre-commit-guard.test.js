import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanDiffForSecrets } from '../scripts/pre-commit-hook.js';
import { installHooks } from '../scripts/install-git-hooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('EOS Pre-Commit Guard & Secret Scanner Tests', () => {
  const fakeOpenAi = ['sk-', 'abcdefghijklmnopqrstuvwxyz1234567890abcdef'].join('');
  const fakeAws = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');

  test('PRECOMMIT-01: Detects plain OpenAI API keys in added diff lines', () => {
    const fakeDiff = `
diff --git a/config.js b/config.js
--- a/config.js
+++ b/config.js
@@ -1,3 +1,4 @@
 const url = "https://api.openai.com";
+const apiKey = "${fakeOpenAi}";
 export default apiKey;
`;
    const violations = scanDiffForSecrets(fakeDiff);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].pattern, 'OpenAI API Key');
  });

  test('PRECOMMIT-02: Detects plain AWS Access Keys in added diff lines', () => {
    const fakeDiff = `
+export const AWS_KEY = "${fakeAws}";
`;
    const violations = scanDiffForSecrets(fakeDiff);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].pattern, 'AWS Access Key');
  });

  test('PRECOMMIT-03: Ignores secrets present only in deleted diff lines', () => {
    const fakeDiff = `
-const oldKey = "${fakeOpenAi}";
+const cleanKey = process.env.OPENAI_API_KEY;
`;
    const violations = scanDiffForSecrets(fakeDiff);
    assert.equal(violations.length, 0);
  });

  test('PRECOMMIT-04: Passes clean diff without violations', () => {
    const fakeDiff = `
+export function calculateSum(a, b) {
+  return a + b;
+}
`;
    const violations = scanDiffForSecrets(fakeDiff);
    assert.equal(violations.length, 0);
  });

  test('PRECOMMIT-05: installHooks properly creates hook file', () => {
    const tempHooksDir = path.join(rootDir, '.eos', 'test_hooks');
    if (fs.existsSync(tempHooksDir)) {
      fs.rmSync(tempHooksDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempHooksDir, { recursive: true });

    const targetHook = path.join(tempHooksDir, 'pre-commit');
    const res = installHooks({ hooksDir: tempHooksDir, preCommitPath: targetHook });

    assert.equal(res.success, true);
    assert.ok(fs.existsSync(targetHook));
    const content = fs.readFileSync(targetHook, 'utf8');
    assert.ok(content.includes('node scripts/pre-commit-hook.js'));

    fs.rmSync(tempHooksDir, { recursive: true, force: true });
  });
});
