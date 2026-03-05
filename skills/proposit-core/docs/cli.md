# proposit-core CLI Reference

## Running the CLI

```bash
# Local development (builds first, then runs)
pnpm run build
pnpm cli -- --help

# Installed globally
proposit-core --help
```

Always build before running the CLI locally. The entry point is `src/cli.ts`, compiled to `dist/cli.js`.

## Routing

**Source:** `src/cli.ts`, `src/cli/router.ts`

`argv[2]` is inspected by `isNamedCommand()` to decide the routing path:

**Named commands** (handled by top-level Commander program):

- `help`, `--help`, `-h`
- `version`, `--version`, `-V`
- `arguments`
- `diff`

**Version-scoped commands** (everything else):

- `argv[2]` is treated as `<argument_id>`
- `argv[3]` is the version selector
- After `resolveVersion()`, a sub-Commander program is built with the remaining args
- Registered sub-commands: `show`, `render`, `roles`, `variables`, `premises`, `expressions`, `analysis`

If `argv[2]` is undefined, `isNamedCommand()` returns `true` (falls through to Commander's help).

## Version Selectors

**Source:** `src/cli/router.ts`

`resolveVersion(argumentId, versionArg)` accepts:

| Selector                           | Behavior                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `"latest"`                         | Max version number found in the argument directory                                 |
| `"last-published"`                 | Highest published version (iterates from highest to lowest; exits 1 if none found) |
| Integer string (e.g. `"0"`, `"3"`) | Exact version number (must be non-negative integer; must exist on disk)            |

Exits with error if no versions exist for the argument, or if the specified version is not found.

## State Storage Layout

**Source:** `src/cli/config.ts`

Root directory: `$PROPOSIT_HOME` (default: `~/.proposit-core`)

```
$PROPOSIT_HOME/
  arguments/
    <argument-id>/
      meta.json            # { id, title, description }
      <version>/           # 0, 1, 2, ...
        meta.json          # { version, createdAt, published, publishedAt? }
        variables.json     # TCorePropositionalVariable[]
        roles.json         # { conclusionPremiseId? }
        premises/
          <premise-id>/
            meta.json      # { id, title? }
            data.json      # { rootExpressionId?, variables: id[], expressions[] }
        <analysis>.json    # { argumentId, argumentVersion, assignments, rejectedExpressionIds }
```

**Reserved filenames** (excluded from analysis file listing): `meta.json`, `variables.json`, `roles.json`.

Analysis files default to `analysis.json`. The `listAnalysisFiles` function uses `Value.Check` to silently skip corrupt or non-analysis JSON files in the version directory.

**Path helpers** (`src/cli/config.ts`):

- `getStateDir()` -- root state directory
- `getArgumentsDir()` -- `<state>/arguments/`
- `getArgumentDir(argumentId)` -- `<state>/arguments/<id>/`
- `getVersionDir(argumentId, version)` -- `<state>/arguments/<id>/<version>/`
- `getPremisesDir(argumentId, version)` -- `<state>/arguments/<id>/<version>/premises/`
- `getPremiseDir(argumentId, version, premiseId)` -- `<state>/arguments/<id>/<version>/premises/<premiseId>/`

## Engine Hydration

**Source:** `src/cli/engine.ts`

### `hydrateEngine(argumentId, version)`

Builds a fully-hydrated `ArgumentEngine` from on-disk state:

1. **Parallel read:** argument meta, version meta, variables, roles, and premise IDs (via `Promise.all`)
2. **Construct argument:** merge `argMeta` and `versionMeta` into `Omit<TCoreArgument, "checksum">`
3. **Create engine:** `new ArgumentEngine(argument)`
4. **Register variables:** iterate all variables, call `engine.addVariable()` for each (with `argumentVersion` set)
5. **For each premise:** read meta + data in parallel, then `engine.createPremiseWithId(premiseId, extras)`
6. **Add expressions in BFS order:** roots first (`parentId === null`), then children of already-added nodes in subsequent passes until all are placed
7. **Set conclusion role last:** `engine.setConclusionPremise(roles.conclusionPremiseId)` if defined. Supporting premises are derived automatically from expression type.

### `persistEngine(engine)`

The inverse of hydration -- writes all engine state back to disk:

1. Extracts argument meta and version meta from `engine.getArgument()`
2. Writes argument meta, version meta, variables, and roles
3. For each premise: writes meta and data (expressions + variables)

## Publish Semantics

**Source:** `src/cli/commands/arguments.ts`

`arguments publish <id>`:

1. Reads the latest version meta; exits if already published
2. Marks the current latest version `published: true, publishedAt: new Date()`
3. Copies the entire version directory to `version + 1`
4. Writes a fresh unpublished meta for the new version (removes `publishedAt`)

**Publish guard:** All mutating CLI commands (roles, variables, premises, expressions) call `assertNotPublished(argumentId, version)` before making changes. If the version is already published, it exits with code 1.

## Command Reference

### Top-Level Commands

| Command     | Subcommands                                        |
| ----------- | -------------------------------------------------- |
| `version`   | Prints the package version                         |
| `arguments` | `create`, `import`, `list`, `delete`, `publish`    |
| `diff`      | `<args...>` (version or cross-argument comparison) |

#### `arguments create <title> <description>`

Creates a new argument with a generated UUID. Initializes version 0 with empty variables, roles, and premises directory. Prints the argument ID.

#### `arguments import <yaml_file>`

Imports an argument from a YAML file. Parses the YAML, builds an `ArgumentEngine` via `importArgumentFromYaml()`, then persists it to disk. Prints the argument ID.

#### `arguments list [--json]`

Lists all arguments sorted newest-first by `createdAt`. Plain output shows `id | title (created date)`. JSON output includes `id`, `title`, `description`, `latestVersion`, `latestCreatedAt`, `latestPublished`.

#### `arguments delete <id> [--confirm] [--all]`

Deletes an argument. Without `--all`, deletes only the latest version (unless only one version exists, in which case the entire argument is deleted). With `--all`, deletes all versions and the argument directory. Without `--confirm`, prompts for interactive confirmation.

#### `arguments publish <id>`

Publishes the latest version and creates a new draft. See [Publish Semantics](#publish-semantics).

#### `diff <args...> [--json]`

Compares two argument versions. Accepts either:

- 3 args: `<id> <verA> <verB>` -- same argument, two versions
- 4 args: `<idA> <verA> <idB> <verB>` -- cross-argument comparison

Without `--json`, renders a human-readable diff. With `--json`, outputs the raw `TCoreArgumentDiff` object.

### Version-Scoped Commands

Invoked as `proposit-core <argument_id> <version> <command> ...`

#### `show [--json]`

Shows metadata for the argument version. Plain output lists id, title, description, version, created date, published status. JSON merges argument meta and version meta.

#### `render`

Renders all premises as logical expression strings. The conclusion premise is listed first, marked with `*`. Empty premises show `(empty)`.

#### `roles`

| Subcommand                    | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `show [--json]`               | Shows the conclusion premise ID and derived supporting premise IDs |
| `set-conclusion <premise_id>` | Sets the designated conclusion premise (premise must exist)        |
| `clear-conclusion`            | Clears the designated conclusion premise                           |

#### `variables`

| Subcommand                           | Description                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `create <symbol> [--id <id>]`        | Registers a new variable with the given symbol. Optionally specify an explicit ID. Prints the variable ID |
| `list [--json]`                      | Lists all argument-level variables                                                                        |
| `show <id> [--json]`                 | Shows a single variable                                                                                   |
| `update <id> [--symbol <new>]`       | Updates a variable's symbol                                                                               |
| `delete <id>`                        | Removes a variable (cascade-deletes all referencing expressions across all premises)                      |
| `list-unused [--json]`               | Lists variables not referenced by any expression                                                          |
| `delete-unused [--confirm] [--json]` | Deletes all unreferenced variables (prompts unless `--confirm`)                                           |

#### `premises`

| Subcommand                                    | Description                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `create [--title <title>]`                    | Creates a new empty premise. Prints the premise ID                              |
| `list [--json]`                               | Lists all premises with type (inference/constraint), display string, and title  |
| `show <id> [--json]`                          | Shows premise metadata, type, root expression, variable count, expression count |
| `update <id> [--title <new>] [--clear-title]` | Updates premise metadata. `--title` and `--clear-title` are mutually exclusive  |
| `delete <id> [--confirm]`                     | Deletes a premise. Clears the conclusion role if this was the conclusion        |
| `render <id>`                                 | Renders the premise as a logical expression string                              |

#### `expressions`

| Subcommand                             | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| `create <premise_id> [flags]`          | Adds an expression to a premise                |
| `insert <premise_id> [flags]`          | Inserts an expression, wrapping existing nodes |
| `delete <premise_id> <expr_id>`        | Removes an expression and its subtree          |
| `list <premise_id> [--json]`           | Lists all expressions in a premise             |
| `show <premise_id> <expr_id> [--json]` | Shows a single expression                      |

**`create` flags:**

- `--type <type>` (required): `variable`, `operator`, or `formula`
- `--id <id>`: explicit expression ID (default: generated UUID)
- `--parent-id <parent_id>`: parent expression ID (omit for root)
- `--position <n>`: explicit position among siblings
- `--before <sibling_id>`: insert before this sibling (mutually exclusive with `--after` and `--position`)
- `--after <sibling_id>`: insert after this sibling (mutually exclusive with `--before` and `--position`)
- `--variable-id <id>`: required for `type=variable`
- `--operator <op>`: required for `type=operator` (`not`, `and`, `or`, `implies`, `iff`)

When neither `--position`, `--before`, nor `--after` is specified, the expression is appended as the last child via `appendExpression`.

**`insert` flags:**

- `--type <type>` (required): `variable`, `operator`, or `formula`
- `--id <id>`: explicit expression ID
- `--parent-id <parent_id>`: parent expression ID
- `--position <n>`: position among siblings
- `--variable-id <id>`: required for `type=variable`
- `--operator <op>`: required for `type=operator`
- `--left-node-id <id>`: left node to wrap
- `--right-node-id <id>`: right node to wrap

At least one of `--left-node-id` or `--right-node-id` is required.

#### `analysis`

| Subcommand                                   | Description                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `create [filename] [--default <value>]`      | Creates a new analysis file with all variables. Default assignment value: `unset` (or `true`/`false`)     |
| `list [--json]`                              | Lists analysis files in the version directory                                                             |
| `show [--file <f>] [--json]`                 | Shows variable assignments and rejected expressions                                                       |
| `set <symbol> <value> [--file <f>]`          | Sets a single variable assignment (`true`, `false`, or `unset`)                                           |
| `reset [--file <f>] [--value <v>]`           | Resets all assignments to one value (default: `unset`)                                                    |
| `reject <expr_id> [--file <f>]`              | Rejects an expression (evaluates to `false`, children skipped)                                            |
| `accept <expr_id> [--file <f>]`              | Accepts an expression (restores normal evaluation)                                                        |
| `validate-assignments [--file <f>] [--json]` | Validates analysis file against the argument version (checks symbols, IDs, rejected expression existence) |
| `delete [--file <f>] [--confirm]`            | Deletes an analysis file                                                                                  |
| `evaluate [--file <f>] [--json] [flags]`     | Evaluates the argument using the analysis file's assignments                                              |
| `check-validity [--json] [flags]`            | Runs truth-table validity checking                                                                        |
| `validate-argument [--json]`                 | Validates argument structure for evaluability                                                             |
| `refs [--json]`                              | Shows variables referenced across all premises (symbol, premise IDs)                                      |
| `export [--json]`                            | Exports the full argument engine state snapshot                                                           |

**`evaluate` flags:**

- `--strict-unknown-assignment-keys`: reject extra assignment keys
- `--no-expression-values`: omit per-expression truth values from output
- `--no-diagnostics`: omit inference diagnostics from output
- `--no-validate-first`: skip evaluability validation before evaluating
- `--skip-analysis-file-validation`: skip analysis file validation (symbol/ID mismatch checks)

**`check-validity` flags:**

- `--mode <mode>`: `first-counterexample` (default) or `exhaustive`
- `--max-variables <n>`: maximum number of variables to allow
- `--max-assignments-checked <n>`: maximum assignments to enumerate
- `--include-counterexample-evaluations`: include full evaluation payloads for counterexamples
- `--no-validate-first`: skip evaluability validation

All analysis subcommands default to `analysis.json` when `--file` is not specified.

## Storage Utilities

**Source:** `src/cli/storage/`

| File           | Key Functions                                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arguments.ts` | `readArgumentMeta`, `writeArgumentMeta`, `readVersionMeta`, `writeVersionMeta`, `listArgumentIds`, `listVersionNumbers`, `latestVersionNumber`, `deleteVersionDir`, `deleteArgumentDir`, `copyVersionDir` |
| `variables.ts` | `readVariables`, `writeVariables`                                                                                                                                                                         |
| `roles.ts`     | `readRoles`, `writeRoles`                                                                                                                                                                                 |
| `premises.ts`  | `readPremiseMeta`, `writePremiseMeta`, `readPremiseData`, `writePremiseData`, `listPremiseIds`, `deletePremiseDir`, `premiseExists`                                                                       |
| `analysis.ts`  | `readAnalysis`, `writeAnalysis`, `listAnalysisFiles`, `deleteAnalysisFile`, `analysisFileExists`, `resolveAnalysisFilename`                                                                               |

Most disk reads use `Value.Parse(Schema, raw)` from `typebox/value`, which throws on invalid data. Some reads (e.g. `readVersionMeta`) use `Value.Decode` instead. `listAnalysisFiles` uses `Value.Check` to silently skip corrupt files.

Local CLI schemata (in `src/cli/schemata.ts`) use optional `checksum` fields for backward compatibility with older data files that may not include checksums.

## Output Helpers

**Source:** `src/cli/output.ts`

| Function                      | Behavior                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `printJson(value)`            | `JSON.stringify(value, null, 2)` + newline to stdout                                                                       |
| `printLine(text)`             | Text + newline to stdout                                                                                                   |
| `errorExit(message, code=1)`  | Message + newline to stderr, then `process.exit(code)`. Return type is `never`                                             |
| `requireConfirmation(prompt)` | Reads from `/dev/tty` (falls back to stdin). Expects the user to type `"confirm"`. Calls `errorExit("Aborted.")` otherwise |
