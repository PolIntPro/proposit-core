import Type, { type Static } from "typebox"
import { UUID, Nullable } from "./shared"

const VariableType = Type.Literal("variable")
const OperatorType = Type.Literal("operator")
const FormulaType = Type.Literal("formula")

export const PropositionalExpressionTypes = Type.Union([
    VariableType,
    OperatorType,
    FormulaType,
])
export type TPropositionalExpressionTypes = Static<
    typeof PropositionalExpressionTypes
>

const BasePropositionalExpressionSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    parentId: Nullable(UUID, {
        description:
            "The ID of the parent operator expression, or null if this is a top-level expression.",
    }),

    position: Nullable(
        Type.Integer({
            minimum: 0,
            description:
                "The ordering of this expression among its siblings under the same parent. Must be unique within (parentId, argumentId, argumentVersion).",
        })
    ),
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

export const LogicalOperatorType = Type.Union([
    Type.Literal("not"), // unary
    Type.Literal("and"), // variadic (≥2)
    Type.Literal("or"), // variadic (≥2)
    Type.Literal("implies"), // binary (ordered)
    Type.Literal("iff"), // binary (unordered but fixed 2)
])

export type TLogicalOperatorType = Static<typeof LogicalOperatorType>

export const OperatorExpressionSchema = Type.Interface(
    [BasePropositionalExpressionSchema],
    {
        type: OperatorType,
        operator: LogicalOperatorType,
    }
)
export type TOperatorExpression = Static<typeof OperatorExpressionSchema>

export const FormulaExpressionSchema = Type.Interface(
    [BasePropositionalExpressionSchema],
    {
        type: FormulaType,
    }
)
export type TFormulaExpression = Static<typeof FormulaExpressionSchema>

export const PropositionalExpressionSchema = Type.Union([
    PropositionalVariableExpressionSchema,
    OperatorExpressionSchema,
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
