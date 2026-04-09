# Changelog

## Added

- `TFormulaTreeVisitor<T>` interface and `TFormulaTreeWalking` interface in `src/lib/core/interfaces/premise-engine.interfaces.ts`
- `PremiseEngine.walkFormulaTree<T>(visitor)` — public generic tree walker delegating to visitor callbacks for variable, operator, formula, and empty nodes
- Private `walkExpression<T>()` helper in `PremiseEngine` for recursive traversal
- 6 tests in `test/core.test.ts` covering empty premise, single variable, binary operator, nested formula, and `toDisplayString` consistency
- Exported `TFormulaTreeVisitor` and `TFormulaTreeWalking` from `src/lib/core/interfaces/index.ts`

## Removed

- `docs/change-requests/2026-04-08-formula-tree-walker.md` (implemented)
- `docs/change-requests/2026-04-09-wrap-expression-formula-auto-wrap.md` (already handled by existing auto-normalize)
