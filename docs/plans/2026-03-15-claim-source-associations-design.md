# Claim-Source Associations Design

## Motivation

Variable-source associations are semantically misaligned. A source supports the truth of a *proposition* (claim), not a particular *use* of that proposition in a specific argument (variable). Currently:

- Claims are global (live in `ClaimLibrary`)
- Sources are global (live in `SourceLibrary`)
- Variable-source associations are argument-scoped (include `argumentId`/`argumentVersion`)

Moving to claim-source associations fixes this: both endpoints are global library entities, and the association is also global.

Additionally, the new library should be generic so consumers can extend the base association type with additional fields (e.g., `createdBy` for per-user filtering).

## Decisions

| Question | Decision |
|----------|----------|
| Scope | Replace variable-source with claim-source only. Expression-source stays as-is. |
| Where associations live | New standalone `ClaimSourceLibrary<TAssoc>` class (not inside `ClaimLibrary` or `SourceLibrary`). |
| Versioning/freeze | No. Associations are create-or-delete only. Version-pinning on `claimVersion` + `sourceVersion` within each association captures the temporal relationship. |
| Validation | Yes. `ClaimSourceLibrary` takes `TClaimLookup` and `TSourceLookup` and validates on add. |
| Extensibility | Generic `TAssoc extends TCoreClaimSourceAssociation`. Consumers extend the base schema with additional fields and use `filter()` for custom queries. |

## Schema

New `CoreClaimSourceAssociationSchema` replaces `CoreVariableSourceAssociationSchema` in `src/lib/schemata/source.ts`:

```typescript
export const CoreClaimSourceAssociationSchema = Type.Object(
    {
        id: UUID,
        claimId: UUID,
        claimVersion: Type.Number({
            description: "The version of the claim this association pins to.",
        }),
        sourceId: UUID,
        sourceVersion: Type.Number({
            description: "The version of the source this association pins to.",
        }),
        checksum: Type.String({
            description: "Association checksum for sync detection.",
        }),
    },
    {
        additionalProperties: true,
        description:
            "An association between a claim and a source. Extended via generics for additional fields (e.g., createdBy).",
    }
)
export type TCoreClaimSourceAssociation = Static<
    typeof CoreClaimSourceAssociationSchema
>
```

Key differences from `CoreVariableSourceAssociationSchema`:
- `variableId` replaced by `claimId` + `claimVersion`
- `argumentId` / `argumentVersion` removed (no longer argument-scoped)
- `additionalProperties: true` for extended types

`CoreVariableSourceAssociationSchema` and `TCoreVariableSourceAssociation` are deleted. `CoreExpressionSourceAssociationSchema` is unchanged.

## `ClaimSourceLibrary<TAssoc>` class

New file: `src/lib/core/claim-source-library.ts`

### Constructor

```typescript
class ClaimSourceLibrary<
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> {
    constructor(
        claimLookup: TClaimLookup,
        sourceLookup: TSourceLookup,
        options?: { checksumConfig?: TCoreChecksumConfig }
    )
}
```

### Data structures

- `associations: Map<assocId, TAssoc>` — primary store
- `claimToAssociations: Map<claimId, Set<assocId>>` — reverse index
- `sourceToAssociations: Map<sourceId, Set<assocId>>` — reverse index

### Mutations (create-or-delete only)

- `add(assoc: Omit<TAssoc, "checksum">): TAssoc` — validates claim exists via `TClaimLookup.get(claimId, claimVersion)` and source exists via `TSourceLookup.get(sourceId, sourceVersion)`. Computes checksum. Throws on duplicate ID, missing claim, or missing source.
- `remove(id: string): TAssoc` — removes from store and indexes, returns removed association. Throws if not found.

### Queries

- `getForClaim(claimId: string): TAssoc[]` — all associations for a claim (across all versions)
- `getForSource(sourceId: string): TAssoc[]` — all associations for a source
- `get(id: string): TAssoc | undefined` — single association by ID
- `getAll(): TAssoc[]` — all associations
- `filter(predicate: (a: TAssoc) => boolean): TAssoc[]` — generic filtering for consumer-defined fields (e.g., `a => a.createdBy === userId`)

### Snapshot/restore

- `snapshot(): TClaimSourceLibrarySnapshot<TAssoc>` — returns `{ claimSourceAssociations: TAssoc[] }`
- `static fromSnapshot<TAssoc>(snapshot, claimLookup, sourceLookup, options?): ClaimSourceLibrary<TAssoc>`

### Read-only interface

```typescript
interface TClaimSourceLookup<
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> {
    getForClaim(claimId: string): TAssoc[]
    getForSource(sourceId: string): TAssoc[]
    get(id: string): TAssoc | undefined
}
```

Added to `src/lib/core/interfaces/library.interfaces.ts` alongside `TClaimLookup` and `TSourceLookup`.

## Integration

### `ArgumentEngine` constructor

Adds `TAssoc` as a new generic parameter with a default, and a 4th library parameter (read-only):

```typescript
class ArgumentEngine<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> {
    constructor(
        argument: TArg,
        claimLibrary: TClaimLookup,
        sourceLibrary: TSourceLookup,
        claimSourceLibrary: TClaimSourceLookup<TAssoc>,
        options?: TArgumentEngineOptions
    )
}
```

`ArgumentEngine` does not mutate claim-source associations. It can query them (e.g., "what sources support the claim behind variable P?") but `ClaimSourceLibrary` is managed externally.

### `SourceManager` changes

