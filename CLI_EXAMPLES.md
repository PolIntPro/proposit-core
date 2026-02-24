# CLI Examples

A complete walkthrough of the `core` CLI, from creating an argument to checking its validity. All commands can be copied and pasted into your terminal.

## Prerequisites

Build the project first:

```bash
pnpm run build
```

Then run commands using either form:

```bash
pnpm cli -- <args>      # run from the local build
core <args>             # if installed globally
```

The examples below use `core` for brevity. Substitute `pnpm cli --` when running from source.

---

## 1. Meta

```bash
core version
```

---

## 2. Arguments

### Create

`arguments create` returns the new argument's UUID on stdout, which you can capture directly:

```bash
ARG_ID=$(core arguments create "Hypothetical Syllogism" \
  "If P→Q and Q→R then P→R")

echo "Created: $ARG_ID"
```

### List

```bash
core arguments list
core arguments list --json
```

### Inspect a version

```bash
core $ARG_ID latest show
core $ARG_ID latest show --json
```

---

## 3. Variables

Register propositional variables for the argument. Each `variables create` call returns the new variable's UUID:

```bash
P_ID=$(core $ARG_ID latest variables create P)
Q_ID=$(core $ARG_ID latest variables create Q)
R_ID=$(core $ARG_ID latest variables create R)

echo "P=$P_ID  Q=$Q_ID  R=$R_ID"
```

List and inspect:

```bash
core $ARG_ID latest variables list
core $ARG_ID latest variables list --json
core $ARG_ID latest variables show $P_ID
```

Rename a variable:

```bash
core $ARG_ID latest variables update $P_ID --symbol "P_new"
core $ARG_ID latest variables update $P_ID --symbol P     # rename back
```

---

## 4. Premises

Create empty premise shells (they hold expression trees, which you add next):

```bash
P1_ID=$(core $ARG_ID latest premises create --title "P implies Q")
P2_ID=$(core $ARG_ID latest premises create --title "Q implies R")
P3_ID=$(core $ARG_ID latest premises create --title "P implies R")

echo "Premises: $P1_ID  $P2_ID  $P3_ID"
```

List all premises:

```bash
core $ARG_ID latest premises list
core $ARG_ID latest premises list --json
```

---

## 5. Expressions

Each premise needs an expression tree. For an implication `A → B`, the tree is:

```
implies  (root, parentId=null)
├── A    (variable, position=0)
└── B    (variable, position=1)
```

`expressions create` returns the new expression's UUID.

### Premise 1: P → Q

```bash
# Root: implies operator
ROOT1=$(core $ARG_ID latest expressions create $P1_ID \
  --type operator --operator implies)

# Left antecedent: variable P at position 0
core $ARG_ID latest expressions create $P1_ID \
  --type variable --variable-id $P_ID \
  --parent-id $ROOT1 --position 0

# Right consequent: variable Q at position 1
core $ARG_ID latest expressions create $P1_ID \
  --type variable --variable-id $Q_ID \
  --parent-id $ROOT1 --position 1

# Verify
core $ARG_ID latest premises render $P1_ID
# → P → Q
```

### Premise 2: Q → R

```bash
ROOT2=$(core $ARG_ID latest expressions create $P2_ID \
  --type operator --operator implies)

core $ARG_ID latest expressions create $P2_ID \
  --type variable --variable-id $Q_ID \
  --parent-id $ROOT2 --position 0

core $ARG_ID latest expressions create $P2_ID \
  --type variable --variable-id $R_ID \
  --parent-id $ROOT2 --position 1

core $ARG_ID latest premises render $P2_ID
# → Q → R
```

### Premise 3: P → R (the conclusion)

```bash
ROOT3=$(core $ARG_ID latest expressions create $P3_ID \
  --type operator --operator implies)

core $ARG_ID latest expressions create $P3_ID \
  --type variable --variable-id $P_ID \
  --parent-id $ROOT3 --position 0

core $ARG_ID latest expressions create $P3_ID \
  --type variable --variable-id $R_ID \
  --parent-id $ROOT3 --position 1

core $ARG_ID latest premises render $P3_ID
# → P → R
```

### Inspect expressions

```bash
core $ARG_ID latest expressions list $P1_ID
core $ARG_ID latest expressions list $P1_ID --json
core $ARG_ID latest expressions show $P1_ID $ROOT1
```

---

## 6. Roles

Assign premises to logical roles. P1 and P2 are supporting premises; P3 is the conclusion:

```bash
core $ARG_ID latest roles add-support $P1_ID
core $ARG_ID latest roles add-support $P2_ID
core $ARG_ID latest roles set-conclusion $P3_ID

core $ARG_ID latest roles show
core $ARG_ID latest roles show --json
```

To undo role assignments:

```bash
core $ARG_ID latest roles remove-support $P1_ID
core $ARG_ID latest roles clear-conclusion
```

---

## 7. Render

Print all premises in one shot, with the conclusion marked by an asterisk:

```bash
core $ARG_ID latest render
# → <P3_ID>*: (P → R)
# → <P1_ID>: (P → Q)
# → <P2_ID>: (Q → R)
```

Each line follows the pattern `<premise_id>[*]: <display_string>`. The asterisk appears only on the premise with the conclusion role.

---

## 8. Analysis

### Validate the argument structure

Checks that the argument is well-formed and evaluable before running analysis:

```bash
core $ARG_ID latest analysis validate-argument
core $ARG_ID latest analysis validate-argument --json
```

### Create an analysis file

Creates `analysis.json` with all variables defaulting to `true`:

```bash
core $ARG_ID latest analysis create
```

Or specify a default value and/or a custom filename:

