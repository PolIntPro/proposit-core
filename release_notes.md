# Release Notes — Snapshot/Rollback & Engine Consistency Redesign

## Breaking Changes

### Renamed classes and types

- **`PremiseManager` renamed to `PremiseEngine`** — all imports must be updated. The class operates on a single premise's business logic (paralleling `ArgumentEngine`), making "Engine" the consistent name.
- **`TArgumentEngineOptions` renamed to `TLogicEngineOptions`** — now the universal config type accepted by all engine/manager classes, not just `ArgumentEngine`.
- **`TCoreArgumentEngineData` removed** — replaced by `TArgumentEngineSnapshot`. Use `snapshot()` instead of `toData()` / `exportState()`.

### Constructor changes

- **`PremiseEngine` constructor restructured** — now accepts `(premise: TOptionalChecksum<TPremise>, deps: { argument, variables: VariableManager }, config?: TLogicEngineOptions)` instead of `(id, argument, variables, extras, config)`. The premise entity (with `id`, `argumentId`, `argumentVersion`, `title`, etc.) is the first parameter.
- **`ExpressionManager` constructor** — now accepts `(config?: TLogicEngineOptions)` instead of initial expressions array. Expressions are added via `addExpression()` after construction, or restored via `fromSnapshot()`.
- **`VariableManager` constructor** — now accepts `(config?: TLogicEngineOptions)` instead of initial variables array.

### Removed methods

- **`ArgumentEngine.toData()`** — replaced by `snapshot()`.
- **`ArgumentEngine.exportState()`** — replaced by `snapshot()`.
- **`PremiseEngine.toData()`** — replaced by `toPremiseData()` (returns `TPremise`) and `snapshot()` (returns `TPremiseEngineSnapshot`).

### Schema changes

- **`BasePropositionalExpressionSchema`** now requires `premiseId: UUID` — all expressions must specify which premise they belong to.
- **`CorePremiseSchema`** now requires `argumentId: UUID` and `argumentVersion: number` — premises are self-describing.

### Checksum field changes

- `premiseId` added to `DEFAULT_CHECKSUM_CONFIG.expressionFields`.
- `argumentId` and `argumentVersion` added to `DEFAULT_CHECKSUM_CONFIG.premiseFields`.
- Expression checksums will differ from previous versions due to the new `premiseId` field.

## New Features

### Hierarchical snapshot/restore

All classes now support `snapshot()` and `static fromSnapshot()`:

```typescript
// Capture full engine state
const snap = engine.snapshot() // TArgumentEngineSnapshot

// Reconstruct from snapshot
const restored = ArgumentEngine.fromSnapshot(snap)

// Restore in place (preserves instance reference)
engine.rollback(snap)
```

Each class snapshots only what it owns. `PremiseEngine.fromSnapshot()` requires argument and `VariableManager` as dependency parameters.

### Bulk loading from flat data

```typescript
const engine = ArgumentEngine.fromData(
    argument,    // TOptionalChecksum<TArg>
    variables,   // TOptionalChecksum<TVar>[]
    premises,    // TOptionalChecksum<TPremise>[]
    expressions, // TExpressionInput<TExpr>[]
    roles,       // TCoreArgumentRoleState
    config?,     // TLogicEngineOptions
)
```

Groups expressions by `premiseId`, loads in BFS order. Generic type parameters are inferred from arguments.

### `ArgumentEngine.toDisplayString()`

Renders the full argument as a multi-line string with role labels:

```
[Conclusion] (P → R)
[Supporting] (P → Q)
[Supporting] (Q → R)
[Constraint] P
```

### Cumulative checksums

Engine checksums now use `Record<string, string>` mapping entity IDs to their individual checksums, making the computation transparent and debuggable.

### Expression checksums stored eagerly

`ExpressionManager` now computes and stores checksums at add/update time rather than attaching them lazily on read. This makes snapshots self-contained.

## Migration Guide

### 1. Update imports

```diff
- import { PremiseManager } from "@polintpro/proposit-core"
+ import { PremiseEngine } from "@polintpro/proposit-core"

- import type { TArgumentEngineOptions } from "@polintpro/proposit-core"
+ import type { TLogicEngineOptions } from "@polintpro/proposit-core"
```

### 2. Update PremiseEngine construction (if constructing directly)

```diff
- new PremiseManager(id, argument, variables, { title }, config)
+ new PremiseEngine({ id, argumentId: arg.id, argumentVersion: arg.version, title }, { argument, variables }, config)
```

### 3. Add `premiseId` to expressions

All expressions now require a `premiseId` field:

```diff
  {
    id: "expr-1",
    argumentId: "arg-1",
    argumentVersion: 1,
+   premiseId: "premise-1",
    type: "variable",
    variableId: "var-p",
    parentId: null,
    position: 0,
  }
```

### 4. Add `argumentId`/`argumentVersion` to premises

```diff
  {
    id: "premise-1",
+   argumentId: "arg-1",
+   argumentVersion: 1,
    title: "P implies Q",
  }
```

### 5. Replace `toData()` / `exportState()` calls

```diff
- const data = engine.toData()
+ const snap = engine.snapshot()

- const data = engine.exportState()
+ const snap = engine.snapshot()

- const premiseData = premise.toData()
+ const premiseData = premise.toPremiseData()
```

### 6. Replace `TCoreArgumentEngineData`

```diff
- const data: TCoreArgumentEngineData = engine.toData()
+ const snap: TArgumentEngineSnapshot = engine.snapshot()
```
