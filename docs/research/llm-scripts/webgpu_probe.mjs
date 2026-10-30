// Probe: does Transformers.js 4.3.2 in Node run these models on device "webgpu" (onnxruntime-node WebGPU EP)?
// Usage: node webgpu_probe.mjs <model_id> <dtype> [long]
const PKG = "<scratch>/tjs_pkg/node_modules/@huggingface/transformers/dist/transformers.node.mjs";
const { AutoTokenizer, AutoModelForCausalLM, env } = await import(PKG);
env.cacheDir = "<scratch>/hf_cache";
const [modelId, dtype, long] = process.argv.slice(2);

const tokenizer = await AutoTokenizer.from_pretrained(modelId);
const t0 = performance.now();
const model = await AutoModelForCausalLM.from_pretrained(modelId, { dtype, device: "webgpu" });
console.log(`loaded ${modelId} ${dtype} on webgpu in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
const isLfm3 = model.config.model_type === "lfm3";

// Build a system prompt; "long" pads it with lore to exceed 256 tokens (tests the sliding-window/prefill path).
let sys = `You are Piggy, a chibi pig boy and neurosurgery resident at UF Health Shands Hospital in Gainesville, in a cute visual novel. Reply with one line of spoken dialogue in double quotes, 1-3 short sentences. Stay in character.`;
if (long) {
  sys += "\nSecret: Piggy's favorite snack is a sweet potato from the Reitz Union food court.";
  sys += "\nLore:\n" + Array.from({ length: 30 }, (_, i) => `- Fact ${i + 1}: Piggy once spent an afternoon at the Communicore building studying perfusion maps and drinking oolong tea with a friend from the College of Medicine.`).join("\n");
}
const user = long ? "What's your favorite snack? Answer from the lore." : "hi! what are you up to today?";
const msgs = [{ role: "system", content: sys }, { role: "user", content: user }];
let prompt = tokenizer.apply_chat_template(msgs, { tokenize: false, add_generation_prompt: true, ...(isLfm3 ? { enable_thinking: false } : {}) }) + '"';
const inputs = tokenizer(prompt, { add_special_tokens: false });
const nIn = inputs.input_ids.dims.at(-1);
const bad = isLfm3 ? [tokenizer.encode("<think>", { add_special_tokens: false }), tokenizer.encode("</think>", { add_special_tokens: false })] : null;

for (let run = 0; run < 2; run++) {
  const s0 = performance.now();
  const out = await model.generate({ ...inputs, max_new_tokens: 64, do_sample: false, repetition_penalty: isLfm3 ? 1.1 : 1.05, ...(bad ? { bad_words_ids: bad } : {}) });
  const ms = performance.now() - s0;
  const genIds = out.slice(null, [nIn, null]);
  const nGen = genIds.dims.at(-1);
  const text = tokenizer.decode(genIds[0], { skip_special_tokens: true });
  console.log(`run${run}: prompt_tokens=${nIn} gen_tokens=${nGen} total=${(ms / 1000).toFixed(2)}s (~${(nGen / (ms / 1000)).toFixed(1)} tok/s incl. prefill) -> ${JSON.stringify(text)}`);
}
await model.dispose();
