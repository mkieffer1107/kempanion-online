# Liquid AI models for Kempanion Online: LFM3, LFM2.5 and the decision models (checked 2026-10-30)

## 0. Summary

- **What the user remembered.** LFM3 was released on **2026-10-27**. It is six post-trained models of about 2B parameters each, all built from LFM3-1.7B-Base:
  - text: `LFM3-1.7B`
  - vision: `LFM3-VL-2B`
  - audio: `LFM3-Audio-2B`
  - omni: `LFM3-Omni-2B`
  - two decision models: **`d1-2B`** and **`d1-Omni-2B`**

  The "2B1" is almost certainly **d1-2B** ("d-one 2B"), and "the Omni" is **d1-Omni-2B** or LFM3-Omni-2B.
  - There is **no LFM3 mixture-of-experts model and no "2B-A1B"**. The only "A1B" models are `LFM2.5-8B-A1B` and `LFM2-8B-A1B`.
  - Earlier decision models are `d1-3B` (deprecated, replaced by d1-2B) and `d1-omni-600M`, both from 2026-10-05.
- **Recommended chat model:** `onnx-community/LFM3-1.7B-ONNX`, `dtype: "q4f16"` (1.088 GB) on WebGPU. Use `"q4"` (1.298 GB) when the GPU lacks `shader-f16`. It needs **Transformers.js ≥ 4.3.2** (released 2026-10-28).
- **Do not use `LiquidAI/LFM3-1.7B-ONNX` with Transformers.js.** In my test it failed with `Missing the following inputs: logits_to_keep`. Liquid's own exporter README says "The exports are not loadable by Transformers.js."
- **Main problem with LFM3-1.7B: reasoning leaks into replies.** Setting `enable_thinking:false` on its own still leaked reasoning in **13/15** test replies. Three things together reduced this to **0/20**: `enable_thinking:false`, banning the `<think>`/`</think>` tokens (ids 124901 and 124902), and either prefilling the reply with an opening quote or using a regex-constrained output.
- **Lite fallback:** `LiquidAI/LFM2.5-1.2B-Instruct-ONNX` q4f16 (0.760 GB). It has no reasoning mode, so nothing leaks, but its lines are formulaic.
- **Models under 1B (350M, 230M) failed** the roleplay and output-format tests. Use the heuristic engine instead.
- **Quality option:** nothing larger from Liquid is practical in a browser. `LFM2.5-8B-A1B-ONNX`'s card says it is "too large for WebGPU". The realistic upgrade path is LFM3-1.7B in fp16 (3.56 GB, desktop only, not tested) or fine-tuning.
- **Emotion classification:** Liquid's d1 decision models are built exactly for this kind of task. In the browser, though, they mean 0.24–1.6 GB of extra download plus custom JavaScript glue. The better choice is to have the chat model write the expression tag in the same pass, as `[expression] "line"`, with a keyword fallback.

## 1. Text models and the LFM3 family

