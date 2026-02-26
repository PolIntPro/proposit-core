import type {
    TCoreArgument,
    TCorePremise,
    TCorePropositionalExpression,
    TCorePropositionalVariable,
} from "../schemata/index.js"
import type { TCoreFieldChange } from "../types/diff.js"

export function defaultCompareArgument(
    before: TCoreArgument,
    after: TCoreArgument
): TCoreFieldChange[] {
    const changes: TCoreFieldChange[] = []
    if (before.title !== after.title) {
        changes.push({
            field: "title",
            before: before.title,
            after: after.title,
        })
    }
    if (before.description !== after.description) {
        changes.push({
            field: "description",
            before: before.description,
            after: after.description,
        })
    }
    return changes
}

export function defaultCompareVariable(
    before: TCorePropositionalVariable,
    after: TCorePropositionalVariable
): TCoreFieldChange[] {
    const changes: TCoreFieldChange[] = []
    if (before.symbol !== after.symbol) {
        changes.push({
            field: "symbol",
            before: before.symbol,
            after: after.symbol,
        })
    }
    return changes
}

export function defaultComparePremise(
    before: TCorePremise,
    after: TCorePremise
): TCoreFieldChange[] {
    const changes: TCoreFieldChange[] = []
    if (before.title !== after.title) {
        changes.push({
            field: "title",
            before: before.title,
            after: after.title,
        })
    }
    if (before.rootExpressionId !== after.rootExpressionId) {
        changes.push({
            field: "rootExpressionId",
            before: before.rootExpressionId,
            after: after.rootExpressionId,
        })
    }
    return changes
}

export function defaultCompareExpression(
    before: TCorePropositionalExpression,
    after: TCorePropositionalExpression
): TCoreFieldChange[] {
    const changes: TCoreFieldChange[] = []
    if (before.parentId !== after.parentId) {
        changes.push({
            field: "parentId",
            before: before.parentId,
            after: after.parentId,
        })
    }
    if (before.position !== after.position) {
        changes.push({
            field: "position",
            before: before.position,
            after: after.position,
        })
    }
    if (before.type === "variable" && after.type === "variable") {
        if (before.variableId !== after.variableId) {
            changes.push({
                field: "variableId",
                before: before.variableId,
                after: after.variableId,
            })
        }
    }
    if (before.type === "operator" && after.type === "operator") {
        if (before.operator !== after.operator) {
            changes.push({
                field: "operator",
                before: before.operator,
                after: after.operator,
            })
        }
    }
    return changes
}
