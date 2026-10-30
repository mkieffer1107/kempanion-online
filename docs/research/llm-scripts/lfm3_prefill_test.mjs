// LFM3-1.7B: assistant-prefill trick (open quote) + think-token ban, via raw model.generate in Transformers.js 4.3.2.
const PKG = "<scratch>/tjs_pkg/node_modules/@huggingface/transformers/dist/transformers.node.mjs";
const { AutoTokenizer, AutoModelForCausalLM, env } = await import(PKG);
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
Rules: Stay in character. Reply with one line of spoken dialogue in double quotes, 1-3 short sentences. No lists, no narration, no emojis. Never say you are an AI.`;

const CODER = `You are Piggy, a chibi pig boy who builds things in the UF Physics building in Gainesville, in a cute visual novel called Kempanion.
Personality: curious hands-on builder, thinks out loud, gently bashful when complimented. Black hoodie, thin round glasses, chocolate curls.
Speech style: often starts with "Okay, so I was thinking..." or "Actually..." and says "basically". When asked which tool or model is best, you ask "best for what?" and compare tradeoffs.
Loves: coding agents, open AI models, EEG/ECG data, HiPerGator, 3D printing, One Piece and JoJo.
Rules: Stay in character. Reply with one line of spoken dialogue in double quotes, 1-3 short sentences. No lists, no narration, no emojis. Never say you are an AI.`;

const TESTS = [
  { sys: NEURO, user: "hi! what are you up to today?" },
  { sys: NEURO, user: "based" },
  { sys: NEURO, user: "what's the coolest part of your job?" },
  { sys: CODER, user: "which AI model is the best?" },
  { sys: CODER, user: "you're really smart, you know that?" },
  { sys: CODER, user: "do you want to get boba later?" },
];

const tokenizer = await AutoTokenizer.from_pretrained(modelId);
const model = await AutoModelForCausalLM.from_pretrained(modelId, { dtype, device: "cpu" });
const isLfm3 = (model.config.model_type === "lfm3");
const bad = isLfm3 ? [tokenizer.encode("<think>", { add_special_tokens: false }), tokenizer.encode("</think>", { add_special_tokens: false })] : null;
const leaks = (s) => /<\/?think>|\bthe user\b|\bAs Piggy\b|I need to|I should/i.test(s);

for (const temp of [0.1, 0.6]) {
  console.log(`\n### prefill '"' temperature=${temp} model=${modelId}`);
  let nLeak = 0;
  for (const t of TESTS) {
    const msgs = [{ role: "system", content: t.sys }, { role: "user", content: t.user }];
    let prompt = tokenizer.apply_chat_template(msgs, { tokenize: false, add_generation_prompt: true, ...(isLfm3 ? { enable_thinking: false } : {}) });
    prompt += '"';
    const inputs = tokenizer(prompt, { add_special_tokens: false });
    const s0 = performance.now();
    const out = await model.generate({
      ...inputs, max_new_tokens: 80, do_sample: true, temperature: temp, top_k: 50,
      repetition_penalty: isLfm3 ? 1.1 : 1.05, ...(bad ? { bad_words_ids: bad } : {}),
    });
    const ms = performance.now() - s0;
    const gen = tokenizer.decode(out.slice(null, [inputs.input_ids.dims.at(-1), null])[0], { skip_special_tokens: true });
    const line = gen.split('"')[0].trim();
    const leak = leaks(gen);
    if (leak) nLeak++;
    console.log(`[${t.sys === NEURO ? "neuro" : "coder"}] ${t.user} -> "${line}" ${leak ? "<<LEAK>> raw=" + JSON.stringify(gen) : ""} (${(ms / 1000).toFixed(1)}s)`);
  }
  console.log(`leaks: ${nLeak}/${TESTS.length}`);
}
await model.dispose();
