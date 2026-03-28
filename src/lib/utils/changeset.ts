import type {
    TCorePropositionalExpression,
    TCorePropositionalVariable,
    TCorePremise,
} from "../schemata/propositional.js"
import type { TCoreArgument } from "../schemata/argument.js"
import type { TCoreEntityChanges, TCoreChangeset } from "../types/mutation.js"

/**
 * Merges two changesets into one, deduplicating entities by `id` within each
 * bucket (added/modified/removed) with last-write-wins semantics.
 *
 * Use this when a single logical operation requires multiple engine calls that
 * each produce a changeset. For example, creating a conclusion premise requires
 * both `createPremiseWithId` and `setConclusionPremise`, each returning a
 * changeset — `mergeChangesets` combines them into one changeset suitable for
 * a single persistence call.
 *
 * @param a - The first changeset.
 * @param b - The second changeset. Its entries take precedence when both
 *   changesets contain the same entity ID in the same bucket.
 * @returns A merged changeset. Entity categories that are empty after merge
 *   are omitted from the result.
 * @throws {Error} If any entity ID appears in more than one bucket
 *   (added/modified/removed) within the same category after merge. This
 *   indicates a logic error in the caller.
 *
 * @example
 * ```ts
 * const { changes: createChanges } = engine.createPremiseWithId(premiseId, data)
 * const { changes: roleChanges } = engine.setConclusionPremise(premiseId)
 * const combined = mergeChangesets(createChanges, roleChanges)
 * await persistChangeset(db, combined)
 * ```
 */
export function mergeChangesets<
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
    TPremise extends TCorePremise = TCorePremise,
    TArg extends TCoreArgument = TCoreArgument,
>(
    a: TCoreChangeset<TExpr, TVar, TPremise, TArg>,
    b: TCoreChangeset<TExpr, TVar, TPremise, TArg>
): TCoreChangeset<TExpr, TVar, TPremise, TArg> {
    const result: TCoreChangeset<TExpr, TVar, TPremise, TArg> = {}

    const mergedExpressions = mergeEntityChanges(
        a.expressions,
        b.expressions,
        "expressions"
    )
    if (mergedExpressions) result.expressions = mergedExpressions

    const mergedVariables = mergeEntityChanges(
        a.variables,
        b.variables,
        "variables"
    )
    if (mergedVariables) result.variables = mergedVariables

    const mergedPremises = mergeEntityChanges(
        a.premises,
        b.premises,
        "premises"
    )
    if (mergedPremises) result.premises = mergedPremises

    if (b.roles !== undefined) {
        result.roles = b.roles
    } else if (a.roles !== undefined) {
        result.roles = a.roles
    }

    if (b.argument !== undefined) {
        result.argument = b.argument
    } else if (a.argument !== undefined) {
        result.argument = a.argument
    }

    return result
}

function mergeEntityChanges<T extends { id: string }>(
    a: TCoreEntityChanges<T> | undefined,
    b: TCoreEntityChanges<T> | undefined,
    categoryName: string
): TCoreEntityChanges<T> | undefined {
    if (!a && !b) return undefined

    const dedup = (aList: T[], bList: T[]): T[] => {
        const map = new Map<string, T>()
        for (const item of aList) map.set(item.id, item)
        for (const item of bList) map.set(item.id, item)
        return [...map.values()]
    }

    const added = dedup(a?.added ?? [], b?.added ?? [])
    const modified = dedup(a?.modified ?? [], b?.modified ?? [])
    const removed = dedup(a?.removed ?? [], b?.removed ?? [])

    // Enforce invariant: no entity ID may appear in more than one bucket.
    const addedIds = new Set(added.map((e) => e.id))
    const modifiedIds = new Set(modified.map((e) => e.id))
    const removedIds = new Set(removed.map((e) => e.id))

    for (const id of addedIds) {
        if (modifiedIds.has(id)) {
            throw new Error(
                `mergeChangesets: entity "${id}" appears in both added and modified in ${categoryName}`
            )
        }
        if (removedIds.has(id)) {
            throw new Error(
                `mergeChangesets: entity "${id}" appears in both added and removed in ${categoryName}`
            )
        }
    }
    for (const id of modifiedIds) {
        if (removedIds.has(id)) {
            throw new Error(
                `mergeChangesets: entity "${id}" appears in both modified and removed in ${categoryName}`
            )
        }
    }

    if (added.length === 0 && modified.length === 0 && removed.length === 0) {
        return undefined
    }

    return { added, modified, removed }
}
