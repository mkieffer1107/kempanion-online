// LFM3-1.7B: how to keep replies free of reasoning traces in Transformers.js 4.3.2.
const PKG = "<scratch>/tjs_pkg/node_modules/@huggingface/transformers/dist/transformers.node.mjs";
const { pipeline, env } = await import(PKG);
env.cacheDir = "<scratch>/hf_cache";
const modelId = process.argv[2] ?? "onnx-community/LFM3-1.7B-ONNX";
const dtype = process.argv[3] ?? "q4";

const NEURO = `You are Piggy, a chibi pig boy and neurosurgery resident at UF Health Shands Hospital in Gainesville, in a cute visual novel called Kempanion.
Personality: confident, earnest, a little intense, secretly sweet. You wear pale blue-gray scrubs and thin silver glasses.
Speech quirks:
- You say "based" and "patriot" a lot.
- If the player says only "based", you reply with exactly one word: patriot
- You love the words "ischemia" and "perfusion".
- You love talking about pigs, spinal surgery, draining cerebrospinal fluid, and putting electrodes and microchips in pigs' brains for research.
Rules: Stay in character. Reply in 1-3 short sentences of spoken dialogue only. No lists, no narration, no emojis. Never say you are an AI.`;

const CODER = `You are Piggy, a chibi pig boy who builds things in the UF Physics building in Gainesville, in a cute visual novel called Kempanion.
Personality: curious hands-on builder, thinks out loud, gently bashful when complimented. Black hoodie, thin round glasses, chocolate curls.
Speech style: often starts with "Okay, so I was thinking..." or "Actually..." and says "basically". When asked which tool or model is best, you ask "best for what?" and compare tradeoffs.
Loves: coding agents, open AI models, EEG/ECG data, HiPerGator, 3D printing, One Piece and JoJo.
Rules: Stay in character. Reply in 1-3 short sentences of spoken dialogue only. No lists, no narration, no emojis. Never say you are an AI.`;

const FEWSHOT = {
  [NEURO]: [
    { role: "user", content: "hey, you look busy" },
    { role: "assistant", content: "Busy is based. I just finished a pig spinal case, and the perfusion looked beautiful." },
  ],
  [CODER]: [
    { role: "user", content: "what are you working on?" },
    { role: "assistant", content: "Okay, so I was thinking... what if the 3D printer could stream EEG data live? Basically a brain-powered printer, haha." },
  ],
};

const TESTS = [
  { sys: NEURO, user: "hi! what are you up to today?" },
  { sys: NEURO, user: "based" },
  { sys: NEURO, user: "what's the coolest part of your job?" },
  { sys: CODER, user: "which AI model is the best?" },
  { sys: CODER, user: "you're really smart, you know that?" },
];

const generator = await pipeline("text-generation", modelId, { dtype, device: "cpu" });
const tok = generator.tokenizer;
const THINK_IDS = [tok.encode("<think>", { add_special_tokens: false }), tok.encode("</think>", { add_special_tokens: false })];
console.log("think token ids:", JSON.stringify(THINK_IDS));

const leaks = (s) => /<\/?think>|\bthe user\b|\bAs Piggy\b|I need to|I should/i.test(s);

async function run(label, buildMsgs, opts, encodeKwargs) {
  console.log(`\n### ${label}`);
  let nLeak = 0;
  for (const t of TESTS) {
    const msgs = buildMsgs(t);
    const s0 = performance.now();
    const out = await generator(msgs, { ...opts, tokenizer_encode_kwargs: encodeKwargs });
    const ms = performance.now() - s0;
    const content = out[0].generated_text.at(-1).content;
    const leak = leaks(content);
    if (leak) nLeak++;
    console.log(`[${t.sys === NEURO ? "neuro" : "coder"}] ${t.user} -> ${JSON.stringify(content)} ${leak ? "<<LEAK>>" : ""} (${(ms / 1000).toFixed(1)}s)`);
  }
  console.log(`leaks: ${nLeak}/${TESTS.length}`);
}

const base = { max_new_tokens: 96, do_sample: true, temperature: 0.6, top_k: 50, repetition_penalty: 1.1 };

// A: enable_thinking false, few-shot history
await run("A no-think + few-shot history", (t) => [{ role: "system", content: t.sys }, ...FEWSHOT[t.sys], { role: "user", content: t.user }], base, { enable_thinking: false });
// B: enable_thinking false + ban think tokens + few-shot
await run("B no-think + few-shot + bad_words_ids(<think>,</think>)", (t) => [{ role: "system", content: t.sys }, ...FEWSHOT[t.sys], { role: "user", content: t.user }], { ...base, bad_words_ids: THINK_IDS }, { enable_thinking: false });
// C: thinking on, strip
console.log("\n### C thinking ON (strip <think>..</think>), max_new_tokens 600");
for (const t of TESTS) {
  const msgs = [{ role: "system", content: t.sys }, { role: "user", content: t.user }];
  const s0 = performance.now();
  const out = await generator(msgs, { ...base, max_new_tokens: 600, tokenizer_encode_kwargs: { enable_thinking: true } });
  const ms = performance.now() - s0;
  const raw = out[0].generated_text.at(-1).content;
  const parts = raw.split("</think>");
  const reasoning = parts.length > 1 ? parts[0] : "";
  const answer = parts.at(-1).trim();
  const rTok = tok.encode(reasoning, { add_special_tokens: false }).length;
  console.log(`[${t.sys === NEURO ? "neuro" : "coder"}] ${t.user} -> ${JSON.stringify(answer)} | reasoning_tokens=${rTok} closed=${parts.length > 1} (${(ms / 1000).toFixed(1)}s)`);
}
