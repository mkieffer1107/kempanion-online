// Validates multi-turn KV-cache reuse + prefix check with transformers.js 4.3.2 on LFM2.5-350M (native CPU in Node).
// Usage: node kv_reuse_test.mjs <transformers.node.mjs> <modelsRoot> <modelDirName> <dtype>
import { pathToFileURL } from 'node:url';
const [, , tjsEntry, modelsRoot, modelName, dtype] = process.argv;
const t = await import(pathToFileURL(tjsEntry).href);
t.env.localModelPath = modelsRoot.endsWith('/') ? modelsRoot : modelsRoot + '/';
t.env.allowRemoteModels = false;
t.env.logLevel = t.LogLevel.ERROR;

const tokenizer = await t.AutoTokenizer.from_pretrained(modelName);
const model = await t.AutoModelForCausalLM.from_pretrained(modelName, { dtype, device: 'cpu' });

const SYSTEM = 'You are Piggy 2, a tiny chibi pig neurosurgeon. If the player says "based", reply only "patriot". Keep replies under 30 words.';
const messages = [{ role: 'system', content: SYSTEM }];
let cache = new t.DynamicCache();
let cachedIds = [];
const startsWith = (ids, p) => p.length < ids.length && p.every((x, i) => x === ids[i]);

for (const user of ['Hi! What do you do all day?', 'based', 'What is perfusion, in one sentence?']) {
  messages.push({ role: 'user', content: user });
  const inputs = tokenizer.apply_chat_template(messages, { add_generation_prompt: true, return_dict: true });
  const ids = inputs.input_ids.tolist()[0];
  const reuse = cachedIds.length > 0 && startsWith(ids, cachedIds);
  if (cachedIds.length && !reuse) { await cache.dispose(); cache = new t.DynamicCache(); cachedIds = []; }
  const before = cache.get_seq_length();
  const t0 = performance.now();
  const out = await model.generate({ ...inputs, past_key_values: cache, max_new_tokens: 40, do_sample: false, repetition_penalty: 1.05, return_dict_in_generate: true });
  const ms = performance.now() - t0;
  const seq = out.sequences.tolist()[0];
  const text = tokenizer.decode(seq.slice(ids.length), { skip_special_tokens: true });
  cachedIds = seq.slice(0, cache.get_seq_length());
  console.log(JSON.stringify({ user, prompt_tokens: ids.length, cache_before: before, prefix_reused: reuse, new_tokens_fed: ids.length - before, seq_len: seq.length, cache_after: cache.get_seq_length(), same_object: out.past_key_values === cache, ms: Math.round(ms), reply: text }));
  messages.push({ role: 'assistant', content: text });
}
process.exit(0);
