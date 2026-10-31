#!/usr/bin/env bun
/**
 * Link-preview media for https://kempanion.online: the og:image card and the looping og:video.
 *
 * Renders scripts/og/scene.html (the title screen's dusk Century Tower, falling petals, the pigs, the logo) in
 * headless Chromium one frame at a time with a manual clock, then writes
 *   public/og/<name>.png   1920x1008 card = frame 0 of the loop, palette PNG (crisp pixels, under 300 KB)
 *   public/og/<name>.mp4   960x504, 6 s seamless loop at 30 fps: H.264 High, yuv420p, BT.709 (sRGB curve), no audio, faststart
 * The scene is drawn at 1920x1008 (4 px per background pixel); the video is the same frames box-filtered to half size.
 *
 *   bun run og                                  # render + encode (needs ffmpeg and Playwright's Chromium)
 *   bun run og -- --name kempanion-sakura-v3    # new file names: bump on every change (previews cache by URL),
 *                                               # then update the og:/twitter: URLs in index.html
 *   bun run og -- --frames 0,45,179 --dump /tmp/og   # only write those frames as PNGs (no encode)
 *   bun run og -- --dump /tmp/og                # full run that also keeps every frame as a PNG
 *
 * Playwright is not a project dependency. Install it without touching package.json:
 *   bun add --no-save playwright@1.49.1 && bunx playwright install chromium
 * or point PLAYWRIGHT at an existing copy (PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs bun run og).
 * FFMPEG / FFPROBE override the binaries (default: from PATH).
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '..');
const ORIGIN = 'http://og.test';
const VIDEO_W = 960;
const VIDEO_H = 504;
const CARD_MAX_BYTES = 300_000;
const VIDEO_MAX_BYTES = 1_000_000;

// ── args ──
const argv = process.argv.slice(2);
function arg(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}
const name = arg('--name') ?? 'kempanion-sakura-v2';
const dumpDir = arg('--dump');
const onlyFrames = arg('--frames')?.split(',').map((s) => Number.parseInt(s, 10));
if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`--name must be lowercase letters, digits and dashes: ${name}`);
if (onlyFrames && (!dumpDir || onlyFrames.some((n) => !Number.isInteger(n) || n < 0))) {
  throw new Error('--frames takes a comma-separated list of frame numbers and needs --dump <dir>');
}
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE ?? 'ffprobe';

// ── Playwright (not a dependency; see the header) ──
interface Route {
  request(): { url(): string };
  fulfill(opts: { path?: string; status?: number; body?: string }): Promise<void>;
}
interface Page {
  route(url: string, handler: (route: Route) => unknown): Promise<void>;
  goto(url: string): Promise<unknown>;
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
  screenshot(opts: object): Promise<Buffer>;
  on(event: 'console' | 'pageerror', fn: (x: { type?: () => string; text?: () => string; message?: string }) => void): void;
}
interface Browser {
  newPage(opts: object): Promise<Page>;
  close(): Promise<void>;
}

async function launchChromium(): Promise<Browser> {
  const spec = process.env.PLAYWRIGHT ?? 'playwright';
  let pw: { chromium: { launch(opts?: object): Promise<Browser> } };
  try {
    pw = await import(spec);
  } catch {
    console.error(
      `Can't load Playwright (${spec}). It isn't a project dependency; install it without touching package.json:\n` +
        '  bun add --no-save playwright@1.49.1 && bunx playwright install chromium\n' +
        'or set PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs',
    );
    process.exit(1);
  }
  return pw.chromium.launch();
}

// ── files for the scene page, served from a fake origin (no port, no server) ──
const MOUNTS: [prefix: string, dir: string][] = [
  ['/fonts/pixelify-sans/', 'node_modules/@fontsource/pixelify-sans/'],
  ['/fonts/dotgothic16/', 'node_modules/@fontsource/dotgothic16/'],
  ['/assets/', 'public/assets/'],
  ['/sprites.json', 'src/generated/sprites.json'],
  ['/', 'scripts/og/'],
];

function serve(route: Route) {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  for (const [prefix, dir] of MOUNTS) {
    if (!path.startsWith(prefix)) continue;
    const file = resolve(root, dir + path.slice(prefix.length));
    if (!file.startsWith(root + sep) || !existsSync(file)) break;
    return route.fulfill({ path: file });
  }
  return route.fulfill({ status: 404, body: 'not found' });
}

async function run(cmd: string[], input?: AsyncIterable<Uint8Array>): Promise<string> {
  const proc = Bun.spawn(cmd, { stdin: input ? 'pipe' : 'ignore', stdout: 'pipe', stderr: 'pipe' });
  const errText = new Response(proc.stderr).text();
  const outText = new Response(proc.stdout).text();
  if (input && proc.stdin) {
    for await (const chunk of input) {
      proc.stdin.write(chunk);
      await proc.stdin.flush();
    }
    await proc.stdin.end();
  }
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${cmd[0]} exited with ${code}:\n${(await errText).slice(-3000)}`);
  return await outText;
}

/** Top-level MP4 boxes in file order (moov must come before mdat so players can start before the download ends). */
function mp4Boxes(buf: Buffer): string[] {
  const boxes: string[] = [];
  for (let off = 0; off + 8 <= buf.length; ) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (size === 1) size = Number(buf.readBigUInt64BE(off + 8));
    else if (size === 0) size = buf.length - off;
    boxes.push(type);
    if (size < 8) break;
    off += size;
  }
  return boxes;
}

