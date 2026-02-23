import { randomUUID } from "node:crypto"
import type {
    TArgument,
    TLogicalOperatorType,
    TPremise,
    TPropositionalExpression,
    TPropositionalVariable,
} from "./schemata"
import { DefaultMap } from "./utils"

function getOrCreate<K, V>(map: Map<K, V>, key: K, makeDefault: () => V): V {
    const existing = map.get(key)
    if (existing !== undefined) {
        return existing
    }

    const value = makeDefault()
    map.set(key, value)
    return value
}

export type TPremiseRole = "supporting" | "conclusion"

export interface TArgumentRoleState {
    supportingPremiseIds: string[]
    conclusionPremiseId?: string
}

export interface TArgumentEngineData {
    argument: TArgument
    premises: TPremise[]
    roles: TArgumentRoleState
}

export type TVariableAssignment = Record<string, boolean>

export type TValidationSeverity = "error" | "warning"

export type TValidationCode =
    | "ARGUMENT_NO_CONCLUSION"
    | "ARGUMENT_CONCLUSION_NOT_FOUND"
    | "ARGUMENT_SUPPORTING_PREMISE_NOT_FOUND"
    | "ARGUMENT_ROLE_OVERLAP"
    | "ARGUMENT_VARIABLE_ID_SYMBOL_MISMATCH"
    | "ARGUMENT_VARIABLE_SYMBOL_AMBIGUOUS"
    | "PREMISE_EMPTY"
    | "PREMISE_ROOT_MISSING"
    | "PREMISE_ROOT_MISMATCH"
    | "EXPR_CHILD_COUNT_INVALID"
    | "EXPR_BINARY_POSITIONS_INVALID"
    | "EXPR_VARIABLE_UNDECLARED"
    | "ASSIGNMENT_MISSING_VARIABLE"
    | "ASSIGNMENT_UNKNOWN_VARIABLE"

export interface TValidationIssue {
    code: TValidationCode
    severity: TValidationSeverity
    message: string
    premiseId?: string
    expressionId?: string
    variableId?: string
}

export interface TValidationResult {
    ok: boolean
    issues: TValidationIssue[]
}

export interface TDirectionalVacuity {
    antecedentTrue: boolean
    consequentTrue: boolean
    implicationValue: boolean
    isVacuouslyTrue: boolean
    fired: boolean
}

export type TPremiseInferenceDiagnostic =
    | {
          kind: "implies"
          premiseId: string
          rootExpressionId: string
          leftValue: boolean
          rightValue: boolean
          rootValue: boolean
          antecedentTrue: boolean
          consequentTrue: boolean
          isVacuouslyTrue: boolean
          fired: boolean
          firedAndHeld: boolean
      }
    | {
          kind: "iff"
          premiseId: string
          rootExpressionId: string
          leftValue: boolean
          rightValue: boolean
          rootValue: boolean
          leftToRight: TDirectionalVacuity
          rightToLeft: TDirectionalVacuity
          bothSidesTrue: boolean
          bothSidesFalse: boolean
      }

export interface TPremiseEvaluationResult {
    premiseId: string
    premiseType: "inference" | "constraint"
    rootExpressionId?: string
    rootValue?: boolean
    expressionValues: Record<string, boolean>
    variableValues: Record<string, boolean>
    inferenceDiagnostic?: TPremiseInferenceDiagnostic
}

export interface TArgumentEvaluationOptions {
    strictUnknownAssignmentKeys?: boolean
    includeExpressionValues?: boolean
    includeDiagnostics?: boolean
    validateFirst?: boolean
}

export interface TArgumentEvaluationResult {
    ok: boolean
    validation?: TValidationResult
    assignment?: TVariableAssignment
    referencedVariableIds?: string[]
    conclusion?: TPremiseEvaluationResult
    supportingPremises?: TPremiseEvaluationResult[]
    constraintPremises?: TPremiseEvaluationResult[]
    isAdmissibleAssignment?: boolean
    allSupportingPremisesTrue?: boolean
    conclusionTrue?: boolean
    isCounterexample?: boolean
    preservesTruthUnderAssignment?: boolean
}

export interface TValidityCheckOptions {
    mode?: "firstCounterexample" | "exhaustive"
    maxVariables?: number
    maxAssignmentsChecked?: number
    includeCounterexampleEvaluations?: boolean
    validateFirst?: boolean
}

export interface TCounterexample {
    assignment: TVariableAssignment
    result: TArgumentEvaluationResult
}

export interface TValidityCheckResult {
    ok: boolean
    validation?: TValidationResult
    isValid?: boolean
    checkedVariableIds?: string[]
    numAssignmentsChecked?: number
    numAdmissibleAssignments?: number
    counterexamples?: TCounterexample[]
    truncated?: boolean
}

function makeValidationResult(issues: TValidationIssue[]): TValidationResult {
    return {
        ok: issues.every((issue) => issue.severity !== "error"),
        issues,
    }
}

function makeErrorIssue(
    issue: Omit<TValidationIssue, "severity">
): TValidationIssue {
    return { severity: "error", ...issue }
}

function sortedCopyById<T extends { id: string }>(items: T[]): T[] {
    return [...items]
        .map((item) => ({ ...item }))
        .sort((a, b) => a.id.localeCompare(b.id))
}

function implicationValue(antecedent: boolean, consequent: boolean): boolean {
    return !antecedent || consequent
}

function buildDirectionalVacuity(
    antecedentTrue: boolean,
    consequentTrue: boolean
): TDirectionalVacuity {
    const implication = implicationValue(antecedentTrue, consequentTrue)
    return {
        antecedentTrue,
        consequentTrue,
        implicationValue: implication,
        isVacuouslyTrue: !antecedentTrue,
        fired: antecedentTrue,
    }
}

function sortedUnique(values: Iterable<string>): string[] {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}

class VariableManager {
    private variables: Map<string, TPropositionalVariable>
    private variableSymbols: Set<string>

    constructor(initialVariables: TPropositionalVariable[] = []) {
        this.variables = new Map()
        this.variableSymbols = new Set()

        for (const variable of initialVariables) {
            this.addVariable(variable)
        }
    }

    public toArray(): TPropositionalVariable[] {
        return Array.from(this.variables.values())
    }

    public addVariable(variable: TPropositionalVariable) {
        if (this.variableSymbols.has(variable.symbol)) {
            throw new Error(
                `Variable symbol "${variable.symbol}" already exists.`
            )
        }
        if (this.variables.has(variable.id)) {
            throw new Error(`Variable with ID "${variable.id}" already exists.`)
        }

        this.variables.set(variable.id, variable)
        this.variableSymbols.add(variable.symbol)
    }

    public removeVariable(variableId: string) {
        const variable = this.variables.get(variableId)
        if (!variable) {
            return undefined
        }

        this.variables.delete(variableId)
        this.variableSymbols.delete(variable.symbol)
        return variable
    }

    public hasVariable(variableId: string): boolean {
        return this.variables.has(variableId)
    }

    public getVariable(variableId: string): TPropositionalVariable | undefined {
        return this.variables.get(variableId)
    }
}

