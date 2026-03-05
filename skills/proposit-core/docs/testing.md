# Testing Guide

Reference for proposit-core test structure, conventions, and how to add new tests.

---

## Test File

All tests live in a single file: `test/ExpressionManager.test.ts` (~6500 lines, Vitest).

```bash
pnpm run test        # run all tests
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # prettier --check + eslint
pnpm run check       # typecheck + lint + test + build (all in sequence)
```

---

## Structure

Each `describe` block corresponds to a method or logical grouping. New features get a new `describe` at the bottom. Do not modify existing blocks unless fixing them.

---

## Fixture Convention

No shared `beforeEach`. Every test builds fixtures inline using helpers defined at the top of the test file.

### Constants and factory functions

```typescript
const ARG: Omit<TCoreArgument, "checksum"> = { id: "arg-1", version: 1 }

function makeVar(id: string, symbol: string): TVariableInput {
    return { id, argumentId: ARG.id, argumentVersion: ARG.version, symbol }
}

function makeVarExpr(
    id: string,
    variableId: string,
    opts: { parentId?: string | null; position?: number } = {}
): TExpressionInput {
    return {
        id,
        argumentId: ARG.id,
        argumentVersion: ARG.version,
        type: "variable",
        variableId,
        parentId: opts.parentId ?? null,
        position: opts.position ?? POSITION_INITIAL,
    }
}

function makeOpExpr(
    id: string,
    operator: "not" | "and" | "or" | "implies" | "iff",
    opts: { parentId?: string | null; position?: number } = {}
): TExpressionInput {
    return {
        id,
        argumentId: ARG.id,
        argumentVersion: ARG.version,
        type: "operator",
        operator,
        parentId: opts.parentId ?? null,
        position: opts.position ?? POSITION_INITIAL,
    }
}

function makeFormulaExpr(
    id: string,
    opts: { parentId?: string | null; position?: number } = {}
): TExpressionInput {
    return {
        id,
        argumentId: ARG.id,
        argumentVersion: ARG.version,
        type: "formula",
        parentId: opts.parentId ?? null,
        position: opts.position ?? POSITION_INITIAL,
    }
}
```

### Pre-built variables

```typescript
const VAR_P = makeVar("var-p", "P")
const VAR_Q = makeVar("var-q", "Q")
const VAR_R = makeVar("var-r", "R")
```

### Helper functions

```typescript
/** Create a premise (via ArgumentEngine) with P, Q, R pre-loaded. */
function premiseWithVars(): PremiseManager {
    const eng = new ArgumentEngine(ARG)
    eng.addVariable(VAR_P)
    eng.addVariable(VAR_Q)
    eng.addVariable(VAR_R)
    const { result: pm } = eng.createPremise()
    return pm
}

/** Create a PremiseManager directly with a deterministic ID (for toData tests). */
function makePremise(extras?: Record<string, unknown>): PremiseManager {
    const vm = new VariableManager()
    return new PremiseManager("premise-1", ARG, vm, extras)
}
```

---

## Adding a New Test

1. Add a new `describe` block at the bottom of the file.
2. Build fixtures inline using the helpers above (`premiseWithVars()`, `makeVarExpr()`, etc.).
3. Destructure mutation results: `const { result, changes } = ...`
4. Assert on both the return value and changeset side effects.
5. Run `pnpm run test` to verify.

### Example: testing a new PremiseManager method

```typescript
describe("PremiseManager —myNewMethod", () => {
    it("does the expected thing", () => {
        const pm = premiseWithVars()
        const { result: root } = pm.addExpression(makeOpExpr("op-1", "and"))
        const { result, changes } = pm.myNewMethod("op-1")

        // Assert on the direct return value
        expect(result).toBeDefined()

        // Assert on changeset side effects
        expect(changes.expressions?.modified).toHaveLength(1)
    })
})
```

---

## Existing Describe Blocks

Full ordered list (42 blocks):

