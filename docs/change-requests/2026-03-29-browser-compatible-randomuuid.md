# Change Request: Inject `generateId` via Constructor Options

## Problem

`argument-engine.ts`, `premise-engine.ts`, `expression-manager.ts`, `proposit-core.ts`, and `argument-parser.ts` all import `randomUUID` from `node:crypto`:

```typescript
import { randomUUID } from "node:crypto"
```

This works on the server (Node.js) but breaks in browser bundles. Next.js / Turbopack replaces `node:crypto` with `crypto-browserify`, which does **not** export `randomUUID`. This causes a runtime `TypeError` whenever the engine auto-generates an ID — most commonly when `createPremiseWithId` auto-creates a premise-bound variable:

```
TypeError: randomUUID is not a function
    at PropositArgumentEngine.createPremiseWithId (argument-engine.js)
```

There are **23+ call sites** across 6 files that use `randomUUID`.

## Root Cause

`node:crypto` is a Node.js-only module. The `randomUUID` function exists in the native Web Crypto API (`globalThis.crypto.randomUUID()`) on all modern browsers, but `crypto-browserify` (the standard bundler polyfill for `node:crypto`) does not expose it.

## Proposed Fix: Dependency Injection via `TLogicEngineOptions`

Add a `generateId` option to `TLogicEngineOptions` and thread it through the library, matching the existing pattern in `TForkArgumentOptions.generateId`:

### 1. Extend the options type

```typescript
export type TLogicEngineOptions = {
    checksumConfig?: TCoreChecksumConfig
    positionConfig?: TCorePositionConfig
    grammarConfig?: TGrammarConfig
    /** UUID generator for new entity IDs. Defaults to `crypto.randomUUID`. */
    generateId?: () => string
}
```

### 2. Store and thread through the component tree

In `ArgumentEngine`:

```typescript
private generateId: () => string;

constructor(argument, claimLibrary, sourceLibrary, claimSourceLibrary, options?) {
    this.generateId = options?.generateId ?? randomUUID;
    // ...pass to VariableManager, PremiseEngine, etc.
}
```

In `PremiseEngine`, `ExpressionManager`, etc. — receive `generateId` through the existing config/deps parameter and use `this.generateId()` instead of the module-level `randomUUID()`.

### 3. Wire up in `PropositCore`

`PropositCore` already threads `checksumConfig`, `positionConfig`, and `grammarConfig` through to `ArgumentLibrary` and then to `ArgumentEngine`. Add `generateId` to that same path.

### 4. Wire up in `ArgumentParser`

`ArgumentParser` generates IDs for claims, sources, variables, expressions, and premises. Accept `generateId` in its options and use it instead of `randomUUID`.

### 5. Wire up in `fork.ts`

`TForkArgumentOptions` already has `generateId?: () => string`. Continue using it. If the fork creates an engine internally, pass `generateId` through to the new engine's options.

### 6. Remove `import { randomUUID } from "node:crypto"`

Once all call sites use the injected `generateId`, the `node:crypto` import can be removed from all 6 files. The import only remains as the default value in the options.

If the default itself should avoid `node:crypto` (to make the library fully environment-agnostic without any Node.js imports), the default can use `globalThis.crypto.randomUUID`:

```typescript
const defaultGenerateId: () => string =
    typeof globalThis?.crypto?.randomUUID === "function"
        ? () => globalThis.crypto.randomUUID()
        : (() => {
              const { randomUUID } = require("node:crypto")
              return randomUUID
          })()
```

Or, since the consumer always provides the option, keeping `randomUUID` from `node:crypto` as the default is acceptable — consumers that run in the browser simply pass their own.

## Consumer Usage

### Server (Node.js)

```typescript
import { randomUUID } from "node:crypto"

const engine = new ArgumentEngine(
    argument,
    claimLookup,
    sourceLookup,
    csLookup,
    {
        checksumConfig: CHECKSUM_CONFIG,
        generateId: randomUUID, // or omit for default
    }
)
```

### Browser

```typescript
const engine = new ArgumentEngine(
    argument,
    claimLookup,
    sourceLookup,
    csLookup,
    {
        checksumConfig: CHECKSUM_CONFIG,
        generateId: () => crypto.randomUUID(), // Web Crypto API
    }
)
```

## Precedent

`TForkArgumentOptions` already uses this exact pattern:

```typescript
export interface TForkArgumentOptions {
    generateId?: () => string // Defaults to crypto.randomUUID
    checksumConfig?: TCoreChecksumConfig
    // ...
}
```

The proposed change extends this pattern to the core engine options for consistency.

## Impact on This Consumer (proposit-server)

### Current Workaround

`PropositArgumentEngine` overrides `createPremiseWithId` to set the private `restoringFromSnapshot = true` in the browser, skipping auto-variable creation (and the `randomUUID` call). Reconciliation code was extended to append missing auto-variables from the server.

This workaround:

- Skips optimistic premise-bound variable creation on the client
- Requires extra reconciliation logic to append missing variables
- Is fragile (depends on private `restoringFromSnapshot` property)

### After This Change

- Remove the `createPremiseWithId` override from `PropositArgumentEngine`
- Remove the "append missing auto-variable" reconciliation logic
- Pass `() => crypto.randomUUID()` in browser engine construction
- Pass `randomUUID` (from `node:crypto`) in server engine construction
- Full optimistic updates with auto-variables work on the client

## Test Cases

1. Construct `ArgumentEngine` with a custom `generateId` → all auto-generated IDs use it
2. Construct `ArgumentEngine` without `generateId` → falls back to default
3. `createPremiseWithId` auto-variable gets an ID from `generateId`, not hardcoded `randomUUID`
4. `PremiseEngine` operations (toggle negation, formula buffers) use `generateId`
5. `PropositCore` operations (create claim, source) use `generateId`
6. `ArgumentParser.buildArgument` uses `generateId` for all entities
7. `forkArgument` continues using its own `generateId` option
8. All existing Node.js tests pass unchanged (default remains `randomUUID`)
