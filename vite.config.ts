import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Stamp public/sw.js's cache version with a build id so every deploy rolls the offline shell cache. */
function stampServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'kempanion-stamp-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (!existsSync(file)) return;
      const id = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      writeFileSync(file, readFileSync(file, 'utf8').replace('__KEMPANION_BUILD__', id));
    },
  };
}

/** Packages whose code ships in the browser build (fonts included); their licenses ask for the notice to travel along. */
const BUNDLED = [
  'svelte', 'clsx', 'esm-env', 'devalue',
  '@huggingface/transformers', '@huggingface/transformers-structured-output', '@huggingface/tokenizers', '@huggingface/jinja',
  'onnxruntime-web', 'onnxruntime-common', 'flatbuffers', 'protobufjs', 'long', 'guid-typescript', 'platform',
  '@fontsource/dotgothic16', '@fontsource/pixelify-sans',
];

/** onnxruntime-web's npm package ships no LICENSE file; this is the MIT license of the onnxruntime repository. */
const ONNXRUNTIME_LICENSE = `MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

/** dist/third-party-notices.txt: name, version, license and license text of every bundled package. */
function thirdPartyNotices(): Plugin {
  let outDir = 'dist';
  let root = '.';
  return {
    name: 'kempanion-third-party-notices',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const parts = [
        'Kempanion Online (https://kempanion.online) bundles the open-source software below. Their licenses follow.',
        'Background and CG photo credits: https://github.com/mkieffer1107/kempanion-online/blob/main/art-src/bg/REFERENCES.md',
        '',
      ];
      for (const name of BUNDLED) {
        const dir = resolve(root, 'node_modules', name);
        if (!existsSync(dir)) continue;
        const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
        const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
        const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
        const text = file
          ? readFileSync(resolve(dir, file), 'utf8')
          : name.startsWith('onnxruntime')
            ? ONNXRUNTIME_LICENSE
            : `${pkg.license} license${author ? `, copyright ${author}` : ''}.`;
        parts.push('='.repeat(78), `${pkg.name} ${pkg.version} (${pkg.license})`, '='.repeat(78), text.trim(), '');
      }
      writeFileSync(resolve(outDir, 'third-party-notices.txt'), parts.join('\n'));
    },
  };
}

// Static build for GitHub Pages: relative base, so it works at the custom domain's root and under /<repo>/.
export default defineConfig({
  base: './',
  plugins: [svelte(), stampServiceWorker(), thirdPartyNotices()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 2048,
  },
});
