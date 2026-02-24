import { Command } from "commander"
import { errorExit, printJson, printLine } from "../output.js"
import { readVersionMeta } from "../storage/arguments.js"
import { premiseExists } from "../storage/premises.js"
import { readRoles, writeRoles } from "../storage/roles.js"

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

export function registerRoleCommands(
    versionedCmd: Command,
    argumentId: string,
    version: number
): void {
    const roles = versionedCmd
        .command("roles")
        .description("Manage premise role assignments")

    roles
        .command("show")
        .description("Show current role assignments")
        .option("--json", "Output as JSON")
        .action(async (opts: { json?: boolean }) => {
            const state = await readRoles(argumentId, version)
            if (opts.json) {
                printJson(state)
            } else {
                printLine(
                    `conclusion: ${state.conclusionPremiseId ?? "(none)"}`
                )
                printLine(
                    `supporting: ${state.supportingPremiseIds.length > 0 ? state.supportingPremiseIds.join(", ") : "(none)"}`
                )
            }
        })

    roles
        .command("set-conclusion <premise_id>")
        .description("Set the designated conclusion premise")
        .action(async (premiseId: string) => {
            await assertNotPublished(argumentId, version)
            if (!(await premiseExists(argumentId, version, premiseId))) {
                errorExit(`Premise "${premiseId}" does not exist.`)
            }
            const state = await readRoles(argumentId, version)
            if (state.supportingPremiseIds.includes(premiseId)) {
                errorExit(
                    `Premise "${premiseId}" is already a supporting premise.`
                )
            }
            await writeRoles(argumentId, version, {
                ...state,
                conclusionPremiseId: premiseId,
            })
            printLine("success")
        })

    roles
        .command("clear-conclusion")
        .description("Clear the designated conclusion premise")
        .action(async () => {
            await assertNotPublished(argumentId, version)
            const state = await readRoles(argumentId, version)
            const { conclusionPremiseId: _removed, ...rest } = state
            await writeRoles(argumentId, version, {
                ...rest,
                conclusionPremiseId: undefined,
            })
            printLine("success")
        })

    roles
        .command("add-support <premise_id>")
        .description("Add a premise to supporting premises")
        .action(async (premiseId: string) => {
            await assertNotPublished(argumentId, version)
            if (!(await premiseExists(argumentId, version, premiseId))) {
                errorExit(`Premise "${premiseId}" does not exist.`)
            }
            const state = await readRoles(argumentId, version)
            if (state.conclusionPremiseId === premiseId) {
                errorExit(
                    `Premise "${premiseId}" is the conclusion and cannot also be supporting.`
                )
            }
            const ids = new Set(state.supportingPremiseIds)
            ids.add(premiseId)
            await writeRoles(argumentId, version, {
                ...state,
                supportingPremiseIds: Array.from(ids).sort(),
            })
            printLine("success")
        })

    roles
        .command("remove-support <premise_id>")
        .description("Remove a premise from supporting premises")
        .action(async (premiseId: string) => {
            await assertNotPublished(argumentId, version)
            const state = await readRoles(argumentId, version)
            await writeRoles(argumentId, version, {
                ...state,
                supportingPremiseIds: state.supportingPremiseIds.filter(
                    (id) => id !== premiseId
                ),
            })
            printLine("success")
        })
}
