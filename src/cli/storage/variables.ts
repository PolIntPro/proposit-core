import fs from "node:fs/promises"
import path from "node:path"
import Type from "typebox"
import Value from "typebox/value"
import {
    CorePropositionalVariableSchema,
    type TCorePropositionalVariable,
} from "../../lib/schemata/index.js"
import { getVersionDir } from "../config.js"
import { errorExit } from "../output.js"

const VariablesFileSchema = Type.Array(CorePropositionalVariableSchema)

function variablesPath(argumentId: string, version: number): string {
    return path.join(getVersionDir(argumentId, version), "variables.json")
}

export async function readVariables(
    argumentId: string,
    version: number
): Promise<TCorePropositionalVariable[]> {
    const filePath = variablesPath(argumentId, version)
    const content = await fs.readFile(filePath, "utf-8").catch(() => {
        errorExit(`variables.json not found for ${argumentId}@${version}.`)
    })
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(VariablesFileSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeVariables(
    argumentId: string,
    version: number,
    variables: TCorePropositionalVariable[]
): Promise<void> {
    await fs.writeFile(
        variablesPath(argumentId, version),
        JSON.stringify(variables, null, 2)
    )
}
