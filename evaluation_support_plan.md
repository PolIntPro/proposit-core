# Evaluation Support Plan

This document outlines the changes needed to make `proposit-core` ready to support both:

- construction of arguments (authoring/editing flows), and
- evaluation of arguments (structural validation, semantic evaluation, validity checks, and diagnostics).

The current `ArgumentEngine` is a strong structural editing engine. The missing pieces are argument-role semantics (premises vs conclusion), public read/introspection APIs, evaluability validation, and semantic evaluation APIs.

## Goals

1. Represent an argument as more than a set of root expressions.
2. Preserve good editing ergonomics while enabling deterministic evaluation.
3. Provide explicit structural validation for "evaluable" states.
4. Support semantic evaluation under one assignment and across all assignments.
5. Add diagnostics for inference operators, including vacuity/"firing" checks.

## Guiding Decisions (to confirm early)

1. Define argument shape:
    - Single conclusion + many premises (recommended), or
    - Multiple conclusions / richer role model.
2. Clarify terminology:
    - Use `satisfiesUnderAssignment`, `counterexample`, or `truthStatus` for single-assignment checks.
    - Reserve `soundness` for "valid + premises true in the intended interpretation" (or explicitly define a project-specific meaning).
3. Define `iff` "firing" semantics:
    - Treat as two directional implications (`left -> right` and `right -> left`) with separate vacuity diagnostics (recommended), or
    - Define a custom "non-vacuous iff" rule.
4. Decide behavior for incomplete trees during editing:
    - Allow incomplete trees (current behavior) but block evaluation with validation errors (recommended), or
    - Enforce completeness eagerly during edits (likely too restrictive).

## Phase 1: Public Read / Introspection API

The evaluator cannot be implemented cleanly without public access to engine state.

### Tasks

1. Add public read methods to `ArgumentEngine`
    - `getVariable(variableId)`
    - `getVariables()`
    - `getExpression(expressionId)`
    - `getExpressions()`
    - `getChildExpressions(parentId)`
    - `getRootExpressions()`

2. Add a stable snapshot/export method (recommended)
    - `exportState(): { argument, variables, expressions }`
    - Return copies (not internal mutable references).

3. Ensure public methods return deterministic ordering
    - Root expressions sorted the same way as internal child ordering.
    - Variables sorted by symbol or insertion order (pick and document one).

### Acceptance Criteria

- Evaluation code can traverse the entire expression forest without using private internals.
- Consumers can inspect roots and reconstruct premise/conclusion sets.

## Phase 2: Argument Role Model (Premises / Conclusion)

Today, all root expressions are just roots. Evaluation requires logical roles.

### Tasks

1. Introduce argument-role metadata
    - Option A (minimal): add `premiseRootIds: string[]` and `conclusionRootId: string | null` to engine-managed metadata.
    - Option B (more extensible): introduce a root-role schema (e.g., `TArgumentClaim` with `role: "premise" | "conclusion"` and `expressionId`).

2. Add public role-management API on `ArgumentEngine`
    - `setConclusion(rootExpressionId)`
    - `addPremise(rootExpressionId)`
    - `removePremise(rootExpressionId)`
    - `listPremises()`
    - `getConclusion()`

3. Enforce role invariants
    - Only root expressions may be assigned a role.
    - A root cannot be both premise and conclusion (unless explicitly allowed and documented).
    - Removing a root expression automatically removes or invalidates its role assignment.

4. Decide persistence shape
    - Extend `TArgument` schema, or
    - Store roles in a new schema exported alongside argument/variables/expressions.

### Acceptance Criteria

- The engine can unambiguously identify premises and conclusion.
- Role assignments remain consistent after `removeExpression` and `insertExpression`.

## Phase 3: Structural Validation for Evaluability

The current engine intentionally allows incomplete trees for authoring. Evaluation needs a stricter validation pass.

### Tasks

1. Add a dedicated validation API
    - `validateStructure()` or `validateEvaluability()`
    - Return structured diagnostics (do not rely only on thrown errors).

2. Validate operator completeness (minimum arity)
    - `not` must have exactly 1 child
    - `implies` and `iff` must have exactly 2 children
    - `and` and `or` must have at least 2 children (or explicitly allow unary/empty semantics if you choose to define them)

3. Validate positional integrity for ordered operators
    - `implies` / `iff` children must occupy positions `0` and `1`
    - Detect missing left/right side even when two children exist with malformed positions

