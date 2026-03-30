# Changelog

## 5db5a44..HEAD

### Breaking Changes

- `TCoreExpressionAssignment.rejectedExpressionIds: string[]` replaced by `operatorAssignments: Record<string, "accepted" | "rejected">` (`src/lib/types/evaluation.ts`)
- `CoreAnalysisFileSchema.rejectedExpressionIds` replaced by `operatorAssignments` record schema (`src/lib/schemata/analysis.ts`)
- New exported type: `TCoreOperatorAssignment = "accepted" | "rejected"` (`src/lib/types/evaluation.ts`)
- CLI commands removed: `analysis reject`, `analysis accept`, `analysis reject-all`, `analysis accept-all`

### Features

- **Operator constraint propagation**: accepted operators propagate constraints to unknown variables during evaluation. Fixed-point iteration across all premises. Runs unconditionally in `ArgumentEngine.evaluate()` (`src/lib/core/argument-engine.ts`)
- **New CLI commands**: `analysis set-operator <id> <state>` and `analysis set-all-operators <state>` where state is `accepted`, `rejected`, or `unset` (`src/cli/commands/analysis.ts`)
- **Auto-incrementing analysis filenames**: `analysis create` generates `analysis-1.json`, `analysis-2.json`, etc. when no filename is given (`src/cli/storage/analysis.ts`)
- **Operator state in `analysis operators`**: added `--file` option to show acceptance states from an analysis file (`src/cli/commands/analysis.ts`)
- **Graph visualization**: accepted operators shown with double border and green color; rejected with double border and red (`src/cli/commands/graph.ts`)

### Bug Fixes

- Fixed CLI confirmation prompt hanging after user types "confirm" — `/dev/tty` file stream now destroyed after readline closes (`src/cli/output.ts`)

### Tests

- 10 new operator constraint propagation tests in `test/core.test.ts` (implies, and, or, not, iff, cross-premise fixed-point, user override, unset no-propagation)
- 2 new `requireConfirmation` tests in `test/require-confirmation.test.ts`
