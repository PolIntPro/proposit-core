# Changelog

## 5db5a44..HEAD

### Breaking Changes

- `TCoreExpressionAssignment.rejectedExpressionIds: string[]` replaced by `operatorAssignments: Record<string, "accepted" | "rejected">` (`src/lib/types/evaluation.ts`)
- `CoreAnalysisFileSchema.rejectedExpressionIds` replaced by `operatorAssignments` record schema (`src/lib/schemata/analysis.ts`)
- New exported type: `TCoreOperatorAssignment = "accepted" | "rejected"` (`src/lib/types/evaluation.ts`)
- CLI commands removed: `analysis reject`, `analysis accept`, `analysis reject-all`, `analysis accept-all`
- Default analysis filename changed from `analysis.json` to auto-incrementing `analysis-N.json`

### Features

- **Operator constraint propagation**: accepted operators propagate constraints to unknown variables during evaluation. Two-phase propagation: rejections first (establishing false values), then acceptances (filling remaining unknowns). False derivations from rejection override true derivations from acceptance. Runs unconditionally in `ArgumentEngine.evaluate()` (`src/lib/core/argument-engine.ts`)
- **Rejected operator propagation**: rejected operators now propagate constraints downward (e.g., rejected `A → B` forces A=true and B=false). Previously, rejected operators only forced the expression to false without deriving child values.
- **Evaluation grading**: new `gradeEvaluation(result)` utility returns a human-readable grade (Sound, Vacuously True, Unsound, Counterexample, Inadmissible, Indeterminate) with label and color (`src/lib/core/evaluation/grading.ts`). Exported types: `TCoreEvaluationGrade`, `TCoreEvaluationGrading`.
- **Graph evaluation summary box**: HTML-label node showing grade headline (colored) and key metrics (admissible, all supporting, conclusion true, counterexample) (`src/cli/commands/graph.ts`)
- **Vacuously true premise styling**: premises with vacuously true implies roots shown with goldenrod/yellow border instead of green (`src/cli/commands/graph.ts`)
- **Variable expression node coloring under rejected operators**: variable expression nodes under rejected operators inherit their color from the variable's assignment value (`src/cli/commands/graph.ts`)
- **New CLI commands**: `analysis set-operator <id> <state>` and `analysis set-all-operators <state>` where state is `accepted`, `rejected`, or `unset` (`src/cli/commands/analysis.ts`)
- **Analysis file copying**: `analysis create --from <file>` copies assignments and operator states from an existing analysis file (`src/cli/commands/analysis.ts`)
- **Auto-incrementing analysis filenames**: `analysis create` generates `analysis-1.json`, `analysis-2.json`, etc. when no filename is given. `--file` defaults to latest `analysis-N.json` when omitted (`src/cli/storage/analysis.ts`)
- **Operator state in `analysis operators`**: added `--file` option to show acceptance states from an analysis file (`src/cli/commands/analysis.ts`)
- **Grade in evaluate output**: `analysis evaluate` prints grade as first line in text output and includes `grading` object in JSON output (`src/cli/commands/analysis.ts`)

### Bug Fixes

- Fixed CLI confirmation prompt hanging after user types "confirm" — `/dev/tty` file stream now destroyed after readline closes (`src/cli/output.ts`)

### Tests

- 10 new operator constraint propagation tests in `test/core.test.ts` (implies, and, or, not, iff, cross-premise fixed-point, user override, unset no-propagation)
- 2 new `requireConfirmation` tests in `test/require-confirmation.test.ts`