class ExpressionManager {
    private expressions: Map<string, TPropositionalExpression>
    private childExpressionIdsByParentId: Map<string | null, Set<string>>
    private childPositionsByParentId: Map<string | null, Set<number>>

    constructor(initialExpressions: TPropositionalExpression[] = []) {
        this.expressions = new Map()
        this.childExpressionIdsByParentId = new Map()
        this.childPositionsByParentId = new Map()

        this.loadInitialExpressions(initialExpressions)
    }

    public toArray(): TPropositionalExpression[] {
        return Array.from(this.expressions.values())
    }

    public addExpression(expression: TPropositionalExpression) {
        if (this.expressions.has(expression.id)) {
            throw new Error(
                `Expression with ID "${expression.id}" already exists.`
            )
        }
        if (expression.parentId === expression.id) {
            throw new Error(
                `Expression "${expression.id}" cannot be its own parent.`
            )
        }

        if (
            expression.type === "operator" &&
            (expression.operator === "implies" ||
                expression.operator === "iff") &&
            expression.parentId !== null
        ) {
            throw new Error(
                `Operator expression "${expression.id}" with "${expression.operator}" must be a root expression (parentId must be null).`
            )
        }

        if (expression.parentId !== null) {
            const parent = this.expressions.get(expression.parentId)
            if (!parent) {
                throw new Error(
                    `Parent expression "${expression.parentId}" does not exist.`
                )
            }
            if (parent.type !== "operator" && parent.type !== "formula") {
                throw new Error(
                    `Parent expression "${expression.parentId}" is not an operator expression.`
                )
            }

            if (parent.type === "operator") {
                this.assertChildLimit(parent.operator, expression.parentId)
            } else {
                const childCount =
                    this.childExpressionIdsByParentId.get(expression.parentId)
                        ?.size ?? 0
                if (childCount >= 1) {
                    throw new Error(
                        `Formula expression "${expression.parentId}" can only have one child.`
                    )
                }
            }
        }

        if (expression.position !== null) {
            const occupiedPositions = getOrCreate(
                this.childPositionsByParentId,
                expression.parentId,
                () => new Set()
            )
            if (occupiedPositions.has(expression.position)) {
                throw new Error(
                    `Position ${expression.position} is already used under parent "${expression.parentId}".`
                )
            }
            occupiedPositions.add(expression.position)
        }

        this.expressions.set(expression.id, expression)
        getOrCreate(
            this.childExpressionIdsByParentId,
            expression.parentId,
            () => new Set()
        ).add(expression.id)
    }

    public removeExpression(expressionId: string) {
        const target = this.expressions.get(expressionId)
        if (!target) {
            return undefined
        }

        const parentId = target.parentId

        const toRemove = new Set<string>()
        const stack = [expressionId]
        while (stack.length > 0) {
            const currentId = stack.pop()
            if (!currentId || toRemove.has(currentId)) {
                continue
            }

            toRemove.add(currentId)
            const children = this.childExpressionIdsByParentId.get(currentId)
            if (!children) {
                continue
            }
            for (const childId of children) {
                stack.push(childId)
            }
        }

        for (const id of toRemove) {
            const expression = this.expressions.get(id)
            if (!expression) {
                continue
            }

            this.expressions.delete(id)
            this.childExpressionIdsByParentId
                .get(expression.parentId)
                ?.delete(id)

            if (expression.position !== null) {
                this.childPositionsByParentId
                    .get(expression.parentId)
                    ?.delete(expression.position)
            }

            this.childExpressionIdsByParentId.delete(id)
            this.childPositionsByParentId.delete(id)
        }

        this.collapseIfNeeded(parentId)

        return target
    }

    private collapseIfNeeded(operatorId: string | null): void {
        if (operatorId === null) return

        const operator = this.expressions.get(operatorId)
        if (!operator) return

        if (operator.type === "formula") {
            const children = this.getChildExpressions(operatorId)
            if (children.length === 0) {
                const grandparentId = operator.parentId
                this.expressions.delete(operatorId)
                this.childExpressionIdsByParentId
                    .get(grandparentId)
                    ?.delete(operatorId)
                if (operator.position !== null) {
                    this.childPositionsByParentId
                        .get(grandparentId)
                        ?.delete(operator.position)
                }
                this.childExpressionIdsByParentId.delete(operatorId)
                this.childPositionsByParentId.delete(operatorId)
                this.collapseIfNeeded(grandparentId)
            }
            return
        }

        if (operator.type !== "operator") return

        const children = this.getChildExpressions(operatorId)

        if (children.length === 0) {
            const grandparentId = operator.parentId
            const grandparentPosition = operator.position

            this.expressions.delete(operatorId)
            this.childExpressionIdsByParentId
                .get(grandparentId)
                ?.delete(operatorId)
            if (grandparentPosition !== null) {
                this.childPositionsByParentId
                    .get(grandparentId)
                    ?.delete(grandparentPosition)
            }
            this.childExpressionIdsByParentId.delete(operatorId)
            this.childPositionsByParentId.delete(operatorId)

            this.collapseIfNeeded(grandparentId)
        } else if (children.length === 1) {
            const child = children[0]
            const grandparentId = operator.parentId
            const grandparentPosition = operator.position

            // Promote the surviving child into the operator's slot in the grandparent.
            const promoted = {
                ...child,
                parentId: grandparentId,
                position: grandparentPosition,
            } as TPropositionalExpression
            this.expressions.set(child.id, promoted)

            // Replace the operator with the promoted child in the grandparent's child-id set.
            this.childExpressionIdsByParentId
                .get(grandparentId)
                ?.delete(operatorId)
            getOrCreate(
                this.childExpressionIdsByParentId,
                grandparentId,
                () => new Set()
            ).add(child.id)

            // The grandparent's position set is unchanged: grandparentPosition was
            // already tracked for the operator and continues to be occupied by the
            // promoted child.

            // Remove the operator's own tracking entries.
            this.childExpressionIdsByParentId.delete(operatorId)
            this.childPositionsByParentId.delete(operatorId)
            this.expressions.delete(operatorId)

            // The grandparent's child count is unchanged; no further recursion needed.
        }
    }

    public hasVariableReference(variableId: string): boolean {
        for (const expression of this.expressions.values()) {
            if (
                expression.type === "variable" &&
                expression.variableId === variableId
            ) {
                return true
            }
        }
        return false
    }

    public getExpression(
        expressionId: string
    ): TPropositionalExpression | undefined {
        return this.expressions.get(expressionId)
    }

    public getChildExpressions(
        parentId: string | null
    ): TPropositionalExpression[] {
        const childIds = this.childExpressionIdsByParentId.get(parentId)
        if (!childIds || childIds.size === 0) {
            return []
        }

        const children: TPropositionalExpression[] = []
        for (const childId of childIds) {
            const child = this.expressions.get(childId)
            if (child) {
                children.push(child)
            }
        }

        return children.sort((a, b) => {
            if (a.position === null && b.position === null) {
                return a.id.localeCompare(b.id)
            }
            if (a.position === null) {
                return 1
            }
            if (b.position === null) {
                return -1
            }
            return a.position - b.position
        })
    }

