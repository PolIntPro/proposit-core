/**
 * Library barrel export. Re-exports core classes, evaluation types, diff
 * types, and the diff function.
 */
export { ArgumentEngine } from "./core/ArgumentEngine.js"
export { PremiseEngine } from "./core/PremiseEngine.js"
export * from "./types/evaluation.js"
export * from "./types/diff.js"
export * from "./types/mutation.js"
export * from "./types/checksum.js"
export {
    computeHash,
    canonicalSerialize,
    entityChecksum,
} from "./core/checksum.js"
export {
    diffArguments,
    defaultCompareArgument,
    defaultCompareVariable,
    defaultComparePremise,
    defaultCompareExpression,
} from "./core/diff.js"
export * from "./types/relationships.js"
export {
    analyzePremiseRelationships,
    buildPremiseProfile,
} from "./core/relationships.js"
export { DEFAULT_CHECKSUM_CONFIG, createChecksumConfig } from "./consts.js"
export { parseFormula } from "./core/parser/formula.js"
export type { FormulaAST } from "./core/parser/formula.js"
export type {
    TExpressionInput,
    TExpressionWithoutPosition,
    TExpressionUpdate,
} from "./core/ExpressionManager.js"
export {
    POSITION_MIN,
    POSITION_MAX,
    POSITION_INITIAL,
    midpoint,
} from "./utils/position.js"
