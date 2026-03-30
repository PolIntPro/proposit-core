# Release Notes

## Operator Constraint Propagation

Operators in an analysis can now be marked as **accepted** or **rejected**, replacing the old binary rejected/not-rejected model.

- **Accepted operators** assert that the logical relationship holds. When you accept an implication and set the antecedent to true, the engine automatically derives that the consequent must be true — no need to manually assign every variable.
- **Rejected operators** force the expression to false and propagate constraints downward (e.g., a rejected `A → B` with A=true derives B=false). False derivations from rejection override true derivations from acceptance.
- **Unset operators** evaluate normally from their children via Kleene logic.

Propagation runs automatically during evaluation in two phases: rejections first (establishing false values), then acceptances (filling remaining unknowns). This prevents acceptance from deriving values through chains that are later invalidated by rejection.

User-assigned variable values always take priority over propagated values. If a contradiction arises (e.g., an accepted AND with a user-set false child), it surfaces naturally in the evaluation results.

## Evaluation Grading

Evaluation results now include a human-readable grade summarizing the logical status:

- **Sound** (green) — all premises hold, conclusion true
- **Vacuously True** (orange) — conclusion true only because the antecedent is false
- **Unsound** (red) — a supporting premise evaluates to false
- **Counterexample** (red) — all premises true but conclusion false
- **Inadmissible** (gray) — constraints not satisfied
- **Indeterminate** (gray) — cannot determine (unknown values)

The grade appears in `analysis evaluate` output and in the graph evaluation summary box.

## Graph Visualization Improvements

- Evaluation summary box with grade headline and key metrics (admissible, all supporting, conclusion true, counterexample)
- Vacuously true premises shown with yellow/goldenrod border instead of green
- Accepted operators shown with green double border, rejected with red double border
- Variable expression nodes under rejected operators now inherit their color from the variable's assignment value

## New CLI Commands

- `analysis set-operator <id> <accepted|rejected|unset>` — set a single operator's state
- `analysis set-all-operators <accepted|rejected|unset>` — mass-set all operators
- `analysis create --from <file>` — copy an existing analysis file as a starting point
- `analysis operators --file <file>` — shows operator acceptance states from an analysis file

The old `reject`, `accept`, `reject-all`, and `accept-all` commands have been removed.

## Auto-Incrementing Analysis Filenames

`analysis create` (with no filename argument) now generates `analysis-1.json`, `analysis-2.json`, etc. instead of always using `analysis.json`. When `--file` is not specified on other analysis commands, the latest `analysis-N.json` is used automatically.

## Breaking Changes

- The analysis file schema field `rejectedExpressionIds` (string array) has been replaced by `operatorAssignments` (record mapping expression IDs to "accepted" or "rejected"). Existing analysis files must be migrated manually.
- The `TCoreExpressionAssignment` type has the same change.
- The default analysis filename is no longer `analysis.json` — it is auto-generated as `analysis-1.json`, etc.

## Bug Fix

- Fixed: CLI commands requiring confirmation (e.g., `arguments delete`) would hang after typing "confirm" because the `/dev/tty` file stream was not destroyed after readline closed.
