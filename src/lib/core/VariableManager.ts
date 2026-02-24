import type { TPropositionalVariable } from "../schemata"

export class VariableManager {
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
