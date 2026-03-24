# Lenient Parser Mode & MiniId Prompt Guidance

**Date:** 2026-03-24
**Status:** Approved

## Problem

`ArgumentParser.build()` hard-fails on invalid cross-entity miniId references. Since the primary consumer is LLM output — which can hallucinate references — a single bad miniId (e.g., using a claim miniId where a source miniId is expected) causes the entire build to fail. Additionally, `buildParsingPrompt()` doesn't communicate miniId namespacing conventions, making cross-entity confusion more likely.

## Changes

### 1. Lenient build mode

Add an optional `TBuildOptions` parameter to `build()` with a `strict` flag (default `true`). In lenient mode (`strict: false`), invalid cross-entity references are skipped and collected as warnings instead of throwing.

#### New types (in `src/lib/parsing/types.ts`)

```typescript
type TParserWarningCode =
    | "UNRESOLVED_SOURCE_MINIID"
    | "UNRESOLVED_CLAIM_MINIID"
    | "UNRESOLVED_CONCLUSION_MINIID"
    | "UNDECLARED_VARIABLE_SYMBOL"

type TParserWarning = {
    code: TParserWarningCode
    message: string
    miniId: string
}

type TBuildOptions = {
    strict?: boolean // default: true
}
```

#### Changes to `TArgumentParserResult`

Add `warnings: TParserWarning[]`. Always present — empty array when strict or when lenient encounters no issues.

#### Changes to `build()` signature

```typescript
build(response: TParsedArgumentResponse, options?: TBuildOptions): TArgumentParserResult
```

#### Recovery behavior per reference type

| Reference | Warning code | Recovery |
|---|---|---|
| `claim.sourceMiniIds` → unknown source miniId | `UNRESOLVED_SOURCE_MINIID` | Skip the association; claim still created |
| `variable.claimMiniId` → unknown claim miniId | `UNRESOLVED_CLAIM_MINIID` | Skip the variable entirely |
| Formula symbol → undeclared variable symbol | `UNDECLARED_VARIABLE_SYMBOL` | Skip the entire premise |
| `conclusionPremiseMiniId` → unknown premise miniId | `UNRESOLVED_CONCLUSION_MINIID` | Don't set conclusion role |

**Cascade:** Skipping a variable due to `UNRESOLVED_CLAIM_MINIID` removes its symbol from the declared set. Premises referencing that symbol will also be skipped with an `UNDECLARED_VARIABLE_SYMBOL` warning. Both warnings are emitted so the caller sees the full chain.

**Strict mode:** Unchanged. All 4 cases throw as they do today.

### 2. MiniId prompt guidance

Add a "MiniId Conventions" section to the `CORE_PROMPT` in `prompt-builder.ts`:

```
### MiniId Conventions

Each entity type uses a distinct prefix for its miniId to avoid cross-reference confusion:

- Claims: `c1`, `c2`, `c3`, ...
- Sources: `s1`, `s2`, `s3`, ...
- Variables: `v1`, `v2`, `v3`, ...
- Premises: `p1`, `p2`, `p3`, ...

Always use the correct prefix when referencing entities. For example, a claim's
`sourceMiniIds` array should contain source miniIds (e.g., `["s1", "s2"]`),
not claim miniIds.
```

This is guidance only — `build()` does not validate miniId prefix format.

## Files changed

- `src/lib/parsing/types.ts` — add `TParserWarningCode`, `TParserWarning`, `TBuildOptions`
- `src/lib/parsing/argument-parser.ts` — add `warnings` to `TArgumentParserResult`, update `build()` signature and implement lenient recovery paths
- `src/lib/parsing/prompt-builder.ts` — add miniId conventions section to `CORE_PROMPT`
- `src/lib/parsing/index.ts` — export new types
- `test/core.test.ts` — new tests for lenient mode

## Test plan

1. **Lenient: unresolved source miniId** — claim references nonexistent source miniId with `{ strict: false }`. Build succeeds, claim created without that association, warnings contains `UNRESOLVED_SOURCE_MINIID`.
2. **Lenient: unresolved claim miniId** — variable references nonexistent claim miniId. Build succeeds, variable skipped, warnings contains `UNRESOLVED_CLAIM_MINIID`.
3. **Lenient: undeclared variable symbol** — formula uses undeclared symbol. Premise skipped, warnings contains `UNDECLARED_VARIABLE_SYMBOL`.
4. **Lenient: cascade from skipped variable** — variable skipped due to bad claim ref, then premise using that symbol also skipped. Both warnings emitted.
5. **Lenient: unresolved conclusion miniId** — conclusion references nonexistent premise. No conclusion set, warnings contains `UNRESOLVED_CONCLUSION_MINIID`.
6. **Lenient: no issues** — valid response with `{ strict: false }`. Identical result, warnings is empty array.
7. **Strict mode still throws** — each of the 4 cases still throws with default options.
8. **Warnings on strict success** — valid response with default options. Warnings is empty array.
9. **Prompt includes miniId conventions** — `buildParsingPrompt()` output contains prefix guidance.
