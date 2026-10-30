#!/usr/bin/env bun
/**
 * Build the Rust chiptune synth (synth/) to WebAssembly and copy it to public/assets/audio/kempa_synth.wasm.
 * Prefers the rustup toolchain (which carries the wasm32 target) over a distro/Homebrew cargo.
 * If no Rust toolchain is available, keeps the committed .wasm and exits successfully.
 */
import { $ } from 'bun';
import { existsSync, statSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const crate = join(root, 'synth');
const out = join(root, 'public/assets/audio/kempa_synth.wasm');
const built = join(crate, 'target/wasm32-unknown-unknown/release/kempa_synth.wasm');

/** On PATH? (Bun Shell has no `command -v`; macOS only gets away with it through /usr/bin/command.) */
function has(cmd: string): boolean {
  return Bun.which(cmd) !== null;
}

const rustup = existsSync(join(homedir(), '.cargo/bin/rustup')) ? join(homedir(), '.cargo/bin/rustup') : has('rustup') ? 'rustup' : null;

if (!rustup && !has('cargo')) {
  if (existsSync(out)) {
    console.warn('⚠ no Rust toolchain found — using committed kempa_synth.wasm');
    process.exit(0);
  }
  console.error('✗ no Rust toolchain and no prebuilt kempa_synth.wasm');
  process.exit(1);
}

// Panic messages embed source paths; keep the builder's home directory and checkout path out of the shipped .wasm.
const env = { ...process.env, RUSTFLAGS: `--remap-path-prefix=${homedir()}=~ --remap-path-prefix=${crate}=synth` };

if (rustup) {
  await $`${rustup} target add wasm32-unknown-unknown`.cwd(crate).quiet().nothrow();
  // A distro/Homebrew rustc earlier in PATH lacks the wasm32 std; point cargo at rustup's compiler explicitly.
  const rustc = (await $`${rustup} which rustc --toolchain stable`.quiet().nothrow()).stdout.toString().trim();
  await $`${rustup} run stable cargo build --release --target wasm32-unknown-unknown`
    .cwd(crate)
    .env({ ...env, ...(rustc ? { RUSTC: rustc } : {}) });
} else {
  await $`cargo build --release --target wasm32-unknown-unknown`.cwd(crate).env(env);
}

await mkdir(join(root, 'public/assets/audio'), { recursive: true });
if (has('wasm-opt')) {
  await $`wasm-opt -O3 --strip-debug --strip-producers ${built} -o ${out}`;
} else {
  await copyFile(built, out);
}
console.log(`✓ synth → ${out.replace(root + '/', '')} (${(statSync(out).size / 1024).toFixed(1)} KiB)`);
