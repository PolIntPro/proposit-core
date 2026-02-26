import type {
    TCoreDirectionalVacuity,
    TCoreValidationIssue,
    TCoreValidationResult,
} from "../../types/evaluation.js"

/** Creates a validation result, setting `ok` based on whether any error-severity issues exist. */
export function makeValidationResult(
    issues: TCoreValidationIssue[]
): TCoreValidationResult {
    return {
        ok: issues.every((issue) => issue.severity !== "error"),
        issues,
    }
}

/** Creates a validation issue with `severity: "error"`. */
export function makeErrorIssue(
    issue: Omit<TCoreValidationIssue, "severity">
): TCoreValidationIssue {
    return { severity: "error", ...issue }
}

/** Computes the truth value of material implication: `!antecedent || consequent`. */
export function implicationValue(
    antecedent: boolean,
    consequent: boolean
): boolean {
    return !antecedent || consequent
}

/** Builds a directional vacuity diagnostic for one direction of an implication. */
export function buildDirectionalVacuity(
    antecedentTrue: boolean,
    consequentTrue: boolean
): TCoreDirectionalVacuity {
    const implication = implicationValue(antecedentTrue, consequentTrue)
    return {
        antecedentTrue,
        consequentTrue,
        implicationValue: implication,
        isVacuouslyTrue: !antecedentTrue,
        fired: antecedentTrue,
    }
}