4. Validate role completeness
    - At least one premise (if required by project semantics)
    - Exactly one conclusion (if single-conclusion model)
    - All referenced role expression IDs exist and are roots

5. Validate variable assignment readiness (optional in structural pass)
    - Collect all referenced variable IDs for later assignment validation

### Acceptance Criteria

- Incomplete authoring states produce clear validation errors instead of ambiguous evaluation behavior.
- Evaluation entry points can require a successful validation result.

## Phase 4: Semantic Expression Evaluation (Single Assignment)

Implement expression-level evaluation independent of argument validity.

### Tasks

1. Define assignment type
    - `Record<variableId, boolean>` (recommended), or
    - `Map<string, boolean>`
    - Consider helper overloads if both are useful.

2. Add assignment validation
    - Missing variable values
    - Unknown variable IDs
    - Optional strict mode for exact coverage (recommended for argument evaluation)

3. Implement expression evaluator
    - Evaluate each expression recursively from a root
    - Support `not`, `and`, `or`, `implies`, `iff`
    - Preserve left/right ordering for `implies` and `iff` via positions

4. Return rich evaluation output (not just booleans)
    - Root value
    - Per-expression values (useful for diagnostics/UI)
    - Per-variable resolved values

5. Memoize subtree evaluation within one run
    - Avoid repeated recomputation for diagnostics

### Acceptance Criteria

- Any structurally valid expression tree can be evaluated deterministically under a complete assignment.
- Diagnostic consumers can inspect node-level truth values.

## Phase 5: Argument Evaluation API (Single Assignment)

This phase evaluates premises and conclusion under one assignment and returns argument-specific results.

### Tasks

1. Define a top-level evaluation method
    - Example: `evaluateArgument(assignment, options?)`

2. Return argument-level result fields
    - `premises`: per-premise truth values
    - `conclusion`: truth value
    - `allPremisesTrue`
    - `isCounterexample` (`allPremisesTrue && !conclusion`)
    - `preservesTruthUnderAssignment` / equivalent name

3. Avoid using the term `sound` unless precisely defined
    - If retained, document the exact project meaning
    - Prefer `isSatisfiedByAssignment` or `isCounterexample`

4. Include validation results in the response (or fail fast)
    - Option A: throw on invalid structure/assignment
    - Option B: return `{ ok: false, errors }`
    - Pick one consistent pattern and document it

### Acceptance Criteria

- Consumers can answer "What happens under this assignment?" without manually traversing expressions.
- Output clearly distinguishes semantic failure (counterexample) from invalid engine state.

## Phase 6: Inference Operator Diagnostics (Vacuity / "Fired")

Implement diagnostics for `implies` and `iff` roots (and optionally nested forms if ever enabled later).

### Tasks

1. Define diagnostic schema
    - Expression ID
    - Operator (`implies` / `iff`)
    - Left value
    - Right value
    - Operator value
    - Vacuity/firing flags

2. Implement `implies` diagnostics
    - `isTrue`
    - `antecedentTrue`
    - `consequentTrue`
    - `isVacuouslyTrue = isTrue && !antecedentTrue`
    - `fired = antecedentTrue` (or `firedAndHeld = antecedentTrue && consequentTrue`, define both if useful)

3. Implement `iff` diagnostics (recommended as two directional checks)
    - Direction A: `left -> right`
    - Direction B: `right -> left`
    - Vacuity/firing flags per direction
    - Optional aggregate summaries:
        - `isBiconditionalTrue`
        - `bothSidesTrue`
        - `bothSidesFalse`

4. Decide diagnostic scope
    - Root premises only (matches current root-only inference operators), or
    - All expressions (future-proof if invariants change)

### Acceptance Criteria

- Consumers can distinguish "true because relation genuinely applied" from "true vacuously."
- `iff` diagnostics are not ambiguous about direction.

## Phase 7: Validity Checking (Across All Assignments)

This phase answers whether the argument is valid in propositional logic.

### Tasks

1. Implement variable discovery for the argument
    - Collect referenced variables from premises + conclusion (not all registered variables unless you explicitly want that behavior)

2. Generate all assignments for referenced variables
    - Deterministic variable ordering for reproducible results
    - Consider short-circuiting on first counterexample

3. Implement validity check
    - Argument is valid iff no assignment makes all premises true and conclusion false

4. Return detailed validity results
    - `isValid`
    - `checkedVariableIds`
    - `numAssignmentsChecked`
    - `counterexamples` (all or first N, configurable)