    private loadInitialExpressions(
        initialExpressions: TPropositionalExpression[]
    ) {
        if (initialExpressions.length === 0) {
            return
        }

        const pending = new Map<string, TPropositionalExpression>(
            initialExpressions.map((expression) => [expression.id, expression])
        )

        let progressed = true
        while (pending.size > 0 && progressed) {
            progressed = false

            for (const [id, expression] of Array.from(pending.entries())) {
                if (
                    expression.parentId !== null &&
                    !this.expressions.has(expression.parentId)
                ) {
                    continue
                }

                this.addExpression(expression)
                pending.delete(id)
                progressed = true
            }
        }

        if (pending.size > 0) {
            const unresolved = Array.from(pending.keys()).join(", ")
            throw new Error(
                `Could not resolve parent relationships for expressions: ${unresolved}.`
            )
        }
    }

    private assertChildLimit(
        operator: TLogicalOperatorType,
        parentId: string
    ): void {
        const childCount =
            this.childExpressionIdsByParentId.get(parentId)?.size ?? 0

        if (operator === "not" && childCount >= 1) {
            throw new Error(
                `Operator expression "${parentId}" with "not" can only have one child.`
            )
        }
        if ((operator === "implies" || operator === "iff") && childCount >= 2) {
            throw new Error(
                `Operator expression "${parentId}" with "${operator}" can only have two children.`
            )
        }
    }

    private reparent(
        expressionId: string,
        newParentId: string | null,
        newPosition: number | null
    ): void {
        const expression = this.expressions.get(expressionId)!

        // Detach from old parent.
        this.childExpressionIdsByParentId
            .get(expression.parentId)
            ?.delete(expressionId)
        if (expression.position !== null) {
            this.childPositionsByParentId
                .get(expression.parentId)
                ?.delete(expression.position)
        }

        // Replace the stored value (expressions are immutable value objects).
        const updated = {
            ...expression,
            parentId: newParentId,
            position: newPosition,
        } as TPropositionalExpression
        this.expressions.set(expressionId, updated)

        // Attach to new parent.
        getOrCreate(
            this.childExpressionIdsByParentId,
            newParentId,
            () => new Set()
        ).add(expressionId)
        if (newPosition !== null) {
            getOrCreate(
                this.childPositionsByParentId,
                newParentId,
                () => new Set()
            ).add(newPosition)
        }
    }

    public insertExpression(
        expression: TPropositionalExpression,
        leftNodeId?: string,
        rightNodeId?: string
    ): void {
        // 1. At least one child node must be provided.
        if (leftNodeId === undefined && rightNodeId === undefined) {
            throw new Error(
                `insertExpression requires at least one of leftNodeId or rightNodeId.`
            )
        }

        // 2. The new expression's ID must not already exist.
        if (this.expressions.has(expression.id)) {
            throw new Error(
                `Expression with ID "${expression.id}" already exists.`
            )
        }

        // 3. An expression cannot be its own parent.
        if (expression.parentId === expression.id) {
            throw new Error(
                `Expression "${expression.id}" cannot be its own parent.`
            )
        }

        // 4. Left and right nodes must be distinct.
        if (
            leftNodeId !== undefined &&
            rightNodeId !== undefined &&
            leftNodeId === rightNodeId
        ) {
            throw new Error(`leftNodeId and rightNodeId must be different.`)
        }

        // 5. The left node must exist if provided.
        const leftNode =
            leftNodeId !== undefined
                ? this.expressions.get(leftNodeId)
                : undefined
        if (leftNodeId !== undefined && !leftNode) {
            throw new Error(`Expression "${leftNodeId}" does not exist.`)
        }

        // 6. The right node must exist if provided.
        const rightNode =
            rightNodeId !== undefined
                ? this.expressions.get(rightNodeId)
                : undefined
        if (rightNodeId !== undefined && !rightNode) {
            throw new Error(`Expression "${rightNodeId}" does not exist.`)
        }

        // 7. The "not" operator is unary and cannot take two children.
        if (
            expression.type === "operator" &&
            expression.operator === "not" &&
            leftNodeId !== undefined &&
            rightNodeId !== undefined
        ) {
            throw new Error(
                `Operator expression "${expression.id}" with "not" can only have one child.`
            )
        }

        // 7b. A formula expression is also unary and cannot take two children.
        if (
            expression.type === "formula" &&
            leftNodeId !== undefined &&
            rightNodeId !== undefined
        ) {
            throw new Error(
                `Formula expression "${expression.id}" can only have one child.`
            )
        }

        // 8. The left node must not be an implies/iff expression (which must remain a root).
        if (
            leftNode?.type === "operator" &&
            (leftNode.operator === "implies" || leftNode.operator === "iff")
        ) {
            throw new Error(
                `Expression "${leftNodeId}" with "${leftNode.operator}" cannot be subordinated (it must remain a root expression).`
            )
        }

        // 9. The right node must not be an implies/iff expression (which must remain a root).
        if (
            rightNode?.type === "operator" &&
            (rightNode.operator === "implies" || rightNode.operator === "iff")
        ) {
            throw new Error(
                `Expression "${rightNodeId}" with "${rightNode.operator}" cannot be subordinated (it must remain a root expression).`
            )
        }

        // The anchor is the node whose current tree slot the new expression will inherit.
        const anchor = (leftNode ?? rightNode)!

        // 10. implies/iff expressions may only be inserted at the root of the tree.
        if (
            expression.type === "operator" &&
            (expression.operator === "implies" ||
                expression.operator === "iff") &&
            anchor.parentId !== null
        ) {
            throw new Error(
                `Operator expression "${expression.id}" with "${expression.operator}" must be a root expression (parentId must be null).`
            )
        }

        const anchorParentId = anchor.parentId
        const anchorPosition = anchor.position

        // Reparent rightNode first in case it is a descendant of leftNode.
        if (rightNodeId !== undefined) {
            this.reparent(rightNodeId, expression.id, 1)
        }
        if (leftNodeId !== undefined) {
            this.reparent(leftNodeId, expression.id, 0)
        }

        // Store the new expression in the freed anchor slot.
        const stored = {
            ...expression,
            parentId: anchorParentId,
            position: anchorPosition,
        } as TPropositionalExpression
        this.expressions.set(expression.id, stored)
        getOrCreate(
            this.childExpressionIdsByParentId,
            anchorParentId,
            () => new Set()
        ).add(expression.id)
        if (anchorPosition !== null) {
            getOrCreate(
                this.childPositionsByParentId,
                anchorParentId,
                () => new Set()
            ).add(anchorPosition)
        }
    }
}

// ---------------------------------------------------------------------------
// PremiseManager
// ---------------------------------------------------------------------------

export class PremiseManager {
    private id: string
    private title: string | undefined
    private rootExpressionId: string | undefined
    private variables: VariableManager
    private expressions: ExpressionManager
    private expressionsByVariableId: DefaultMap<string, Set<string>>
    private argument: TArgument

    constructor(id: string, argument: TArgument, title?: string) {
        this.id = id
        this.argument = argument
        this.title = title
        this.rootExpressionId = undefined
        this.variables = new VariableManager()
        this.expressions = new ExpressionManager()
        this.expressionsByVariableId = new DefaultMap(() => new Set())
    }

