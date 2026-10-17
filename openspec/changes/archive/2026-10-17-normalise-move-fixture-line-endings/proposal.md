## Why

The repository has no `.gitattributes`. Every `.move` file is stored LF in the index, but a Windows contributor with `core.autocrlf=true` — Git for Windows' default — receives them as CRLF on checkout.

The Move fixtures under `src/__fixtures__/move` are imported with `?raw` and compared against emitter output, which is always LF. So on a clean Windows checkout, with no edits of any kind, `src/__tests__/compiler/emitter.test.ts` and `src/__tests__/compiler/pipeline.test.ts` fail on string equality. The same checkout passes in CI, where the runner is Linux.

`bun.lock` has the same problem with worse symptoms. The `scripts/security/*.mjs` regression suites parse it line by line with `$`-anchored regexes, so a CRLF checkout leaves a trailing carriage return that makes *no* package row parse at all. `bun run test:security` then fails four assertions that read as missing or unpatched lockfile entries, which is not what is wrong.

The cost is not the failures themselves but what they hide: a Windows contributor cannot tell their own regressions apart from the platform artifact, and may report either as the other.

## What Changes

- Add `.gitattributes` pinning `*.move` to `text eol=lf`, so the fixtures are checked out LF on every platform. The 223 vendored sources under `public/upstream-sources` are already LF in the index and are covered by the same rule.
- Pin `*.json` to `text eol=lf` as well. The graph fixtures and the deploy-grade resolution snapshots are script-generated and reviewed as diffs; without this, regenerating one on Windows rewrites every line.
- Pin `bun.lock` to `text eol=lf`, so the security regression suites can parse it.

No source, test, fixture, or snapshot content changes. The index already holds LF for every file matched by both rules, so nothing is renormalised by this change — it only fixes what checkout produces.

## Capabilities

### New Capabilities

None; this is contributor-environment parity only.

### Modified Capabilities

None. `ci-quality-gates` is unaffected: CI already passes today, because its runners check out LF regardless. This change makes a local run agree with CI, it does not change what CI asserts.

## Impact

- One new root file, `.gitattributes`.
- On their next checkout or `git add --renormalize`, Windows contributors will see `.move`, `.json`, and `bun.lock` converted from CRLF to LF in the working tree. No committed content changes.
- No runtime code, dependency, CI configuration, or API change.

## Deliberately out of scope

- `*.snap` is not covered. The repository has no snapshot files; adding a rule for a file type that does not exist would be speculative.
- No blanket `* text=auto`. It would extend normalisation to every present and future file type, which is a broader policy decision than the defect requires.
- One Windows-only failure in `scripts/security/no-legacy-sui-jsonrpc.mjs` is **not** fixed here. Its `skipped` list uses forward-slash prefixes while `relative()` returns backslashes on Windows, so the scanner reports itself as a violation. That is a path-separator defect, not a line-ending one, and it belongs in its own change.
