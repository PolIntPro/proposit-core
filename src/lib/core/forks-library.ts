import { Value } from "typebox/value"
import type { TCoreFork } from "../schemata/fork.js"
import { CoreForkSchema } from "../schemata/fork.js"
import type { TCoreChecksumConfig } from "../types/checksum.js"
import { DEFAULT_CHECKSUM_CONFIG } from "../consts.js"
import { entityChecksum } from "./checksum.js"
import type {
    TForkLookup,
    TForksLibrarySnapshot,
} from "./interfaces/library.interfaces.js"
import type {
    TInvariantValidationResult,
    TInvariantViolation,
} from "../types/validation.js"
import { FORK_SCHEMA_INVALID } from "../types/validation.js"
import { InvariantViolationError } from "./invariant-violation-error.js"

export class ForksLibrary<
    TFork extends TCoreFork = TCoreFork,
> implements TForkLookup<TFork> {
    private forks: Map<string, TFork>
    private checksumConfig?: TCoreChecksumConfig

    constructor(options?: { checksumConfig?: TCoreChecksumConfig }) {
        this.forks = new Map()
        this.checksumConfig = options?.checksumConfig
    }

    private restoreFromSnapshot(snap: TForksLibrarySnapshot<TFork>): void {
        this.forks = new Map()
        for (const fork of snap.forks) {
            this.forks.set(fork.id, fork)
        }
    }

    private withValidation<T>(fn: () => T): T {
        const snap = this.snapshot()
        try {
            const result = fn()
            const validation = this.validate()
            if (!validation.ok) {
                this.restoreFromSnapshot(snap)
                throw new InvariantViolationError(validation.violations)
            }
            return result
        } catch (e) {
            if (!(e instanceof InvariantViolationError)) {
                this.restoreFromSnapshot(snap)
            }
            throw e
        }
    }

    private computeChecksum(fork: TFork): string {
        const fields =
            this.checksumConfig?.forkFields ??
            DEFAULT_CHECKSUM_CONFIG.forkFields!
        return entityChecksum(
            fork as unknown as Record<string, unknown>,
            fields
        )
    }

    public create(
        fork: Omit<TFork, "checksum"> & { checksum?: string }
    ): TFork {
        return this.withValidation(() => {
            if (this.forks.has(fork.id)) {
                throw new Error(
                    `Fork record with ID "${fork.id}" already exists.`
                )
            }

            const full = { ...fork, checksum: "" } as TFork
            full.checksum = this.computeChecksum(full)

            this.forks.set(full.id, full)
            return full
        })
    }

    public get(id: string): TFork | undefined {
        return this.forks.get(id)
    }

    public getAll(): TFork[] {
        return Array.from(this.forks.values())
    }

    public remove(id: string): TFork {
        return this.withValidation(() => {
            const fork = this.forks.get(id)
            if (!fork) {
                throw new Error(`Fork record "${id}" not found.`)
            }

            this.forks.delete(id)
            return fork
        })
    }

    public snapshot(): TForksLibrarySnapshot<TFork> {
        return { forks: this.getAll() }
    }

    public validate(): TInvariantValidationResult {
        const violations: TInvariantViolation[] = []
        for (const [id, fork] of this.forks) {
            if (!Value.Check(CoreForkSchema, fork)) {
                violations.push({
                    code: FORK_SCHEMA_INVALID,
                    message: `Fork record "${id}" does not conform to schema`,
                    entityType: "fork",
                    entityId: id,
                })
            }
        }
        return { ok: violations.length === 0, violations }
    }

    public static fromSnapshot<TFork extends TCoreFork = TCoreFork>(
        snapshot: TForksLibrarySnapshot<TFork>,
        options?: { checksumConfig?: TCoreChecksumConfig }
    ): ForksLibrary<TFork> {
        const lib = new ForksLibrary<TFork>(options)
        for (const fork of snapshot.forks) {
            lib.forks.set(fork.id, fork)
        }
        return lib
    }
}