    /**
     * Registers a propositional variable for use within this premise.
     *
     * @throws If `variable.symbol` is already in use within this premise.
     * @throws If `variable.id` already exists within this premise.
     * @throws If the variable does not belong to this premise's argument.
     */
    public addVariable(variable: TPropositionalVariable): void {
        this.assertBelongsToArgument(
            variable.argumentId,
            variable.argumentVersion
        )
        this.variables.addVariable(variable)
    }

    /**
     * Removes a variable from this premise's registry and returns it, or
     * `undefined` if it was not found.
     *
     * @throws If any expression in this premise still references the variable.
     */
    public removeVariable(
        variableId: string
    ): TPropositionalVariable | undefined {
        if (this.expressionsByVariableId.get(variableId).size > 0) {
            throw new Error(
                `Variable "${variableId}" cannot be removed because it is referenced by one or more expressions.`
            )
        }
        return this.variables.removeVariable(variableId)
    }

    /**
     * Adds an expression to this premise's tree.
     *
     * If the expression has `parentId: null` it becomes the root; only one
     * root is permitted per premise.  If `parentId` is non-null the parent
     * must already exist within this premise.
     *
     * All other structural rules (`implies`/`iff` root-only, child limits,
     * position uniqueness) are enforced by the underlying `ExpressionManager`.
     *
     * @throws If the premise already has a root expression and this one is also a root.
     * @throws If the expression's parent does not exist in this premise.
     * @throws If the expression is a variable reference and the variable has not been registered.
     * @throws If the expression does not belong to this argument.
     */
    public addExpression(expression: TPropositionalExpression): void {
        this.assertBelongsToArgument(
            expression.argumentId,
            expression.argumentVersion
        )

        if (
            expression.type === "variable" &&
            !this.variables.hasVariable(expression.variableId)
        ) {
            throw new Error(
                `Variable expression "${expression.id}" references non-existent variable "${expression.variableId}".`
            )
        }

        if (expression.parentId === null) {
            if (this.rootExpressionId !== undefined) {
                throw new Error(
                    `Premise "${this.id}" already has a root expression.`
                )
            }
        } else {
            if (!this.expressions.getExpression(expression.parentId)) {
                throw new Error(
                    `Parent expression "${expression.parentId}" does not exist in this premise.`
                )
            }
        }

        // Delegate structural validation (operator type checks, position
        // uniqueness, child limits) to ExpressionManager.
        this.expressions.addExpression(expression)

        if (expression.parentId === null) {
            this.rootExpressionId = expression.id
        }
        if (expression.type === "variable") {
            this.expressionsByVariableId
                .get(expression.variableId)
                .add(expression.id)
        }
    }

    /**
     * Removes an expression and its entire descendant subtree, then collapses
     * any ancestor operators with fewer than two children (same semantics as
     * before).  Returns the removed root expression, or `undefined` if not
     * found.
     *
     * `rootExpressionId` is recomputed after every removal because operator
     * collapse can silently promote a new expression into the root slot.
     */
    public removeExpression(
        expressionId: string
    ): TPropositionalExpression | undefined {
        // Snapshot the subtree before deletion so we can clean up
        // expressionsByVariableId for cascade-deleted descendants — they are
        // not individually surfaced by ExpressionManager.removeExpression.
        const subtree = this.collectSubtree(expressionId)

        const removed = this.expressions.removeExpression(expressionId)

        if (removed) {
            for (const expr of subtree) {
                if (expr.type === "variable") {
                    this.expressionsByVariableId
                        .get(expr.variableId)
                        ?.delete(expr.id)
                }
            }
        }

        this.syncRootExpressionId()
        return removed
    }

    /**
     * Splices a new expression between existing nodes in the tree.  The new
     * expression inherits the tree slot of the anchor node
     * (`leftNodeId ?? rightNodeId`).
     *
     * `rootExpressionId` is recomputed after every insertion because the
     * anchor may have been the root.
     *
     * See `ArgumentEngine.insertExpression` for the full contract; the same
     * rules apply here.
     *
     * @throws If the expression does not belong to this argument.
     * @throws If the expression is a variable reference and the variable has not been registered.
     */
    public insertExpression(
        expression: TPropositionalExpression,
        leftNodeId?: string,
        rightNodeId?: string
    ): void {
        this.assertBelongsToArgument(
            expression.argumentId,
            expression.argumentVersion
        )

        if (
            expression.type === "variable" &&
            !this.variables.hasVariable(expression.variableId)
        ) {
            throw new Error(
                `Variable expression "${expression.id}" references non-existent variable "${expression.variableId}".`
            )
        }

        this.expressions.insertExpression(expression, leftNodeId, rightNodeId)

        if (expression.type === "variable") {
            this.expressionsByVariableId
                .get(expression.variableId)
                .add(expression.id)
        }

        this.syncRootExpressionId()
    }

    /**
     * Returns an expression by ID, or `undefined` if not found in this
     * premise.
     */
    public getExpression(id: string): TPropositionalExpression | undefined {
        return this.expressions.getExpression(id)
    }

    public getId(): string {
        return this.id
    }

    public getTitle(): string | undefined {
        return this.title
    }

    public getRootExpressionId(): string | undefined {
        return this.rootExpressionId
    }

    public getRootExpression(): TPropositionalExpression | undefined {
        if (this.rootExpressionId === undefined) {
            return undefined
        }
        const expr = this.expressions.getExpression(this.rootExpressionId)
        return expr ? { ...expr } : undefined
    }

    public getVariables(): TPropositionalVariable[] {
        return sortedCopyById(this.variables.toArray())
    }

    public getExpressions(): TPropositionalExpression[] {
        return sortedCopyById(this.expressions.toArray())
    }

    public getChildExpressions(
        parentId: string | null
    ): TPropositionalExpression[] {
        return this.expressions.getChildExpressions(parentId).map((expr) => ({
            ...expr,
        }))
    }

    public getPremiseType(): "inference" | "constraint" {
        const root = this.getRootExpression()
        return root?.type === "operator" &&
            (root.operator === "implies" || root.operator === "iff")
            ? "inference"
            : "constraint"
    }