| #   | Block name                                                               |
| --- | ------------------------------------------------------------------------ |
| 1   | `addExpression`                                                          |
| 2   | `insertExpression`                                                       |
| 3   | `removeExpression`                                                       |
| 4   | `removeExpression —operator collapse`                                    |
| 5   | `removeVariable`                                                         |
| 6   | `addExpression ordering`                                                 |
| 7   | `toArray behaviour (via toData().expressions)`                           |
| 8   | `stress test`                                                            |
| 9   | `formula`                                                                |
| 10  | `ArgumentEngine premise CRUD`                                            |
| 11  | `ArgumentEngine —addVariable / removeVariable`                           |
| 12  | `PremiseManager —single-root enforcement`                                |
| 13  | `PremiseManager —addExpression / removeExpression / insertExpression`    |
| 14  | `PremiseManager —toDisplayString`                                        |
| 15  | `PremiseManager —toData`                                                 |
| 16  | `PremiseManager —validation and evaluation`                              |
| 17  | `ArgumentEngine —roles and evaluation`                                   |
| 18  | `ArgumentEngine —complex argument scenarios across multiple evaluations` |
| 19  | `diffArguments`                                                          |
| 20  | `Kleene three-valued logic helpers`                                      |
| 21  | `PremiseManager —three-valued evaluation`                                |
| 22  | `ArgumentEngine —three-valued evaluation`                                |
| 23  | `schema shapes with additionalProperties`                                |
| 24  | `field preservation —unknown fields survive round-trips`                 |
| 25  | `buildPremiseProfile`                                                    |
| 26  | `analyzePremiseRelationships —direct relationships`                      |
| 27  | `analyzePremiseRelationships —transitive relationships`                  |
| 28  | `analyzePremiseRelationships —precedence and edge cases`                 |
| 29  | `position utilities`                                                     |
| 30  | `PremiseManager —appendExpression and addExpressionRelative`             |
| 31  | `ChangeCollector`                                                        |
| 32  | `PremiseManager —mutation changesets`                                    |
| 33  | `ArgumentEngine —mutation changesets`                                    |
| 34  | `checksum utilities`                                                     |
| 35  | `entity checksum fields`                                                 |
| 36  | `createChecksumConfig`                                                   |
| 37  | `ArgumentEngine —variable management`                                    |
| 38  | `PremiseManager —deleteExpressionsUsingVariable`                         |
| 39  | `variable expressions cannot have children`                              |
| 40  | `ArgumentEngine —auto-conclusion on first premise`                       |
| 41  | `PremiseManager —updateExpression`                                       |
| 42  | `removeExpression —deleteSubtree parameter`                              |

---

## Key Testing Patterns

### Destructure mutation results

All mutating methods return `TCoreMutationResult<T>`. Always destructure and assert on both parts:

```typescript
const { result, changes } = pm.addExpression(makeVarExpr("v1", "var-p"))
expect(result.id).toBe("v1")
expect(changes.expressions?.added).toHaveLength(1)
```

### Operator collapse after removal

When removing an expression, assert on the parent/child state afterward. Operator collapse may delete the parent or promote a surviving child:

```typescript
const { changes } = pm.removeExpression("child-2", true)
// Parent operator collapsed -- check it was removed
expect(changes.expressions?.removed?.map((e) => e.id)).toContain("op-1")
```

### Cascade operations (e.g. removeVariable)

Check `changes.expressions.removed` across all affected premises:

```typescript
const { changes } = engine.removeVariable("var-p")
expect(changes.expressions?.removed?.length).toBeGreaterThan(0)
expect(changes.variables?.removed).toHaveLength(1)
```

### Verify tree structure

Use `pm.toData().expressions` to inspect the full expression array:

```typescript
const exprs = pm.toData().expressions
expect(exprs).toHaveLength(3)
expect(exprs[0].parentId).toBeNull() // root
```

### Verify rendered formula

Use `pm.toDisplayString()` to check the human-readable form:

```typescript
expect(pm.toDisplayString()).toBe("(P AND Q) IMPLIES R")
```

### Evaluation tests

Build an assignment and check evaluation results:

```typescript
const assignment: TCoreExpressionAssignment = {
    variables: { "var-p": true, "var-q": false },
    rejectedExpressionIds: [],
}
const evalResult = pm.evaluate(assignment)
expect(evalResult.rootValue).toBe(false)
```

### Root-only operator enforcement

`implies` and `iff` must have `parentId: null`. Tests should verify that nesting them throws:

```typescript
expect(() =>
    pm.addExpression(
        makeOpExpr("nested-implies", "implies", { parentId: "op-1" })
    )
).toThrow()
```

---

## Commands Reference

| Command               | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `pnpm run test`       | Run all tests (vitest run)                      |
| `pnpm run check`      | Typecheck + lint + test + build (full pipeline) |
| `pnpm run typecheck`  | tsc --noEmit                                    |
| `pnpm run lint`       | prettier --check + eslint                       |
| `pnpm run prettify`   | prettier --write (auto-fix formatting)          |
| `pnpm eslint . --fix` | Auto-fix lint errors                            |
