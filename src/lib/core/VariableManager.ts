import type { TCorePropositionalVariable } from "../schemata/index.js"

export class VariableManager {
    private variables: Map<string, TCorePropositionalVariable>
    private variableSymbols: Set<string>

    constructor(initialVariables: TCorePropositionalVariable[] = []) {
        this.variables = new Map()
        this.variableSymbols = new Set()

        for (const variable of initialVariables) {
            this.addVariable(variable)
        }
    }

    public toArray(): TCorePropositionalVariable[] {
        return Array.from(this.variables.values())
    }

    public addVariable(variable: TCorePropositionalVariable) {
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

    public getVariable(
        variableId: string
    ): TCorePropositionalVariable | undefined {
        return this.variables.get(variableId)
    }

    public renameVariable(variableId: string, newSymbol: string): void {
        const variable = this.variables.get(variableId)
        if (!variable) {
            throw new Error(`Variable "${variableId}" does not exist.`)
        }
        if (
            this.variableSymbols.has(newSymbol) &&
            variable.symbol !== newSymbol
        ) {
            throw new Error(`Variable symbol "${newSymbol}" is already in use.`)
        }
        this.variableSymbols.delete(variable.symbol)
        this.variableSymbols.add(newSymbol)
        this.variables.set(variableId, { ...variable, symbol: newSymbol })
    }
}
