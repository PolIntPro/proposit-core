import { randomUUID } from "node:crypto"
import { Command } from "commander"
import { hydratePropositCore, persistCore } from "../engine.js"
import { errorExit, printJson, printLine } from "../output.js"

export function registerSourceCommands(program: Command): void {
    const sources = program
        .command("sources")
        .description("Manage global source library")

    sources
        .command("list")
        .description("List all sources")
        .option("--json", "Output as JSON")
        .action(async (opts: { json?: boolean }) => {
            const core = await hydratePropositCore()
            const all = core.sources.getAll()
            if (opts.json) {
                printJson(all)
            } else {
                for (const source of all) {
                    const extras = source as Record<string, unknown>
                    const text =
                        typeof extras.text === "string"
                            ? ` | ${extras.text}`
                            : ""
                    printLine(`${source.id}@${source.version}${text}`)
                }
            }
        })

    sources
        .command("show <source_id>")
        .description("Show all versions of a source")
        .option("--json", "Output as JSON")
        .action(async (sourceId: string, opts: { json?: boolean }) => {
            const core = await hydratePropositCore()
            const versions = core.sources.getVersions(sourceId)
            if (versions.length === 0) {
                errorExit(`Source "${sourceId}" not found.`)
            }
            if (opts.json) {
                printJson(versions)
            } else {
                for (const v of versions) {
                    const extras = v as Record<string, unknown>
                    const frozen = v.frozen ? " [frozen]" : ""
                    const text =
                        typeof extras.text === "string"
                            ? ` | ${extras.text}`
                            : ""
                    printLine(`v${v.version}${frozen}${text}`)
                }
            }
        })

    sources
        .command("add")
        .description("Create a new source")
        .requiredOption("--text <text>", "Source text")
        .action(async (opts: { text: string }) => {
            const core = await hydratePropositCore()
            const source = core.sources.create({
                id: randomUUID(),
                text: opts.text,
            } as Parameters<typeof core.sources.create>[0])
            await persistCore(core)
            printLine(source.id)
        })

    sources
        .command("link-claim <source_id> <claim_id>")
        .description("Link a source to a claim via a new association")
        .action(async (sourceId: string, claimId: string) => {
            const core = await hydratePropositCore()
            const source = core.sources.getCurrent(sourceId)
            if (!source) {
                errorExit(`Source "${sourceId}" not found.`)
            }
            const claim = core.claims.getCurrent(claimId)
            if (!claim) {
                errorExit(`Claim "${claimId}" not found.`)
            }
            const assoc = core.claimSources.add({
                id: randomUUID(),
                claimId: claim.id,
                claimVersion: claim.version,
                sourceId: source.id,
                sourceVersion: source.version,
            })
            await persistCore(core)
            printLine(assoc.id)
        })

    sources
        .command("unlink <association_id>")
        .description("Remove a claim-source association")
        .action(async (associationId: string) => {
            const core = await hydratePropositCore()
            const assoc = core.claimSources.get(associationId)
            if (!assoc) {
                errorExit(`Association "${associationId}" not found.`)
            }
            core.claimSources.remove(associationId)
            await persistCore(core)
            printLine("success")
        })
}
