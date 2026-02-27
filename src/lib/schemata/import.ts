import Type, { type Static } from "typebox"

export const CoreYamlPremiseSchema = Type.Object({
    title: Type.Optional(Type.String()),
    role: Type.Optional(
        Type.Union([Type.Literal("conclusion"), Type.Literal("supporting")])
    ),
    formula: Type.String(),
})

export type TCoreYamlPremise = Static<typeof CoreYamlPremiseSchema>

export const CoreYamlArgumentSchema = Type.Object({
    title: Type.String(),
    description: Type.Optional(Type.String({ default: "" })),
    premises: Type.Array(CoreYamlPremiseSchema, { minItems: 1 }),
})

export type TCoreYamlArgument = Static<typeof CoreYamlArgumentSchema>
