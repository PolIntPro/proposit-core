# Grammar Enforcement Config Design

## Problem

The operator nesting restriction is currently enforced unconditionally during mutations and bypassed via a `skipNestingCheck` boolean flag during restoration. This is ad-hoc and doesn't scale as more structural rules are added (e.g., arity enforcement). There's also no way for callers to opt into auto-normalization of non-compliant trees.

## Solution

Replace the `skipNestingCheck` flag with a first-class `TGrammarConfig` system that:

- Toggles individual structural rules independently
- Supports auto-normalization (automatically fix violations where possible)
- Threads through the existing `TLogicEngineOptions` → `ArgumentEngine` → `PremiseEngine` → `ExpressionManager` pipeline
- Allows callers of `fromSnapshot`, `fromData`, and other static factories to control enforcement at load time

## Type Definitions

New file `src/lib/types/grammar.ts`:

```typescript
type TGrammarOptions = {
    enforceFormulaBetweenOperators: boolean
}

type TGrammarConfig = TGrammarOptions & {
    autoNormalize: boolean
}

const DEFAULT_GRAMMAR_CONFIG: TGrammarConfig = {
    enforceFormulaBetweenOperators: true,
    autoNormalize: false,
}
```

`TLogicEngineOptions` gains a new optional field:

```typescript
type TLogicEngineOptions = {
    checksumConfig?: TCoreChecksumConfig
    positionConfig?: TCorePositionConfig
    grammarConfig?: TGrammarConfig
}
```

When `grammarConfig` is omitted, `DEFAULT_GRAMMAR_CONFIG` is used — all rules enforced, auto-normalize off. This preserves current behavior.

## ExpressionManager Changes

`ExpressionManager` stores the resolved `TGrammarConfig` (from options or default). The private `skipNestingCheck` flag is removed.

### `addExpression`

The current guard (`if (!this.skipNestingCheck && ...)`) becomes:

```
if grammarConfig.enforceFormulaBetweenOperators
   && parent.type === "operator"
   && expression is non-not operator:
    if autoNormalize:
        insert formula buffer between parent and expression (in place)
    else:
        throw
```

Auto-normalization mechanics:
1. Create a formula node with `randomUUID()` as ID, copying `argumentId`, `argumentVersion`, `premiseId` from the expression
2. Use the expression's intended position under the parent for the formula
3. Add the formula as child of the parent (via internal call that skips grammar checks)
4. Rewrite the expression's `parentId` to the formula's ID, position to `0`
5. Continue with normal `addExpression` flow

### `insertExpression` and `wrapExpression`

Check `grammarConfig.enforceFormulaBetweenOperators` instead of the removed flag. When the rule is enabled and violated, always throw — even when `autoNormalize` is `true`. These are compound operations where the caller must construct correct trees. Auto-normalization is not supported.

### `removeExpression`

The pre-flight check consults `grammarConfig.enforceFormulaBetweenOperators`. When the rule is disabled, the pre-flight check is skipped. No auto-normalize path — if removal would create a violation, it's rejected.

### `loadInitialExpressions`

No longer needs to toggle `skipNestingCheck`. It calls `addExpression` normally and the grammar config controls enforcement. If the `ExpressionManager` was constructed with enforcement disabled (because the caller passed that config to `fromSnapshot`), the checks don't fire.

## Static Factory and Restoration Changes

### `ExpressionManager.fromSnapshot`

Gains optional `grammarConfig` parameter:

```typescript
static fromSnapshot(snapshot, grammarConfig?): ExpressionManager
```

If provided, overrides the config from `snapshot.config` for this construction. If omitted, uses `snapshot.config?.grammarConfig` or `DEFAULT_GRAMMAR_CONFIG`.

### `PremiseEngine.fromSnapshot`

Gains optional `grammarConfig` parameter, passes through to `ExpressionManager.fromSnapshot`.

### `ArgumentEngine.fromSnapshot`

Gains optional `grammarConfig` parameter, passes through to each `PremiseEngine.fromSnapshot` call.

### `ArgumentEngine.fromData`

Gains optional `grammarConfig` parameter. Passes through so the caller controls enforcement during loading. Callers wanting no enforcement pass `{ enforceFormulaBetweenOperators: false, autoNormalize: false }`. Callers wanting auto-normalization pass `{ enforceFormulaBetweenOperators: true, autoNormalize: true }`.

### `PremiseEngine.loadExpressions`

This method was added to bypass the nesting check. With grammar config, it's kept as a convenience but respects the grammar config rather than unconditionally bypassing.

### `rollback`

Uses the engine's existing grammar config from `TLogicEngineOptions`. No additional parameter needed.

## Error Handling

- **Enforcement violation (no auto-normalize):** Throws with existing error messages (`"Non-not operator expressions cannot be direct children..."`, `"Cannot remove expression — would promote..."`)
- **Auto-normalize failure:** Throws with descriptive error. For the current operator nesting rule, auto-normalize always succeeds (inserting a formula buffer is always valid). Future rules may have cases where normalization is impossible.
- **Auto-normalize not supported:** `insertExpression`, `wrapExpression`, and `removeExpression` throw even with `autoNormalize: true`. These compound operations require the caller to construct correct trees.

## Testing

New `describe("grammar enforcement config")` block in `test/core.test.ts`:

### Config behavior

- Default config (no `grammarConfig`) enforces nesting restriction and throws — same as current behavior
- `{ enforceFormulaBetweenOperators: false }` allows operator-under-operator via `addExpression`
- `{ enforceFormulaBetweenOperators: false }` allows operator-under-operator via `insertExpression` and `wrapExpression`
- `{ enforceFormulaBetweenOperators: false }` allows removals that would promote operator-under-operator

### Auto-normalize

- `{ enforceFormulaBetweenOperators: true, autoNormalize: true }` — `addExpression` auto-inserts formula buffer
- Verify auto-inserted formula has correct `argumentId`, `argumentVersion`, `premiseId`
- Verify expression ends up parented under the formula, not the original operator
- Auto-normalize during `loadInitialExpressions` via `fromSnapshot` with auto-normalize config
- `insertExpression` still throws even with `autoNormalize: true`
- `wrapExpression` still throws even with `autoNormalize: true`
- `removeExpression` still throws even with `autoNormalize: true`

### Restoration paths

- `fromSnapshot` with `{ enforceFormulaBetweenOperators: true }` rejects operator-under-operator
- `fromSnapshot` with `{ enforceFormulaBetweenOperators: true, autoNormalize: true }` auto-normalizes legacy tree
- `fromSnapshot` with no grammar config uses default (enforces, throws)
- `fromData` with grammar config parameter controls enforcement
- Existing restoration bypass tests updated to pass grammar config instead of relying on `loadExpressions` bypass

## Migration

- `skipNestingCheck` private flag removed from `ExpressionManager`
- `loadInitialExpressions` no longer toggles a flag — relies on grammar config
- Existing tests that use `ExpressionManager.fromSnapshot` to load legacy trees continue to work if they pass a permissive grammar config, or if the default enforcement catches violations as expected
- The existing `loadExpressions` method on `ExpressionManager` and `PremiseEngine` is preserved but updated to respect grammar config
