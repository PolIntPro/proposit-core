import type { ArgumentEngine } from "./ArgumentEngine.js"
import type { PremiseManager } from "./PremiseManager.js"
import type {
    TCorePremiseProfile,
    TCorePremiseRelationshipAnalysis,
} from "../types/relationships.js"

/**
 * Builds a profile of a premise's variable appearances, recording each
 * variable's side (antecedent/consequent) and polarity (positive/negative).
 */
export function buildPremiseProfile(
    premise: PremiseManager
): TCorePremiseProfile {
    throw new Error("Not implemented")
}

/**
 * Analyzes how every other premise in the argument relates to the focused
 * premise, classifying each as supporting, contradicting, restricting,
 * downstream, or unrelated.
 */
export function analyzePremiseRelationships(
    engine: ArgumentEngine,
    focusedPremiseId: string
): TCorePremiseRelationshipAnalysis {
    throw new Error("Not implemented")
}
