import type {
    TCoreArgument,
    TCorePremise,
    TCorePropositionalExpression,
    TCorePropositionalVariable,
} from "../../schemata/index.js"
import type {
    TCoreExpressionAssignment,
    TCorePremiseEvaluationResult,
    TCoreValidationResult,
} from "../../types/evaluation.js"
import type { TCoreMutationResult } from "../../types/mutation.js"
import type {
    TExpressionInput,
    TExpressionWithoutPosition,
    TExpressionUpdate,
} from "../expression-manager.js"
import type { TPremiseEngineSnapshot } from "../premise-engine.js"

/**
 * Single-premise expression tree mutations.
 */
export interface TExpressionMutations<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /**
     * Adds an expression to this premise's tree.
     *
     * If the expression has `parentId: null` it becomes the root; only one root is
     * permitted per premise. All structural rules (`implies`/`iff` root-only, child
     * limits, position uniqueness) are enforced.
     *
     * @throws If the premise already has a root expression and this one is also a root.
     * @throws If the expression's parent does not exist in this premise.
     * @throws If the expression is a variable reference and the variable has not been registered.
     */
    addExpression(
        expression: TExpressionInput<TExpr>
    ): TCoreMutationResult<TExpr, TExpr, TVar, TPremise, TArg>
    /**
     * Adds an expression as the last child of the given parent, with position
     * computed automatically. If `parentId` is `null`, the expression becomes the root.
     *
     * @throws If the premise already has a root and parentId is null.
     * @throws If the expression is a variable reference and the variable has not been registered.
     */
    appendExpression(
        parentId: string | null,
        expression: TExpressionWithoutPosition<TExpr>
    ): TCoreMutationResult<TExpr, TExpr, TVar, TPremise, TArg>
    /**
     * Adds an expression immediately before or after an existing sibling,
     * with position computed automatically.
     *
     * @throws If the sibling does not exist in this premise.
     * @throws If the expression is a variable reference and the variable has not been registered.
     */
    addExpressionRelative(
        siblingId: string,
        relativePosition: "before" | "after",
        expression: TExpressionWithoutPosition<TExpr>
    ): TCoreMutationResult<TExpr, TExpr, TVar, TPremise, TArg>
    /**
     * Updates mutable fields of an existing expression. Only `position`,
     * `variableId`, and `operator` may be updated.
     *
     * @throws If the expression does not exist in this premise.
     * @throws If `variableId` references a non-existent variable.
     */
    updateExpression(
        expressionId: string,
        updates: TExpressionUpdate
    ): TCoreMutationResult<TExpr, TExpr, TVar, TPremise, TArg>
    /**
     * Removes an expression and optionally its entire descendant subtree, then
     * collapses any ancestor operators with fewer than two children.
     *
     * Returns the removed root expression, or `undefined` if not found.
     */
    removeExpression(
        expressionId: string,
        deleteSubtree: boolean
    ): TCoreMutationResult<TExpr | undefined, TExpr, TVar, TPremise, TArg>
    /**
     * Splices a new expression between existing nodes in the tree. The new
     * expression inherits the tree slot of the anchor node
     * (`leftNodeId ?? rightNodeId`).
     *
     * @throws If the expression is a variable reference and the variable has not been registered.
     */
    insertExpression(
        expression: TExpressionInput<TExpr>,
        leftNodeId?: string,
        rightNodeId?: string
    ): TCoreMutationResult<TExpr, TExpr, TVar, TPremise, TArg>
    /**
     * Wraps an existing expression with a new operator and a new sibling
     * in a single atomic operation.
     *
     * Exactly one of `leftNodeId` / `rightNodeId` must be provided — it
     * identifies the existing node. The new sibling fills the other slot.
     *
     * @throws If the new sibling is a variable reference and the variable has not been registered.
     */
    wrapExpression(
        operator: TExpressionWithoutPosition<TExpr>,
        newSibling: TExpressionWithoutPosition<TExpr>,
        leftNodeId?: string,
        rightNodeId?: string
    ): TCoreMutationResult<TExpr, TExpr, TVar, TPremise, TArg>
}

/**
 * Single-premise expression tree reads.
 */
export interface TExpressionQueries<
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
> {
    /** Returns an expression by ID, or `undefined` if not found in this premise. */
    getExpression(id: string): TExpr | undefined
    /** Returns the ID of the root expression, or `undefined` if the premise is empty. */
    getRootExpressionId(): string | undefined
    /** Returns the root expression, or `undefined` if the premise is empty. */
    getRootExpression(): TExpr | undefined
    /** Returns all expressions in this premise. */
    getExpressions(): TExpr[]
    /** Returns the child expressions of the given parent, sorted by position. */
    getChildExpressions(parentId: string | null): TExpr[]
}

/**
 * Variable reference queries and cascade deletion.
 */
export interface TVariableReferences<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /** Returns all argument-level variables (from the shared VariableManager) sorted by ID. */
    getVariables(): TVar[]
    /** Returns the set of variable IDs referenced by expressions in this premise. */
    getReferencedVariableIds(): Set<string>
    /** Deletes all expressions that reference the given variable ID, including their subtrees. Operator collapse runs after each removal. */
    deleteExpressionsUsingVariable(
        variableId: string
    ): TCoreMutationResult<TExpr[], TExpr, TVar, TPremise, TArg>
}

/**
 * Premise type classification (inference vs constraint).
 */
export interface TPremiseClassification {
    /** Returns `true` if the root expression is an `implies` or `iff` operator. */
    isInference(): boolean
    /** Returns `true` if this premise does not have an inference operator at its root. Equivalent to `!isInference()`. */
    isConstraint(): boolean
}

/**
 * Premise-level evaluation: single-assignment evaluation and
 * evaluability validation.
 */
export interface TPremiseEvaluation {
    /** Validates that this premise is structurally ready for evaluation. */
    validateEvaluability(): TCoreValidationResult
    /**
     * Evaluates the premise under a three-valued expression assignment.
     *
     * Variable values are looked up using Kleene three-valued logic (`null` = unknown).
     * For inference premises, an `inferenceDiagnostic` is computed.
     */
    evaluate(
        assignment: TCoreExpressionAssignment,
        options?: {
            strictUnknownKeys?: boolean
            requireExactCoverage?: boolean
        }
    ): TCorePremiseEvaluationResult
}

/**
 * Premise snapshot and mutation callback lifecycle.
 * Static fromSnapshot factory is class-level only.
 */
export interface TPremiseLifecycle<
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
> {
    /** Returns a serializable snapshot of the premise's owned state. */
    snapshot(): TPremiseEngineSnapshot<TPremise, TExpr>
    /** Sets a callback invoked after every mutation, or `undefined` to clear. */
    setOnMutate(callback: (() => void) | undefined): void
    /** Invalidates the cached checksum so the next call recomputes it. */
    markDirty(): void
}

/**
 * Premise entity identity and metadata access.
 */
export interface TPremiseIdentity<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /** Returns the premise ID. */
    getId(): string
    /** Returns a serializable premise representation containing only identity/metadata and checksum. */
    toPremiseData(): TPremise
    /** Returns the premise's extra metadata record. */
    getExtras(): Record<string, unknown>
    /** Replaces the premise's extra metadata record. */
    setExtras(
        extras: Record<string, unknown>
    ): TCoreMutationResult<Record<string, unknown>, TExpr, TVar, TPremise, TArg>
}
