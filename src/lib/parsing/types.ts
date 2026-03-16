import type { TSchema } from "typebox"

export type TPromptOptions = {
    customInstructions?: string
}

export type TParsingSchemaOptions = {
    claimSchema?: TSchema
    sourceSchema?: TSchema
    variableSchema?: TSchema
    premiseSchema?: TSchema
    parsedArgumentSchema?: TSchema
    responseSchema?: TSchema
}
