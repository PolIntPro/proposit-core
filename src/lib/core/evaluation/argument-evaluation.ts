/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    isClaimBound,
    isPremiseBound,
    type TCorePropositionalExpression,
    type TCorePropositionalVariable,
} from "../../schemata/index.js"
import type {
    TCoreArgumentEvaluationOptions,
    TCoreArgumentEvaluationResult,
    TCoreCounterexample,
    TCoreExpressionAssignment,
    TCoreTrivalentValue,
    TCoreValidityCheckOptions,
    TCoreValidityCheckResult,
    TCoreVariableAssignment,
    TCorePremiseEvaluationResult,
} from "../../types/evaluation.js"
import {
    kleeneAnd,
    kleeneNot,
    kleeneOr,
    kleeneImplies,
    kleeneIff,
} from "./kleene.js"
import { makeErrorIssue, makeValidationResult } from "./validation.js"
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Read-only interface providing the data an evaluation needs from an
 * argument engine. This is intentionally narrow — evaluation should
 * not mutate anything.
 */
export interface TArgumentEvaluationContext {
    /** The argument's own ID. */
    argumentId: string
    /** Returns the conclusion PremiseEngine, or undefined. */
    getConclusionPremise(): TEvaluablePremise | undefined
    /** Returns supporting premises (inference premises minus conclusion). */
    listSupportingPremises(): TEvaluablePremise[]
    /** Returns all premises. */
    listPremises(): TEvaluablePremise[]
    /** The conclusion premise ID, if set. */
    conclusionPremiseId: string | undefined
    /** Look up a variable by ID. */
    getVariable(variableId: string): TCorePropositionalVariable | undefined
    /** Pre-evaluation structural validation. */
    validateEvaluability(): { ok: boolean; issues: { severity: string; code: string; message: string }[] }
}

/**
 * Narrow view of a PremiseEngine needed for evaluation.
 */
export interface TEvaluablePremise {
    getId(): string
    getExpressions(): TCorePropositionalExpression[]
    getChildExpressions(parentId: string): TCorePropositionalExpression[]
    getVariables(): TCorePropositionalVariable[]
    evaluate(
        assignment: TCoreExpressionAssignment,
        options?: { strictUnknownKeys?: boolean; resolver?: (variableId: string) => boolean | null }
    ): TCorePremiseEvaluationResult
}

/**
 * Run fixed-point constraint propagation over accepted/rejected operators.
 * Fills unknown (null) variable values based on operator semantics.
 * Never overwrites user-assigned values (true/false).
 */
export function propagateOperatorConstraints(
    _ctx: TArgumentEvaluationContext,
    _assignment: TCoreExpressionAssignment
): TCoreVariableAssignment {
    // TODO: will be moved from ArgumentEngine in Task 2
    throw new Error("Not implemented")
}

/**
 * Evaluates an argument under a three-valued expression assignment.
 */
export function evaluateArgument(
    _ctx: TArgumentEvaluationContext,
    _assignment: TCoreExpressionAssignment,
    _options?: TCoreArgumentEvaluationOptions
): TCoreArgumentEvaluationResult {
    // TODO: will be moved from ArgumentEngine in Task 3
    throw new Error("Not implemented")
}

/**
 * Enumerates all 2^n variable assignments and checks for counterexamples.
 */
export function checkArgumentValidity(
    _ctx: TArgumentEvaluationContext,
    _options?: TCoreValidityCheckOptions
): TCoreValidityCheckResult {
    // TODO: will be moved from ArgumentEngine in Task 4
    throw new Error("Not implemented")
}
