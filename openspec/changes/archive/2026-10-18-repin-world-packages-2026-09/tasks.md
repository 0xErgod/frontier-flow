## 1. Establish the outage

- [x] 1.1 Reproduce `0/2 targets fully verified` from `scripts/check-world-package-references.ts` on `main`.
- [x] 1.2 Confirm on chain that no `OwnerCap<Turret>` object exists under the pinned stillness lineage, for any owner, while the live lineage holds capabilities mutated within the day.
- [x] 1.3 Confirm the pinned object registries last mutated 2026-09-29 (stillness) and 2026-09-24 (utopia), against 2026-10-17 and 2026-10-15 for the live ones.
- [x] 1.4 Trace the user-visible path: `fetchTurrets` returns an empty list rather than an error when the character or capability lookup finds nothing, so the roster is silently empty.

## 2. Repin both targets

- [x] 2.1 Repin stillness to `0x7be18d62…bed9d92` with its object registry, server address registry, and publication transaction.
- [x] 2.2 Repin utopia to `0x28eab6a6…5c7da0230`, where the fresh lineage makes `originalWorldPackageId` equal to `worldPackageId`.
- [x] 2.3 Move both targets to toolchain `1.78.0` and pin the upstream revision that carries the new addresses.
- [x] 2.4 Set `LAST_VERIFIED_ON` to the date of the verification run in this change.

## 3. Realign the deploy cache

- [x] 3.1 Collapse `scripts/deploy-cache-packages.json` to one entry covering both testnet targets, which now share an upstream revision.
- [x] 3.2 Include the regenerated deploy-grade snapshot for that revision, and the regenerated local `v0.0.18` snapshot.
- [x] 3.3 Leave the retired `v0.0.24` and `v0.0.21` snapshots in place; removing unreferenced snapshots is a separate tidy-up.

## 4. Update the fixtures that pinned retired values

- [x] 4.1 Update package, registry, and publication-transaction ids in the six test files that asserted the checked-in bundle.
- [x] 4.2 Update the source tag and toolchain expectations in `packageReferences` and `useDeployment.success`.
- [x] 4.3 Point the `check-world-package-references` stubs at the pinned revision's manifest path, and align the coherent manifest's toolchain.
- [x] 4.4 Leave synthetic fixtures alone: drift detection, the published-manifest parser's upgrade and replacement cases, and the publish-time upgrade hint all depend on ids that differ by construction.

## 5. Verify

- [x] 5.1 `bun run scripts/check-world-package-references.ts` reports `2/2 targets fully verified` on this branch.
- [x] 5.2 Full `vitest run`: 928 passed, 1 skipped.
- [x] 5.3 `bun run lint` and `bunx tsc -b` clean.
