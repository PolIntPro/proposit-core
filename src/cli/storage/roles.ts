import fs from "node:fs/promises"
import path from "node:path"
import Value from "typebox/value"
import {
    CoreArgumentRoleStateSchema,
    type TCoreArgumentRoleState,
} from "../../lib/schemata/index.js"
import { getVersionDir } from "../config.js"
import { errorExit } from "../output.js"

function rolesPath(argumentId: string, version: number): string {
    return path.join(getVersionDir(argumentId, version), "roles.json")
}

export async function readRoles(
    argumentId: string,
    version: number
): Promise<TCoreArgumentRoleState> {
    const filePath = rolesPath(argumentId, version)
    const content = await fs.readFile(filePath, "utf-8").catch(() => {
        errorExit(`roles.json not found for ${argumentId}@${version}.`)
    })
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(CoreArgumentRoleStateSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeRoles(
    argumentId: string,
    version: number,
    roles: TCoreArgumentRoleState
): Promise<void> {
    await fs.writeFile(
        rolesPath(argumentId, version),
        JSON.stringify(roles, null, 2)
    )
}
