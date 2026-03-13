import type {
    TCoreVariableSourceAssociation,
    TCoreExpressionSourceAssociation,
} from "../schemata/index.js"

export interface TSourceAssociationRemovalResult {
    removedVariableAssociations: TCoreVariableSourceAssociation[]
    removedExpressionAssociations: TCoreExpressionSourceAssociation[]
}

export interface TSourceManagerSnapshot {
    variableSourceAssociations: TCoreVariableSourceAssociation[]
    expressionSourceAssociations: TCoreExpressionSourceAssociation[]
}

/**
 * Registry for source associations to variables and expressions within an
 * argument. Source entities themselves live in SourceLibrary.
 */
export class SourceManager {
    private variableAssociations: Map<string, TCoreVariableSourceAssociation>
    private expressionAssociations: Map<
        string,
        TCoreExpressionSourceAssociation
    >
    private sourceToAssociations: Map<string, Set<string>>
    private variableToAssociations: Map<string, Set<string>>
    private expressionToAssociations: Map<string, Set<string>>

    constructor() {
        this.variableAssociations = new Map()
        this.expressionAssociations = new Map()
        this.sourceToAssociations = new Map()
        this.variableToAssociations = new Map()
        this.expressionToAssociations = new Map()
    }

    // -----------------------------------------------------------------------
    // Variable association mutations
    // -----------------------------------------------------------------------

    public addVariableSourceAssociation(
        assoc: TCoreVariableSourceAssociation
    ): void {
        if (this.variableAssociations.has(assoc.id)) {
            throw new Error(
                `Variable-source association with ID "${assoc.id}" already exists.`
            )
        }
        this.variableAssociations.set(assoc.id, assoc)

        let sourceSet = this.sourceToAssociations.get(assoc.sourceId)
        if (!sourceSet) {
            sourceSet = new Set()
            this.sourceToAssociations.set(assoc.sourceId, sourceSet)
        }
        sourceSet.add(assoc.id)

        let varSet = this.variableToAssociations.get(assoc.variableId)
        if (!varSet) {
            varSet = new Set()
            this.variableToAssociations.set(assoc.variableId, varSet)
        }
        varSet.add(assoc.id)
    }

    public removeVariableSourceAssociation(
        id: string
    ): TSourceAssociationRemovalResult {
        const assoc = this.variableAssociations.get(id)
        if (!assoc) {
            throw new Error(
                `Variable-source association "${id}" does not exist.`
            )
        }
        this.variableAssociations.delete(id)

        const sourceSet = this.sourceToAssociations.get(assoc.sourceId)
        if (sourceSet) {
            sourceSet.delete(id)
            if (sourceSet.size === 0) {
                this.sourceToAssociations.delete(assoc.sourceId)
            }
        }

        const varSet = this.variableToAssociations.get(assoc.variableId)
        if (varSet) {
            varSet.delete(id)
            if (varSet.size === 0) {
                this.variableToAssociations.delete(assoc.variableId)
            }
        }

        return {
            removedVariableAssociations: [assoc],
            removedExpressionAssociations: [],
        }
    }

    // -----------------------------------------------------------------------
    // Expression association mutations
    // -----------------------------------------------------------------------

    public addExpressionSourceAssociation(
        assoc: TCoreExpressionSourceAssociation
    ): void {
        if (this.expressionAssociations.has(assoc.id)) {
            throw new Error(
                `Expression-source association with ID "${assoc.id}" already exists.`
            )
        }
        this.expressionAssociations.set(assoc.id, assoc)

        let sourceSet = this.sourceToAssociations.get(assoc.sourceId)
        if (!sourceSet) {
            sourceSet = new Set()
            this.sourceToAssociations.set(assoc.sourceId, sourceSet)
        }
        sourceSet.add(assoc.id)

        let exprSet = this.expressionToAssociations.get(assoc.expressionId)
        if (!exprSet) {
            exprSet = new Set()
            this.expressionToAssociations.set(assoc.expressionId, exprSet)
        }
        exprSet.add(assoc.id)
    }

    public removeExpressionSourceAssociation(
        id: string
    ): TSourceAssociationRemovalResult {
        const assoc = this.expressionAssociations.get(id)
        if (!assoc) {
            throw new Error(
                `Expression-source association "${id}" does not exist.`
            )
        }
        this.expressionAssociations.delete(id)

        const sourceSet = this.sourceToAssociations.get(assoc.sourceId)
        if (sourceSet) {
            sourceSet.delete(id)
            if (sourceSet.size === 0) {
                this.sourceToAssociations.delete(assoc.sourceId)
            }
        }

        const exprSet = this.expressionToAssociations.get(assoc.expressionId)
        if (exprSet) {
            exprSet.delete(id)
            if (exprSet.size === 0) {
                this.expressionToAssociations.delete(assoc.expressionId)
            }
        }

        return {
            removedVariableAssociations: [],
            removedExpressionAssociations: [assoc],
        }
    }

    // -----------------------------------------------------------------------
    // Bulk association removal
    // -----------------------------------------------------------------------

