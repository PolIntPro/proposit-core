import fs from "node:fs/promises"
import path from "node:path"
import Type from "typebox"
import Value from "typebox/value"
import type {
    TCoreVariableSourceAssociation,
    TCoreExpressionSourceAssociation,
} from "../../lib/schemata/index.js"
import { UUID } from "../../lib/schemata/shared.js"
import { getSourceDir, getSourcesDir } from "../config.js"
import { errorExit } from "../output.js"
import { CliSourceMetaSchema, type TCliSourceMeta } from "../schemata.js"

// ── Source meta I/O ─────────────────────────────────────────────────────────

export async function readSourceMeta(
    argumentId: string,
    version: number,
    sourceId: string
): Promise<TCliSourceMeta> {
    const filePath = path.join(
        getSourceDir(argumentId, version, sourceId),
        "meta.json"
    )
    const content = await fs.readFile(filePath, "utf-8").catch(() => {
        errorExit(`Source "${sourceId}" not found.`)
    })
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(CliSourceMetaSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeSourceMeta(
    argumentId: string,
    version: number,
    sourceId: string,
    data: TCliSourceMeta
): Promise<void> {
    const dir = getSourceDir(argumentId, version, sourceId)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
        path.join(dir, "meta.json"),
        JSON.stringify(data, null, 2)
    )
}

export async function listSourceIds(
    argumentId: string,
    version: number
): Promise<string[]> {
    const dir = getSourcesDir(argumentId, version)
    await fs.mkdir(dir, { recursive: true })
    const entries = await fs
        .readdir(dir, { withFileTypes: true })
        .catch(() => [])
    return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
}

export async function deleteSourceDir(
    argumentId: string,
    version: number,
    sourceId: string
): Promise<void> {
    await fs.rm(getSourceDir(argumentId, version, sourceId), {
        recursive: true,
        force: true,
    })
}

// ── Association I/O ─────────────────────────────────────────────────────────

const VariableAssociationSchema = Type.Array(
    Type.Object({
        id: UUID,
        sourceId: UUID,
        variableId: UUID,
        argumentId: UUID,
        argumentVersion: Type.Number(),
        checksum: Type.Optional(Type.String()),
    })
)

const ExpressionAssociationSchema = Type.Array(
    Type.Object({
        id: UUID,
        sourceId: UUID,
        expressionId: UUID,
        premiseId: UUID,
        argumentId: UUID,
        argumentVersion: Type.Number(),
        checksum: Type.Optional(Type.String()),
    })
)

function variableAssociationsPath(
    argumentId: string,
    version: number
): string {
    return path.join(
        getSourcesDir(argumentId, version),
        "variable-associations.json"
    )
}

function expressionAssociationsPath(
    argumentId: string,
    version: number
): string {
    return path.join(
        getSourcesDir(argumentId, version),
        "expression-associations.json"
    )
}

export async function readVariableAssociations(
    argumentId: string,
    version: number
): Promise<TCoreVariableSourceAssociation[]> {
    const filePath = variableAssociationsPath(argumentId, version)
    const content = await fs.readFile(filePath, "utf-8").catch(() => null)
    if (content === null) return []
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(VariableAssociationSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeVariableAssociations(
    argumentId: string,
    version: number,
    data: TCoreVariableSourceAssociation[]
): Promise<void> {
    const dir = getSourcesDir(argumentId, version)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
        variableAssociationsPath(argumentId, version),
        JSON.stringify(data, null, 2)
    )
}

export async function readExpressionAssociations(
    argumentId: string,
    version: number
): Promise<TCoreExpressionSourceAssociation[]> {
    const filePath = expressionAssociationsPath(argumentId, version)
    const content = await fs.readFile(filePath, "utf-8").catch(() => null)
    if (content === null) return []
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(ExpressionAssociationSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeExpressionAssociations(
    argumentId: string,
    version: number,
    data: TCoreExpressionSourceAssociation[]
): Promise<void> {
    const dir = getSourcesDir(argumentId, version)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
        expressionAssociationsPath(argumentId, version),
        JSON.stringify(data, null, 2)
    )
}
