import { expect, test } from 'bun:test';
import { join } from 'node:path';

// Keep the browser asset mocks isolated from the suite's other stage/engine tests.
test('background image loading and rendered pixels', async () => {
  const child = Bun.spawn([process.execPath, 'test', join(import.meta.dir, '../test-fixtures/backgrounds.test.ts')], {
    stdout: 'pipe', stderr: 'pipe',
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ]);
  if (code !== 0) throw new Error(`Background fixture failed (${code}):\n${stdout}${stderr}`);
  expect(code).toBe(0);
}, 30_000);