    public removeAssociationsForVariable(
        variableId: string
    ): TSourceAssociationRemovalResult {
        const assocIds = this.variableToAssociations.get(variableId)
        if (!assocIds || assocIds.size === 0) {
            return {
                removedVariableAssociations: [],
                removedExpressionAssociations: [],
            }
        }

        const removedVariableAssociations: TCoreVariableSourceAssociation[] = []
        for (const assocId of assocIds) {
            const assoc = this.variableAssociations.get(assocId)
            if (!assoc) continue
            this.variableAssociations.delete(assocId)

            const sourceSet = this.sourceToAssociations.get(assoc.sourceId)
            if (sourceSet) {
                sourceSet.delete(assocId)
                if (sourceSet.size === 0) {
                    this.sourceToAssociations.delete(assoc.sourceId)
                }
            }
            removedVariableAssociations.push(assoc)
        }

        this.variableToAssociations.delete(variableId)

        return {
            removedVariableAssociations,
            removedExpressionAssociations: [],
        }
    }

    public removeAssociationsForExpression(
        expressionId: string
    ): TSourceAssociationRemovalResult {
        const assocIds = this.expressionToAssociations.get(expressionId)
        if (!assocIds || assocIds.size === 0) {
            return {
                removedVariableAssociations: [],
                removedExpressionAssociations: [],
            }
        }

        const removedExpressionAssociations: TCoreExpressionSourceAssociation[] =
            []
        for (const assocId of assocIds) {
            const assoc = this.expressionAssociations.get(assocId)
            if (!assoc) continue
            this.expressionAssociations.delete(assocId)

            const sourceSet = this.sourceToAssociations.get(assoc.sourceId)
            if (sourceSet) {
                sourceSet.delete(assocId)
                if (sourceSet.size === 0) {
                    this.sourceToAssociations.delete(assoc.sourceId)
                }
            }
            removedExpressionAssociations.push(assoc)
        }

        this.expressionToAssociations.delete(expressionId)

        return {
            removedVariableAssociations: [],
            removedExpressionAssociations,
        }
    }

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    public getAssociationsForSource(sourceId: string): {
        variable: TCoreVariableSourceAssociation[]
        expression: TCoreExpressionSourceAssociation[]
    } {
        const assocIds = this.sourceToAssociations.get(sourceId)
        if (!assocIds) return { variable: [], expression: [] }

        const variable: TCoreVariableSourceAssociation[] = []
        const expression: TCoreExpressionSourceAssociation[] = []
        for (const assocId of assocIds) {
            const varAssoc = this.variableAssociations.get(assocId)
            if (varAssoc) {
                variable.push(varAssoc)
                continue
            }
            const exprAssoc = this.expressionAssociations.get(assocId)
            if (exprAssoc) expression.push(exprAssoc)
        }
        return { variable, expression }
    }

    public getAssociationsForVariable(
        variableId: string
    ): TCoreVariableSourceAssociation[] {
        const assocIds = this.variableToAssociations.get(variableId)
        if (!assocIds) return []
        const result: TCoreVariableSourceAssociation[] = []
        for (const assocId of assocIds) {
            const assoc = this.variableAssociations.get(assocId)
            if (assoc) result.push(assoc)
        }
        return result
    }

    public getAssociationsForExpression(
        expressionId: string
    ): TCoreExpressionSourceAssociation[] {
        const assocIds = this.expressionToAssociations.get(expressionId)
        if (!assocIds) return []
        const result: TCoreExpressionSourceAssociation[] = []
        for (const assocId of assocIds) {
            const assoc = this.expressionAssociations.get(assocId)
            if (assoc) result.push(assoc)
        }
        return result
    }

    public getAllVariableSourceAssociations(): TCoreVariableSourceAssociation[] {
        return Array.from(this.variableAssociations.values())
    }

    public getAllExpressionSourceAssociations(): TCoreExpressionSourceAssociation[] {
        return Array.from(this.expressionAssociations.values())
    }

    // -----------------------------------------------------------------------
    // Snapshot & restoration
    // -----------------------------------------------------------------------

    public snapshot(): TSourceManagerSnapshot {
        return {
            variableSourceAssociations: Array.from(
                this.variableAssociations.values()
            ).sort((a, b) => a.id.localeCompare(b.id)),
            expressionSourceAssociations: Array.from(
                this.expressionAssociations.values()
            ).sort((a, b) => a.id.localeCompare(b.id)),
        }
    }

    public static fromSnapshot(data: TSourceManagerSnapshot): SourceManager {
        const sm = new SourceManager()

        for (const assoc of data.variableSourceAssociations) {
            sm.variableAssociations.set(assoc.id, assoc)

            let sourceSet = sm.sourceToAssociations.get(assoc.sourceId)
            if (!sourceSet) {
                sourceSet = new Set()
                sm.sourceToAssociations.set(assoc.sourceId, sourceSet)
            }
            sourceSet.add(assoc.id)

            let varSet = sm.variableToAssociations.get(assoc.variableId)
            if (!varSet) {
                varSet = new Set()
                sm.variableToAssociations.set(assoc.variableId, varSet)
            }
            varSet.add(assoc.id)
        }

        for (const assoc of data.expressionSourceAssociations) {
            sm.expressionAssociations.set(assoc.id, assoc)

            let sourceSet = sm.sourceToAssociations.get(assoc.sourceId)
            if (!sourceSet) {
                sourceSet = new Set()
                sm.sourceToAssociations.set(assoc.sourceId, sourceSet)
            }
            sourceSet.add(assoc.id)

            let exprSet = sm.expressionToAssociations.get(assoc.expressionId)
            if (!exprSet) {
                exprSet = new Set()
                sm.expressionToAssociations.set(assoc.expressionId, exprSet)
            }
            exprSet.add(assoc.id)
        }

        return sm
    }
}
