import fs from "node:fs/promises"
import path from "node:path"
import { Value } from "typebox/value"
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
