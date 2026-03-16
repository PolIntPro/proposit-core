# Premise-Variable Associations — Design Spec

**Date:** 2026-03-15
**Status:** Approved

## Problem

The root-only operator restriction means `implies` and `iff` cannot be nested. To express "P implies that A implies B" as a single argument, you need two premises:

- Premise 1: `A implies B`
- Premise 2: `P implies Q`

Where Q "stands for" Premise 1's content. Currently, Q references a claim in ClaimLibrary, but there is no structural link between Q and the expression tree of Premise 1. The claim is just metadata — it doesn't say "Q is this specific premise."

## Solution

A **premise-variable binding** that binds a variable to a premise within the same argument. The binding is semantically load-bearing: the evaluator treats a premise-bound variable as equivalent to its bound premise's expression tree during evaluation.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Binding target | Premise (not formula/expression) | Motivating use case is nested implications, which are whole-premise constructs |
| Semantic equivalence | Yes | If the binding doesn't affect evaluation, it's just a label |
| Storage | Argument-internal | Bindings are argument-scoped and tightly coupled to evaluation |
| Variable binding model | Claim XOR premise (discriminated union) | Clean type safety, no ambiguous optional combinations |
| Schema future-proofing | Include `boundArgumentId`/`boundArgumentVersion` fields | Enables cross-argument references in the future |
| Current scope restriction | Same-argument only | `boundArgumentId` must equal variable's `argumentId` |
| Circularity prevention | Enforced at bind time and expression-add time | Cycles are logical errors, not evaluation edge cases |
| Evaluation strategy | Lazy resolution | Preserves original tree structure, handles recursive bindings naturally |
| Premise removal cascade | Deletes bound variables (which cascade through expressions) | Consistent with existing cascade behavior |
| Cardinality | Many-to-one (multiple variables can bind to one premise) | No reason to artificially restrict |

## 1. Variable Schema Changes

`TCorePropositionalVariable` becomes a discriminated union of two types:

### Claim-Bound Variable

```typescript
{
  id: UUID
  argumentId: UUID
  argumentVersion: number
  symbol: string
  claimId: UUID          // required
  claimVersion: number   // required
  checksum: string
}
```

This is the existing variable shape, unchanged.

### Premise-Bound Variable

```typescript
{
  id: UUID
  argumentId: UUID
  argumentVersion: number
  symbol: string
  boundPremiseId: UUID          // required
  boundArgumentId: UUID         // required
  boundArgumentVersion: number  // required
  checksum: string
}
```

The union type: `TCorePropositionalVariable = TClaimBoundVariable | TPremiseBoundVariable`

Runtime discrimination: check for the presence of `claimId` vs `boundPremiseId`. Type guards `isClaimBound(v)` and `isPremiseBound(v)` make downstream code clean.

### Checksum Fields

`variableFields` in `TCoreChecksumConfig` includes all six binding fields. For any given variable, only one group is present — absent fields are excluded from checksum computation. Claim-bound variables produce the same checksums as before.

### Current Validation Restriction

`boundArgumentId` must equal `variable.argumentId`. Enforced at bind time. This restriction can be relaxed in a future version for cross-argument references.

## 2. API Surface on ArgumentEngine

### New Methods

**`bindVariableToPremise(variable: TPremiseBoundVariableInput): TCoreMutationResult`**

Creates a premise-bound variable. Validates:
- `boundPremiseId` references an existing premise in this argument
- `boundArgumentId === variable.argumentId` (current restriction)
- Symbol uniqueness (same as `addVariable`)
- Circularity: vacuously safe at creation (variable doesn't exist yet), but relevant if rebinding is added later

**`getVariablesBoundToPremise(premiseId: string): TVar[]`**

Returns all variables bound to a given premise. Useful for cascade logic and for callers to understand bindings.

### Modified Methods

**`removePremise(premiseId)`**

After removing the premise, scans variables for `boundPremiseId === premiseId` and cascades their removal via `removeVariable` (which in turn cascades through expressions).

**`addExpression` / `appendExpression`**

When adding a variable-expression that references a variable, checks for circularity. If the referenced variable is premise-bound to the premise being modified (directly or transitively), rejects with an error.

### Unchanged Methods

**`removeVariable(variableId)`** — Works the same for both claim-bound and premise-bound variables. Removes the variable and cascades through expressions.

**`addVariable(variable)`** — Continues to accept claim-bound variables only. Premise-bound variables are created via `bindVariableToPremise`.

## 3. Circularity Prevention

Cycles are forbidden. Two enforcement points:

### At Bind Time

Before creating a premise-bound variable, verify that the target premise's expression tree does not reference the variable being created. Vacuously safe at creation (variable doesn't exist yet), but meaningful if rebinding is added later.

