/** Polarity of a variable within an expression subtree. */
export type TCoreVariablePolarity = "positive" | "negative"

/** Which side of an inference premise a variable appears on. */
export type TCorePremiseSide = "antecedent" | "consequent"

/** A single variable appearance within a premise, recording its side and polarity. */
export interface TCoreVariableAppearance {
    variableId: string
    side: TCorePremiseSide
    polarity: TCoreVariablePolarity
}

/** Profile of a premise's variable appearances, split by antecedent/consequent. */
export interface TCorePremiseProfile {
    premiseId: string
    isInference: boolean
    appearances: TCoreVariableAppearance[]
}

/** The five relationship categories a premise can have relative to a focused premise. */
export type TCorePremiseRelationshipType =
    | "supporting"
    | "contradicting"
    | "restricting"
    | "downstream"
    | "unrelated"

/** Per-variable relationship detail explaining why a variable contributes to the classification. */
export interface TCoreVariableRelationship {
    variableId: string
    relationship: "supporting" | "contradicting" | "restricting"
}

/** Classification result for a single premise relative to the focused premise. */
export interface TCorePremiseRelationResult {
    premiseId: string
    relationship: TCorePremiseRelationshipType
    variableDetails: TCoreVariableRelationship[]
    transitive: boolean
}

/** Top-level result from `analyzePremiseRelationships`. */
export interface TCorePremiseRelationshipAnalysis {
    focusedPremiseId: string
    premises: TCorePremiseRelationResult[]
}
