---
name: proposit-core
description: Use when working with the proposit-core library — building propositional logic arguments, managing premises/variables/expressions, evaluating with Kleene three-valued logic, or using the proposit-core CLI.
---

# proposit-core

A TypeScript library and CLI for building, evaluating, and analyzing propositional logic arguments using Kleene three-valued logic.

## When to Use

- Building or manipulating propositional logic arguments programmatically
- Managing premises, variables, and expression trees
- Evaluating arguments under variable assignments (three-valued: true/false/null)
- Checking argument validity via truth-table enumeration
- Diffing argument versions or analyzing premise relationships
- Using the proposit-core CLI to manage arguments on disk
- Writing tests for proposit-core features

## Key Patterns

- All mutating methods return `TCoreMutationResult<T>` — destructure `{ result, changes }`
- Intent-based expression insertion: prefer `appendExpression`/`addExpressionRelative` over `addExpression`
- Supporting premises derived from expression type (no explicit assignment)
- Per-entity checksums are lazy (computed on read)
- ESM with `.js` extensions on all relative imports
- Typebox schemas with `Value.Parse()` for runtime validation

## Reference

- **API Usage** — `docs/api-usage.md` — Creating arguments, managing premises/variables/expressions, evaluation, validity checking, diffing, relationship analysis.
- **Architecture & Design** — `docs/architecture.md` — Class hierarchy, expression tree internals, midpoint positions, operator collapse, mutation changesets, checksums.
- **Types & Schemas** — `docs/types-schemas.md` — All exported types: expression unions, evaluation types, mutation result types, diff types, relationship types, checksum config.
- **Testing** — `docs/testing.md` — Test file structure, describe block conventions, fixture patterns, how to add new tests.
- **CLI** — `docs/cli.md` — CLI routing, state storage layout, engine hydration, version resolution, command reference.
