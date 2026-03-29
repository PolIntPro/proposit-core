import Type, { type Static } from "typebox"
import { UUID } from "./shared.js"

// ---------------------------------------------------------------------------
// New entity fork record schemas
// ---------------------------------------------------------------------------

/**
 * Base schema shared by all entity fork records. Each record tracks that
 * a specific entity was created as part of a fork operation.
 *
 * No checksum field — fork records are immutable after creation.
 */
export const CoreEntityForkRecordSchema = Type.Object(
    {
        entityId: UUID,
        forkedFromEntityId: UUID,
        forkedFromArgumentId: UUID,
        forkedFromArgumentVersion: Type.Number({
            minimum: 0,
            description: "Version of the original argument at fork time",
        }),
        forkId: UUID,
    },
    { additionalProperties: true }
)

export type TCoreEntityForkRecord = Static<typeof CoreEntityForkRecordSchema>

/** Argument fork record. Identical to base. */
export const CoreArgumentForkRecordSchema = CoreEntityForkRecordSchema
export type TCoreArgumentForkRecord = TCoreEntityForkRecord

/** Premise fork record. Identical to base. */
export const CorePremiseForkRecordSchema = CoreEntityForkRecordSchema
export type TCorePremiseForkRecord = TCoreEntityForkRecord

/** Expression fork record. Adds source premise reference. */
export const CoreExpressionForkRecordSchema = Type.Intersect(
    [
        CoreEntityForkRecordSchema,
        Type.Object({
            forkedFromPremiseId: UUID,
        }),
    ],
    { additionalProperties: true }
)
export type TCoreExpressionForkRecord = Static<
    typeof CoreExpressionForkRecordSchema
>

/** Variable fork record. Identical to base. */
export const CoreVariableForkRecordSchema = CoreEntityForkRecordSchema
export type TCoreVariableForkRecord = TCoreEntityForkRecord

/** Claim fork record. Adds version tracking for independently versioned claims. */
export const CoreClaimForkRecordSchema = Type.Intersect(
    [
        CoreEntityForkRecordSchema,
        Type.Object({
            forkedFromEntityVersion: Type.Number({
                minimum: 0,
                description: "Claim version that was cloned",
            }),
        }),
    ],
    { additionalProperties: true }
)
export type TCoreClaimForkRecord = Static<typeof CoreClaimForkRecordSchema>

/** Source fork record. Adds version tracking for independently versioned sources. */
export const CoreSourceForkRecordSchema = Type.Intersect(
    [
        CoreEntityForkRecordSchema,
        Type.Object({
            forkedFromEntityVersion: Type.Number({
                minimum: 0,
                description: "Source version that was cloned",
            }),
        }),
    ],
    { additionalProperties: true }
)
export type TCoreSourceForkRecord = Static<typeof CoreSourceForkRecordSchema>

// ---------------------------------------------------------------------------
// Legacy fork schema (kept for ForksLibrary — will be removed in Task 9)
// ---------------------------------------------------------------------------

/**
 * Schema for a fork record. Represents a single fork operation — the event of
 * creating an independent copy of an argument. Create-or-delete only; fork
 * records are immutable after creation.
 */
export const CoreForkSchema = Type.Object(
    {
        id: UUID,
        sourceArgumentId: UUID,
        sourceArgumentVersion: Type.Number({
            description:
                "The version of the source argument at the time of the fork.",
        }),
        createdOn: Type.String({
            description: "ISO 8601 timestamp of when the fork was created.",
        }),
        creatorId: Type.Optional(
            Type.String({
                description: "Optional application-provided ID of the creator.",
            })
        ),
        checksum: Type.String({
            description: "Fork record checksum for sync detection.",
        }),
    },
    {
        additionalProperties: true,
        description:
            "A fork record. Extended via generics for additional fields.",
    }
)

/** A fork record entity. */
export type TCoreFork = Static<typeof CoreForkSchema>