All models below use the **LFM Open License v1.0** (`license_name: lfm1.0`). It is Apache-style, but commercial use is licensed only for entities under **$10M annual revenue**; non-profits are exempt for non-commercial use ([LICENSE](https://huggingface.co/LiquidAI/LFM3-1.7B/blob/main/LICENSE)).

"Created" is the Hugging Face repo creation date. Public launch dates were 2026-10-27 for LFM3 ([blog](https://www.liquid.ai/blog/lfm3)) and 2026-10-07 for open d1 ([blog](https://www.liquid.ai/blog/open-d1)).

| Repo | Params (safetensors) | `model_type` / arch | Context | Created | Intended use (model card) |
|---|---|---|---|---|---|
| [LiquidAI/LFM3-1.7B](https://huggingface.co/LiquidAI/LFM3-1.7B) | 1,728,801,536 | `lfm3` / `Lfm3ForCausalLM` (custom code). 24 layers: 13 conv, 5 sliding-window (256), 6 global attention. 128K vocab | 256K (262,144) | 2026-10-23 | Local agents, tool calling, structured output, fine-tuning. "Not recommended for agentic coding or complex multi-step reasoning." Reasoning is on by default. |
| [LiquidAI/LFM3-1.7B-Base](https://huggingface.co/LiquidAI/LFM3-1.7B-Base) | 1.73B | `lfm3` | 256K | 2026-10-26 | Only for heavy fine-tuning |
| [LFM3-VL-2B](https://huggingface.co/LiquidAI/LFM3-VL-2B) | 1,918,181,888 | `lfm3_vl` | 128K | 2026-10-19 | Images and video |
| [LFM3-Audio-2B](https://huggingface.co/LiquidAI/LFM3-Audio-2B) | 2,002,332,928 | `lfm3_audio` | 32K | 2026-09-08 | Text or audio in; text and 24 kHz speech out |
| [LFM3-Omni-2B](https://huggingface.co/LiquidAI/LFM3-Omni-2B) | 2,166,928,384 | `lfm3_omni` | 32K | 2026-10-21 | Liquid's first omni model; non-reasoning |
| [d1-2B](https://huggingface.co/LiquidAI/d1-2B) | 1,918,181,888 | `lfm3_vl` / `D1Model` | 128K | 2026-10-24 | Decision model: "calibrated answers in one forward pass, without generating tokens… It is not a chat model." |
| [d1-Omni-2B](https://huggingface.co/LiquidAI/d1-Omni-2B) | 2,166,928,384 | `lfm3_omni` / `D1Model` | 128K | 2026-10-24 | Decision model that also takes audio |
| [d1-omni-600M](https://huggingface.co/LiquidAI/d1-omni-600M) | 587,161,089 (F32) | `d1_omni` (built on LFM2.5-Encoder-350M) | 16,384 | 2026-10-05 | Smallest decision model |
| [LFM2.5-230M](https://huggingface.co/LiquidAI/LFM2.5-230M) | 229,693,184 | `lfm2` | 32,768 (config 128000) | 2026-06-24 | Extraction and light agents. "Not recommended for… creative writing." |
| [LFM2.5-350M](https://huggingface.co/LiquidAI/LFM2.5-350M) | 354,483,968 | `lfm2` | 32,768 | 2026-03-31 | Extraction, structured output, tool use |
| [LFM2.5-1.2B-Instruct](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct) | 1,170,340,608 | `lfm2` | 32,768 | 2026-01-06 | Agentic tasks, extraction, RAG. Labelled "Chat" in the docs. Non-reasoning. |
| [LFM2.5-1.2B-Thinking](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking) | 1.17B | `lfm2` | 32,768 | 2026-01-20 | Reasoning |
| [LFM2.5-1.2B-JP-202606](https://huggingface.co/LiquidAI/LFM2.5-1.2B-JP-202606) | 1.17B | `lfm2` | 32,768 | 2026-05-26 | English/Japanese assistants |
| [LFM2.5-2.6B](https://huggingface.co/LiquidAI/LFM2.5-2.6B) | 2,697,198,592 | `lfm2` (128K vocab) | 131,072 | 2026-07-28 | "Pure reasoning model". **Deprecated, replaced by LFM3-1.7B.** |
| [LFM2.5-8B-A1B](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B) | 8.47B total / 1.5B active | `lfm2_moe` | 128,000 | 2026-05-28 | Reasoning model |
| [LFM2.5-24B-A2B](https://huggingface.co/LiquidAI/LFM2.5-24B-A2B) | 23.97B total / 2.45B active | `lfm2_moe` | 131,072 | 2026-10-12 | Reasoning agent |

- All LFM2 text models (350M, 700M, 1.2B, 2.6B, 8B-A1B, 24B-A2B) are deprecated ([deprecations](https://docs.liquid.ai/lfm/help/deprecations)).
- The LFM3 collection lists exactly Base plus the six models above ([collection](https://huggingface.co/collections/LiquidAI/lfm3-6adc03dcfe62bfd2fcd8eea7)).

## 2. ONNX exports usable in the browser

Sizes are the `.onnx` file plus its `_data*` files, from `/api/models/<id>/tree/main/onnx`.

In Transformers.js 4.3.2 the `dtype` option picks the file suffix: `fp32` → none, `fp16` → `_fp16`, **`q8` → `_quantized`**, `q4` → `_q4`, `q4f16` → `_q4f16`. There is no `q8f16` or `q4f32` dtype, so Liquid's `model_q8`, `q8f16` and `q4f32` files cannot be selected ([dtypes.js](https://github.com/huggingface/transformers.js/blob/4.3.2/packages/transformers/src/utils/dtypes.js)). `q4f16` needs the GPU feature `shader-f16`.

| Repo | Works in Transformers.js? | Files and sizes |
|---|---|---|
| [**onnx-community/LFM3-1.7B-ONNX**](https://huggingface.co/onnx-community/LFM3-1.7B-ONNX) | **Yes, ≥4.3.2. I ran q4 on CPU and q4f16/q4 on WebGPU.** | `model_q4f16.onnx` 296,714 + `.onnx_data` 1,087,789,056 = **1.088 GB**<br>`model_q4` 301,147 + 1,297,248,256 = **1.298 GB**<br>`model_quantized` (q8) 2.176 GB in 2 data files<br>`model_fp16` 3.559 GB in 2 data files<br>`tokenizer.json` 17.9 MB |
| [LiquidAI/LFM3-1.7B-ONNX](https://huggingface.co/LiquidAI/LFM3-1.7B-ONNX) | **No.** Needs raw `onnxruntime-web/webgpu`. | q4 1.626 GB, **q4f16 1.383 GB**, q4f32 2.235, q8 2.269, q8f16 2.026, fp16 3.592, fp32 7.184 GB. Its q4 and q4f16 keep the embedding, the LM head and 27 of 153 projections in int8. |
| [LiquidAI/LFM2.5-1.2B-Instruct-ONNX](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-ONNX) | Yes (I ran q4 and q4f16) | **q4f16 760,461,835**, q4 850,242,437, quantized 1.521 GB, q8 1.768 GB (not selectable), fp16 2.357 GB, fp32 4.714 GB |
| [LiquidAI/LFM2.5-1.2B-Thinking-ONNX](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking-ONNX) | Yes (used by Liquid's official Space) | Same sizes as Instruct |
| [LiquidAI/LFM2.5-1.2B-JP-202606-ONNX](https://huggingface.co/LiquidAI/LFM2.5-1.2B-JP-202606-ONNX) | Yes (I ran q4f16) | q4f16 744,220,746, q4 834,045,515, q4f32 1.218 GB, q8 1.768 GB, fp16 2.357 GB |
| [onnx-community/LFM2.5-350M-ONNX](https://huggingface.co/onnx-community/LFM2.5-350M-ONNX) (same files as the LiquidAI repo) | Yes (I ran q4 and q4f16) | **q4f16 255,148,587**, q4 293,813,394, quantized 510 MB, fp16 725 MB |
| [LiquidAI/LFM2.5-230M-ONNX](https://huggingface.co/LiquidAI/LFM2.5-230M-ONNX) | Yes (I ran q4) | **q4 211,265,946** (the card calls this the WebGPU file), fp16 476 MB, q4f32 403 MB and q8 490 MB (server only). No q4f16. |
| [LiquidAI/LFM2.5-2.6B-ONNX](https://huggingface.co/LiquidAI/LFM2.5-2.6B-ONNX) | Yes (used by Liquid's official Space) | q4f16 1.534 GB, q4 1.855 GB, fp16 5.41 GB |
| [LiquidAI/LFM2.5-8B-A1B-ONNX](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B-ONNX) | Card: "too large for WebGPU" | q4f16 5.045 GB, q4 5.594 GB |
| [LiquidAI/d1-2B-ONNX](https://huggingface.co/LiquidAI/d1-2B-ONNX) | No. Needs `onnxruntime-web/webgpu`, custom inputs (`question_ids`, `slot_positions`), and the host code is Python only. | decoder_q4f16 1.568 GB (+ vision_encoder_q8 0.196 GB for images), decoder_q4 1.742 GB |
| [onnx-community/d1-omni-600M-ONNX](https://huggingface.co/onnx-community/d1-omni-600M-ONNX) | Raw ONNX session plus a port of `prompt.py` (I did this; ~40 lines) | Text: `model_quantized` (q8) 406,329,174 and `model_q4` 244,664,778. Inputs: `input_ids`, `attention_mask`, `prefix_len`, `marker_pos`, `marker_mask`, `qtype`; output `logits[batch, options]`. |

- Liquid's docs: "WebGPU supports Q4 and FP16… Q8 quantization is not available in browser environments" ([ONNX docs](https://docs.liquid.ai/deployment/on-device/onnx)).
- A third-party export, `daveycodez/LFM3-1.7B-Web` (q4f16, 0.900 GB), exists. I did not verify it.

## 3. WebGPU Spaces and demos

**No official LiquidAI Space runs LFM3-1.7B through Transformers.js yet.** `LiquidAI/LFM3-Omni-2B-WebGPU` (created 2026-10-29) is still the empty "Welcome to your static Space!" template.

**[webml-community/LFM3-1.7B-WebGPU-Pi](https://huggingface.co/spaces/webml-community/LFM3-1.7B-WebGPU-Pi)**
- Uses a custom WebGPU GGUF runtime, not Transformers.js: `dist/runtime/Lfm3ForCausalLM.js` (1.07 MB, bundled; no npm package; the runtime's licence is not stated).
- Loads from `LiquidAI/LFM3-1.7B-GGUF`:
  - `LFM3-1.7B-Q4_K_M.gguf` (1.100 GB, default)
  - `LFM3-1.7B-QAD-Q4_0.gguf` (1.050 GB)
- Settings in `src/config.js`: `CONTEXT_LENGTH=32768`, `MAX_NEW_TOKENS=4096`, `MAX_ROUNDS=12`, `do_sample:false`.
- API calls: `Lfm3ForCausalLM.checkAvailability(id,{file})`, then `from_pretrained(id,{file,maxLength,signal,onProgress})`.
- Its sampler accepts temperature, `top_k` (at most 64), `top_p`, `min_p` and seed. It has no repetition penalty.

**[webml-community/LFM3-VL-2B-WebGPU](https://huggingface.co/spaces/webml-community/LFM3-VL-2B-WebGPU)**
- Imports `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2`.
- Loads `AutoModelForImageTextToText.from_pretrained("onnx-community/LFM3-VL-2B-ONNX", {device, dtype:{vision_encoder:"fp16", embed_tokens:"fp16", decoder_model_merged:"q4f16"}})`.
- Throws "requires a GPU with shader-f16 support" when the feature is missing.
- Generates with `do_sample:false, repetition_penalty:1.05`, max 64 new tokens.

**[LiquidAI/LFM2.5-1.2B-Thinking-WebGPU](https://huggingface.co/spaces/LiquidAI/LFM2.5-1.2B-Thinking-WebGPU)**
- `pipeline("text-generation","LiquidAI/LFM2.5-1.2B-Thinking-ONNX",{dtype:"q4",device:"webgpu"})`.
- `TextStreamer` with `skip_special_tokens:false`, plus a `ThinkStreamParser` that splits `<think>…</think>` incrementally (`src/utils/think-parser.ts`, reusable).
- `do_sample:false`, `InterruptableStoppingCriteria`.

**[LiquidAI/LFM2-WebGPU](https://huggingface.co/spaces/LiquidAI/LFM2-WebGPU)**
- `onnx-community/LFM2-{350M,700M,1.2B}-ONNX`, `q4f16`, pinned revisions.
- `apply_chat_template(messages,{tools,add_generation_prompt:true,return_dict:true})`.
- `generate({...input, past_key_values: prev, max_new_tokens:512, do_sample:false, return_dict_in_generate:true})`, which reuses the KV cache across turns.

**[LiquidAI/LFM2.5-2.6B-WebGPU](https://huggingface.co/spaces/LiquidAI/LFM2.5-2.6B-WebGPU)** (mirror of [nico-martin/LFM2.5-2.6B-WebGPU](https://github.com/nico-martin/LFM2.5-2.6B-WebGPU))
- `pipeline(..., "LiquidAI/LFM2.5-2.6B-ONNX", {device:"webgpu", dtype:"q4f16"})`.
- Sets `env.experimental_useCrossOriginStorage=true`.
- Reuses a `DynamicCache` across turns, after checking the new prompt starts with the exact cached prefix.
- Sampling: `do_sample:true, temperature:0.2, top_k:80, repetition_penalty:1.05`, with `tools` passed to the pipeline.

**Others:** `LiquidAI/LFM2-MoE-WebGPU`, `LiquidAI/LFM2.5-VL-{450M,1.6B,3B}-WebGPU`, `LiquidAI/LFM2.5-Audio-1.5B-transformers-js`, and `webml-community/lfm2-webgpu-kernels` (custom kernels, LFM2.5-230M GGUF). `LiquidAI/system-one-arcade` runs d1-2B on a server GPU, not WebGPU.

**Official Transformers.js snippet** ([onnx-community/LFM3-1.7B-ONNX card](https://huggingface.co/onnx-community/LFM3-1.7B-ONNX)):

```js
const generator = await pipeline("text-generation", "onnx-community/LFM3-1.7B-ONNX", { dtype: "q4f16", device: "webgpu" });
const output = await generator(messages, { max_new_tokens: 512, do_sample: true, temperature: 0.1, top_k: 50,
  repetition_penalty: 1.1, tokenizer_encode_kwargs: { enable_thinking: false }, streamer });
```

The onnx-community `generation_config.json` has no sampling defaults, so pass them explicitly or you get greedy decoding.

## 4. My tests (Transformers.js 4.3.2, Node 25, M1 Max)

**Setup:** CPU execution provider for q4; onnxruntime-node's WebGPU provider (Dawn/Metal) for q4f16. Two personas (neurosurgeon Piggy and coder Piggy, about 200-token system prompts), 5–8 prompts each, temperature 0.1 and 0.6. This is an informal sample, not a benchmark.

| Model / dtype | Persona result | Reasoning leaks | WebGPU decode speed |
|---|---|---|---|
| LFM2.5-230M q4 | Broke character, e.g. "Based on the rules, you would reply with **patriot**", plus markdown | n/a | – |
| LFM2.5-350M q4f16 | Got based→patriot right, but answered "Patriot" to "hi!" and produced one-word lines ("basati"). Failed the `[expr] "line"` format by outputting it literally. | n/a | ~134 tok/s |
| LFM2.5-1.2B-JP-202606 q4f16 | Wordy, ignored the user's message, stuffed persona keywords | none | – |
| LFM2.5-1.2B-Instruct q4f16 | In character and short, but formulaic ("Based on…" / "Okay, so I was thinking…" on every line). Ignored the exact-reply rule. | none | ~101 tok/s |
| **LFM3-1.7B** q4f16 | **Best by far.** Responsive and varied ("best for what exactly?", bashful when complimented, natural answer about boba). Followed based→patriot. | 13/15 with `enable_thinking:false` alone; **0/20** with the mitigations | **~71 tok/s** (q4: ~62) |

Mitigation results for LFM3-1.7B:
- `enable_thinking:false` alone: it writes a line, then `</think>`, then another line, or plain planning text such as "Okay, the user is asking…".
- Ban think tokens plus few-shot history: 2/5 still leaked. The coder persona's "Okay, so…" catchphrase collides with the model's reasoning opener.
- Thinking on: 120 to more than 600 reasoning tokens per reply, often not finished within 600 tokens (6–18 s on CPU).

Prompt-length test: a 1,157-token prompt with a fact placed about 1,100 tokens earlier was answered correctly in about 1.1 s (LFM3 q4f16 on WebGPU, single-shot prefill). The 256-token chunk advice in Liquid's card is for raw onnxruntime-web: according to [Liquid4All/onnx-export](https://github.com/Liquid4All/onnx-export), single runs fail or return non-finite logits from about 5.4K–11.6K tokens. Keep prompt plus history at about 4K tokens or less.

## 5. Recommendation

- **Primary:** LFM3-1.7B, `onnx-community/LFM3-1.7B-ONNX`.
  - `q4f16` (1.088 GB) when `adapter.features.has('shader-f16')`, otherwise `q4` (1.298 GB).
  - Always use `enable_thinking:false`, `bad_words_ids:[[124901],[124902]]`, and a prefill or regex-constrained output.
- **Lite:** LFM2.5-1.2B-Instruct (`LiquidAI/LFM2.5-1.2B-Instruct-ONNX`), q4f16 0.760 GB or q4 0.850 GB.
- **Below 1B:** skip the LLM and use the deterministic engine.
- **Quality:** LFM3-1.7B fp16 (3.56 GB, desktop GPUs with shader-f16; not tested), or fine-tune with Liquid's TRL SFT notebook and re-export through the onnx-community path, since Liquid's own exporter output is not Transformers.js-loadable.
- **Prompting:** handle exact `based` → `patriot` in the deterministic engine. Write quirks as "occasionally"; "says X a lot" made both 350M and LFM3 answer "Patriot." to "hi!".

**Liquid's recommended sampling parameters:**

| Model | Parameters |
|---|---|
| LFM3-1.7B (general) | `temperature=0.1, top_k=50, repetition_penalty=1.1` |
| LFM3-1.7B (math/STEM) | `temperature=1.0, top_p=0.95, top_k=20`, rep 1.0 |
| LFM2.5 230M / 350M / 1.2B-Instruct / JP | `temperature 0.1, top_k 50, repetition_penalty 1.05` |
| LFM2.5-1.2B-Thinking | temperature 0.05 |
| LFM2.5-2.6B | rep 1.1 |
| LFM2.5-8B-A1B | temperature 0.2, top_k 80 |
| LFM2 (legacy) | `temperature 0.3, min_p 0.15, repetition_penalty 1.05` |
| LFM3-VL-2B | `0.1 / top_p 1.0 / top_k 50 / min_p 0 / rep 1.1` |
| LFM3-Omni-2B | Greedy for text |

- **Transformers.js 4.3.2 applies only `temperature`, `top_k` and `repetition_penalty`.** `top_p` is commented out as a TODO and there is no `min_p` ([source](https://github.com/huggingface/transformers.js/blob/4.3.2/packages/transformers/src/models/modeling_utils.js)).
- For VN variety I used temperature 0.6, top_k 50, rep 1.1 and max_new_tokens 80–120. That is my choice, not Liquid's.

**Emotion and expression classification:**
- **d1 models fit the task on paper.** A `choice` question returns calibrated probabilities in one forward pass with no generated tokens ([decision models](https://docs.liquid.ai/lfm/models/decision-models)). Browser cost:
  - d1-2B: +1.57 GB and a JavaScript port of the Python runner.
  - d1-omni-600M: +0.24 GB (q4) or 0.41 GB (q8). The onnx-community card says to use `open-jev`, but the published `open-jev@0.1.2` only handles `kev`/`open_jev` configs, not `d1_omni`.
  - My JavaScript port of `prompt.py` scored **5/8** on test lines, about 0.3–0.4 s on CPU.
- **Reusing the chat model:**
  - LFM3 with a JSON enum: about 5/8. LFM2.5-1.2B: about 4/8.
  - A bare-word regex was bad (LFM3 labelled 7/8 lines "surprised"). Wrap the label in JSON or in the line format.
  - Best: one regex-constrained generation of `\[(neutral|happy|…)\] "[^"\n]{1,240}"`. Tags came out contextually apt (shy for a compliment, flustered for "your code deleted my thesis").
- **Recommendation:** tag plus line from the chat model, with a keyword lexicon fallback. All approaches were weak on scared, sleepy and flustered. Add d1-omni-600M only if you want classification while no LLM is loaded.

## 6. LFM3-1.7B chat template and special tokens

Source: [chat_template.jinja](https://huggingface.co/LiquidAI/LFM3-1.7B/blob/main/chat_template.jinja) and [docs](https://docs.liquid.ai/lfm/key-concepts/chat-template).

**Rendered prompt** (verified in Transformers.js; `@huggingface/jinja` strips the `{% generation %}` tags):

```
<|startoftext|><|im_start|>system\n{system}<|im_end|>\n<|im_start|>user\n{user}<|im_end|>\n<|im_start|>assistant\n<think>
```

- With `enable_thinking:false` the prompt ends `…assistant\n<think></think>`.
- Roles: `system` (optional; emitted only if non-empty or if tools are given), `user`, `assistant`, `tool`.
- Earlier assistant turns are rendered as `<think></think>` + content; old reasoning is dropped unless `preserve_thinking=True`.

**Token ids:**

| Token | Id | Notes |
|---|---|---|
| `<|pad|>` | 124893 | |
| `<|startoftext|>` | 124894 | BOS |
| `<|endoftext|>` | 124895 | |
| `<|im_start|>` | 124899 | |
| `<|im_end|>` | 124900 | EOS |
| `<think>` | 124901 | **Not a special token**, so it survives `skip_special_tokens` |
| `</think>` | 124902 | **Not a special token**, so it survives `skip_special_tokens` |
| `<tools>` / `</tools>` | 125017 / 125018 | |
| `<tool_call>` / `</tool_call>` | 125019 / 125020 | |
| `<tool_response>` / `</tool_response>` | 125025 / 125026 | |

Vocabulary size is 128,000.

**Tool calling:**
- Tool schemas are JSON lines appended to the system prompt inside `<tools>…</tools>`.
- The model calls tools in XML: `<tool_call>\n<function=NAME>\n<parameter=ARG>\nVALUE\n</parameter>\n</function>\n</tool_call>`.
- Results go in a `tool` message wrapped as `<tool_response>…</tool_response>`.
- Deferred tools use `defer_loading` and an `<additional_tools>` block.

**Lite model template (LFM2.5-1.2B-Instruct):** plain ChatML with no think prefill. BOS id 1, EOS `<|im_end|>` id 7, PAD id 0. Tools go in the system prompt as `List of tools: [...]`; calls look like `<|tool_call_start|>[fn(arg='v')]<|tool_call_end|>`.

## 7. Integration sketch

I tested this in Node, not in a browser. With no bundler, use an import map, because `@huggingface/transformers-structured-output@4.3.2/dist/index.js` imports `"@huggingface/transformers"` by bare name.

```js
import { AutoTokenizer, AutoModelForCausalLM } from "@huggingface/transformers";            // 4.3.2
import { StructuredOutputProcessor } from "@huggingface/transformers-structured-output";     // 4.3.2
const M = "onnx-community/LFM3-1.7B-ONNX";
const dtype = (await navigator.gpu?.requestAdapter())?.features.has("shader-f16") ? "q4f16" : "q4";
const tok = await AutoTokenizer.from_pretrained(M);
const model = await AutoModelForCausalLM.from_pretrained(M, { device: "webgpu", dtype });
const prompt = tok.apply_chat_template(msgs, { tokenize: false, add_generation_prompt: true, enable_thinking: false });
const inputs = tok(prompt, { add_special_tokens: false });
const out = await model.generate({ ...inputs, max_new_tokens: 120, do_sample: true, temperature: 0.6, top_k: 50,
  repetition_penalty: 1.1, bad_words_ids: [[124901], [124902]],
  logits_processor: [new StructuredOutputProcessor(tok, { type: "regex", regex: `\\[(${EXPR.join("|")})\\] "[^"\\n]{1,240}"` })] });
const text = tok.decode(out.slice(null, [inputs.input_ids.dims.at(-1), null])[0], { skip_special_tokens: true });
// parse /^\[(\w+)\] "(.*)"$/s; on failure, fall back to the heuristic engine
```

## 8. Not verified, and caveats

- **Speed numbers:** all come from an M1 Max running Node with onnxruntime-node's WebGPU provider, not Chrome. Phones (iOS Safari 26+, which Transformers.js 4.3.0 enabled, and Android) were not tested for memory, the 1.1 GB download, or Cache API quotas.
- **Other GPUs:** Liquid notes that Chromium's SwiftShader lacks `shader-f16` and that its 4-wide subgroups break the subgroup FlashAttention path in onnxruntime-web 1.30. Non-Apple, non-NVIDIA GPUs were not checked by Liquid.
- **Not tested:** KV-cache reuse (`DynamicCache`) across turns with LFM3; LFM3 fp16 quality; the onnx-community export's behaviour beyond 1,157 tokens.
- **Why the two LFM3 exports differ in size:** the q4f16 files are 1.09 GB (onnx-community) vs 1.38 GB (LiquidAI). Only Liquid documents its quantization recipe.
- **"2B1" means d1-2B:** this is my inference from the names.
- **d1-omni-600M:** my JavaScript port of `prompt.py` may differ slightly from Liquid's reference implementation.
- **Roleplay and emotion results:** small, informal samples.
- **Benchmarks:** all benchmark numbers on Liquid's cards are vendor-reported.

Scripts and run logs are in `<scratch>/scripts` and `<scratch>/runs`.

**Other sources:**
- [Transformers.js 4.3.2 release](https://github.com/huggingface/transformers.js/releases/tag/4.3.2) and [PR #1821 (LFM3 support)](https://github.com/huggingface/transformers.js/pull/1821)
- [Transformers.js 4.3.0 release](https://github.com/huggingface/transformers.js/releases/tag/4.3.0) (structured output, Safari 26)
- [LFM3-1.7B docs](https://docs.liquid.ai/lfm/models/lfm3-1.7b)
- [Liquid text models docs](https://docs.liquid.ai/lfm/models/text-models)
- [open-jev](https://github.com/nico-martin/open-jev)
- [d1-omni-600M prompt.py](https://huggingface.co/LiquidAI/d1-omni-600M/blob/main/prompt.py)