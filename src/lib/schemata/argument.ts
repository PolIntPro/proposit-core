import Type, { type Static } from "typebox"
import { UUID } from "./shared.js"

export const ArgumentMetaSchema = Type.Object(
    {
        id: UUID,
        title: Type.String(),
        description: Type.String(),
    },
    {
        description:
            "Metadata for an argument that does not change for different versions of the same argument.",
    }
)
export type TArgumentMeta = Static<typeof ArgumentMetaSchema>

export const ArgumentVersionedSchema = Type.Object(
    {
        version: Type.Number(),
        createdAt: Type.Number({
            description:
                "Unix timestamp in milliseconds of when the argument was created.",
            default: () => Date.now(),
        }),
    },
    {
        description:
            "Data for an argument that will differ between different versions of the same argument",
    }
)
export type TArgumentVersioned = Static<typeof ArgumentVersionedSchema>

export const ArgumentMutableDataSchema = Type.Object(
    {
        published: Type.Boolean(),
        publishedAt: Type.Optional(
            Type.Number({
                description:
                    "Unix timestamp in milliseconds of when the argument was published.",
            })
        ),
    },
    {
        description:
            "Data for an argument that can be changed (e.g. published status).",
    }
)
export type TArgumentMutableData = Static<typeof ArgumentMutableDataSchema>

export const ArgumentSchema = Type.Intersect([
    ArgumentMetaSchema,
    ArgumentVersionedSchema,
    ArgumentMutableDataSchema,
])
export type TArgument = Static<typeof ArgumentSchema>

export const ArgumentVersionMetaSchema = Type.Intersect([
    ArgumentVersionedSchema,
    ArgumentMutableDataSchema,
])
export type TArgumentVersionMeta = Static<typeof ArgumentVersionMetaSchema>

export const ArgumentRoleStateSchema = Type.Object({
    conclusionPremiseId: Type.Optional(UUID),
    supportingPremiseIds: Type.Array(UUID),
})
export type TArgumentRoleState = Static<typeof ArgumentRoleStateSchema>
