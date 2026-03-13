import type {
    TCoreArgument,
    TCorePremise,
    TCorePropositionalExpression,
    TCorePropositionalVariable,
    TCoreVariableSourceAssociation,
    TCoreExpressionSourceAssociation,
} from "../../schemata/index.js"
import type { TCoreMutationResult } from "../../types/mutation.js"

/**
 * Source association management and lookup for an argument.
 * Source entities live in SourceLibrary; this interface manages associations only.
 */
export interface TSourceManagement<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
> {
    /**
     * Creates an association between a source and a variable.
     *
     * @param sourceId - The ID of the source.
     * @param sourceVersion - The version of the source to associate.
     * @param variableId - The ID of the variable to associate.
     * @returns The created association and changeset.
     * @throws If the source does not exist in the source library.
     * @throws If the variable does not exist.
     */
    addVariableSourceAssociation(
        sourceId: string,
        sourceVersion: number,
        variableId: string
    ): TCoreMutationResult<
        TCoreVariableSourceAssociation,
        TExpr,
        TVar,
        TPremise,
        TArg
    >

    /**
     * Removes a variable-source association by its own ID.
     *
     * @param associationId - The ID of the association to remove.
     * @returns The removed association, or `undefined` if not found.
     */
    removeVariableSourceAssociation(
        associationId: string
    ): TCoreMutationResult<
        TCoreVariableSourceAssociation | undefined,
        TExpr,
        TVar,
        TPremise,
        TArg
    >

    /**
     * Creates an association between a source and an expression within a
     * specific premise.
     *
     * @param sourceId - The ID of the source.
     * @param sourceVersion - The version of the source to associate.
     * @param expressionId - The ID of the expression to associate.
     * @param premiseId - The ID of the premise that owns the expression.
     * @returns The created association and changeset.
     * @throws If the source does not exist in the source library.
     * @throws If the expression does not exist in the specified premise.
     */
    addExpressionSourceAssociation(
        sourceId: string,
        sourceVersion: number,
        expressionId: string,
        premiseId: string
    ): TCoreMutationResult<
        TCoreExpressionSourceAssociation,
        TExpr,
        TVar,
        TPremise,
        TArg
    >

    /**
     * Removes an expression-source association by its own ID.
     *
     * @param associationId - The ID of the association to remove.
     * @returns The removed association, or `undefined` if not found.
     */
    removeExpressionSourceAssociation(
        associationId: string
    ): TCoreMutationResult<
        TCoreExpressionSourceAssociation | undefined,
        TExpr,
        TVar,
        TPremise,
        TArg
    >

    /**
     * Returns all variable and expression associations for a given source.
     * Returns associations across all source versions for that ID.
     */
    getAssociationsForSource(sourceId: string): {
        variable: TCoreVariableSourceAssociation[]
        expression: TCoreExpressionSourceAssociation[]
    }

    /** Returns all source associations for a given variable. */
    getAssociationsForVariable(
        variableId: string
    ): TCoreVariableSourceAssociation[]

    /** Returns all source associations for a given expression. */
    getAssociationsForExpression(
        expressionId: string
    ): TCoreExpressionSourceAssociation[]

    /** Returns all variable-source associations across the argument. */
    getAllVariableSourceAssociations(): TCoreVariableSourceAssociation[]

    /** Returns all expression-source associations across the argument. */
    getAllExpressionSourceAssociations(): TCoreExpressionSourceAssociation[]
}
