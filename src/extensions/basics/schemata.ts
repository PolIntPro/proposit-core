import Type, { type Static } from "typebox"
import { CoreArgumentSchema } from "../../lib/schemata/argument.js"
import { CoreClaimSchema } from "../../lib/schemata/claim.js"
import { CorePremiseSchema } from "../../lib/schemata/propositional.js"
import { buildParsingResponseSchema } from "../../lib/parsing/schemata.js"

// Core entity extensions
export const BasicsArgumentSchema = Type.Intersect([
    CoreArgumentSchema,
    Type.Object({
        title: Type.String(),
        description: Type.Optional(Type.String()),
    }),
])
export type TBasicsArgument = Static<typeof BasicsArgumentSchema>

export const BasicsClaimSchema = Type.Intersect([
    CoreClaimSchema,
    Type.Object({
        title: Type.String(),
        body: Type.String(),
    }),
])
export type TBasicsClaim = Static<typeof BasicsClaimSchema>

export const BasicsPremiseSchema = Type.Intersect([
    CorePremiseSchema,
    Type.Object({
        title: Type.String(),
    }),
])
export type TBasicsPremise = Static<typeof BasicsPremiseSchema>

// Parsing response extensions
const BasicsClaimExtension = Type.Object({
    title: Type.String({
        maxLength: 50,
        description: "A short title summarizing the claim",
    }),
    body: Type.String({
        maxLength: 500,
        description: "A detailed description of the claim",
    }),
})

const BasicsPremiseExtension = Type.Object({
    title: Type.String({
        maxLength: 50,
        description: "A short title for this premise",
    }),
})

const BasicsArgumentExtension = Type.Object({
    title: Type.String({
        maxLength: 50,
        description: "A short title for the argument",
    }),
})

export const BasicsParsingSchema = buildParsingResponseSchema({
    claimSchema: BasicsClaimExtension,
    premiseSchema: BasicsPremiseExtension,
    parsedArgumentSchema: BasicsArgumentExtension,
})
