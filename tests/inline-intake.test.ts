import { expect, test } from 'bun:test';
import { join } from 'node:path';

// Isolate the rune/runner integration harness from the suite's global module mocks and JSC warm-up.
test('inline name and comfort-food integration', async () => {
  const child = Bun.spawn([process.execPath, 'test', join(import.meta.dir, '../test-fixtures/inline-intake.test.ts')], {
    stdout: 'pipe', stderr: 'pipe',
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ]);
  if (code !== 0) throw new Error(`Inline intake fixture failed (${code}):\n${stdout}${stderr}`);
  expect(code).toBe(0);
}, 15_000);
