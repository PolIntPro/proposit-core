import type {
    TCoreArgument,
    TCorePremise,
    TCorePropositionalExpression,
    TCorePropositionalVariable,
    TOptionalChecksum,
} from "../../schemata/index.js"
import type {
    TCoreArgumentEvaluationOptions,
    TCoreArgumentEvaluationResult,
    TCoreArgumentRoleState,
    TCoreExpressionAssignment,
    TCoreValidationResult,
    TCoreValidityCheckOptions,
    TCoreValidityCheckResult,
} from "../../types/evaluation.js"
import type { TCoreMutationResult } from "../../types/mutation.js"
import type { TReactiveSnapshot } from "../../types/reactive.js"
import type { PremiseEngine } from "../premise-engine.js"
import type { TArgumentEngineSnapshot } from "../argument-engine.js"

/**
 * Premise creation, removal, and lookup.
 */
export interface TPremiseCrud<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /** Creates a new premise with an auto-generated UUID and registers it with this engine. */
    createPremise(
        extras?: Record<string, unknown>
    ): TCoreMutationResult<
        PremiseEngine<TArg, TPremise, TExpr, TVar>,
        TExpr,
        TVar,
        TPremise,
        TArg
    >
    /**
     * Creates a premise with a caller-supplied ID and registers it with this engine.
     *
     * @throws If a premise with the given ID already exists.
     */
    createPremiseWithId(
        id: string,
        extras?: Record<string, unknown>
    ): TCoreMutationResult<
        PremiseEngine<TArg, TPremise, TExpr, TVar>,
        TExpr,
        TVar,
        TPremise,
        TArg
    >
    /** Removes a premise and clears any role assignments that reference it. Returns the removed premise data, or `undefined` if not found. */
    removePremise(
        premiseId: string
    ): TCoreMutationResult<TPremise | undefined, TExpr, TVar, TPremise, TArg>
    /** Returns the premise with the given ID, or `undefined` if not found. */
    getPremise(
        premiseId: string
    ): PremiseEngine<TArg, TPremise, TExpr, TVar> | undefined
    /** Returns `true` if a premise with the given ID exists. */
    hasPremise(premiseId: string): boolean
    /** Returns all premise IDs in lexicographic order. */
    listPremiseIds(): string[]
    /** Returns all premises in lexicographic ID order. */
    listPremises(): PremiseEngine<TArg, TPremise, TExpr, TVar>[]
    /** Returns the PremiseEngine containing the given expression, or `undefined`. */
    findPremiseByExpressionId(
        expressionId: string
    ): PremiseEngine<TArg, TPremise, TExpr, TVar> | undefined
}

/**
 * Variable CRUD and lookup across the argument.
 */
export interface TVariableManagement<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /**
     * Registers a propositional variable for use across all premises.
     *
     * @throws If `variable.symbol` is already in use.
     * @throws If `variable.id` already exists.
     * @throws If the variable does not belong to this argument.
     */
    addVariable(
        variable: TOptionalChecksum<TVar>
    ): TCoreMutationResult<TVar, TExpr, TVar, TPremise, TArg>
    /**
     * Updates fields on an existing variable. Since all premises share the same VariableManager, the update is immediately visible everywhere.
     *
     * @throws If the new symbol is already in use by a different variable.
     */
    updateVariable(
        variableId: string,
        updates: { symbol?: string }
    ): TCoreMutationResult<TVar | undefined, TExpr, TVar, TPremise, TArg>
    /** Removes a variable and cascade-deletes all expressions referencing it across every premise (including subtrees and operator collapse). */
    removeVariable(
        variableId: string
    ): TCoreMutationResult<TVar | undefined, TExpr, TVar, TPremise, TArg>
    /** Returns the variable with the given ID, or `undefined` if not found. */
    getVariable(variableId: string): TVar | undefined
    /** Returns `true` if a variable with the given ID exists. */
    hasVariable(variableId: string): boolean
    /** Returns the variable with the given symbol, or `undefined` if not found. */
    getVariableBySymbol(symbol: string): TVar | undefined
    /** Returns all registered variables sorted by ID. */
    getVariables(): TVar[]
    /** Builds a Map keyed by a caller-supplied function over all variables. Useful for indexing by extension fields. The caller should cache the result — this is O(n) per call. */
    buildVariableIndex<K>(keyFn: (v: TVar) => K): Map<K, TVar>
}

/**
 * Cross-premise expression lookups and analysis.
 */
