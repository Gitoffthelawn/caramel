# Cart-classifier eval scoreboard (F-012)

Dated rows from real `pnpm eval` runs. See `README.md` for the threshold
rationale, run/red-proof commands, and CI wiring. Pricing is OpenRouter's
public `/api/v1/models` rate at the time noted — check current pricing
before trusting an old row for cost decisions.

| Date       | Model             | Cases | Primary-match   | Schema-valid  | p50 latency   | p95 latency   | $/M in · out   | Notes                                      |
| ---------- | ----------------- | ----- | --------------- | ------------- | ------------- | ------------- | -------------- | ------------------------------------------ |
| 2026-07-11 | openai/gpt-5-mini | 40    | **5.0%** (2/40) | not captured¹ | not captured¹ | not captured¹ | $0.25 · $2.00² | **RED — root cause confirmed, see below.** |

¹ Local console-capture limitation on this run (the reporter in use didn't
surface `beforeAll`'s scoreboard log line) — the aggregate primary-match
rate came from the gate assertion's own failure message, which is exact.
CI's `ai-evals.yml` tees full output to an uploaded artifact, so a future
CI run will capture these cleanly.

² OpenRouter `/api/v1/models` public pricing for `openai/gpt-5-mini`,
checked 2026-07-11: $0.25 / M input tokens, $2.00 / M output tokens
(`input_cache_read`: $0.025/M). Actual run cost was a few cents total —
most calls failed before producing billable completion tokens (see below).

### Why this row is red — root cause (not a gate bug)

`openai/gpt-5-mini` is a reasoning model: it spends hidden "reasoning"
tokens before emitting the visible JSON answer. `cartClassifier.ts`'s
`classifyCart()` calls `chat()` with `maxTokens: 120` — far too small once
reasoning tokens are included. Raw-response diagnostics against the live
API confirmed it directly: with `max_tokens: 120`, the model hits
`finish_reason: "length"` / `native_finish_reason: "max_output_tokens"`
with `message.content: null` (all 120 tokens spent on reasoning, zero left
for the answer) → `openrouter.ts` throws `OpenRouterError: empty
response`. Raising `max_tokens` to 600 in the same raw call, same cart,
produced a clean `finish_reason: "stop"` and a correct
`{"primary":"apparel","secondary":null,"confidence":0.95}` (165 total
completion tokens: 128 reasoning + the visible answer).

38/40 cases hit this failure (`scoreThrown` — every scorer fails, not just
`primary-exact`); only 2 short/simple carts finished reasoning inside the
120-token budget. This is a **real, pre-existing bug in production code**,
not a flaw in the eval design, and not something F-012 is scoped to fix
(`PLAN-F-012.md` §Scope: "Prompt/enum/cache/classifyCart UNCHANGED"). Per
the plan's own step-5 instruction — "if <0.85: investigate bad-label vs
real model weakness; do NOT lower the gate to force green" — this has been
investigated and the gate was left exactly as specified. **Filed as a
new-finding candidate in the F-012 Stage-3 report** (recommended fix:
raise `maxTokens` in `classifyCart()`'s `chat()` call to something like
500–600, then re-run `pnpm eval` for the real green baseline + a
corrected row here).

Separately (checked directly against the production Dokploy app,
2026-07-11): prod has **no `OPENROUTER_API_KEY` at all**, so this bug is
currently masked in production by an even earlier failure — see
`README.md` §"Deploy-time model pin (Dokploy)".

### Red-proof

- **Free, permanent** (`tests/unit/cartClassifier.pipeline.test.ts`,
  mocked `chat()`, zero API cost): scrambled-label variant →
  `primaryMatchRate < 0.85`, every case named as failing. Green as of this
  commit — proves the scoring/aggregation/threshold logic independent of
  the live-API issue above.
- **Live** (`SCRAMBLE_EVAL=1 pnpm eval`, 8 cases): exit code 1,
  `primary_match_rate=0.0% (8 cases) — failing: apparel-exemplar,
beauty-exemplar, books_media-exemplar, electronics-exemplar,
food_grocery-exemplar, health_supplements-exemplar, home_garden-exemplar,
jewelry_accessories-exemplar`. Confounded by the maxTokens bug above
  (most of these 8 are `scoreThrown`, not genuine primary mismatches) —
  the mechanism the scramble is meant to isolate is the free test's job;
  this run mainly proves the live command/CI path itself exits non-zero
  and names cases correctly end-to-end.
