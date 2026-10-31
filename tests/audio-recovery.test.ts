import { expect, test } from 'bun:test';
import { join } from 'node:path';

// The audio engine needs browser globals; isolate them from the suite's stage/audio module mocks.
test('audio interruption recovery integration', async () => {
  const child = Bun.spawn([process.execPath, 'test', join(import.meta.dir, '../test-fixtures/audio-recovery.test.ts')], {
    stdout: 'pipe', stderr: 'pipe',
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ]);
  if (code !== 0) throw new Error(`Audio recovery fixture failed (${code}):\n${stdout}${stderr}`);
  expect(code).toBe(0);
}, 30_000);
