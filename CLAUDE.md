# proposit-core — Claude Code Guide

## Commands

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # prettier --check + eslint
pnpm run prettify    # prettier --write (auto-fix formatting)
pnpm run test        # vitest run
pnpm run build       # tsc -p tsconfig.build.json → dist/
pnpm run check       # all of the above in sequence
```

Run `pnpm eslint . --fix` to auto-fix lint errors before checking manually.

## Architecture

```
src/
  index.ts              # Public entry point — re-exports ArgumentEngine and all schemata
  lib/
    index.ts            # All engine logic (VariableManager, ExpressionManager, ArgumentEngine)
    utils.ts            # DefaultMap utility
    schemata/
      argument.ts       # TArgument schema + type
      propositional.ts  # TPropositionalVariable, TPropositionalExpression, operator types
      shared.ts         # UUID, Nullable helpers

test/
  ExpressionManager.test.ts   # Full test suite (56 tests, Vitest)
```

There is one implementation file (`src/lib/index.ts`) and one test file. All logic lives in those two files.

## Key design decisions

### Expression tree representation

Expressions form a rooted tree stored flat in three maps inside `ExpressionManager`:

- `expressions: Map<string, TPropositionalExpression>` — the main store.
- `childExpressionIdsByParentId: Map<string | null, Set<string>>` — fast child lookup. The `null` key holds root expressions.
- `childPositionsByParentId: Map<string | null, Set<number>>` — tracks which positions are occupied under each parent.

Expressions are **immutable value objects** — to "move" one, delete and re-insert or use `reparent()`.

### Root-only operators

`implies` and `iff` must always have `parentId: null`. They cannot be nested inside another expression. This is enforced in both `addExpression` and `insertExpression`.

### Operator collapse on removal

After `removeExpression` deletes a subtree, `collapseIfNeeded(parentId)` is called:

- **0 children remaining** — the operator is deleted; the check recurses to the grandparent.
- **1 child remaining** — the operator is deleted and the surviving child is promoted into the operator's former slot. No recursion (grandparent's child count is unchanged).

### `insertExpression` mutation order

`reparent(rightNodeId, ...)` runs **before** `reparent(leftNodeId, ...)`. This handles the case where the right node is a descendant of the left node's subtree — it must be detached first.

## Types

`TPropositionalExpression<T>` is a discriminated union narrowed by `type`:

```typescript
TPropositionalExpression<"variable"> // has variableId
TPropositionalExpression<"operator"> // has operator
TPropositionalExpression // either
```

Schemata use [Typebox](https://github.com/sinclairzx81/typebox) for runtime-validatable schemas alongside TypeScript types.

## Testing

Tests live in `test/ExpressionManager.test.ts` and operate directly on `ArgumentEngine`. Each `describe` block corresponds to a method. All tests build their own fixtures inline — there is no shared `beforeEach` state.

When adding a test for a new feature, add a new `describe` block at the bottom.

## Linting notes

- `*.mjs` files (including `eslint.config.mjs`) are excluded from type-aware ESLint rules — see the `disableTypeChecked` override in `eslint.config.mjs`.
- `.claude/` is excluded from Prettier via `.prettierignore`.
- Run `pnpm eslint . --fix` to auto-fix `prefer-optional-chain` and similar stylistic issues before running a manual check.