```bash
core $ARG_ID latest analysis create --default false
core $ARG_ID latest analysis create scenario-b.json
```

### View and modify assignments

```bash
core $ARG_ID latest analysis show
core $ARG_ID latest analysis show --json

# Assign specific truth values
core $ARG_ID latest analysis set P true
core $ARG_ID latest analysis set Q true
core $ARG_ID latest analysis set R true

# Reset all to false
core $ARG_ID latest analysis reset --value false

# Validate that the file matches the argument version
core $ARG_ID latest analysis validate-assignments
```

### Evaluate a specific assignment

Runs the argument engine on the assignments in the analysis file:

```bash
core $ARG_ID latest analysis evaluate
core $ARG_ID latest analysis evaluate --json
```

### Check validity (truth-table search)

Enumerates all 2³ = 8 assignments and searches for counterexamples:

```bash
core $ARG_ID latest analysis check-validity
core $ARG_ID latest analysis check-validity --mode exhaustive
core $ARG_ID latest analysis check-validity --json
```

The hypothetical syllogism argument is **valid** — no admissible assignment satisfies both supporting premises while falsifying the conclusion.

### Multiple analysis files

```bash
# Create a second analysis file to explore a specific assignment
core $ARG_ID latest analysis create counterexample-attempt.json

core $ARG_ID latest analysis set P true  --file counterexample-attempt.json
core $ARG_ID latest analysis set Q false --file counterexample-attempt.json
core $ARG_ID latest analysis set R false --file counterexample-attempt.json

core $ARG_ID latest analysis evaluate    --file counterexample-attempt.json
core $ARG_ID latest analysis list
```

### Inspect variable references across all premises

```bash
core $ARG_ID latest analysis refs
core $ARG_ID latest analysis refs --json
```

### Export the full engine state

```bash
core $ARG_ID latest analysis export
```

---

## 9. Publishing

Publishing locks the current version and prepares a new draft:

```bash
core arguments publish $ARG_ID
# Version 0 published, draft version 1 prepared

core $ARG_ID 0 show        # published version (read-only)
core $ARG_ID 1 show        # new draft
core $ARG_ID latest show   # same as version 1 (current latest)
```

Any mutation command on a published version will exit with an error. All further edits happen on the new draft.

---

## 10. Cleanup

```bash
# Delete a single premise (prompts for confirmation)
core $ARG_ID latest premises delete $P1_ID

# Skip the confirmation prompt
core $ARG_ID latest premises delete $P1_ID --confirm

# Delete the argument's latest unpublished version
core arguments delete $ARG_ID

# Delete all versions of an argument without a prompt
core arguments delete $ARG_ID --all --confirm
```

---

## Version selectors

All version-scoped commands (`<id> <version> <command>`) accept three forms:

| Selector         | Meaning                   |
| ---------------- | ------------------------- |
| `latest`         | Highest version number    |
| `last-published` | Highest published version |
| `0`, `1`, `2`, … | Exact version number      |

```bash
core $ARG_ID latest          show
core $ARG_ID last-published  show
core $ARG_ID 0               show
```

---

## Complete script

The full session above as a single runnable script:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Argument ──────────────────────────────────────────────────────────────────
ARG_ID=$(core arguments create "Hypothetical Syllogism" \
  "If P→Q and Q→R then P→R")
echo "ARG_ID=$ARG_ID"

# ── Variables ─────────────────────────────────────────────────────────────────
P_ID=$(core $ARG_ID latest variables create P)
Q_ID=$(core $ARG_ID latest variables create Q)
R_ID=$(core $ARG_ID latest variables create R)

# ── Premises ──────────────────────────────────────────────────────────────────
P1_ID=$(core $ARG_ID latest premises create --title "P implies Q")
P2_ID=$(core $ARG_ID latest premises create --title "Q implies R")
P3_ID=$(core $ARG_ID latest premises create --title "P implies R")

# ── Expressions: P → Q ────────────────────────────────────────────────────────
ROOT1=$(core $ARG_ID latest expressions create $P1_ID --type operator --operator implies)
core $ARG_ID latest expressions create $P1_ID --type variable --variable-id $P_ID --parent-id $ROOT1 --position 0
core $ARG_ID latest expressions create $P1_ID --type variable --variable-id $Q_ID --parent-id $ROOT1 --position 1

# ── Expressions: Q → R ────────────────────────────────────────────────────────
ROOT2=$(core $ARG_ID latest expressions create $P2_ID --type operator --operator implies)
core $ARG_ID latest expressions create $P2_ID --type variable --variable-id $Q_ID --parent-id $ROOT2 --position 0
core $ARG_ID latest expressions create $P2_ID --type variable --variable-id $R_ID --parent-id $ROOT2 --position 1

# ── Expressions: P → R ────────────────────────────────────────────────────────
ROOT3=$(core $ARG_ID latest expressions create $P3_ID --type operator --operator implies)
core $ARG_ID latest expressions create $P3_ID --type variable --variable-id $P_ID --parent-id $ROOT3 --position 0
core $ARG_ID latest expressions create $P3_ID --type variable --variable-id $R_ID --parent-id $ROOT3 --position 1

# ── Roles ─────────────────────────────────────────────────────────────────────
core $ARG_ID latest roles add-support $P1_ID
core $ARG_ID latest roles add-support $P2_ID
core $ARG_ID latest roles set-conclusion $P3_ID

# ── Render ────────────────────────────────────────────────────────────────────
core $ARG_ID latest render

# ── Analysis ──────────────────────────────────────────────────────────────────
core $ARG_ID latest analysis validate-argument
core $ARG_ID latest analysis create
core $ARG_ID latest analysis evaluate --json
core $ARG_ID latest analysis check-validity
```
