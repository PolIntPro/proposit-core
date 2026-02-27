import fs from "node:fs/promises"
import path from "node:path"
import Value from "typebox/value"
import {
    CliArgumentMetaSchema,
    CliArgumentVersionMetaSchema,
    type TCliArgumentMeta,
    type TCliArgumentVersionMeta,
} from "../schemata.js"
import { getArgumentDir, getArgumentsDir, getVersionDir } from "../config.js"
import { errorExit } from "../output.js"

export async function readArgumentMeta(
    argumentId: string
): Promise<TCliArgumentMeta> {
    const filePath = path.join(getArgumentDir(argumentId), "meta.json")
    const content = await fs.readFile(filePath, "utf-8").catch(() => {
        errorExit(`Argument "${argumentId}" not found.`)
    })
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(CliArgumentMetaSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeArgumentMeta(meta: TCliArgumentMeta): Promise<void> {
    const dir = getArgumentDir(meta.id)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
        path.join(dir, "meta.json"),
        JSON.stringify(meta, null, 2)
    )
}

export async function readVersionMeta(
    argumentId: string,
    version: number
): Promise<TCliArgumentVersionMeta> {
    const filePath = path.join(getVersionDir(argumentId, version), "meta.json")
    const content = await fs.readFile(filePath, "utf-8").catch(() => {
        errorExit(`Version ${version} of argument "${argumentId}" not found.`)
    })
    const raw: unknown = JSON.parse(content)
    try {
        return Value.Parse(CliArgumentVersionMetaSchema, raw)
    } catch {
        errorExit(`Invalid or corrupt file: ${filePath}`)
    }
}

export async function writeVersionMeta(
    argumentId: string,
    meta: TCliArgumentVersionMeta
): Promise<void> {
    const dir = getVersionDir(argumentId, meta.version)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
        path.join(dir, "meta.json"),
        JSON.stringify(meta, null, 2)
    )
}

export async function listArgumentIds(): Promise<string[]> {
    const dir = getArgumentsDir()
    await fs.mkdir(dir, { recursive: true })
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
}

export async function listVersionNumbers(
    argumentId: string
): Promise<number[]> {
    const dir = getArgumentDir(argumentId)
    const entries = await fs
        .readdir(dir, { withFileTypes: true })
        .catch(() => [])
    return entries
        .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
        .map((e) => Number(e.name))
        .sort((a, b) => a - b)
}

export async function latestVersionNumber(argumentId: string): Promise<number> {
    const versions = await listVersionNumbers(argumentId)
    if (versions.length === 0)
        errorExit(`No versions found for argument "${argumentId}".`)
    return versions[versions.length - 1]
}

export async function deleteVersionDir(
    argumentId: string,
    version: number
): Promise<void> {
    await fs.rm(getVersionDir(argumentId, version), {
        recursive: true,
        force: true,
    })
}

export async function deleteArgumentDir(argumentId: string): Promise<void> {
    await fs.rm(getArgumentDir(argumentId), { recursive: true, force: true })
}

export async function copyVersionDir(
    argumentId: string,
    srcVersion: number,
    destVersion: number
): Promise<void> {
    await fs.cp(
        getVersionDir(argumentId, srcVersion),
        getVersionDir(argumentId, destVersion),
        { recursive: true }
    )
}