5. Add guardrails for combinatorial explosion
    - Max variable count option
    - Time/iteration cap
    - Modes: `"firstCounterexample"` vs `"exhaustive"`

### Acceptance Criteria

- The engine can correctly detect valid/invalid arguments.
- Invalid results include at least one concrete counterexample assignment.

## Phase 8: Optional Soundness Support (Project-Level Semantics)

If you want "soundness" as a first-class capability, define what "actual truth" means in this library.

### Tasks

1. Choose a soundness model
    - Pure logic library model: do not implement soundness; leave to applications
    - Application-assisted model: accept an "actual world" assignment and define `isSound = isValid && premisesTrueInActualWorld`

2. If implemented, expose a separate API
    - `assessSoundness(actualAssignment)`
    - Reuse `checkValidity()` + single-assignment premise evaluation

3. Document limitation clearly
    - Propositional truth assignments are user-supplied; the library does not infer factual truth

### Acceptance Criteria

- The API avoids conflating validity and truth-under-an-assignment.

## Phase 9: Testing Plan

Add tests before/with each phase. The current suite is strong for editing behavior; evaluation needs equivalent rigor.

### Tasks

1. Add unit tests for structural evaluability validation
    - Missing children
    - Wrong child counts
    - Missing `position 0/1` for `implies` / `iff`
    - Role assignment to non-root

2. Add expression evaluation truth-table tests
    - One test table per operator
    - Nested expressions
    - Position-sensitive implication cases

3. Add argument evaluation tests (single assignment)
    - Premises true / conclusion true
    - Premises true / conclusion false (counterexample)
    - Some premise false (not a counterexample)

4. Add validity tests (all assignments)
    - Valid forms: Modus Ponens, Hypothetical Syllogism (if representable)
    - Invalid forms: Affirming the Consequent

5. Add inference diagnostic tests
    - `P -> Q` vacuously true (`P=false, Q=false/true`)
    - `P -> Q` fired and true (`P=true, Q=true`)
    - `P -> Q` fired and false (`P=true, Q=false`)
    - `P <-> Q` directional vacuity cases

6. Add regression tests around editing + roles
    - Removing a premise root clears role references
    - Inserting above a role-assigned root preserves role assignment (if intended)

### Acceptance Criteria

- Evaluation and construction features can evolve without breaking each other.

## Phase 10: Documentation and Examples

The project will need examples that distinguish authoring from evaluation workflows.

### Tasks

1. Update README with two workflows
    - Authoring/editing example
    - Evaluation/validity example

2. Document terminology
    - validity
    - counterexample
    - vacuous truth
    - (optional) soundness

3. Document API contracts
    - Which methods require structurally valid/evaluable arguments
    - Error handling / diagnostics return shapes

4. Add example outputs
    - Single-assignment evaluation result
    - Validity check result with counterexample
    - Inference diagnostics result

### Acceptance Criteria

- A consumer can build an argument and evaluate it correctly without reading the source.

## Suggested Implementation Order (Pragmatic)

1. Phase 1 (public read/snapshot APIs)
2. Phase 2 (premise/conclusion role model)
3. Phase 3 (structural evaluability validation)
4. Phase 4 (expression evaluation under assignment)
5. Phase 5 (argument evaluation under assignment)
6. Phase 6 (inference diagnostics / vacuity)
7. Phase 7 (validity across all assignments)
8. Phase 8 (optional soundness support)
9. Phase 9 + 10 continuously alongside implementation

## Notes on Current Engine Behavior to Preserve

These existing characteristics are useful and should remain unless intentionally changed:

- Strict argument scoping (`argumentId` / `argumentVersion`)
- Root-only `implies` / `iff` invariant
- Editing support for incomplete expressions (with explicit validation before evaluation)
- Automatic subtree removal and operator collapse after deletion

## Open Questions (Resolve Before Coding Evaluation APIs)

1. Should `and` / `or` with one child be structurally invalid for evaluation, or normalized to identity semantics?
2. Should role assignments live in `TArgument` or in a separate schema to avoid coupling metadata with mutable expression IDs?
3. Should evaluation APIs throw on invalid structure/assignment, or return diagnostics-only result objects?
4. Should validity checks include unreferenced registered variables in the assignment space (usually no)?
5. For `iff`, should diagnostics report directional vacuity, aggregate "fired", or both?
