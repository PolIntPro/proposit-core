/**
 * @module @polintpro/proposit-core
 *
 * Core engine for building, evaluating, and diffing propositional logic
 * arguments. Exports {@link ArgumentEngine} and {@link PremiseManager} as
 * the primary API, along with all type schemata and the {@link diffArguments}
 * utility.
 */
export { ArgumentEngine, PremiseManager } from "./lib/index.js"
export * from "./lib/schemata/index.js"
export * from "./lib/types/diff.js"
export * from "./lib/types/mutation.js"
export * from "./lib/types/checksum.js"
export {
    computeHash,
    canonicalSerialize,
    entityChecksum,
} from "./lib/core/checksum.js"
export {
    diffArguments,
    defaultCompareArgument,
    defaultCompareVariable,
    defaultComparePremise,
    defaultCompareExpression,
} from "./lib/core/diff.js"
export * from "./lib/types/relationships.js"
export {
    analyzePremiseRelationships,
    buildPremiseProfile,
} from "./lib/core/relationships.js"
export { DEFAULT_CHECKSUM_CONFIG, createChecksumConfig } from "./lib/consts.js"
export { parseFormula } from "./lib/core/parser/formula.js"
export type { FormulaAST } from "./lib/core/parser/formula.js"
export type {
    TExpressionInput,
    TExpressionWithoutPosition,
} from "./lib/core/ExpressionManager.js"
export {
    POSITION_MIN,
    POSITION_MAX,
    POSITION_INITIAL,
    midpoint,
} from "./lib/utils/position.js"
