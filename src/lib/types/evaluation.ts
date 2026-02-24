import type { TArgument, TPremise } from "../schemata"

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

export type TVariableAssignment = Record<string, boolean>

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

export interface TArgumentEvaluationOptions {
    strictUnknownAssignmentKeys?: boolean
    includeExpressionValues?: boolean
    includeDiagnostics?: boolean
    validateFirst?: boolean
}

export interface TArgumentEvaluationResult {
    // `false` means evaluation could not be completed (typically validation failure).
    ok: boolean
    // Validation output when `ok === false`, or when validation was requested and included.
    validation?: TValidationResult
    // The assignment used for this evaluation (variableId -> boolean).
    assignment?: TVariableAssignment
    // All variable IDs referenced across evaluated supporting/conclusion/constraint premises.
    referencedVariableIds?: string[]
    // Evaluation result for the designated conclusion premise.
    conclusion?: TPremiseEvaluationResult
    // Evaluation results for premises designated as supporting the argument.
    supportingPremises?: TPremiseEvaluationResult[]
    // Evaluation results for constraint premises (used to determine admissibility).
    constraintPremises?: TPremiseEvaluationResult[]
    // `true` iff all constraint premises evaluate to true under the assignment.
    isAdmissibleAssignment?: boolean
    // `true` iff every supporting premise evaluates to true.
    allSupportingPremisesTrue?: boolean
    // The truth value of the conclusion premise root expression.
    conclusionTrue?: boolean
    // `true` iff constraints are satisfied, all supporting premises are true, and the conclusion is false.
    isCounterexample?: boolean
    // Convenience inverse of `isCounterexample` for the evaluated assignment.
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
