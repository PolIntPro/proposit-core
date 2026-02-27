import type {
    TCoreDirectionalVacuity,
    TCoreTrivalentValue,
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

/** Computes Kleene three-valued material implication: `!antecedent || consequent`. */
export function implicationValue(
    antecedent: TCoreTrivalentValue,
    consequent: TCoreTrivalentValue
): TCoreTrivalentValue {
    return kleeneImplies(antecedent, consequent)
}

/** Builds a directional vacuity diagnostic for one direction of an implication. */
export function buildDirectionalVacuity(
    antecedentTrue: TCoreTrivalentValue,
    consequentTrue: TCoreTrivalentValue
): TCoreDirectionalVacuity {
    const implication = implicationValue(antecedentTrue, consequentTrue)
    return {
        antecedentTrue,
        consequentTrue,
        implicationValue: implication,
        isVacuouslyTrue: kleeneAnd(implication, kleeneNot(antecedentTrue)),
        fired: antecedentTrue,
    }
}

/** Kleene three-valued NOT: null propagates. */
export function kleeneNot(a: TCoreTrivalentValue): TCoreTrivalentValue {
    return a === null ? null : !a
}

/** Kleene three-valued AND: false dominates, null propagates. */
export function kleeneAnd(
    a: TCoreTrivalentValue,
    b: TCoreTrivalentValue
): TCoreTrivalentValue {
    if (a === false || b === false) return false
    if (a === null || b === null) return null
    return true
}

/** Kleene three-valued OR: true dominates, null propagates. */
export function kleeneOr(
    a: TCoreTrivalentValue,
    b: TCoreTrivalentValue
): TCoreTrivalentValue {
    if (a === true || b === true) return true
    if (a === null || b === null) return null
    return false
}

/** Kleene three-valued material implication: NOT a OR b. */
export function kleeneImplies(
    a: TCoreTrivalentValue,
    b: TCoreTrivalentValue
): TCoreTrivalentValue {
    return kleeneOr(kleeneNot(a), b)
}

/** Kleene three-valued biconditional: (a -> b) AND (b -> a). */
export function kleeneIff(
    a: TCoreTrivalentValue,
    b: TCoreTrivalentValue
): TCoreTrivalentValue {
    return kleeneAnd(kleeneImplies(a, b), kleeneImplies(b, a))
}
