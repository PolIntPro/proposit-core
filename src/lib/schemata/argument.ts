import Type, { type Static } from "typebox"
import { UUID } from "./shared"

export const ArgumentSchema = Type.Object({
    id: UUID,
    version: Type.Number(),
    title: Type.String(),
    description: Type.String(),
})
export type TArgument = Static<typeof ArgumentSchema>
