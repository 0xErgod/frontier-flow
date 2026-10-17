## 1. Establish the defect

- [x] 1.1 Confirm no `.gitattributes` exists at any path in the repository.
- [x] 1.2 Confirm `git ls-files --eol -- '*.move'` reports `i/lf w/crlf attr/` for all 223 matches, and that none is stored CRLF in the index.
- [x] 1.3 Confirm `core.autocrlf=true` locally, matching the Git for Windows default.
- [x] 1.4 Confirm the same for `bun.lock`: `i/lf w/crlf`, with 907 of 908 working-tree lines carrying a trailing carriage return.

## 2. Add the attributes

- [x] 2.1 Add root `.gitattributes` with `*.move text eol=lf` and `*.json text eol=lf`, each commented with the reason.
- [x] 2.2 Add `bun.lock text eol=lf` for the security regression suites.
- [x] 2.3 Re-check out `src/__fixtures__/move/` and `bun.lock` and confirm `git ls-files --eol` reports `w/lf attr/text eol=lf` for both.

## 3. Verify in both directions

- [x] 3.1 With the fixtures LF, `emitter.test.ts` and `pipeline.test.ts` pass: 23 tests in 2 files.
- [x] 3.2 Force the fixtures back to CRLF and confirm `emitter.test.ts` fails 2 of 3 tests, establishing that the attribute is what fixes it rather than an unrelated change.
- [x] 3.3 Restore the fixtures and confirm `git status` is clean for that directory.
- [x] 3.4 Reproduce the lockfile parse failure directly: with CRLF, 0 of 908 lines yield a package row and 0 `source-map-js` resolutions are found; after stripping the carriage returns, 422 rows parse and the resolution is found.
- [x] 3.5 Confirm `bun run test:security` drops from 4 failing assertions to 1 once `bun.lock` is checked out LF.

## 4. Keep the change bounded

- [x] 4.1 Confirm the only file added is `.gitattributes` and no committed file content changes.
- [x] 4.2 Run `bun run lint` and `bunx tsc -b`.
- [x] 4.3 Leave the remaining Windows-only `test:security` failure alone: `no-legacy-sui-jsonrpc.mjs` compares forward-slash prefixes against `relative()` output containing backslashes, which is a path-separator defect for a separate change.
