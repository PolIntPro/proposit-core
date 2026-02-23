# Evaluation Support Plan (PremiseManager Architecture)

## Summary

`ArgumentEngine` now manages `PremiseManager` instances, each with a single-premise AST and local variables. This is a good authoring model. To support argument evaluation, the missing pieces are:

- argument-level roles (supporting premises vs conclusion),
- cross-premise variable identity rules,
- evaluability validation,
- premise/argument evaluation APIs,
- validity checking and inference diagnostics.

## Key Decisions (Resolve First)

1. Conclusion representation
    - Recommended: designate one premise as the conclusion.
2. Constraint semantics (`TPremise.type === "constraint"`)
    - Recommended: constraints define admissible assignments.
3. Cross-premise variable identity (critical)
    - Recommended: identity by variable ID, with symbol consistency checks.
4. Terminology
    - Prefer `counterexample` / `preservesTruthUnderAssignment`; avoid overloading `soundness`.
5. `iff` diagnostics
    - Recommended: directional vacuity (`left -> right`, `right -> left`) plus aggregate fields.

## Implementation Plan (Condensed)

### 1. Add Read APIs

`ArgumentEngine`

- `hasPremise(premiseId)`
- `listPremiseIds()`
- `listPremises()`
- `toData()` / `exportState()`

`PremiseManager`

- `getId()`, `getTitle()`
- `getRootExpressionId()`, `getRootExpression()`
- `getVariables()`, `getExpressions()`
- `getChildExpressions(parentId)`
- `getPremiseType()`

Requirements

- deterministic ordering for premises, expressions, variables
- return copies/snapshots where appropriate

### 2. Add Argument Roles

Add role metadata to `ArgumentEngine`:

- supporting premise IDs
- conclusion premise ID

APIs

- `setConclusionPremise(premiseId)`
- `clearConclusionPremise()`
- `getConclusionPremise()`
- `addSupportingPremise(premiseId)`
- `removeSupportingPremise(premiseId)`
- `listSupportingPremises()`
- `getRoleState()`

Invariants

- premise must exist
- no role overlap (unless explicitly allowed)
- removing a premise updates roles automatically

### 3. Add Cross-Premise Variable Consistency Validation (Critical)

Because variables are premise-local, argument-level evaluation needs one assignment space.

Add `ArgumentEngine.collectReferencedVariables()` and validation checks for:

- same symbol used with different IDs (ambiguous)
- same ID used with different symbols (invalid)

Recommended policy

- allow loose authoring
- block evaluation when ambiguity exists

### 4. Add Evaluability Validation

Premise-level validation (`PremiseManager.validateEvaluability()` or pure helper):

- root exists (for evaluable premises)
- `rootExpressionId` matches actual root
- `formula` has exactly 1 child
- `not` exactly 1 child
- `implies`/`iff` exactly 2 children
- `and`/`or` at least 2 children
- binary positions `0` and `1` present for `implies`/`iff`
- variable expressions reference declared variables

Argument-level validation (`ArgumentEngine.validateEvaluability()`):

- conclusion exists and is valid
- supporting premise roles valid
- cross-premise variable consistency valid
- aggregate premise validation issues

### 5. Add Premise Evaluation (Single Assignment)

`PremiseManager.evaluate(assignment, options?)`

Behavior

- validate assignment coverage for referenced variable IDs
- evaluate root recursively
- support `formula`, `not`, `and`, `or`, `implies`, `iff`
- preserve child order for binary operators via positions
- return per-expression truth values

### 6. Add Inference Diagnostics (Premise-Level)

For inference premises (`implies`/`iff` root):

- left/right/root truth values
- vacuity and firing info

`implies`

- `antecedentTrue`
- `consequentTrue`
- `isVacuouslyTrue`
- `fired`
- `firedAndHeld`

`iff`

- directional diagnostics for `left -> right` and `right -> left`
- aggregate `bothSidesTrue` / `bothSidesFalse`

### 7. Add Argument Evaluation (Single Assignment)

`ArgumentEngine.evaluate(assignment, options?)`

Aggregate results

