import fs from "node:fs/promises"
import path from "node:path"
import Value from "typebox/value"
import {
    CoreAnalysisFileSchema,
    type TCoreAnalysisFile,
} from "../../lib/schemata/index.js"
import { getVersionDir } from "../config.js"
import { errorExit } from "../output.js"

const RESERVED_FILENAMES = new Set([
    "meta.json",
    "variables.json",
    "roles.json",
])

export function resolveAnalysisFilename(filename?: string): string {
    return filename ?? "analysis.json"
}

function analysisPath(
    argumentId: string,
    version: number,
    filename: string
): string {
    return path.join(getVersionDir(argumentId, version), filename)
}

export async function readAnalysis(
    argumentId: string,
    version: number,
    filename: string
): Promise<TCoreAnalysisFile> {
    const filePath = analysisPath(argumentId, version, filename)
    const content = await fs.readFile(filePath, "utf-8").catch(() => {
        errorExit(`Analysis file "${filename}" not found.`)
    })
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(CoreAnalysisFileSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeAnalysis(
    argumentId: string,
    version: number,
    filename: string,
    data: TCoreAnalysisFile
): Promise<void> {
    await fs.writeFile(
        analysisPath(argumentId, version, filename),
        JSON.stringify(data, null, 2)
    )
}

export async function listAnalysisFiles(
    argumentId: string,
    version: number
): Promise<string[]> {
    const dir = getVersionDir(argumentId, version)
    const entries = await fs
        .readdir(dir, { withFileTypes: true })
        .catch(() => [])
    const results: string[] = []
    for (const entry of entries) {
        if (!entry.isFile()) continue
        if (!entry.name.endsWith(".json")) continue
        if (RESERVED_FILENAMES.has(entry.name)) continue
        const filePath = path.join(dir, entry.name)
        try {
            const content = await fs.readFile(filePath, "utf-8")
            const raw: unknown = JSON.parse(content)
            if (Value.Check(CoreAnalysisFileSchema, raw)) {
                results.push(entry.name)
            }
        } catch {
            // skip unparseable files
        }
    }
    return results.sort()
}

export async function deleteAnalysisFile(
    argumentId: string,
    version: number,
    filename: string
): Promise<void> {
    await fs.rm(analysisPath(argumentId, version, filename), { force: true })
}

export async function analysisFileExists(
    argumentId: string,
    version: number,
    filename: string
): Promise<boolean> {
    return fs
        .stat(analysisPath(argumentId, version, filename))
        .then((s) => s.isFile())
        .catch(() => false)
}
