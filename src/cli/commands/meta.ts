import { Command } from "commander"
import { createRequire } from "node:module"
import { printLine } from "../output.js"

const require = createRequire(import.meta.url)

export function registerMetaCommands(program: Command): void {
    program
        .command("version")
        .description("Print the current package version")
        .action(() => {
            const pkg = require("../../../package.json") as { version: string }
            printLine(pkg.version)
        })
}