function meanAbsDiff(a: Uint8Array, b: Uint8Array): number {
  let sum = 0;
  for (let k = 0; k < a.length; k++) sum += Math.abs(a[k] - b[k]);
  return sum / a.length;
}

/**
 * Decode the video and compare every frame with the next, including last → first. The source loop is exact, but
 * the encoder's single keyframe can still differ from the re-coded last frame; at a high enough quality the jump
 * at the seam is no bigger than an ordinary frame step.
 */
async function seam(path: string): Promise<{ seam: number; median: number; max: number }> {
  const size = VIDEO_W * VIDEO_H * 3;
  const proc = Bun.spawn(
    [ffmpeg, '-v', 'error', '-i', path, '-vf', 'scale=in_color_matrix=bt709:in_range=tv:flags=neighbor,format=rgb24', '-f', 'rawvideo', '-'],
    { stdout: 'pipe', stderr: 'ignore' },
  );
  let cur = new Uint8Array(size);
  let prev: Uint8Array | null = null;
  let first: Uint8Array | null = null;
  let fill = 0;
  const steps: number[] = [];
  for await (const chunk of proc.stdout) {
    for (let off = 0; off < chunk.length; ) {
      const n = Math.min(size - fill, chunk.length - off);
      cur.set(chunk.subarray(off, off + n), fill);
      fill += n;
      off += n;
      if (fill < size) continue;
      if (prev) steps.push(meanAbsDiff(prev, cur));
      if (!first) first = cur.slice();
      prev = cur;
      cur = new Uint8Array(size);
      fill = 0;
    }
  }
  await proc.exited;
  if (!first || !prev) throw new Error('could not decode the video');
  const sorted = [...steps].sort((x, y) => x - y);
  return { seam: meanAbsDiff(prev, first), median: sorted[sorted.length >> 1], max: sorted[sorted.length - 1] };
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

// ── render ──
async function main(browser: Browser): Promise<boolean> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1008 }, deviceScaleFactor: 1 });
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type?.() === 'error') problems.push(`console: ${m.text?.()}`);
  });
  await page.route(`${ORIGIN}/**`, serve);
  await page.goto(`${ORIGIN}/scene.html`);
  const info = await page.evaluate(async () => {
    type Og = { ready: Promise<void>; FRAMES: number; FPS: number; width: number; height: number };
    const og = (window as unknown as { og?: Og }).og;
    if (!og) return null;
    await og.ready;
    return { frames: og.FRAMES, fps: og.FPS, width: og.width, height: og.height };
  }, null);
  if (problems.length || !info) throw new Error(`scene.html failed to load:\n${problems.join('\n')}`);
  if (info.width !== VIDEO_W * 2 || info.height !== VIDEO_H * 2) throw new Error(`unexpected scene size ${info.width}x${info.height}`);

  const frame = async (i: number): Promise<Buffer> => {
    await page.evaluate((n) => (window as unknown as { og: { render(n: number): void } }).og.render(n), i);
    return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: info.width, height: info.height }, animations: 'disabled', caret: 'hide' });
  };
  const dump = (i: number, png: Buffer) => {
    if (dumpDir) writeFileSync(join(dumpDir, `frame-${String(i).padStart(4, '0')}.png`), png);
  };
  if (dumpDir) mkdirSync(dumpDir, { recursive: true });

  if (onlyFrames) {
    for (const i of onlyFrames) dump(i, await frame(i));
    console.log(`✓ wrote ${onlyFrames.length} frame(s) to ${dumpDir}`);
    return true;
  }

  // Frame 0 and the frame one loop later must match exactly, or the loop would visibly jump.
  const first = await frame(0);
  const wrapped = await frame(info.frames);
  const [a, b] = await Promise.all([first, wrapped].map((f) => sharp(f).raw().toBuffer()));
  if (!a.equals(b)) throw new Error(`frame ${info.frames} differs from frame 0: the loop is not seamless`);

  const outDir = join(root, 'public/og');
  mkdirSync(outDir, { recursive: true });

  // Card: frame 0 as a palette PNG. No dithering: it would speckle the 4x4 pixel blocks and roughly double the size.
  const cardPath = join(outDir, `${name}.png`);
  await sharp(first).png({ palette: true, colours: 256, dither: 0, compressionLevel: 9, effort: 10 }).toFile(cardPath);
  const cardBytes = statSync(cardPath).size;
  console.log(`✓ ${cardPath.slice(root.length + 1)}  ${info.width}x${info.height}  ${kb(cardBytes)}`);

  // Video: stream the PNG frames into ffmpeg. Box-filter to half size in RGB, then convert to BT.709 limited-range
  // 4:2:0 in a second, explicit step (a plain format=yuv420p would use the BT.601 matrix) and tag it BT.709, with the
  // sRGB transfer curve: tagged with BT.709's own curve, Apple's decoder (iMessage) shows it visibly brighter and
  // hazier than the card, so the bubble jumps when the still turns into the video.
  // CRF 14 and no VBV cap: a capped or lower-quality keyframe makes the whole picture shimmer once per loop.
  const videoPath = join(outDir, `${name}.mp4`);
  const vf = [
    'format=rgb24',
    `scale=${VIDEO_W}:${VIDEO_H}:flags=area`,
    'scale=flags=area:out_color_matrix=bt709:out_range=tv',
    'format=yuv420p',
    'setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv',
  ].join(',');
  const total = info.frames;
  async function* frames(): AsyncIterable<Uint8Array> {
    for (let i = 0; i < total; i++) {
      const png = i === 0 ? first : await frame(i);
      dump(i, png);
      if (i % 30 === 0) process.stdout.write(`  rendering frame ${i}/${total}\r`);
      yield png;
    }
  }
  await run(
    [
      ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(info.fps), '-i', '-',
      '-vf', vf,
      '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '3.1', '-preset', 'veryslow', '-tune', 'animation',
      '-crf', '14', '-g', String(total), '-keyint_min', String(total), '-sc_threshold', '0',
      '-pix_fmt', 'yuv420p', '-r', String(info.fps), '-an', '-movflags', '+faststart',
      videoPath,
    ],
    frames(),
  );
  const video = readFileSync(videoPath);
  const boxes = mp4Boxes(video);
  const probe = JSON.parse(
    await run([ffprobe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', videoPath]),
  ) as { streams: Record<string, string | number>[]; format: Record<string, string> };
  const v = probe.streams.find((s) => s.codec_type === 'video');
  const audio = probe.streams.some((s) => s.codec_type === 'audio');
  console.log(
    `✓ ${videoPath.slice(root.length + 1)}  ${v?.width}x${v?.height} ${v?.codec_name} ${v?.profile} ${v?.pix_fmt} ` +
      `${v?.color_space}/${v?.color_primaries}/${v?.color_transfer} ${v?.nb_frames} frames ` +
      `${Number(probe.format.duration).toFixed(3)} s  ${kb(video.length)}  boxes: ${boxes.join(' ')}`,
  );
  const s = await seam(videoPath);
  console.log(`  loop seam (mean abs diff, last → first): ${s.seam.toFixed(2)}; frame steps: median ${s.median.toFixed(2)}, max ${s.max.toFixed(2)}`);

  const warnings: string[] = [];
  if (cardBytes > CARD_MAX_BYTES) warnings.push(`card is ${kb(cardBytes)} (budget ${kb(CARD_MAX_BYTES)})`);
  if (video.length > VIDEO_MAX_BYTES) warnings.push(`video is ${kb(video.length)} (budget ${kb(VIDEO_MAX_BYTES)})`);
  if (audio) warnings.push('the video has an audio track');
  if (boxes.indexOf('moov') > boxes.indexOf('mdat')) warnings.push('moov comes after mdat (not faststart)');
  if (v?.pix_fmt !== 'yuv420p' || v?.profile !== 'High') warnings.push(`unexpected ${v?.profile} / ${v?.pix_fmt}`);
  if (s.seam > s.max * 1.25) warnings.push('the loop seam is visibly bigger than a normal frame step');
  for (const w of warnings) console.warn(`⚠ ${w}`);
  console.log(`index.html should point at https://kempanion.online/og/${name}.png and https://kempanion.online/og/${name}.mp4`);
  return warnings.length === 0;
}

const browser = await launchChromium();
let ok = false;
try {
  ok = await main(browser);
} finally {
  await browser.close();
}
if (!ok) process.exitCode = 1;