The entire variable-association half is removed:
- Deleted: `variableAssociations` map, `variableToAssociations` index, all `*VariableSourceAssociation*` methods, `removeAssociationsForVariable`
- Kept: all expression-association logic unchanged
- `TSourceAssociationRemovalResult` replaced by `TCoreExpressionSourceAssociation[]` (single-field wrapper no longer needed)
- `TSourceManagerSnapshot` drops `variableSourceAssociations`
- `getAssociationsForSource` simplified: returns `TCoreExpressionSourceAssociation[]` instead of `{ variable, expression }` (only expression associations remain)

### `TSourceManagement` interface changes

Removed methods:
- `addVariableSourceAssociation`
- `removeVariableSourceAssociation`
- `getAssociationsForVariable`
- `getAllVariableSourceAssociations`

Changed methods:
- `getAssociationsForSource(sourceId)` — simplified to return `TCoreExpressionSourceAssociation[]` (was `{ variable, expression }`)

Kept methods (all expression-source):
- `addExpressionSourceAssociation`
- `removeExpressionSourceAssociation`
- `getAssociationsForExpression`
- `getAllExpressionSourceAssociations`

### `ChangeCollector` changes

In `src/lib/core/change-collector.ts`:
- Remove `variableSourceAssociations` private field
- Remove `addedVariableSourceAssociation()` and `removedVariableSourceAssociation()` methods
- Keep all expression-source association tracking unchanged

### `TCoreChangeset` changes

In `src/lib/types/mutation.ts`:
- Remove `variableSourceAssociations?: TCoreEntityChanges<TCoreVariableSourceAssociation>` field
- Keep `expressionSourceAssociations` field unchanged

### `TReactiveSnapshot` changes

In `src/lib/types/reactive.ts`:
- Remove `variableSourceAssociations: Record<string, TCoreVariableSourceAssociation>` field
- Keep `expressionSourceAssociations` field unchanged

### Diff module changes

In `src/lib/types/diff.ts`:
- Remove `variableSourceAssociations` field from `TCoreArgumentDiff`
- Remove `compareVariableSourceAssociation` field from `TCoreDiffOptions`

In `src/lib/core/diff.ts`:
- Remove `defaultCompareVariableSourceAssociation` comparator function
- Remove variable-source association diffing from `diffArguments` (calls to `getAllVariableSourceAssociations()`)
- Remove `defaultCompareVariableSourceAssociation` from barrel exports

### Cascade changes

- `removeVariable()` no longer cascades to variable-source associations (they don't exist). Still cascades expressions -> expression-source associations.
- `removePremise()` unchanged (only cascades expression-source associations).
- No cascade from claim-source side — associations are global and independent of argument lifecycle.

### Checksum config

- `variableSourceAssociationFields` renamed to `claimSourceAssociationFields` in both `TCoreChecksumConfig` (`src/lib/types/checksum.ts`) and `DEFAULT_CHECKSUM_CONFIG` (`src/lib/consts.ts`)
- Default fields: `["id", "claimId", "claimVersion", "sourceId", "sourceVersion"]`
- `createChecksumConfig` `keys` array updated to replace `"variableSourceAssociationFields"` with `"claimSourceAssociationFields"`

## Exports

### New exports

- `ClaimSourceLibrary` class
- `TCoreClaimSourceAssociation` type and `CoreClaimSourceAssociationSchema`
- `TClaimSourceLookup` and `TClaimSourceLibrarySnapshot` interfaces

### Removed exports

- `TCoreVariableSourceAssociation` type and `CoreVariableSourceAssociationSchema`
- `defaultCompareVariableSourceAssociation` from diff module
- All variable-source methods from `TSourceManagement`

## CLI layer

- `sources link-variable` command removed or replaced with `sources link-claim` calling `ClaimSourceLibrary.add()`
- `sources unlink` updated to handle claim-source vs expression-source association types
- Disk storage: `sources/variable-associations.json` replaced with `claim-source-associations.json`, managed separately from argument-versioned directories (global, not argument-scoped)
- `src/cli/storage/sources.ts`: remove `readVariableAssociations`, `writeVariableAssociations`, `variableAssociationsPath`, `VariableAssociationSchema`; add equivalents for claim-source associations
- `src/cli/engine.ts`: update `hydrateEngine` and `persistEngine` to stop reading/writing variable-source associations; `ClaimSourceLibrary` hydration/persistence is managed independently (not inside `hydrateEngine`/`persistEngine`) since it is global, not argument-scoped

## Testing

Affected test blocks in `test/core.test.ts`:
- All `SourceManager` variable-association tests — remove entirely
- All `ArgumentEngine` `addVariableSourceAssociation`/`removeVariableSourceAssociation` tests — remove entirely
- `removeVariable` cascade tests — update to verify no variable-source cascade (only expression-source cascade via expression deletion)
- `getAssociationsForSource` tests — update to reflect simplified expression-only return type

Affected test blocks in `test/diff-renderer.test.ts`:
- Fixture objects that include `variableSourceAssociations` — remove field from fixtures

New tests to add:
- `ClaimSourceLibrary` — add/remove, validation against `ClaimLookup`/`SourceLookup`, `getForClaim`, `getForSource`, `filter`, snapshot/restore, duplicate ID rejection, missing claim/source rejection
- Generic `TAssoc` extension — verify extended fields are preserved through add/snapshot/filter

## Breaking changes

Breaking public API change to `ArgumentEngine` constructor signature and generics, `TSourceManagement` interface, `TCoreChangeset`, `TCoreArgumentDiff`, `TCoreDiffOptions`, `TReactiveSnapshot`, checksum config, and schemas. Acceptable at current semver (0.x).
