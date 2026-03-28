import type { TCoreChecksumConfig } from "./types/checksum.js"

export const DEFAULT_CHECKSUM_CONFIG: Readonly<TCoreChecksumConfig> = {
    expressionFields: new Set([
        "id",
        "type",
        "parentId",
        "position",
        "argumentId",
        "argumentVersion",
        "premiseId",
        "variableId",
        "operator",
        "forkedFromExpressionId",
        "forkedFromPremiseId",
        "forkedFromArgumentId",
        "forkedFromArgumentVersion",
        "forkId",
    ]),
    variableFields: new Set([
        "id",
        "symbol",
        "argumentId",
        "argumentVersion",
        "claimId",
        "claimVersion",
        "boundPremiseId",
        "boundArgumentId",
        "boundArgumentVersion",
        "forkedFromVariableId",
        "forkedFromArgumentId",
        "forkedFromArgumentVersion",
        "forkId",
    ]),
    premiseFields: new Set([
        "id",
        "argumentId",
        "argumentVersion",
        "forkedFromPremiseId",
        "forkedFromArgumentId",
        "forkedFromArgumentVersion",
        "forkId",
    ]),
    argumentFields: new Set([
        "id",
        "version",
        "forkedFromArgumentId",
        "forkedFromArgumentVersion",
        "forkId",
    ]),
    roleFields: new Set(["conclusionPremiseId"]),
    claimFields: new Set(["id", "version"]),
    sourceFields: new Set(["id", "version"]),
    claimSourceAssociationFields: new Set([
        "id",
        "claimId",
        "claimVersion",
        "sourceId",
        "sourceVersion",
    ]),
    forkFields: new Set([
        "id",
        "sourceArgumentId",
        "sourceArgumentVersion",
        "createdOn",
    ]),
}

/**
 * Ensures all fields of a `TCoreChecksumConfig` are `Set<string>` instances.
 * After a JSON round-trip, Sets become arrays (custom replacer) or empty
 * objects (native `JSON.stringify`); this converts both forms back to Sets.
 * Returns `undefined` if the input is `undefined`. Leaves undefined fields as-is.
 */
export function normalizeChecksumConfig(
    config: TCoreChecksumConfig | undefined
): TCoreChecksumConfig | undefined {
    if (config === undefined) return undefined
    const keys = [
        "expressionFields",
        "variableFields",
        "premiseFields",
        "argumentFields",
        "roleFields",
        "claimFields",
        "sourceFields",
        "claimSourceAssociationFields",
        "forkFields",
    ] as const
    const result: TCoreChecksumConfig = {}
    for (const key of keys) {
        const value = config[key]
        if (value === undefined) continue
        result[key] =
            value instanceof Set
                ? value
                : Array.isArray(value)
                  ? new Set(value)
                  : new Set()
    }
    return result
}

/**
 * Converts all `Set<string>` fields in a `TCoreChecksumConfig` to `string[]`
 * so the config survives a plain `JSON.stringify` round-trip (which turns Sets
 * into `{}`). Returns `undefined` when the input is `undefined`.
 */
export function serializeChecksumConfig(
    config: TCoreChecksumConfig | undefined
): Record<string, string[]> | undefined {
    if (config === undefined) return undefined
    const keys = [
        "expressionFields",
        "variableFields",
        "premiseFields",
        "argumentFields",
        "roleFields",
        "claimFields",
        "sourceFields",
        "claimSourceAssociationFields",
        "forkFields",
    ] as const
    const result: Record<string, string[]> = {}
    for (const key of keys) {
        const value = config[key]
        if (value === undefined) continue
        result[key] = Array.from(value)
    }
    return result
}

/**
 * Creates a checksum config by merging additional fields into the defaults.
 * Omitted fields in `additional` inherit defaults. Fields are unioned, not replaced.
 */
export function createChecksumConfig(
    additional: TCoreChecksumConfig
): TCoreChecksumConfig {
    const keys = [
        "expressionFields",
        "variableFields",
        "premiseFields",
        "argumentFields",
        "roleFields",
        "claimFields",
        "sourceFields",
        "claimSourceAssociationFields",
        "forkFields",
    ] as const
    const result: TCoreChecksumConfig = {}
    for (const key of keys) {
        const base = DEFAULT_CHECKSUM_CONFIG[key]!
        const extra = additional[key]
        result[key] = extra ? new Set([...base, ...extra]) : new Set(base)
    }
    return result
}
