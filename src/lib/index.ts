import type {
    TArgument,
    TPropositionalExpression,
    TPropositionalRelation,
    TPropositionalVariable,
} from "./schemata"
import { createRelationUUID, DefaultMap } from "./utils"

interface IVariableManager {
    addVariable(variable: TPropositionalVariable): void
    removeVariable(variableId: string): TPropositionalVariable | undefined
}

class VariableManager implements IVariableManager {
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
}

interface IExpressionManager {
    addExpression(expression: TPropositionalExpression): void
    removeExpression(expressionId: string): TPropositionalExpression | undefined
}

class ExpressionManager implements IExpressionManager {
    private expressions: Map<string, TPropositionalExpression>
    private childExpressionIds: DefaultMap<string | null, Set<string>>

    constructor(initialExpressions: TPropositionalExpression[] = []) {
        this.expressions = new Map()
        this.childExpressionIds = new DefaultMap(() => new Set())

        for (const expression of initialExpressions) {
            this.addExpression(expression)
        }
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
        this.expressions.set(expression.id, expression)
        this.childExpressionIds.get(expression.parentId).add(expression.id)
    }

    public removeExpression(expressionId: string) {
        const expression = this.expressions.get(expressionId)
        if (!expression) {
            return undefined
        }
        this.expressions.delete(expressionId)
        this.childExpressionIds.get(expression.parentId).delete(expressionId)
        return expression
    }
}

interface IRelationManager {
    addRelation(relation: TPropositionalRelation): void
    removeRelation(relationId: string): TPropositionalRelation | undefined
}

class RelationManager implements IRelationManager {
    private relations: Map<string, TPropositionalRelation>
    private relationsBySourceId: DefaultMap<string, Set<string>>
    private relationsByTargetId: DefaultMap<string, Set<string>>

    constructor(initialRelations: TPropositionalRelation[] = []) {
        this.relations = new Map()
        this.relationsBySourceId = new DefaultMap(() => new Set())
        this.relationsByTargetId = new DefaultMap(() => new Set())

        for (const relation of initialRelations) {
            this.addRelation(relation)
        }
    }

    public toArray(): TPropositionalRelation[] {
        return Array.from(this.relations.values())
    }

    public addRelation(relation: TPropositionalRelation) {
        const id = createRelationUUID(relation)
        if (this.relations.has(id)) {
            throw new Error(`Relation with ID "${id}" already exists.`)
        }
        this.relations.set(id, relation)
        this.relationsBySourceId.get(relation.sourceId).add(id)
        this.relationsByTargetId.get(relation.targetId).add(id)
    }

    public removeRelation(relationId: string) {
        const relation = this.relations.get(relationId)
        if (!relation) {
            return undefined
        }
        this.relations.delete(relationId)
        this.relationsBySourceId.get(relation.sourceId).delete(relationId)
        this.relationsByTargetId.get(relation.targetId).delete(relationId)
        return relation
    }
}

export class ArgumentEngine
    implements IVariableManager, IExpressionManager, IRelationManager
{
    private argument: TArgument
    private variables: VariableManager
    private expressions: ExpressionManager
    private relations: RelationManager

    constructor(
        argument: TArgument,
        variables: TPropositionalVariable[] = [],
        expressions: TPropositionalExpression[] = [],
        relations: TPropositionalRelation[] = []
    ) {
        this.argument = { ...argument }
        this.variables = new VariableManager(variables)
        this.expressions = new ExpressionManager(expressions)
        this.relations = new RelationManager(relations)
    }

    public getArgument(): TArgument {
        return this.argument
    }

    public addVariable(variable: TPropositionalVariable) {
        this.variables.addVariable(variable)
    }

    public removeVariable(variableId: string) {
        return this.variables.removeVariable(variableId)
    }

    public addExpression(expression: TPropositionalExpression) {
        this.expressions.addExpression(expression)
    }

    public removeExpression(expressionId: string) {
        return this.expressions.removeExpression(expressionId)
    }

    public addRelation(relation: TPropositionalRelation) {
        this.relations.addRelation(relation)
    }

    public removeRelation(relationId: string) {
        return this.relations.removeRelation(relationId)
    }
}
