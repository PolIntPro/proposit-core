/**
 * Individual structural rule toggles for expression tree grammar.
 *
 * Each boolean controls whether a specific structural constraint is enforced.
 * When `true`, violations throw (or auto-normalize if `TGrammarConfig.autoNormalize`
 * is also `true` — but only for operations that support it).
 */
export type TGrammarOptions = {
    /** Require a `formula` node between a parent operator and a non-`not` operator child. */
    enforceFormulaBetweenOperators: boolean
}

/**
 * Grammar enforcement configuration for expression trees.
 *
 * Controls which structural rules are enforced and whether violations are
 * automatically corrected.
 *
 * **`autoNormalize` scope:** When `true`, expression mutation operations
 * (`addExpression`, `insertExpression`, `wrapExpression`) auto-insert formula
 * buffers. `removeExpression` auto-collapses operators with 0 or 1 children
 * and collapses formulas whose bounded subtree has no binary operator
 * (`and`/`or`). When `false`, no automatic structural changes occur — the
 * tree can be in any state including incomplete or grammar-violating.
 *
 * **Formula collapse rule:** A formula node is only justified if its bounded
 * subtree (stopping at the next nested formula) contains a binary operator
 * (`and` or `or`). Formulas wrapping only variables, `not` chains, or other
 * non-binary subtrees are automatically collapsed when `autoNormalize` is `true`.
 */
export type TGrammarConfig = TGrammarOptions & {
    /** When `true`, auto-fix violations where possible instead of throwing. */
    autoNormalize: boolean
}

/** Default config: all rules enforced, auto-normalize on. */
export const DEFAULT_GRAMMAR_CONFIG: TGrammarConfig = {
    enforceFormulaBetweenOperators: true,
    autoNormalize: true,
}

/** Permissive config: no enforcement. Used by default in `fromData`. */
export const PERMISSIVE_GRAMMAR_CONFIG: TGrammarConfig = {
    enforceFormulaBetweenOperators: false,
    autoNormalize: false,
}
