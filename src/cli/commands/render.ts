import { Command } from "commander"
import { hydrateEngine } from "../engine.js"
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
            const engine = await hydrateEngine(argumentId, version)
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
        })
}
