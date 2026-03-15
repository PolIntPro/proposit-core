import type { TCoreClaim } from "../../schemata/claim.js"
import type {
    TCoreClaimSourceAssociation,
    TCoreSource,
} from "../../schemata/source.js"

/** Narrow read-only interface for claim lookups. Used by ArgumentEngine for validation. */
export interface TClaimLookup<TClaim extends TCoreClaim = TCoreClaim> {
    get(id: string, version: number): TClaim | undefined
}

/** Narrow read-only interface for source lookups. Used by ArgumentEngine for validation. */
export interface TSourceLookup<TSource extends TCoreSource = TCoreSource> {
    get(id: string, version: number): TSource | undefined
}

/** Serializable snapshot of a ClaimLibrary. */
export type TClaimLibrarySnapshot<TClaim extends TCoreClaim = TCoreClaim> = {
    claims: TClaim[]
}

/** Serializable snapshot of a SourceLibrary. */
export type TSourceLibrarySnapshot<TSource extends TCoreSource = TCoreSource> =
    {
        sources: TSource[]
    }

/**
 * Narrow read-only interface for claim-source association lookups.
 * Implemented by `ClaimSourceLibrary`. Passed to `ArgumentEngine` as the
 * fourth constructor parameter.
 */
export interface TClaimSourceLookup<
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> {
    /** Returns all associations for the given claim ID. */
    getForClaim(claimId: string): TAssoc[]
    /** Returns all associations for the given source ID. */
    getForSource(sourceId: string): TAssoc[]
    /** Returns an association by ID, or `undefined` if not found. */
    get(id: string): TAssoc | undefined
}

/** Serializable snapshot of a ClaimSourceLibrary (`{ claimSourceAssociations }`). */
export type TClaimSourceLibrarySnapshot<
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> = {
    claimSourceAssociations: TAssoc[]
}