- conclusion evaluation
- supporting premise evaluations
- constraint premise evaluations
- `isAdmissibleAssignment` (all constraints true)
- `allSupportingPremisesTrue`
- `conclusionTrue`
- `isCounterexample`
- `preservesTruthUnderAssignment`

Recommended `isCounterexample`

- `constraintsSatisfied && allSupportingPremisesTrue && !conclusionTrue`

### 8. Add Validity Checking (All Assignments)

`ArgumentEngine.checkValidity(options?)`

Behavior

- validate evaluability
- collect referenced variables across supporting + conclusion + constraints
- generate assignments deterministically
- ignore inadmissible assignments (false constraints)
- find counterexamples

Return

- `isValid`
- `checkedVariableIds`
- `numAssignmentsChecked`
- `numAdmissibleAssignments`
- `counterexamples` (first or exhaustive)
- truncation flag if limits reached

### 9. Tests and Docs

Tests

- premise validation/evaluation
- role management
- cross-premise variable consistency
- single-assignment argument evaluation
- validity with/without constraints
- vacuity diagnostics for `implies` and `iff`

Docs

- premise-first architecture
- roles (supporting/conclusion/constraint)
- admissible assignments and counterexamples
- evaluation vs validity vs (optional) soundness

## Concrete API Proposal (Draft)

### Core Types

```ts
export type TPremiseRole = "supporting" | "conclusion"

export interface TArgumentRoleState {
    supportingPremiseIds: string[]
    conclusionPremiseId?: string
}

export interface TArgumentEngineData {
    argument: TArgument
    premises: TPremise[]
    roles: TArgumentRoleState
}

export type TVariableAssignment = Record<string, boolean> // variableId -> value

export type TValidationSeverity = "error" | "warning"

export type TValidationCode =
    | "ARGUMENT_NO_CONCLUSION"
    | "ARGUMENT_CONCLUSION_NOT_FOUND"
    | "ARGUMENT_SUPPORTING_PREMISE_NOT_FOUND"
    | "ARGUMENT_ROLE_OVERLAP"
    | "ARGUMENT_VARIABLE_ID_SYMBOL_MISMATCH"
    | "ARGUMENT_VARIABLE_SYMBOL_AMBIGUOUS"
    | "PREMISE_EMPTY"
    | "PREMISE_ROOT_MISSING"
    | "PREMISE_ROOT_MISMATCH"
    | "EXPR_CHILD_COUNT_INVALID"
    | "EXPR_BINARY_POSITIONS_INVALID"
    | "EXPR_VARIABLE_UNDECLARED"
    | "ASSIGNMENT_MISSING_VARIABLE"
    | "ASSIGNMENT_UNKNOWN_VARIABLE"

export interface TValidationIssue {
    code: TValidationCode
    severity: TValidationSeverity
    message: string
    premiseId?: string
    expressionId?: string
    variableId?: string
}

export interface TValidationResult {
    ok: boolean
    issues: TValidationIssue[]
}
```

### Premise Evaluation Types

```ts
export interface TDirectionalVacuity {
    antecedentTrue: boolean
    consequentTrue: boolean
    implicationValue: boolean
    isVacuouslyTrue: boolean
    fired: boolean
}

export type TPremiseInferenceDiagnostic =
    | {
          kind: "implies"
          premiseId: string
          rootExpressionId: string
          leftValue: boolean
          rightValue: boolean
          rootValue: boolean
          antecedentTrue: boolean
          consequentTrue: boolean
          isVacuouslyTrue: boolean
          fired: boolean
          firedAndHeld: boolean
      }
    | {
          kind: "iff"
          premiseId: string
          rootExpressionId: string
          leftValue: boolean
          rightValue: boolean
          rootValue: boolean
          leftToRight: TDirectionalVacuity
          rightToLeft: TDirectionalVacuity
          bothSidesTrue: boolean
          bothSidesFalse: boolean
      }

export interface TPremiseEvaluationResult {
    premiseId: string
    premiseType: "inference" | "constraint"
    rootExpressionId?: string
    rootValue?: boolean
    expressionValues: Record<string, boolean>
    variableValues: Record<string, boolean>
    inferenceDiagnostic?: TPremiseInferenceDiagnostic
}
```

