# Release Notes

## Persistence Utilities

New utility functions to reduce boilerplate for consumers that persist argument data to databases or other storage:

- **`mergeChangesets(a, b)`** -- Combines two changesets from separate engine calls into one, with dedup-by-id and cross-bucket validation. Useful when a single logical operation requires multiple engine mutations (e.g., creating a premise and setting it as conclusion).

- **`orderChangeset(changeset)`** -- Converts a changeset into a flat array of operations ordered for safe sequential execution against a relational store with foreign key constraints. Handles topological sorting of expression inserts and reverse-topological sorting of expression deletes.

- **`createLookup(items, getKey)`** -- Factory for building `TClaimLookup` or `TSourceLookup` from arrays, replacing hand-written Map adapters.

- **`EMPTY_CLAIM_LOOKUP`**, **`EMPTY_SOURCE_LOOKUP`**, **`EMPTY_CLAIM_SOURCE_LOOKUP`** -- No-op lookup constants for when a library isn't in use.
