import type {
    TDirectionalVacuity,
    TValidationIssue,
    TValidationResult,
} from "../../types/evaluation.js"

export function makeValidationResult(
    issues: TValidationIssue[]
): TValidationResult {
    return {
        ok: issues.every((issue) => issue.severity !== "error"),
        issues,
    }
}

export function makeErrorIssue(
    issue: Omit<TValidationIssue, "severity">
): TValidationIssue {
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
): TDirectionalVacuity {
    const implication = implicationValue(antecedentTrue, consequentTrue)
    return {
        antecedentTrue,
        consequentTrue,
        implicationValue: implication,
        isVacuouslyTrue: !antecedentTrue,
        fired: antecedentTrue,
    }
}