    public validateEvaluability(): TValidationResult {
        const issues: TValidationIssue[] = []
        const roots = this.expressions.getChildExpressions(null)

        if (this.expressions.toArray().length === 0) {
            issues.push(
                makeErrorIssue({
                    code: "PREMISE_EMPTY",
                    message: `Premise "${this.id}" has no expressions to evaluate.`,
                    premiseId: this.id,
                })
            )
            return makeValidationResult(issues)
        }

        if (roots.length === 0) {
            issues.push(
                makeErrorIssue({
                    code: "PREMISE_ROOT_MISSING",
                    message: `Premise "${this.id}" has expressions but no root expression.`,
                    premiseId: this.id,
                })
            )
        }

        if (this.rootExpressionId === undefined) {
            issues.push(
                makeErrorIssue({
                    code: "PREMISE_ROOT_MISSING",
                    message: `Premise "${this.id}" does not have rootExpressionId set.`,
                    premiseId: this.id,
                })
            )
        } else if (!this.expressions.getExpression(this.rootExpressionId)) {
            issues.push(
                makeErrorIssue({
                    code: "PREMISE_ROOT_MISMATCH",
                    message: `Premise "${this.id}" rootExpressionId "${this.rootExpressionId}" does not exist.`,
                    premiseId: this.id,
                    expressionId: this.rootExpressionId,
                })
            )
        } else if (roots[0] && roots[0].id !== this.rootExpressionId) {
            issues.push(
                makeErrorIssue({
                    code: "PREMISE_ROOT_MISMATCH",
                    message: `Premise "${this.id}" rootExpressionId "${this.rootExpressionId}" does not match actual root "${roots[0].id}".`,
                    premiseId: this.id,
                    expressionId: this.rootExpressionId,
                })
            )
        }

        for (const expr of this.expressions.toArray()) {
            if (
                expr.type === "variable" &&
                !this.variables.hasVariable(expr.variableId)
            ) {
                issues.push(
                    makeErrorIssue({
                        code: "EXPR_VARIABLE_UNDECLARED",
                        message: `Expression "${expr.id}" references undeclared variable "${expr.variableId}".`,
                        premiseId: this.id,
                        expressionId: expr.id,
                        variableId: expr.variableId,
                    })
                )
            }

            if (expr.type !== "operator" && expr.type !== "formula") {
                continue
            }

            const children = this.expressions.getChildExpressions(expr.id)

            if (expr.type === "formula") {
                if (children.length !== 1) {
                    issues.push(
                        makeErrorIssue({
                            code: "EXPR_CHILD_COUNT_INVALID",
                            message: `Formula expression "${expr.id}" must have exactly 1 child; found ${children.length}.`,
                            premiseId: this.id,
                            expressionId: expr.id,
                        })
                    )
                }
                continue
            }

            if (expr.operator === "not" && children.length !== 1) {
                issues.push(
                    makeErrorIssue({
                        code: "EXPR_CHILD_COUNT_INVALID",
                        message: `Operator "${expr.id}" (not) must have exactly 1 child; found ${children.length}.`,
                        premiseId: this.id,
                        expressionId: expr.id,
                    })
                )
            }

            if (
                (expr.operator === "implies" || expr.operator === "iff") &&
                children.length !== 2
            ) {
                issues.push(
                    makeErrorIssue({
                        code: "EXPR_CHILD_COUNT_INVALID",
                        message: `Operator "${expr.id}" (${expr.operator}) must have exactly 2 children; found ${children.length}.`,
                        premiseId: this.id,
                        expressionId: expr.id,
                    })
                )
            }

            if (
                (expr.operator === "and" || expr.operator === "or") &&
                children.length < 2
            ) {
                issues.push(
                    makeErrorIssue({
                        code: "EXPR_CHILD_COUNT_INVALID",
                        message: `Operator "${expr.id}" (${expr.operator}) must have at least 2 children; found ${children.length}.`,
                        premiseId: this.id,
                        expressionId: expr.id,
                    })
                )
            }

            if (expr.operator === "implies" || expr.operator === "iff") {
                const childPositions = new Set(
                    children.map((child) => child.position)
                )
                if (!childPositions.has(0) || !childPositions.has(1)) {
                    issues.push(
                        makeErrorIssue({
                            code: "EXPR_BINARY_POSITIONS_INVALID",
                            message: `Operator "${expr.id}" (${expr.operator}) must have children at positions 0 and 1.`,
                            premiseId: this.id,
                            expressionId: expr.id,
                        })
                    )
                }
            }
        }

        return makeValidationResult(issues)
    }

    public evaluate(
        assignment: TVariableAssignment,
        options?: {
            strictUnknownKeys?: boolean
            requireExactCoverage?: boolean
        }
    ): TPremiseEvaluationResult {
        const validation = this.validateEvaluability()
        if (!validation.ok) {
            throw new Error(
                `Premise "${this.id}" is not evaluable: ${validation.issues
                    .map((issue) => issue.code)
                    .join(", ")}`
            )
        }

        const rootExpressionId = this.rootExpressionId!
        const referencedVariableIds = sortedUnique(
            this.expressions
                .toArray()
                .filter(
                    (expr): expr is TPropositionalExpression<"variable"> =>
                        expr.type === "variable"
                )
                .map((expr) => expr.variableId)
        )

        const missingVariableIds = referencedVariableIds.filter(
            (variableId) => !(variableId in assignment)
        )
        if (missingVariableIds.length > 0) {
            throw new Error(
                `Missing assignment values for variables: ${missingVariableIds.join(", ")}`
            )
        }

        if (options?.strictUnknownKeys || options?.requireExactCoverage) {
            const knownVariableIds = new Set(referencedVariableIds)
            const unknownKeys = Object.keys(assignment).filter(
                (variableId) => !knownVariableIds.has(variableId)
            )
            if (unknownKeys.length > 0) {
                throw new Error(
                    `Assignment contains unknown variable IDs for premise "${this.id}": ${unknownKeys.join(", ")}`
                )
            }
        }

        const expressionValues: Record<string, boolean> = {}
        const evaluateExpression = (expressionId: string): boolean => {
            const expression = this.expressions.getExpression(expressionId)
            if (!expression) {
                throw new Error(`Expression "${expressionId}" was not found.`)
            }

            if (expression.type === "variable") {
                const value = assignment[expression.variableId]
                expressionValues[expression.id] = value
                return value
            }

            const children = this.expressions.getChildExpressions(expression.id)
            let value: boolean

            if (expression.type === "formula") {
                value = evaluateExpression(children[0].id)
                expressionValues[expression.id] = value
                return value
            }

            switch (expression.operator) {
                case "not":
                    value = !evaluateExpression(children[0].id)
                    break
                case "and":
                    value = children.every((child) =>
                        evaluateExpression(child.id)
                    )
                    break
                case "or":
                    value = children.some((child) =>
                        evaluateExpression(child.id)
                    )
                    break
                case "implies": {
                    const left = children.find((child) => child.position === 0)
                    const right = children.find((child) => child.position === 1)
                    value = implicationValue(
                        evaluateExpression(left!.id),
                        evaluateExpression(right!.id)
                    )
                    break
                }
                case "iff": {
                    const left = children.find((child) => child.position === 0)
                    const right = children.find((child) => child.position === 1)
                    value =
                        evaluateExpression(left!.id) ===
                        evaluateExpression(right!.id)
                    break
                }
            }

            expressionValues[expression.id] = value
            return value
        }

        const rootValue = evaluateExpression(rootExpressionId)
        const variableValues: Record<string, boolean> = {}
        for (const variableId of referencedVariableIds) {
            variableValues[variableId] = assignment[variableId]
        }

        let inferenceDiagnostic: TPremiseInferenceDiagnostic | undefined
        if (this.getPremiseType() === "inference") {
            const root = this.expressions.getExpression(rootExpressionId)
            if (root?.type === "operator") {
                const children = this.expressions.getChildExpressions(root.id)
                const left = children.find((child) => child.position === 0)
                const right = children.find((child) => child.position === 1)
                if (left && right) {
                    const leftValue = expressionValues[left.id]
                    const rightValue = expressionValues[right.id]
                    if (root.operator === "implies") {
                        inferenceDiagnostic = {
                            kind: "implies",
                            premiseId: this.id,
                            rootExpressionId,
                            leftValue,
                            rightValue,
                            rootValue,
                            antecedentTrue: leftValue,
                            consequentTrue: rightValue,
                            isVacuouslyTrue: !leftValue,
                            fired: leftValue,
                            firedAndHeld: leftValue && rightValue,
                        }
                    } else if (root.operator === "iff") {
                        const leftToRight = buildDirectionalVacuity(
                            leftValue,
                            rightValue
                        )
                        const rightToLeft = buildDirectionalVacuity(
                            rightValue,
                            leftValue
                        )
                        inferenceDiagnostic = {
                            kind: "iff",
                            premiseId: this.id,
                            rootExpressionId,
                            leftValue,
                            rightValue,
                            rootValue,
                            leftToRight,
                            rightToLeft,
                            bothSidesTrue: leftValue && rightValue,
                            bothSidesFalse: !leftValue && !rightValue,
                        }
                    }
                }
            }
        }

        return {
            premiseId: this.id,
            premiseType: this.getPremiseType(),
            rootExpressionId,
            rootValue,
            expressionValues,
            variableValues,
            inferenceDiagnostic,
        }
    }

