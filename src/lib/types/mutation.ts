import type {
    TCorePropositionalExpression,
    TCorePropositionalVariable,
    TCorePremise,
} from "../schemata/propositional.js"
import type {
    TCoreArgument,
    TCoreArgumentRoleState,
} from "../schemata/argument.js"

/** Added/modified/removed entities of one type within a single mutation. */
export interface TCoreEntityChanges<T> {
    added: T[]
    modified: T[]
    removed: T[]
}

/**
 * Entity-typed changeset produced by every mutating operation.
 * Only categories that were actually affected are present.
 */
export interface TCoreChangeset {
    expressions?: TCoreEntityChanges<TCorePropositionalExpression>
    variables?: TCoreEntityChanges<TCorePropositionalVariable>
    premises?: TCoreEntityChanges<TCorePremise>
    /** New role state, present only when roles changed. */
    roles?: TCoreArgumentRoleState
    /** New argument metadata, present only when argument changed. */
    argument?: TCoreArgument
}

/**
 * Every mutating method returns this wrapper.
 * `result` is the direct answer (e.g. the removed expression).
 * `changes` is the full set of DB-level side effects.
 */
export interface TCoreMutationResult<T> {
    result: T
    changes: TCoreChangeset
}