### At Expression-Add Time

When adding a variable-expression to a premise, check whether the referenced variable is bound to that premise (directly or transitively).

**Direct check:** `variable.boundPremiseId === expression.premiseId` → reject.

**Transitive check:** Walk the binding chain. When adding variable-expression for Q to Premise X:
1. If Q is premise-bound, find Q's target premise
2. Collect all variable-expressions in that target premise's tree
3. For each such variable, if it is premise-bound to Premise X, reject
4. Recursively check each such variable's binding chain

The acyclicity invariant (enforced incrementally) guarantees this walk terminates. Cost is proportional to binding chain depth, which is very shallow in practice (1-2 levels).

## 4. Evaluation Changes

### Variable Resolution

When the evaluator encounters a variable-expression:
1. Check if the variable is claim-bound or premise-bound
2. If **claim-bound**: look up truth value from the current assignment (existing behavior)
3. If **premise-bound**: evaluate the target premise's expression tree under the current assignment and return the result (lazy resolution)

### Assignment Generation

Only **claim-bound variables** get truth table columns. Premise-bound variables are computed, not assigned. Total assignments = `2^n` where `n` = count of claim-bound variables.

### Recursive Resolution

If a bound premise's tree contains another premise-bound variable, the evaluator naturally recurses. The acyclicity guarantee ensures termination.

### Caching

A premise-bound variable produces the same value for a given assignment regardless of where it appears. The evaluator caches resolved values per-variable per-assignment to avoid redundant tree walks.

## 5. Snapshot and Diff Impact

### Snapshots

No structural changes. `TVariableManagerSnapshot<TVar>` already serializes all variables. Premise-bound variables are captured naturally via their fields. `fromSnapshot` restores them; binding relationships are implicit in the variable data.

### Diff

Variable diffs compare variable entities through the existing variable comparator. The new fields (`boundPremiseId`, `boundArgumentId`, `boundArgumentVersion`) participate in diffing. A variable changing from claim-bound to premise-bound shows up as field-level changes. `defaultCompareVariable` updated to include new fields.

### Changesets

No changes. Variable mutations appear in `variables.added`/`variables.updated`/`variables.removed`. Premise-bound variables flow through the same paths.

### Reactive Snapshots

Variable changes are already tracked. The `onMutate` callback fires for premise-bound variable creation and cascade deletions.

## 6. Cascade Behavior

### `removePremise(premiseId)`

1. Remove the premise and its expressions (existing behavior)
2. Scan variables for `boundPremiseId === premiseId`
3. For each bound variable found, call `removeVariable`
4. `removeVariable` cascades: deletes all variable-expressions referencing it across all premises, with operator collapse

### `removeVariable(variableId)`

No change. Works identically for claim-bound and premise-bound variables.

### Cascade Ordering

Premise removal → variable removal → expression removal. Each step can trigger operator collapse. Same pattern as existing `removeVariable` cascade, with an additional entry point from `removePremise`.

### No Cascade on Library Changes

Removing a claim from `ClaimLibrary` does not cascade into variables (claims are versioned and frozen, not deleted). Unchanged.

## 7. CLI Impact

**`variables create`** — Unchanged. Creates claim-bound variables.

**`variables bind`** (new) — Creates a premise-bound variable bound to a specified premise. Accepts `--symbol` and `--premiseId`; infers `boundArgumentId`/`boundArgumentVersion` from current argument context.

**`variables list`** — Updated to display binding type. Claim-bound variables show claim reference; premise-bound variables show bound premise ID.

**`variables delete`** — Unchanged. Handles both types via existing `removeVariable` cascade.