    /**
     * Returns a human-readable string of this premise's expression tree using
     * standard logical notation (∧ ∨ ¬ → ↔).  Missing operands are rendered
     * as `(?)`.  Returns an empty string when the premise has no expressions.
     */
    public toDisplayString(): string {
        if (this.rootExpressionId === undefined) {
            return ""
        }
        return this.renderExpression(this.rootExpressionId)
    }

    /**
     * Returns a serialisable snapshot of this premise conforming to
     * `TPremise`.  `variables` contains only the variables that are actually
     * referenced by expressions in this premise.  `type` is derived from the
     * root expression: `"inference"` if the root is an `implies` or `iff`
     * operator, `"constraint"` otherwise (including when the premise is empty).
     */
    public toData(): TPremise {
        const expressions = this.getExpressions()

        const referencedVariableIds = new Set<string>()
        for (const expr of expressions) {
            if (expr.type === "variable") {
                referencedVariableIds.add(expr.variableId)
            }
        }
        const variables = Array.from(referencedVariableIds)
            .map((id) => this.variables.getVariable(id))
            .filter((v): v is TPropositionalVariable => v !== undefined)
            .map((v) => ({ ...v }))
            .sort((a, b) => a.id.localeCompare(b.id))

        return {
            id: this.id,
            title: this.title,
            rootExpressionId: this.rootExpressionId,
            variables,
            expressions,
            type: this.getPremiseType(),
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Re-reads the single root from ExpressionManager after any operation
     * that may have caused operator collapse to silently change the root.
     */
    private syncRootExpressionId(): void {
        const roots = this.expressions.getChildExpressions(null)
        this.rootExpressionId = roots[0]?.id
    }

    private collectSubtree(rootId: string): TPropositionalExpression[] {
        const result: TPropositionalExpression[] = []
        const stack = [rootId]
        while (stack.length > 0) {
            const id = stack.pop()!
            const expr = this.expressions.getExpression(id)
            if (!expr) continue
            result.push(expr)
            for (const child of this.expressions.getChildExpressions(id)) {
                stack.push(child.id)
            }
        }
        return result
    }

    private assertBelongsToArgument(
        argumentId: string,
        argumentVersion: number
    ): void {
        if (argumentId !== this.argument.id) {
            throw new Error(
                `Entity argumentId "${argumentId}" does not match engine argument ID "${this.argument.id}".`
            )
        }
        if (argumentVersion !== this.argument.version) {
            throw new Error(
                `Entity argumentVersion "${argumentVersion}" does not match engine argument version "${this.argument.version}".`
            )
        }
    }

    private renderExpression(expressionId: string): string {
        const expression = this.expressions.getExpression(expressionId)
        if (!expression) {
            throw new Error(`Expression "${expressionId}" was not found.`)
        }

        if (expression.type === "variable") {
            const variable = this.variables.getVariable(expression.variableId)
            if (!variable) {
                throw new Error(
                    `Variable "${expression.variableId}" for expression "${expressionId}" was not found.`
                )
            }
            return variable.symbol
        }

        if (expression.type === "formula") {
            const children = this.expressions.getChildExpressions(expression.id)
            if (children.length === 0) {
                return "(?)"
            }
            return `(${this.renderExpression(children[0].id)})`
        }

        const children = this.expressions.getChildExpressions(expression.id)
        if (expression.operator === "not") {
            if (children.length === 0) {
                return `${this.operatorSymbol(expression.operator)} (?)`
            }
            return `${this.operatorSymbol(expression.operator)}(${this.renderExpression(children[0].id)})`
        }

        if (children.length === 0) {
            return "(?)"
        }

        const renderedChildren = children.map((child) =>
            this.renderExpression(child.id)
        )
        return `(${renderedChildren.join(` ${this.operatorSymbol(expression.operator)} `)})`
    }

    private operatorSymbol(operator: TLogicalOperatorType): string {
        switch (operator) {
            case "and":
                return "∧"
            case "or":
                return "∨"
            case "implies":
                return "→"
            case "iff":
                return "↔"
            case "not":
                return "¬"
        }
    }
}

export class ArgumentEngine {
    private argument: TArgument
    private premises: Map<string, PremiseManager>
    private supportingPremiseIds: Set<string>
    private conclusionPremiseId: string | undefined

    constructor(argument: TArgument) {
        this.argument = { ...argument }
        this.premises = new Map()
        this.supportingPremiseIds = new Set()
        this.conclusionPremiseId = undefined
    }

    public getArgument(): TArgument {
        return { ...this.argument }
    }

    public createPremise(title?: string): PremiseManager {
        const id = randomUUID()
        const pm = new PremiseManager(id, this.argument, title)
        this.premises.set(id, pm)
        return pm
    }

    public removePremise(premiseId: string): void {
        this.premises.delete(premiseId)
        this.supportingPremiseIds.delete(premiseId)
        if (this.conclusionPremiseId === premiseId) {
            this.conclusionPremiseId = undefined
        }
    }

    public getPremise(premiseId: string): PremiseManager | undefined {
        return this.premises.get(premiseId)
    }

    public hasPremise(premiseId: string): boolean {
        return this.premises.has(premiseId)
    }

    public listPremiseIds(): string[] {
        return Array.from(this.premises.keys()).sort((a, b) =>
            a.localeCompare(b)
        )
    }

    public listPremises(): PremiseManager[] {
        return this.listPremiseIds()
            .map((id) => this.premises.get(id))
            .filter((pm): pm is PremiseManager => pm !== undefined)
    }

    public getRoleState(): TArgumentRoleState {
        return {
            supportingPremiseIds: sortedUnique(this.supportingPremiseIds),
            conclusionPremiseId: this.conclusionPremiseId,
        }
    }

    public setConclusionPremise(premiseId: string): void {
        if (!this.hasPremise(premiseId)) {
            throw new Error(`Premise "${premiseId}" does not exist.`)
        }
        if (this.supportingPremiseIds.has(premiseId)) {
            throw new Error(
                `Premise "${premiseId}" is already a supporting premise and cannot also be the conclusion.`
            )
        }
        this.conclusionPremiseId = premiseId
    }

    public clearConclusionPremise(): void {
        this.conclusionPremiseId = undefined
    }

    public getConclusionPremise(): PremiseManager | undefined {
        if (this.conclusionPremiseId === undefined) {
            return undefined
        }
        return this.premises.get(this.conclusionPremiseId)
    }

    public addSupportingPremise(premiseId: string): void {
        if (!this.hasPremise(premiseId)) {
            throw new Error(`Premise "${premiseId}" does not exist.`)
        }
        if (this.conclusionPremiseId === premiseId) {
            throw new Error(
                `Premise "${premiseId}" is the conclusion and cannot also be supporting.`
            )
        }
        this.supportingPremiseIds.add(premiseId)
    }

    public removeSupportingPremise(premiseId: string): void {
        this.supportingPremiseIds.delete(premiseId)
    }

    public listSupportingPremises(): PremiseManager[] {
        return sortedUnique(this.supportingPremiseIds)
            .map((id) => this.premises.get(id))
            .filter((pm): pm is PremiseManager => pm !== undefined)
    }

    public toData(): TArgumentEngineData {
        return {
            argument: { ...this.argument },
            premises: this.listPremises().map((pm) => pm.toData()),
            roles: this.getRoleState(),
        }
    }

    public exportState(): TArgumentEngineData {
        return this.toData()
    }

    public collectReferencedVariables(): {
        variableIds: string[]
        byId: Record<string, { symbol: string; premiseIds: string[] }>
        bySymbol: Record<
            string,
            { variableIds: string[]; premiseIds: string[] }
        >
    } {
        const byIdTmp = new Map<
            string,
            { symbols: Set<string>; premiseIds: Set<string> }
        >()
        const bySymbolTmp = new Map<
            string,
            { variableIds: Set<string>; premiseIds: Set<string> }
        >()

        for (const premise of this.listPremises()) {
            const premiseId = premise.getId()
            const varsById = new Map(
                premise.getVariables().map((v) => [v.id, v])
            )
            for (const expr of premise.getExpressions()) {
                if (expr.type !== "variable") continue
                const variable = varsById.get(expr.variableId)
                if (!variable) continue

                const byIdEntry = getOrCreate(byIdTmp, variable.id, () => ({
                    symbols: new Set<string>(),
                    premiseIds: new Set<string>(),
                }))
                byIdEntry.symbols.add(variable.symbol)
                byIdEntry.premiseIds.add(premiseId)

                const bySymbolEntry = getOrCreate(
                    bySymbolTmp,
                    variable.symbol,
                    () => ({
                        variableIds: new Set<string>(),
                        premiseIds: new Set<string>(),
                    })
                )
                bySymbolEntry.variableIds.add(variable.id)
                bySymbolEntry.premiseIds.add(premiseId)
            }
        }

        const byId: Record<string, { symbol: string; premiseIds: string[] }> =
            {}
        for (const [variableId, entry] of Array.from(byIdTmp.entries()).sort(
            (a, b) => a[0].localeCompare(b[0])
        )) {
            byId[variableId] = {
                symbol: sortedUnique(entry.symbols)[0] ?? "",
                premiseIds: sortedUnique(entry.premiseIds),
            }
        }

        const bySymbol: Record<
            string,
            { variableIds: string[]; premiseIds: string[] }
        > = {}
        for (const [symbol, entry] of Array.from(bySymbolTmp.entries()).sort(
            (a, b) => a[0].localeCompare(b[0])
        )) {
            bySymbol[symbol] = {
                variableIds: sortedUnique(entry.variableIds),
                premiseIds: sortedUnique(entry.premiseIds),
            }
        }

        return {
            variableIds: sortedUnique(byIdTmp.keys()),
            byId,
            bySymbol,
        }
    }

    public validateEvaluability(): TValidationResult {
        const issues: TValidationIssue[] = []

        if (this.conclusionPremiseId === undefined) {
            issues.push(
                makeErrorIssue({
                    code: "ARGUMENT_NO_CONCLUSION",
                    message: "Argument has no designated conclusion premise.",
                })
            )
        } else if (!this.premises.has(this.conclusionPremiseId)) {
            issues.push(
                makeErrorIssue({
                    code: "ARGUMENT_CONCLUSION_NOT_FOUND",
                    message: `Conclusion premise "${this.conclusionPremiseId}" does not exist.`,
                    premiseId: this.conclusionPremiseId,
                })
            )
        }

        for (const premiseId of sortedUnique(this.supportingPremiseIds)) {
            if (!this.premises.has(premiseId)) {
                issues.push(
                    makeErrorIssue({
                        code: "ARGUMENT_SUPPORTING_PREMISE_NOT_FOUND",
                        message: `Supporting premise "${premiseId}" does not exist.`,
                        premiseId,
                    })
                )
            }
        }

        if (
            this.conclusionPremiseId !== undefined &&
            this.supportingPremiseIds.has(this.conclusionPremiseId)
        ) {
            issues.push(
                makeErrorIssue({
                    code: "ARGUMENT_ROLE_OVERLAP",
                    message: `Premise "${this.conclusionPremiseId}" cannot be both supporting and conclusion.`,
                    premiseId: this.conclusionPremiseId,
                })
            )
        }

        const idToSymbols = new Map<string, Set<string>>()
        const symbolToIds = new Map<string, Set<string>>()
        for (const premise of this.listPremises()) {
            const varById = new Map(
                premise.getVariables().map((v) => [v.id, v])
            )
            for (const expr of premise.getExpressions()) {
                if (expr.type !== "variable") continue
                const variable = varById.get(expr.variableId)
                if (!variable) continue
                getOrCreate(idToSymbols, variable.id, () => new Set()).add(
                    variable.symbol
                )
                getOrCreate(symbolToIds, variable.symbol, () => new Set()).add(
                    variable.id
                )
            }
        }

        for (const [variableId, symbols] of idToSymbols) {
            if (symbols.size > 1) {
                issues.push(
                    makeErrorIssue({
                        code: "ARGUMENT_VARIABLE_ID_SYMBOL_MISMATCH",
                        message: `Variable ID "${variableId}" is used with multiple symbols: ${sortedUnique(symbols).join(", ")}.`,
                        variableId,
                    })
                )
            }
        }

        for (const [symbol, ids] of symbolToIds) {
            if (ids.size > 1) {
                issues.push(
                    makeErrorIssue({
                        code: "ARGUMENT_VARIABLE_SYMBOL_AMBIGUOUS",
                        message: `Variable symbol "${symbol}" is used with multiple IDs: ${sortedUnique(ids).join(", ")}.`,
                    })
                )
            }
        }

        for (const premise of this.listPremises()) {
            const premiseValidation = premise.validateEvaluability()
            issues.push(...premiseValidation.issues)
        }

        return makeValidationResult(issues)
    }

    public evaluate(
        assignment: TVariableAssignment,
        options?: TArgumentEvaluationOptions
    ): TArgumentEvaluationResult {
        const validateFirst = options?.validateFirst ?? true
        if (validateFirst) {
            const validation = this.validateEvaluability()
            if (!validation.ok) {
                return {
                    ok: false,
                    validation,
                }
            }
        }

        const conclusion = this.getConclusionPremise()
        if (!conclusion) {
            return {
                ok: false,
                validation: makeValidationResult([
                    makeErrorIssue({
                        code: "ARGUMENT_NO_CONCLUSION",
                        message:
                            "Argument has no designated conclusion premise.",
                    }),
                ]),
            }
        }

        const supportingPremises = this.listSupportingPremises()
        const roleIds = new Set<string>([
            conclusion.getId(),
            ...supportingPremises.map((pm) => pm.getId()),
        ])
        const constraintPremises = this.listPremises().filter(
            (pm) =>
                !roleIds.has(pm.getId()) && pm.getPremiseType() === "constraint"
        )

        const allRelevantPremises = [
            conclusion,
            ...supportingPremises,
            ...constraintPremises,
        ]
        const referencedVariableIds = sortedUnique(
            allRelevantPremises.flatMap((pm) =>
                pm
                    .getExpressions()
                    .filter(
                        (expr): expr is TPropositionalExpression<"variable"> =>
                            expr.type === "variable"
                    )
                    .map((expr) => expr.variableId)
            )
        )

        try {
            const evalOpts = {
                strictUnknownKeys:
                    options?.strictUnknownAssignmentKeys ?? false,
            }
            const conclusionEvaluation = conclusion.evaluate(
                assignment,
                evalOpts
            )
            const supportingEvaluations = supportingPremises.map((pm) =>
                pm.evaluate(assignment, evalOpts)
            )
            const constraintEvaluations = constraintPremises.map((pm) =>
                pm.evaluate(assignment, evalOpts)
            )

            const isAdmissibleAssignment = constraintEvaluations.every(
                (result) => result.rootValue === true
            )
            const allSupportingPremisesTrue = supportingEvaluations.every(
                (result) => result.rootValue === true
            )
            const conclusionTrue = conclusionEvaluation.rootValue === true
            const isCounterexample =
                isAdmissibleAssignment &&
                allSupportingPremisesTrue &&
                !conclusionTrue

            const includeExpressionValues =
                options?.includeExpressionValues ?? true
            const includeDiagnostics = options?.includeDiagnostics ?? true
            const strip = (
                result: TPremiseEvaluationResult
            ): TPremiseEvaluationResult => ({
                ...result,
                expressionValues: includeExpressionValues
                    ? result.expressionValues
                    : {},
                inferenceDiagnostic: includeDiagnostics
                    ? result.inferenceDiagnostic
                    : undefined,
            })

            return {
                ok: true,
                assignment: { ...assignment },
                referencedVariableIds,
                conclusion: strip(conclusionEvaluation),
                supportingPremises: supportingEvaluations.map(strip),
                constraintPremises: constraintEvaluations.map(strip),
                isAdmissibleAssignment,
                allSupportingPremisesTrue,
                conclusionTrue,
                isCounterexample,
                preservesTruthUnderAssignment: !isCounterexample,
            }
        } catch (error) {
            return {
                ok: false,
                validation: makeValidationResult([
                    makeErrorIssue({
                        code: "ASSIGNMENT_MISSING_VARIABLE",
                        message:
                            error instanceof Error
                                ? error.message
                                : "Argument evaluation failed.",
                    }),
                ]),
            }
        }
    }

    public checkValidity(
        options?: TValidityCheckOptions
    ): TValidityCheckResult {
        const validateFirst = options?.validateFirst ?? true
        if (validateFirst) {
            const validation = this.validateEvaluability()
            if (!validation.ok) {
                return {
                    ok: false,
                    validation,
                }
            }
        }

        const conclusion = this.getConclusionPremise()
        if (!conclusion) {
            return {
                ok: false,
                validation: makeValidationResult([
                    makeErrorIssue({
                        code: "ARGUMENT_NO_CONCLUSION",
                        message:
                            "Argument has no designated conclusion premise.",
                    }),
                ]),
            }
        }

        const supportingPremises = this.listSupportingPremises()
        const roleIds = new Set<string>([
            conclusion.getId(),
            ...supportingPremises.map((pm) => pm.getId()),
        ])
        const constraintPremises = this.listPremises().filter(
            (pm) =>
                !roleIds.has(pm.getId()) && pm.getPremiseType() === "constraint"
        )

        const checkedVariableIds = sortedUnique(
            [conclusion, ...supportingPremises, ...constraintPremises].flatMap(
                (pm) =>
                    pm
                        .getExpressions()
                        .filter(
                            (
                                expr
                            ): expr is TPropositionalExpression<"variable"> =>
                                expr.type === "variable"
                        )
                        .map((expr) => expr.variableId)
            )
        )

        if (
            options?.maxVariables !== undefined &&
            checkedVariableIds.length > options.maxVariables
        ) {
            return {
                ok: false,
                validation: makeValidationResult([
                    makeErrorIssue({
                        code: "ASSIGNMENT_UNKNOWN_VARIABLE",
                        message: `Validity check requires ${checkedVariableIds.length} variables, exceeding limit ${options.maxVariables}.`,
                    }),
                ]),
            }
        }

        const mode = options?.mode ?? "firstCounterexample"
        const maxAssignmentsChecked = options?.maxAssignmentsChecked
        const counterexamples: TCounterexample[] = []
        let numAssignmentsChecked = 0
        let numAdmissibleAssignments = 0
        let truncated = false

        const totalAssignments = 2 ** checkedVariableIds.length
        for (let mask = 0; mask < totalAssignments; mask++) {
            if (
                maxAssignmentsChecked !== undefined &&
                numAssignmentsChecked >= maxAssignmentsChecked
            ) {
                truncated = true
                break
            }

            const assignment: TVariableAssignment = {}
            for (let i = 0; i < checkedVariableIds.length; i++) {
                assignment[checkedVariableIds[i]] = Boolean(mask & (1 << i))
            }

            const result = this.evaluate(assignment, {
                validateFirst: false,
                includeExpressionValues:
                    options?.includeCounterexampleEvaluations ?? false,
                includeDiagnostics:
                    options?.includeCounterexampleEvaluations ?? false,
            })

            if (!result.ok) {
                return {
                    ok: false,
                    validation: result.validation,
                }
            }

            numAssignmentsChecked += 1

            if (result.isAdmissibleAssignment) {
                numAdmissibleAssignments += 1
            }

            if (result.isCounterexample) {
                counterexamples.push({
                    assignment,
                    result,
                })
                if (mode === "firstCounterexample") {
                    break
                }
            }
        }

        const foundCounterexample = counterexamples.length > 0
        const fullyChecked =
            !truncated &&
            (mode === "exhaustive" ||
                (mode === "firstCounterexample" && !foundCounterexample))

        return {
            ok: true,
            isValid: foundCounterexample
                ? false
                : fullyChecked
                  ? true
                  : undefined,
            checkedVariableIds,
            numAssignmentsChecked,
            numAdmissibleAssignments,
            counterexamples,
            truncated,
        }
    }
}
