## Why

Turret authorization is broken on both testnets, for every user, and has been since late September. The maintained world package references point at lineages the game no longer uses, so `scripts/check-world-package-references.ts` reports `0/2 targets fully verified`.

This is not a latent inconsistency. It is user-visible, it produces no error message, and a player has reported it:

- `fetchTurrets` resolves characters, then asks for `<originalWorldPackageId>::access::OwnerCap<<originalWorldPackageId>::turret::Turret>`.
- For stillness that type is rooted at `0x8b8a46ed…`. **Zero objects of that type exist on chain, for any owner.** The live caps are `0x7be18d62…` objects, and one was mutated on 2026-10-17.
- When no characters or caps come back, `fetchTurrets` returns `[]`. The roster is simply empty, with nothing to report and nothing to retry.

Both targets were republished on 2026-09-24 as new lineages rather than upgraded in place, so the pinned ids are not ancestors of the live ones. See issue #136.

## What Changes

- Repin `testnet:stillness` to `0x7be18d62…bed9d92` and `testnet:utopia` to `0x28eab6a6…5c7da0230`, each with its current object registry, server address registry, and publication transaction.
- Move both targets to toolchain `1.78.0`, and set `LAST_VERIFIED_ON` to the date the repin was verified against the chain.
- Collapse `scripts/deploy-cache-packages.json` to one entry covering both testnet targets, since both now resolve from the same upstream revision, and add the regenerated deploy-grade snapshot for it. The regenerated `v0.0.18` local snapshot is included.
- Update the fixture tests that asserted the retired ids, tags, and toolchains.

After this change the checker reports `2/2 targets fully verified`, and the turret lookup addresses the lineage that actually holds turret capabilities.

## Capabilities

### Modified Capabilities

None. This is a data update performed under the existing `world-package-reference-integrity` capability rather than a change to its requirements. Every layer that capability defines — current manifest, pinned source, deploy cache, on-chain registries and publication transaction — is re-verified and passing, and no verification semantics, bundle format, or provenance rule is altered.

### New Capabilities

None.

## Impact

- `src/data/maintainedWorldPackageReferences.ts`, `scripts/deploy-cache-packages.json`, and the deploy-grade snapshots.
- Fixture updates in six test files that pinned the retired values.
- Runtime: turret listing, authorization, and simulation begin addressing the live lineage. Nothing else in the application reads these references.
- The retired `v0.0.24` and `v0.0.21` snapshots are left in place rather than deleted; nothing references them now, and removing them is a separate tidy-up.

## The decision that is yours to make

Runbook §4 requires `sourceVersionTag` to be a **release tag**. No tag through `v0.0.35` carries the new addresses — they exist only on `main` at commit `d3c7016b48a796ee70ecff7b892316f2d0170282`. This change therefore pins that commit, which §4 as written does not permit.

The alternatives, as I see them:

1. Accept the SHA pin as a documented deviation, which is what this PR implements.
2. Wait for an upstream release tag that carries the new addresses, leaving authorization broken for every player until it exists.
3. Amend §4 to allow a commit pin when a target is republished ahead of tagging, with whatever additional evidence you want recorded.

I have implemented (1) so the rest of the change is reviewable and the outage has a fix ready, not to settle the question. If you prefer (2) or (3), say so and I will rework or withdraw this. The `sui-grpc-connectivity` proposal is explicit that changing transport does not authorize changing package bundles, so this is not a call I wanted to make inside a PR.
