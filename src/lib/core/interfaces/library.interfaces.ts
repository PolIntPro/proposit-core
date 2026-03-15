import type { TCoreClaim } from "../../schemata/claim.js"
import type { TCoreSource } from "../../schemata/source.js"

/** Narrow read-only interface for claim lookups. Used by ArgumentEngine for validation. */
export interface TClaimLookup<
    TClaim extends TCoreClaim = TCoreClaim,
> {
    get(id: string, version: number): TClaim | undefined
}

/** Narrow read-only interface for source lookups. Used by ArgumentEngine for validation. */
export interface TSourceLookup<TSource extends TCoreSource = TCoreSource> {
    get(id: string, version: number): TSource | undefined
}

/** Serializable snapshot of a ClaimLibrary. */
export type TClaimLibrarySnapshot<
    TClaim extends TCoreClaim = TCoreClaim,
> = {
    claims: TClaim[]
}

/** Serializable snapshot of a SourceLibrary. */
export type TSourceLibrarySnapshot<TSource extends TCoreSource = TCoreSource> =
    {
        sources: TSource[]
    }
