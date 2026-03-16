# README Mermaid Diagrams — Design Spec

## Goal

Add Mermaid diagrams to the README to help developers integrating the library quickly understand the data model, expression tree structure, argument composition, and evaluation flow.

## Decisions

- **Format:** Mermaid (rendered natively by GitHub, version-controlled in markdown)
- **Audience:** Developers integrating the library
- **Style:** Top-down containment/flowchart
- **Placement:** High-level overview near the top of README + detailed diagrams inline in Concepts

## Diagram Set

### 1. High-Level Overview

**Location:** New "Visual Overview" section after the opening paragraph, before Concepts.

**Content:** Top-down flowchart (`flowchart TD`) showing the full ArgumentEngine containment hierarchy:

- `ArgumentEngine` at the top
- Owned entities: Premises (0..N), Variables (0..N, shared across premises), Roles
- Each Premise contains an ExpressionManager with an expression tree
- Injected dependencies shown to the side: ClaimLibrary, SourceLibrary, ClaimSourceLibrary
- Variables connect to ClaimLibrary (claim-bound) or to Premises (premise-bound)

**Purpose:** Give developers the 10-second mental model before reading prose.

### 2. Expression Tree Diagram

**Location:** Inline in Concepts → Expressions section.

**Content:** Tree diagram (`flowchart TD`) showing a concrete expression: `¬(P ∧ R) → (Q ∨ S)`.

Nodes show:
- Root `implies` operator (root-only annotation)
- Left subtree: `not` → `and` (variadic) → variable leaves `P`, `R`
- Right subtree: `or` (variadic) → variable leaves `Q`, `S`
- Node labels indicate type: operator nodes show the logical symbol, variable nodes show the symbol name
- Node styling differentiates operators, variables, and formula nodes

**Purpose:** Show how expressions form trees, the parent-child relationship, and the root-only constraint for `implies`/`iff`.

### 3. Argument Composition Diagram

**Location:** Inline in Concepts, spanning Premises and Argument Roles subsections.

**Content:** Flowchart (`flowchart LR` or `flowchart TD`) showing a concrete argument with:

- Three premises with role annotations: one supporting (inference, root is `implies`), one constraint (root is a non-implication), one conclusion
- Variables `P`, `Q`, `R` shown as shared across premises (referenced by multiple premise expression trees)
- The auto-conclusion rule noted: first premise added becomes conclusion if none set
- Supporting = inference premise that isn't the conclusion (derived, not stored)

**Purpose:** Show how premises, roles, and shared variables compose an argument.

### 4. Evaluation Flow Diagram

**Location:** Inline near the evaluation/validity code examples (after Concepts, near the "Evaluating an argument" and "Checking validity" sections).

**Content:** Left-to-right flowchart (`flowchart LR`) showing the evaluation pipeline:

1. **Input:** Variable assignment (symbol → true/false/null) + rejected expression IDs
2. **Constraint check:** Evaluate constraint premises → admissible? (three-valued)
3. **Supporting premises:** Evaluate each supporting premise → all true? (three-valued)
4. **Conclusion:** Evaluate conclusion premise → true? (three-valued)
5. **Decision:** If all supporting true AND conclusion false → counterexample
6. **Validity:** No counterexamples across all admissible assignments → valid

Decision nodes use diamond shapes. Three-valued outcomes (true/false/null) shown at each evaluation step.

**Purpose:** Show the evaluation pipeline and how Kleene three-valued logic flows through it.

## README Structure Changes

Current structure:
```
# proposit-core
  (opening paragraph)
  ## Installation
  ## Concepts
    ### Argument
    ### Premises
    ### Variables
    ### Expressions
    ### Argument roles
    ### Sources
  ## Usage
  ...
```

New structure:
```
# proposit-core
  (opening paragraph)
  ## Visual Overview          ← NEW: Diagram 1
  ## Installation
  ## Concepts
    ### Argument
    ### Premises
    ### Argument roles
      (Diagram 3 inline)      ← NEW: Diagram 3
    ### Variables
    ### Expressions
      (Diagram 2 inline)      ← NEW: Diagram 2
    ### Sources
  ## Usage
    ### Evaluating an argument
      (Diagram 4 inline)      ← NEW: Diagram 4
  ...
```

## Mermaid Conventions

- Use `flowchart TD` for vertical hierarchy diagrams (overview, expression tree)
- Use `flowchart LR` for pipeline/flow diagrams (evaluation)
- Use subgraphs to group related entities (e.g., injected libraries)
- Style nodes by type: rounded for data entities, diamond for decisions, stadium for annotations
- Keep labels concise — full explanations stay in prose
- No custom CSS classes (not supported in GitHub Mermaid rendering)

## Out of Scope

- Interactive diagrams or JavaScript-based rendering
- Diagrams outside the README (API reference, etc.)
- Diagrams for the CLI or on-disk storage format
