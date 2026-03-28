# Changelog

## New Exports

- `mergeChangesets` -- standalone function in `src/lib/utils/changeset.ts`; merges two `TCoreChangeset` objects with dedup-by-id, last-write-wins, and cross-bucket invariant validation (7f262ad..897a048)
- `orderChangeset` -- standalone function in `src/lib/utils/changeset.ts`; converts a changeset to FK-safe ordered `TOrderedOperation[]` with topological sort for expression inserts and reverse-topological sort for expression deletes (897a048..13e946a)
- `TOrderedOperation` -- discriminated union type for persistence operations (897a048..13e946a)
- `createLookup` -- generic factory in `src/lib/utils/lookup.ts`; builds `TClaimLookup`/`TSourceLookup` from arrays (13e946a..c6468b0)
- `EMPTY_CLAIM_LOOKUP`, `EMPTY_SOURCE_LOOKUP`, `EMPTY_CLAIM_SOURCE_LOOKUP` -- no-op lookup constants in `src/lib/utils/lookup.ts` (13e946a..c6468b0)

## New Files

- `src/lib/utils/changeset.ts` -- changeset merge and ordering utilities
- `src/lib/utils/lookup.ts` -- lookup factory and empty constants

## Documentation

- Added `orderChangeset` FK-safe ordering invariant to CLAUDE.md design rules (4550bab)
