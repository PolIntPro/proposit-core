# Release Notes

## Operator Constraint Propagation

Operators in an analysis can now be marked as **accepted** or **rejected**, replacing the old binary rejected/not-rejected model.

- **Accepted operators** assert that the logical relationship holds. When you accept an implication and set the antecedent to true, the engine automatically derives that the consequent must be true — no need to manually assign every variable.
- **Rejected operators** force the expression to false (same as before).
- **Unset operators** evaluate normally from their children via Kleene logic.

Propagation runs automatically during evaluation and chains across premises. If premise 1 says A→B and premise 2 says B→C, accepting both and setting A=true derives B=true and then C=true.

User-assigned variable values always take priority over propagated values. If a contradiction arises (e.g., an accepted AND with a user-set false child), it surfaces naturally in the evaluation results.

## New CLI Commands

- `analysis set-operator <id> <accepted|rejected|unset>` — set a single operator's state
- `analysis set-all-operators <accepted|rejected|unset>` — mass-set all operators
- `analysis operators --file <file>` — now shows operator acceptance states from an analysis file

The old `reject`, `accept`, `reject-all`, and `accept-all` commands have been removed.

## Auto-Incrementing Analysis Filenames

`analysis create` (with no filename argument) now generates `analysis-1.json`, `analysis-2.json`, etc. instead of always using `analysis.json`. You can still pass an explicit filename if you prefer.

## Breaking Changes

- The analysis file schema field `rejectedExpressionIds` (string array) has been replaced by `operatorAssignments` (record mapping expression IDs to "accepted" or "rejected"). Existing analysis files must be migrated manually.
- The `TCoreExpressionAssignment` type has the same change.

## Bug Fix

- Fixed: CLI commands requiring confirmation (e.g., `arguments delete`) would hang after typing "confirm" because the `/dev/tty` file stream was not destroyed after readline closed.
