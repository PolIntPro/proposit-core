import { randomUUID } from "node:crypto"
import { Command } from "commander"
import type {
    TCoreLogicalOperatorType,
    TCorePropositionalExpression,
} from "../../lib/schemata/index.js"
import { hydrateEngine } from "../engine.js"
import { errorExit, printJson, printLine } from "../output.js"
import { readVersionMeta } from "../storage/arguments.js"
import {
    premiseExists,
    readPremiseData,
    writePremiseData,
} from "../storage/premises.js"

async function assertNotPublished(
    argumentId: string,
    version: number
): Promise<void> {
    const meta = await readVersionMeta(argumentId, version)
    if (meta.published) {
        errorExit(
            `Version ${version} of argument "${argumentId}" is published and cannot be modified.`
        )
    }
}

function typeSpecificInfo(expr: TCorePropositionalExpression): string {
    if (expr.type === "variable") return `variableId=${expr.variableId}`
    if (expr.type === "operator") return `operator=${expr.operator}`
    return ""
}

export function registerExpressionCommands(
    versionedCmd: Command,
    argumentId: string,
    version: number
): void {
    const exprs = versionedCmd
        .command("expressions")
        .description("Manage premise expressions")

    exprs
        .command("create <premise_id>")
        .description("Add an expression to a premise")
        .requiredOption(
            "--type <type>",
            "Expression type: variable, operator, formula"
        )
        .option("--id <id>", "Expression ID (default: generated UUID)")
        .option(
            "--parent-id <parent_id>",
            "Parent expression ID (omit for root)"
        )
        .option("--position <n>", "Position among siblings")
        .option(
            "--variable-id <variable_id>",
            "Variable ID (for type=variable)"
        )
        .option(
            "--operator <op>",
            "Operator (for type=operator): not,and,or,implies,iff"
        )
        .action(
            async (
                premiseId: string,
                opts: {
                    type: string
                    id?: string
                    parentId?: string
                    position?: string
                    variableId?: string
                    operator?: string
                }
            ) => {
                await assertNotPublished(argumentId, version)
                if (!(await premiseExists(argumentId, version, premiseId))) {
                    errorExit(`Premise "${premiseId}" not found.`)
                }

                const engine = await hydrateEngine(argumentId, version)
                const pm = engine.getPremise(premiseId)
                if (!pm)
                    errorExit(`Premise "${premiseId}" not found in engine.`)

                const id = opts.id ?? randomUUID()
                const parentId = opts.parentId ?? null
                const position =
                    opts.position !== undefined ? Number(opts.position) : null

                let expression: TCorePropositionalExpression
                if (opts.type === "variable") {
                    if (!opts.variableId)
                        errorExit("--variable-id is required for type=variable")
                    expression = {
                        id,
                        argumentId,
                        argumentVersion: version,
                        parentId,
                        position,
                        type: "variable",
                        variableId: opts.variableId,
                    }
                } else if (opts.type === "operator") {
                    if (!opts.operator)
                        errorExit("--operator is required for type=operator")
                    expression = {
                        id,
                        argumentId,
                        argumentVersion: version,
                        parentId,
                        position,
                        type: "operator",
                        operator: opts.operator as TCoreLogicalOperatorType,
                    }
                } else if (opts.type === "formula") {
                    expression = {
                        id,
                        argumentId,
                        argumentVersion: version,
                        parentId,
                        position,
                        type: "formula",
                    }
                } else {
                    errorExit(
                        `Unknown type "${opts.type}". Use variable, operator, or formula.`
                    )
                }

                try {
                    pm.addExpression(expression)
                } catch (e) {
                    errorExit(
                        e instanceof Error
                            ? e.message
                            : "Failed to add expression."
                    )
                }

                await writePremiseData(
                    argumentId,
                    version,
                    premiseId,
                    pm.toData()
                )
                printLine(id)
            }
        )

    exprs
        .command("insert <premise_id>")
        .description("Insert an expression, wrapping existing nodes")
        .requiredOption(
            "--type <type>",
            "Expression type: variable, operator, formula"
        )
        .option("--id <id>", "Expression ID (default: generated UUID)")
        .option("--parent-id <parent_id>", "Parent expression ID")
        .option("--position <n>", "Position among siblings")
        .option(
            "--variable-id <variable_id>",
            "Variable ID (for type=variable)"
        )
        .option("--operator <op>", "Operator (for type=operator)")
        .option("--left-node-id <id>", "Left node to wrap")
        .option("--right-node-id <id>", "Right node to wrap")
        .action(
            async (
                premiseId: string,
                opts: {
                    type: string
                    id?: string
                    parentId?: string
                    position?: string
                    variableId?: string
                    operator?: string
                    leftNodeId?: string
                    rightNodeId?: string
                }
            ) => {
                await assertNotPublished(argumentId, version)
                if (!opts.leftNodeId && !opts.rightNodeId) {
                    errorExit(
                        "At least one of --left-node-id or --right-node-id is required."
                    )
                }
                if (!(await premiseExists(argumentId, version, premiseId))) {
                    errorExit(`Premise "${premiseId}" not found.`)
                }

                const engine = await hydrateEngine(argumentId, version)
                const pm = engine.getPremise(premiseId)
                if (!pm)
                    errorExit(`Premise "${premiseId}" not found in engine.`)

                const id = opts.id ?? randomUUID()
                const parentId = opts.parentId ?? null
                const position =
                    opts.position !== undefined ? Number(opts.position) : null

                let expression: TCorePropositionalExpression
                if (opts.type === "variable") {
                    if (!opts.variableId)
                        errorExit("--variable-id is required for type=variable")
                    expression = {
                        id,
                        argumentId,
                        argumentVersion: version,
                        parentId,
                        position,
                        type: "variable",
                        variableId: opts.variableId,
                    }
                } else if (opts.type === "operator") {
                    if (!opts.operator)
                        errorExit("--operator is required for type=operator")
                    expression = {
                        id,
                        argumentId,
                        argumentVersion: version,
                        parentId,
                        position,
                        type: "operator",
                        operator: opts.operator as TCoreLogicalOperatorType,
                    }
                } else if (opts.type === "formula") {
                    expression = {
                        id,
                        argumentId,
                        argumentVersion: version,
                        parentId,
                        position,
                        type: "formula",
                    }
                } else {
                    errorExit(`Unknown type "${opts.type}".`)
                }

                try {
                    pm.insertExpression(
                        expression,
                        opts.leftNodeId,
                        opts.rightNodeId
                    )
                } catch (e) {
                    errorExit(
                        e instanceof Error
                            ? e.message
                            : "Failed to insert expression."
                    )
                }

                await writePremiseData(
                    argumentId,
                    version,
                    premiseId,
                    pm.toData()
                )
                printLine(id)
            }
        )

    exprs
        .command("delete <premise_id> <expression_id>")
        .description("Remove an expression and its subtree")
        .action(async (premiseId: string, expressionId: string) => {
            await assertNotPublished(argumentId, version)
            if (!(await premiseExists(argumentId, version, premiseId))) {
                errorExit(`Premise "${premiseId}" not found.`)
            }

            const engine = await hydrateEngine(argumentId, version)
            const pm = engine.getPremise(premiseId)
            if (!pm) errorExit(`Premise "${premiseId}" not found in engine.`)

            const removed = pm.removeExpression(expressionId)
            if (!removed) errorExit(`Expression "${expressionId}" not found.`)

            await writePremiseData(argumentId, version, premiseId, pm.toData())
            printLine("success")
        })

    exprs
        .command("list <premise_id>")
        .description("List all expressions in a premise")
        .option("--json", "Output as JSON")
        .action(async (premiseId: string, opts: { json?: boolean }) => {
            if (!(await premiseExists(argumentId, version, premiseId))) {
                errorExit(`Premise "${premiseId}" not found.`)
            }
            const data = await readPremiseData(argumentId, version, premiseId)
            const sorted = [...data.expressions].sort((a, b) =>
                a.id.localeCompare(b.id)
            )
            if (opts.json) {
                printJson(sorted)
            } else {
                for (const expr of sorted) {
                    const extra = typeSpecificInfo(expr)
                    printLine(
                        `${expr.id} | ${expr.type} | parent=${expr.parentId ?? "null"} | position=${expr.position ?? "null"}${extra ? ` | ${extra}` : ""}`
                    )
                }
            }
        })

    exprs
        .command("show <premise_id> <expression_id>")
        .description("Show a single expression")
        .option("--json", "Output as JSON")
        .action(
            async (
                premiseId: string,
                expressionId: string,
                opts: { json?: boolean }
            ) => {
                if (!(await premiseExists(argumentId, version, premiseId))) {
                    errorExit(`Premise "${premiseId}" not found.`)
                }
                const data = await readPremiseData(
                    argumentId,
                    version,
                    premiseId
                )
                const expr = data.expressions.find((e) => e.id === expressionId)
                if (!expr) errorExit(`Expression "${expressionId}" not found.`)
                if (opts.json) {
                    printJson(expr)
                } else {
                    printLine(`id:         ${expr.id}`)
                    printLine(`type:       ${expr.type}`)
                    printLine(`parentId:   ${expr.parentId ?? "null"}`)
                    printLine(`position:   ${expr.position ?? "null"}`)
                    if (expr.type === "variable") {
                        printLine(`variableId: ${expr.variableId}`)
                    }
                    if (expr.type === "operator") {
                        printLine(`operator:   ${expr.operator}`)
                    }
                }
            }
        )
}
