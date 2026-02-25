import type {
    TCoreDirectionalVacuity,
    TCoreValidationIssue,
    TCoreValidationResult,
} from "../../types/evaluation.js"

export function makeValidationResult(
    issues: TCoreValidationIssue[]
): TCoreValidationResult {
    return {
        ok: issues.every((issue) => issue.severity !== "error"),
        issues,
    }
}

export function makeErrorIssue(
    issue: Omit<TCoreValidationIssue, "severity">
): TCoreValidationIssue {
    return { severity: "error", ...issue }
}

export function implicationValue(
    antecedent: boolean,
    consequent: boolean
): boolean {
    return !antecedent || consequent
}

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