### Argument Evaluation / Validity Types

```ts
export interface TArgumentEvaluationOptions {
    strictUnknownAssignmentKeys?: boolean
    includeExpressionValues?: boolean
    includeDiagnostics?: boolean
    validateFirst?: boolean
}

export interface TArgumentEvaluationResult {
    ok: boolean
    validation?: TValidationResult
    assignment?: TVariableAssignment
    referencedVariableIds?: string[]
    conclusion?: TPremiseEvaluationResult
    supportingPremises?: TPremiseEvaluationResult[]
    constraintPremises?: TPremiseEvaluationResult[]
    isAdmissibleAssignment?: boolean
    allSupportingPremisesTrue?: boolean
    conclusionTrue?: boolean
    isCounterexample?: boolean
    preservesTruthUnderAssignment?: boolean
}

export interface TValidityCheckOptions {
    mode?: "firstCounterexample" | "exhaustive"
    maxVariables?: number
    maxAssignmentsChecked?: number
    includeCounterexampleEvaluations?: boolean
    validateFirst?: boolean
}

export interface TCounterexample {
    assignment: TVariableAssignment
    result: TArgumentEvaluationResult
}

export interface TValidityCheckResult {
    ok: boolean
    validation?: TValidationResult
    isValid?: boolean
    checkedVariableIds?: string[]
    numAssignmentsChecked?: number
    numAdmissibleAssignments?: number
    counterexamples?: TCounterexample[]
    truncated?: boolean
}
```

### Proposed `PremiseManager` Additions

```ts
export class PremiseManager {
    public getId(): string
    public getTitle(): string | undefined
    public getRootExpressionId(): string | undefined
    public getRootExpression(): TPropositionalExpression | undefined
    public getVariables(): TPropositionalVariable[]
    public getExpressions(): TPropositionalExpression[]
    public getChildExpressions(
        parentId: string | null
    ): TPropositionalExpression[]
    public getPremiseType(): "inference" | "constraint"

    public validateEvaluability(): TValidationResult
    public evaluate(
        assignment: TVariableAssignment,
        options?: {
            strictUnknownKeys?: boolean
            requireExactCoverage?: boolean
        }
    ): TPremiseEvaluationResult
}
```

### Proposed `ArgumentEngine` Additions

```ts
export class ArgumentEngine {
    public hasPremise(premiseId: string): boolean
    public listPremiseIds(): string[]
    public listPremises(): PremiseManager[]

    public getRoleState(): TArgumentRoleState
    public setConclusionPremise(premiseId: string): void
    public clearConclusionPremise(): void
    public getConclusionPremise(): PremiseManager | undefined
    public addSupportingPremise(premiseId: string): void
    public removeSupportingPremise(premiseId: string): void
    public listSupportingPremises(): PremiseManager[]

    public toData(): TArgumentEngineData

    public collectReferencedVariables(): {
        variableIds: string[]
        byId: Record<string, { symbol: string; premiseIds: string[] }>
        bySymbol: Record<
            string,
            { variableIds: string[]; premiseIds: string[] }
        >
    }

    public validateEvaluability(): TValidationResult

    public evaluate(
        assignment: TVariableAssignment,
        options?: TArgumentEvaluationOptions
    ): TArgumentEvaluationResult

    public checkValidity(options?: TValidityCheckOptions): TValidityCheckResult
}
```

## Suggested Build Order

1. Read APIs + `toData()`
2. Role APIs
3. Cross-premise variable validation
4. Premise/argument evaluability validation
5. Premise evaluation
6. Inference diagnostics
7. Argument evaluation
8. Validity checking
9. Tests/docs polish

## Open Questions

1. Should conclusion be a designated premise or a separate object?
2. Are constraints just premise type semantics, or also a role/category?
3. Canonical cross-premise identity rule: ID only, symbol only, or both?
4. Should evaluation APIs throw on invalid state or return `ok: false` with diagnostics?
5. Should the library implement `soundness`, or leave that to callers?
