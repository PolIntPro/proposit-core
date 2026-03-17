import { Command } from "commander"
import { hydrateEngine, hydrateLibraries } from "../engine.js"
import { printLine } from "../output.js"

export function registerRenderCommand(
    versionedCmd: Command,
    argumentId: string,
    version: number
): void {
    versionedCmd
        .command("render")
        .description("Render all premises as logical expression strings")
        .action(async () => {
            const libs = await hydrateLibraries()
            const engine = await hydrateEngine(argumentId, version, libs)
            const roles = engine.getRoleState()
            const conclusionId = roles.conclusionPremiseId

            const all = engine.listPremises()
            const sorted = [
                ...all.filter((pm) => pm.getId() === conclusionId),
                ...all.filter((pm) => pm.getId() !== conclusionId),
            ]

            for (const pm of sorted) {
                const id = pm.getId()
                const marker = id === conclusionId ? "*" : ""
                const display = pm.toDisplayString() || "(empty)"
                printLine(`${id}${marker}: ${display}`)
            }

            const claims = libs.claimLibrary.getAll()
            if (claims.length > 0) {
                printLine("")
                printLine("Claims:")
                for (const claim of claims) {
                    const extras = claim as Record<string, unknown>
                    const frozen = claim.frozen ? " [frozen]" : ""
                    const text =
                        typeof extras.text === "string"
                            ? ` | ${extras.text}`
                            : ""
                    printLine(`  ${claim.id}@${claim.version}${frozen}${text}`)
                }
            }

            const sources = libs.sourceLibrary.getAll()
            if (sources.length > 0) {
                printLine("")
                printLine("Sources:")
                for (const source of sources) {
                    const extras = source as Record<string, unknown>
                    const text =
                        typeof extras.text === "string"
                            ? ` | ${extras.text}`
                            : ""
                    printLine(`  ${source.id}@${source.version}${text}`)
                }
            }
        })
}
