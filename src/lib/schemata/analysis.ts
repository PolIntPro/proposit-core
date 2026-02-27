import Type, { type Static } from "typebox"
import { UUID } from "./shared.js"

export const CoreAnalysisFileSchema = Type.Object({
    argumentId: UUID,
    argumentVersion: Type.Number(),
    assignments: Type.Record(
        Type.String(),
        Type.Union([Type.Boolean(), Type.Null()]),
        {
            description: "Variable symbol → true/false/null (unset).",
        }
    ),
    rejectedExpressionIds: Type.Array(Type.String(), {
        description: "Expression IDs rejected by the user.",
    }),
})
export type TCoreAnalysisFile = Static<typeof CoreAnalysisFileSchema>