export interface TArgumentExpressionQueries<
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
> {
    /** Returns an expression by ID from any premise, or `undefined` if not found. */
    getExpression(expressionId: string): TExpr | undefined
    /** Returns `true` if an expression with the given ID exists in any premise. */
    hasExpression(expressionId: string): boolean
    /** Returns the premise ID that contains the given expression, or `undefined`. */
    getExpressionPremiseId(expressionId: string): string | undefined
    /** Returns all expressions across all premises, sorted by ID. */
    getAllExpressions(): TExpr[]
    /** Returns all expressions that reference the given variable ID, across all premises. */
    getExpressionsByVariableId(variableId: string): TExpr[]
    /** Returns the root expression from each premise that has one. */
    listRootExpressions(): TExpr[]
    /** Collects all variables referenced by expressions across all premises, indexed both by variable ID and by symbol. */
    collectReferencedVariables(): {
        variableIds: string[]
        byId: Record<string, { symbol: string; premiseIds: string[] }>
        bySymbol: Record<
            string,
            { variableIds: string[]; premiseIds: string[] }
        >
    }
}

/**
 * Conclusion and supporting premise role management.
 */
export interface TArgumentRoleState<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /** Returns the conclusion premise, or `undefined` if none is set. */
    getConclusionPremise():
        | PremiseEngine<TArg, TPremise, TExpr, TVar>
        | undefined
    /** Returns all supporting premises (derived: inference premises that are not the conclusion) in lexicographic ID order. */
    listSupportingPremises(): PremiseEngine<TArg, TPremise, TExpr, TVar>[]
    /**
     * Designates a premise as the argument's conclusion.
     *
     * @throws If the premise does not exist.
     */
    setConclusionPremise(
        premiseId: string
    ): TCoreMutationResult<TCoreArgumentRoleState, TExpr, TVar, TPremise, TArg>
    /** Clears the conclusion designation. */
    clearConclusionPremise(): TCoreMutationResult<
        TCoreArgumentRoleState,
        TExpr,
        TVar,
        TPremise,
        TArg
    >
    /** Returns the current role assignments (conclusion premise ID only; supporting is derived). */
    getRoleState(): TCoreArgumentRoleState
}

/**
 * Argument-level evaluation: single-assignment evaluation, evaluability
 * validation, and exhaustive validity checking.
 */
export interface TArgumentEvaluation {
    /** Validates that this argument is structurally ready for evaluation: a conclusion must be set, all role references must point to existing premises, variable ID/symbol mappings must be consistent, and every premise must be individually evaluable. */
    validateEvaluability(): TCoreValidationResult
    /**
     * Evaluates the argument under a three-valued expression assignment.
     *
     * Variables may be `true`, `false`, or `null` (unknown). All result flags
     * (`isAdmissibleAssignment`, `isCounterexample`, etc.) are three-valued:
     * `null` means indeterminate due to unknown variable values.
     *
     * Returns `{ ok: false }` with validation details if the argument is not structurally evaluable.
     */
    evaluate(
        assignment: TCoreExpressionAssignment,
        options?: TCoreArgumentEvaluationOptions
    ): TCoreArgumentEvaluationResult
    /**
     * Enumerates all 2^n variable assignments and checks for counterexamples.
     *
     * A counterexample is an admissible assignment where all supporting premises
     * are true but the conclusion is false. The argument is valid if no
     * counterexamples exist.
     */
    checkValidity(options?: TCoreValidityCheckOptions): TCoreValidityCheckResult
}

/**
 * Snapshot, rollback, and reactive subscription lifecycle.
 * Static factory methods (fromSnapshot, fromData) are class-level only.
 */
export interface TArgumentLifecycle<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /** Registers a listener that is called after every mutation. Returns an unsubscribe function. */
    subscribe(listener: () => void): () => void
    /** Returns the current reactive snapshot for external store consumption. */
    getSnapshot(): TReactiveSnapshot<TArg, TPremise, TExpr, TVar>
    /** Returns a serializable snapshot of the full engine state. */
    snapshot(): TArgumentEngineSnapshot<TArg, TPremise, TExpr, TVar>
    /** Restores the engine to a previously captured snapshot state. */
    rollback(
        snapshot: TArgumentEngineSnapshot<TArg, TPremise, TExpr, TVar>
    ): void
}

/**
 * Argument entity access.
 */
export interface TArgumentIdentity<TArg extends TCoreArgument = TCoreArgument> {
    /** Returns a shallow copy of the argument metadata with checksum attached. */
    getArgument(): TArg
}
