import Type, { type Static } from "typebox"
import { UUID } from "./shared.js"

export const CoreAnalysisFileSchema = Type.Object({
    argumentId: UUID,
    argumentVersion: Type.Number(),
    assignments: Type.Record(Type.String(), Type.Boolean(), {
        description: "Variable symbol → truth-value mapping.",
    }),
})
export type TCoreAnalysisFile = Static<typeof CoreAnalysisFileSchema>
