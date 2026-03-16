import { Value } from "typebox/value"
import type { TSchema } from "typebox"
import type {
    TCoreArgument,
    TCorePremise,
    TCorePropositionalExpression,
    TCorePropositionalVariable,
    TCoreSource,
    TCoreClaim,
    TCoreClaimSourceAssociation,
} from "../schemata/index.js"
import { ParsedArgumentResponseSchema } from "./schemata.js"
import type { TParsedArgumentResponse } from "./schemata.js"
import type { ArgumentEngine } from "../core/argument-engine.js"
import type { ClaimLibrary } from "../core/claim-library.js"
import type { SourceLibrary } from "../core/source-library.js"
import type { ClaimSourceLibrary } from "../core/claim-source-library.js"

/**
 * The result returned by `ArgumentParser.build()`.
 */
export type TArgumentParserResult<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
    TSource extends TCoreSource = TCoreSource,
    TClaim extends TCoreClaim = TCoreClaim,
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> = {
    engine: ArgumentEngine<TArg, TPremise, TExpr, TVar, TSource, TClaim, TAssoc>
    claimLibrary: ClaimLibrary<TClaim>
    sourceLibrary: SourceLibrary<TSource>
    claimSourceLibrary: ClaimSourceLibrary<TAssoc>
}

/**
 * Validates and builds an `ArgumentEngine` from a parsed LLM response.
 *
 * Override the protected `map*` hooks to inject custom fields into
 * the entities created during the build phase.
 */
export class ArgumentParser<
    TArg extends TCoreArgument = TCoreArgument,
    TPremise extends TCorePremise = TCorePremise,
    TExpr extends TCorePropositionalExpression = TCorePropositionalExpression,
    TVar extends TCorePropositionalVariable = TCorePropositionalVariable,
    TSource extends TCoreSource = TCoreSource,
    TClaim extends TCoreClaim = TCoreClaim,
    TAssoc extends TCoreClaimSourceAssociation = TCoreClaimSourceAssociation,
> {
    protected readonly responseSchema: TSchema

    constructor(responseSchema?: TSchema) {
        this.responseSchema = responseSchema ?? ParsedArgumentResponseSchema
    }

    /**
     * Validate raw LLM output against the response schema.
     */
    public validate(raw: unknown): TParsedArgumentResponse {
        return Value.Parse(this.responseSchema, raw)
    }

    /**
     * Build an ArgumentEngine from a validated response.
     * @throws "Not yet implemented"
     */
    public build(
        _response: TParsedArgumentResponse
    ): TArgumentParserResult<
        TArg,
        TPremise,
        TExpr,
        TVar,
        TSource,
        TClaim,
        TAssoc
    > {
        throw new Error("Not yet implemented")
    }

    // -----------------------------------------------------------------------
    // Protected mapping hooks — override to inject custom fields
    // -----------------------------------------------------------------------

    protected mapArgument(
        _parsed: TParsedArgumentResponse
    ): Record<string, unknown> {
        return {}
    }

    protected mapClaim(
        _parsed: TParsedArgumentResponse["argument"] extends infer A
            ? A extends { claims: (infer C)[] }
                ? C
                : never
            : never
    ): Record<string, unknown> {
        return {}
    }

    protected mapSource(
        _parsed: TParsedArgumentResponse["argument"] extends infer A
            ? A extends { sources: (infer S)[] }
                ? S
                : never
            : never
    ): Record<string, unknown> {
        return {}
    }

    protected mapVariable(
        _parsed: TParsedArgumentResponse["argument"] extends infer A
            ? A extends { variables: (infer V)[] }
                ? V
                : never
            : never
    ): Record<string, unknown> {
        return {}
    }

    protected mapPremise(
        _parsed: TParsedArgumentResponse["argument"] extends infer A
            ? A extends { premises: (infer P)[] }
                ? P
                : never
            : never
    ): Record<string, unknown> {
        return {}
    }

    protected mapClaimSourceAssociation(
        _claimMiniId: string,
        _sourceMiniId: string
    ): Record<string, unknown> {
        return {}
    }
}
