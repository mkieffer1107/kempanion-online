// d1-omni-600M (onnx-community ONNX) as a sprite-expression classifier: JS port of prompt.py encode() + one forward pass.
// The input encoding follows prompt.py from Liquid AI's d1-omni-600M model repository
// (https://huggingface.co/LiquidAI/d1-omni-600M); that code and the model are © Liquid AI under the license on that page.
// Research scratch only: the game does not use this script.
// Usage: node d1omni_emotion.mjs <q8|q4> [device: cpu|webgpu]
import { createRequire } from "node:module";
const BASE = "<scratch>/";
const require = createRequire(BASE + "tjs_pkg/package.json");
const ort = require("onnxruntime-node");
const { AutoTokenizer, env } = await import(BASE + "tjs_pkg/node_modules/@huggingface/transformers/dist/transformers.node.mjs");
const DIR = BASE + "dl_d1omni/";
const fs = await import("node:fs");
const cfg = JSON.parse(fs.readFileSync(DIR + "config.json", "utf8"));
env.allowRemoteModels = false; env.localModelPath = BASE; // load tokenizer from local folder
const tok = await AutoTokenizer.from_pretrained("dl_d1omni");

const [prec = "q8", device = "cpu"] = process.argv.slice(2);
const file = prec === "q4" ? "model_q4.onnx" : "model_quantized.onnx";
const sess = await ort.InferenceSession.create(DIR + "onnx/" + file, { executionProviders: [device] });
console.log("inputs:", JSON.stringify(sess.inputMetadata ?? sess.inputNames), "outputs:", JSON.stringify(sess.outputMetadata ?? sess.outputNames));

const DELIM = { state: "<|reserved_7|>", q: "<|reserved_8|>", opt: "<|reserved_9|>", opt_end: "<|reserved_10|>", decide: "<|reserved_11|>" };
const id = (t) => { const r = tok.encode(t, { add_special_tokens: false }); if (r.length !== 1) throw new Error("not a single token: " + t + " -> " + r); return r[0]; };
const esc = (s) => s.replace(/<\|([A-Za-z0-9_]+)\|>/g, "<¦$1¦>");
const enc = (s) => tok.encode(esc(s), { add_special_tokens: false });

function encode(state, criteria, instructions, maxLen = 16384, perOption = 24) {
  const opts = Object.entries(criteria).map(([k, v]) => (v ? `${k}: ${v}` : k));
  const budget = Math.max(96, Math.min(opts.length * perOption + 32, Math.floor(maxLen / 2)));
  const per = Math.max(2, Math.floor((budget - 3 * opts.length) / opts.length));
  let question = [id(DELIM.q), ...enc(instructions)].slice(0, Math.max(16, budget));
  const markers = [];
  for (const text of opts) {
    markers.push(question.length + 1);
    question = question.concat([id(DELIM.opt), id("<|mask|>"), ...enc(" " + text).slice(0, per), id(DELIM.opt_end)]);
  }
  question.push(id(DELIM.decide));
  const room = Math.max(0, maxLen - question.length - 2);
  const stateIds = [id(DELIM.state), ...enc(state).slice(0, room)];
  const ids = [tok.bos_token_id ?? id("<|startoftext|>"), ...stateIds, ...question];
  return { ids, markers: markers.map((m) => m + 1 + stateIds.length) };
}

const EXPR = {
  neutral: "calm, matter-of-fact", happy: "cheerful, pleased", laughing: "laughing, amused", sad: "sad, disappointed, upset",
  angry: "angry, annoyed, frustrated", surprised: "surprised, astonished", scared: "scared, startled, afraid", confused: "confused, puzzled",
  shy: "shy, bashful, embarrassed", loving: "affectionate, grateful, warm", proud: "proud, confident, smug", sleepy: "sleepy, tired",
  thinking: "thinking, pondering, asking a considered question", excited: "excited, enthusiastic", flustered: "flustered, nervous, apologetic",
};
const n = Object.keys(EXPR).length;
const T = cfg.temperatures[n <= 2 ? "choice:2" : n <= 5 ? "choice:3-5" : n <= 10 ? "choice:6-10" : "choice:11+"];
const LINES = [
  ["patriot.", "proud/neutral"],
  ["Wait, you made this for me? I... I don't know what to say, thank you so much!", "loving/surprised"],
  ["Ugh, the HiPerGator queue killed my job again. Three days of training, gone.", "sad/angry"],
  ["Hmm, best for what, though? Latency, or accuracy on EEG data?", "thinking"],
  ["Haha, okay, that is genuinely the funniest bug I've ever seen.", "laughing"],
  ["Oh no! I'm so sorry, I was testing edge cases and... uh... I'll fix it, I promise!", "flustered"],
  ["AAH! Don't sneak up on me like that, I almost dropped the scalpel!", "scared/surprised"],
  ["Mmm... five more minutes... the perfusion maps can wait...", "sleepy"],
];
for (const [line, expect] of LINES) {
  const { ids, markers } = encode(line, EXPR, "Which facial expression should the speaker's sprite show while saying this line?");
  const L = ids.length;
  const feeds = {};
  const K = markers.length;
  feeds.input_ids = new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, L]);
  feeds.attention_mask = new ort.Tensor("int64", BigInt64Array.from(ids.map(() => 1n)), [1, L]);
  feeds.prefix_len = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
  feeds.marker_pos = new ort.Tensor("int64", BigInt64Array.from(markers.map(BigInt)), [1, K]);
  feeds.marker_mask = new ort.Tensor("int64", BigInt64Array.from(markers.map(() => 1n)), [1, K]);
  feeds.qtype = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]); // 0 = choice (QTYPES in prompt.py)
  const s0 = performance.now();
  const out = await sess.run(feeds);
  const ms = performance.now() - s0;
  const logits = Array.from(out[sess.outputNames[0]].data).map(Number);
  const z = logits.slice(0, n).map((x) => x / T);
  const mx = Math.max(...z);
  const e = z.map((x) => Math.exp(x - mx));
  const s = e.reduce((a, b) => a + b, 0);
  const p = e.map((x) => x / s);
  const names = Object.keys(EXPR);
  const order = p.map((v, i) => [v, names[i]]).sort((a, b) => b[0] - a[0]).slice(0, 3);
  console.log(`${JSON.stringify(line).slice(0, 70).padEnd(72)} expect=${expect.padEnd(16)} -> ${order.map(([v, k]) => `${k}:${v.toFixed(2)}`).join(" ")} (${ms.toFixed(0)} ms, out dims ${out[sess.outputNames[0]].dims})`);
}
