import readline from "node:readline"
import fs from "node:fs"

export function printJson(value: unknown): void {
    process.stdout.write(JSON.stringify(value, null, 2) + "\n")
}

export function printLine(text: string): void {
    process.stdout.write(text + "\n")
}

export function printWarning(message: string): void {
    process.stderr.write(message + "\n")
}

export function errorExit(message: string, code = 1): never {
    process.stderr.write(message + "\n")
    process.exit(code)
}

export async function requireConfirmation(prompt: string): Promise<void> {
    // Open /dev/tty directly so piped stdin doesn't interfere
    let input: NodeJS.ReadableStream
    try {
        input = fs.createReadStream("/dev/tty")
    } catch {
        input = process.stdin
    }

    const rl = readline.createInterface({ input, output: process.stderr })
    process.stderr.write(`${prompt} (type "confirm" to proceed): `)

    await new Promise<void>((resolve) => {
        rl.once("line", (line) => {
            rl.close()
            if (line.trim() !== "confirm") {
                errorExit("Aborted.")
            }
            resolve()
        })
    })
}
