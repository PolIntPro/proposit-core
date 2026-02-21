import Type, { type Static } from "typebox"
import { UUID, Nullable } from "./shared"

// PROPOSITIONAL LOGIC SCHEMAS
const VariableType = Type.Literal("variable")
const FormulaType = Type.Literal("formula")

export const PropositionalExpressionTypes = Type.Union([
    VariableType,
    FormulaType,
])
export type TPropositionalExpressionTypes = Static<
    typeof PropositionalExpressionTypes
>

const BasePropositionalExpressionSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    parentId: Nullable(UUID),
})

export const PropositionalVariableExpressionSchema = Type.Interface(
    [BasePropositionalExpressionSchema],
    {
        type: VariableType,
        variableId: UUID,
    }
)

export type TPropositionalVariableExpression = Static<
    typeof PropositionalVariableExpressionSchema
>

export const FormulaExpressionSchema = Type.Interface(
    [BasePropositionalExpressionSchema],
    {
        type: FormulaType,
        variableId: Type.Null(),
        isNegated: Type.Boolean(),
    }
)

export type TFormulaExpression = Static<typeof FormulaExpressionSchema>

export const PropositionalExpressionSchema = Type.Union([
    PropositionalVariableExpressionSchema,
    FormulaExpressionSchema,
])

export type TPropositionalExpressionCombined = Static<
    typeof PropositionalExpressionSchema
>

export type TPropositionalExpression<
    T extends TPropositionalExpressionTypes = TPropositionalExpressionTypes,
> = Extract<TPropositionalExpressionCombined, { type: T }>

export const PropositionalVariableSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    symbol: Type.String(),
})
export type TPropositionalVariable = Static<typeof PropositionalVariableSchema>

export const LogicalRelationTypes = Type.Union([
    Type.Literal("and"),
    Type.Literal("or"),
])
export type TLogicalRelationTypes = Static<typeof LogicalRelationTypes>

export const InferenceRelationTypes = Type.Union([
    Type.Literal("implies"),
    Type.Literal("iff"),
])
export type TInferenceRelationTypes = Static<typeof InferenceRelationTypes>

export const PropositionalRelationType = Type.Union([
    LogicalRelationTypes,
    InferenceRelationTypes,
])
export type TPropositionalRelationType = Static<
    typeof PropositionalRelationType
>

export const PropositionalRelationSchema = Type.Object({
    sourceId: UUID,
    targetId: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    type: PropositionalRelationType,
})
export type TPropositionalRelation = Static<typeof PropositionalRelationSchema>

// Combined propositional logic data schema
export const PropositionalLogicDataSchema = Type.Object({
    variables: Type.Array(PropositionalVariableSchema),
    expressions: Type.Array(PropositionalExpressionSchema),
    relations: Type.Array(PropositionalRelationSchema),
})
export type TPropositionalLogicData = Static<
    typeof PropositionalLogicDataSchema
>
