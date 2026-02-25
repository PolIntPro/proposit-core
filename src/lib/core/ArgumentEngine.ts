import { randomUUID } from "node:crypto"
import type {
    TCoreArgument,
    TCorePropositionalExpression,
} from "../schemata/index.js"
import type {
    TCoreArgumentEngineData,
    TCoreArgumentEvaluationOptions,
    TCoreArgumentEvaluationResult,
    TCoreArgumentRoleState,
    TCoreCounterexample,
    TCorePremiseEvaluationResult,
    TCoreValidationIssue,
    TCoreValidationResult,
    TCoreValidityCheckOptions,
    TCoreValidityCheckResult,
    TCoreVariableAssignment,
} from "../types/evaluation.js"
import { getOrCreate, sortedUnique } from "../utils/collections.js"
import { makeErrorIssue, makeValidationResult } from "./evaluation/shared.js"
import { PremiseManager } from "./PremiseManager.js"

export class ArgumentEngine {
    private argument: TCoreArgument
    private premises: Map<string, PremiseManager>
    private supportingPremiseIds: Set<string>
    private conclusionPremiseId: string | undefined

    constructor(argument: TCoreArgument) {
        this.argument = { ...argument }
        this.premises = new Map()
        this.supportingPremiseIds = new Set()
        this.conclusionPremiseId = undefined
    }

    public getArgument(): TCoreArgument {
        return { ...this.argument }
    }

    public createPremise(title?: string): PremiseManager {
        const id = randomUUID()
        const pm = new PremiseManager(id, this.argument, title)
        this.premises.set(id, pm)
        return pm
    }

    public createPremiseWithId(id: string, title?: string): PremiseManager {
        if (this.premises.has(id)) {
            throw new Error(`Premise "${id}" already exists.`)
        }
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

    public getRoleState(): TCoreArgumentRoleState {
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

    public toData(): TCoreArgumentEngineData {
        return {
            argument: { ...this.argument },
            premises: this.listPremises().map((pm) => pm.toData()),
            roles: this.getRoleState(),
        }
    }

    public exportState(): TCoreArgumentEngineData {
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

    public validateEvaluability(): TCoreValidationResult {
        const issues: TCoreValidationIssue[] = []

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
        assignment: TCoreVariableAssignment,
        options?: TCoreArgumentEvaluationOptions
    ): TCoreArgumentEvaluationResult {
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
            (pm) => !roleIds.has(pm.getId()) && pm.isConstraint()
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
                        (
                            expr
                        ): expr is TCorePropositionalExpression<"variable"> =>
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
                result: TCorePremiseEvaluationResult
            ): TCorePremiseEvaluationResult => ({
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
        options?: TCoreValidityCheckOptions
    ): TCoreValidityCheckResult {
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
            (pm) => !roleIds.has(pm.getId()) && pm.isConstraint()
        )

        const checkedVariableIds = sortedUnique(
            [conclusion, ...supportingPremises, ...constraintPremises].flatMap(
                (pm) =>
                    pm
                        .getExpressions()
                        .filter(
                            (
                                expr
                            ): expr is TCorePropositionalExpression<"variable"> =>
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
        const counterexamples: TCoreCounterexample[] = []
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

            const assignment: TCoreVariableAssignment = {}
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
