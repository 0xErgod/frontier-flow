## Context

`git ls-files --eol -- '*.move'` reports `i/lf w/crlf attr/` for all 223 matches on a Windows checkout: LF in the index, CRLF in the working tree, no governing attribute.

`emitter.test.ts` imports fixtures as raw text:

```ts
import expectedDefaultTurret from "../../__fixtures__/move/default-turret.move?raw";
```

and compares them to emitter output. The emitter emits LF unconditionally, so the comparison is a byte-for-byte test of the checkout's line endings as much as of the emitter.

The lockfile is a second instance. `scripts/security/source-map-js-regression.mjs` builds its row table with:

```js
const match = line.match(/^\s*"([^"]+)": (\[.*\]),?$/);
```

On a CRLF checkout every line retains a trailing carriage return, so the `$` anchor never matches: 0 of 422 package rows parse, and the suite reports `Bun must record a source-map-js resolution` — a missing-entry message for a file whose entries are all present.

## Goals / Non-Goals

**Goals:** Make a clean checkout produce the same test result on Windows as in CI for every failure caused by line endings, and keep script-regenerated JSON diffs free of whole-file line-ending churn.

**Non-Goals:** Changing any committed file content; renormalising the index; changing the emitter's output; introducing a repository-wide text policy; or altering what CI asserts.

## Decisions

### Attribute the fixtures rather than the test

Alternative: normalise inside the test, comparing with line endings stripped. Rejected â€” it weakens a byte-for-byte assertion to paper over a checkout artifact, and it would have to be repeated in every future test that reads a fixture as raw text. The defect is in what the checkout produces, so that is where it is fixed.

### `*.move` by extension, not by path

Scoping the rule to `src/__fixtures__/move/**` would fix the failing tests and leave the 223 vendored `.move` sources inconsistent. They are already LF in the index, so the extension-wide rule costs nothing and keeps all Move text in the repository under one rule.

### `eol=lf`, not `text=auto`

`text=auto` alone leaves checkout conversion to the contributor's `core.autocrlf`, which is the variable that caused the defect. `eol=lf` makes the result independent of local configuration.

### Name `bun.lock` rather than `*.lock`

`bun.lock` is the only lockfile in the repository. A glob would assert a policy about lockfiles that do not exist; naming the file keeps the rule checkable against something real.

## Risks / Trade-offs

A Windows contributor with in-progress uncommitted edits to `.move`, `.json`, or `bun.lock` will see those files' line endings change in the working tree on their next checkout. Content is unaffected and the index already holds LF, so no diff is produced and nothing can be lost.

## What this does not fix

`scripts/security/no-legacy-sui-jsonrpc.mjs` still fails on Windows after this change. Its `skipped` entries are forward-slash prefixes, but `relative(root, path)` returns `scripts\security
o-legacy-sui-jsonrpc.mjs`, so `startsWith` never matches and the scanner flags its own pattern list as a violation. The `src/__tests__/` skip misses for the same reason. A one-line separator normalisation fixes it, but that is a different defect and is left to its own change.
