import type { TCorePremise } from "../schemata/index.js"
import type {
    TCoreArgument,
    TCoreArgumentRoleState,
} from "../schemata/argument.js"
import type {
    TCoreEntityChanges,
    TCoreRawChangeset,
} from "../types/mutation.js"
import type { TExpressionInput } from "./ExpressionManager.js"
import type { TVariableInput } from "./VariableManager.js"

function emptyEntityChanges<T>(): TCoreEntityChanges<T> {
    return { added: [], modified: [], removed: [] }
}

function isEntityChangesEmpty<T>(ec: TCoreEntityChanges<T>): boolean {
    return (
        ec.added.length === 0 &&
        ec.modified.length === 0 &&
        ec.removed.length === 0
    )
}

/**
 * Internal collector used during a single mutation to accumulate all
 * side-effect changes. Created at the start of a public mutating method,
 * populated by internal helpers, and consumed via toChangeset().
 */
export class ChangeCollector {
    private expressions: TCoreEntityChanges<TExpressionInput> =
        emptyEntityChanges()
    private variables: TCoreEntityChanges<TVariableInput> = emptyEntityChanges()
    private premises: TCoreEntityChanges<TCorePremise> = emptyEntityChanges()
    private roles: TCoreArgumentRoleState | undefined = undefined
    private argument: TCoreArgument | undefined = undefined

    addedExpression(expr: TExpressionInput): void {
        this.expressions.added.push(expr)
    }
    modifiedExpression(expr: TExpressionInput): void {
        this.expressions.modified.push(expr)
    }
    removedExpression(expr: TExpressionInput): void {
        this.expressions.removed.push(expr)
    }

    addedVariable(variable: TVariableInput): void {
        this.variables.added.push(variable)
    }
    modifiedVariable(variable: TVariableInput): void {
        this.variables.modified.push(variable)
    }
    removedVariable(variable: TVariableInput): void {
        this.variables.removed.push(variable)
    }

    addedPremise(premise: TCorePremise): void {
        this.premises.added.push(premise)
    }
    removedPremise(premise: TCorePremise): void {
        this.premises.removed.push(premise)
    }

    setRoles(roles: TCoreArgumentRoleState): void {
        this.roles = roles
    }

    setArgument(argument: TCoreArgument): void {
        this.argument = argument
    }

    toChangeset(): TCoreRawChangeset {
        const cs: TCoreRawChangeset = {}
        if (!isEntityChangesEmpty(this.expressions))
            cs.expressions = this.expressions
        if (!isEntityChangesEmpty(this.variables)) cs.variables = this.variables
        if (!isEntityChangesEmpty(this.premises)) cs.premises = this.premises
        if (this.roles !== undefined) cs.roles = this.roles
        if (this.argument !== undefined) cs.argument = this.argument
        return cs
    }
}
