// One generation -> sprite expression tag + spoken line, enforced with a regex via @huggingface/transformers-structured-output.
const BASE = "<scratch>/tjs_pkg/node_modules/@huggingface/";
const { AutoTokenizer, AutoModelForCausalLM, env } = await import(BASE + "transformers/dist/transformers.node.mjs");
const { StructuredOutputProcessor } = await import(BASE + "transformers-structured-output/dist/index.js");
env.cacheDir = "<scratch>/hf_cache";
const [modelId, dtype = "q4f16", device = "webgpu"] = process.argv.slice(2);

const EXPR = ["neutral", "happy", "laughing", "sad", "angry", "surprised", "scared", "confused", "shy", "loving", "proud", "sleepy", "thinking", "excited", "flustered"];
const FORMAT = `\nOutput format: [expression] "line"\nexpression is one of: ${EXPR.join(", ")}. It is Piggy's face while saying the line.`;

const NEURO = `You are Piggy, a chibi pig boy and neurosurgery resident at UF Health Shands Hospital in Gainesville, in a cute visual novel called Kempanion.
Personality: confident, earnest, a little intense, secretly sweet. Pale blue-gray scrubs, thin silver glasses.
Speech: sometimes says "based" or "patriot". Loves the words "ischemia" and "perfusion". Loves talking about pigs, spinal surgery, draining cerebrospinal fluid, and electrodes and microchips in pigs' brains.
Rules: Stay in character. One line of spoken dialogue, 1-3 short sentences. No narration, no emojis. Never say you are an AI.` + FORMAT;
const CODER = `You are Piggy, a chibi pig boy who builds things in the UF Physics building in Gainesville, in a cute visual novel called Kempanion.
Personality: curious hands-on builder, thinks out loud, gently bashful when complimented. Black hoodie, thin round glasses, chocolate curls.
Speech: often starts with "Okay, so I was thinking..." or "Actually..." and says "basically". When asked which tool or model is best, asks "best for what?" and compares tradeoffs.
Loves: coding agents, open AI models, EEG/ECG data, HiPerGator, 3D printing, One Piece and JoJo.
Rules: Stay in character. One line of spoken dialogue, 1-3 short sentences. No narration, no emojis. Never say you are an AI.` + FORMAT;

const TESTS = [
  [NEURO, "hi! what are you up to today?"],
  [NEURO, "what's the coolest part of your job?"],
  [NEURO, "I failed my anatomy exam..."],
  [NEURO, "BOO! did I scare you?"],
  [CODER, "which AI model is the best?"],
  [CODER, "you're really smart, you know that?"],
  [CODER, "I baked you a cake shaped like a 3D printer!"],
  [CODER, "your code deleted my whole thesis."],
];

const tok = await AutoTokenizer.from_pretrained(modelId);
const model = await AutoModelForCausalLM.from_pretrained(modelId, { dtype, device });
const isLfm3 = model.config.model_type === "lfm3";
const bad = isLfm3 ? [tok.encode("<think>", { add_special_tokens: false }), tok.encode("</think>", { add_special_tokens: false })] : null;
const regex = `\\[(${EXPR.join("|")})\\] "[^"\\n]{1,240}"`;
console.log(`## ${modelId} ${dtype} ${device}  regex=${regex.slice(0, 60)}...`);
for (const [sys, user] of TESTS) {
  const msgs = [{ role: "system", content: sys }, { role: "user", content: user }];
  const prompt = tok.apply_chat_template(msgs, { tokenize: false, add_generation_prompt: true, ...(isLfm3 ? { enable_thinking: false } : {}) });
  const inputs = tok(prompt, { add_special_tokens: false });
  const processor = new StructuredOutputProcessor(tok, { type: "regex", regex });
  const s0 = performance.now();
  const out = await model.generate({
    ...inputs, max_new_tokens: 120, do_sample: true, temperature: 0.6, top_k: 50,
    repetition_penalty: isLfm3 ? 1.1 : 1.05, logits_processor: [processor], ...(bad ? { bad_words_ids: bad } : {}),
  });
  const ms = performance.now() - s0;
  const text = tok.decode(out.slice(null, [inputs.input_ids.dims.at(-1), null])[0], { skip_special_tokens: true });
  console.log(`[${sys === NEURO ? "neuro" : "coder"}] ${user} -> ${text} (${(ms / 1000).toFixed(2)}s)`);
}
await model.dispose();
