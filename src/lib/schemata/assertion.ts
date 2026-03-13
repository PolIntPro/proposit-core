import Type, { type Static } from "typebox"
import { UUID } from "./shared.js"

export const CoreAssertionSchema = Type.Object(
    {
        id: UUID,
        version: Type.Number({
            description: "Assertion version number. Starts at 0.",
        }),
        frozen: Type.Boolean({
            description:
                "Whether this version is frozen (immutable). Frozen versions cannot be updated.",
        }),
        checksum: Type.String({
            description: "Entity-level checksum for sync detection.",
        }),
    },
    {
        additionalProperties: true,
        description:
            "A global assertion representing propositional content. Variables reference assertions by ID and version.",
    }
)
export type TCoreAssertion = Static<typeof CoreAssertionSchema>
