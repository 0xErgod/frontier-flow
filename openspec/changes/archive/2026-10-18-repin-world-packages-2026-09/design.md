## Context

`maintainedWorldPackageReferences.ts` is the single source for every world package identifier the application uses at runtime. Two of its fields drive the turret path specifically:

- `originalWorldPackageId` types the character and capability lookups: `::character::PlayerProfile`, and `::access::OwnerCap<::turret::Turret>`.
- `worldPackageId` targets the move calls: `::character::borrow_owner_cap`, `::turret::authorize_extension`, `::turret::verify_online`.

Both targets were republished on 2026-09-24 as new lineages. A republication is not an upgrade: the new packages have new ids and are not reachable from the old ones, so every identifier derived from the pinned values addresses objects that no longer participate in the game.

## Evidence

Queried against `graphql.testnet.sui.io` while preparing this change:

| | Pinned (`0x8b8a46ed…`) | Live (`0x7be18d62…`) |
|---|---|---|
| `OwnerCap<Turret>` objects | **0** | present, one mutated 2026-10-17T19:18Z |
| Object registry last mutated | 2026-09-29T08:53Z | 2026-10-17T02:22Z |

Utopia's pinned registry last moved 2026-09-24T11:58Z against 2026-10-15T14:42Z for its live one. The old `PlayerProfile` objects do still exist, so the character lookup can succeed for an older character and still yield nothing at the capability step; both paths end in the same empty list.

## Goals / Non-Goals

**Goals:** Address the lineages the game is using, re-verify every layer the integrity capability defines, and keep the change to data plus the fixtures that asserted the retired data.

**Non-Goals:** Changing verification semantics, the runbook, the bundle format, or any application behaviour; deleting retired snapshots; and deciding the §4 question, which `proposal.md` puts to the maintainer.

## Decisions

### Repin both targets together

Utopia is less visibly broken than stillness — capabilities still exist under its pinned `originalWorldPackageId`, while stillness has none at all. Repinning only stillness would leave the manifest half-drifted and the checker still failing, and would split one upstream event across two changes. Both targets were republished by the same upstream revision, so they move together.

### Utopia stops being an upgrade

Previously utopia's `originalWorldPackageId` (`0xd12a70c7…`) differed from its `worldPackageId` (`0x07e6b810…`), because that lineage had been upgraded in place. The new publication is a fresh lineage, so both fields are now the same id.

This removes the only maintained target that exercised the upgraded-package shape. `publishRemote`'s "upgraded-package dependency mismatch" test keeps covering that path with an explicitly constructed bundle rather than a maintained one, so the behaviour stays tested even though no shipped target currently has that shape.

### One deploy-cache entry for both targets

Both targets now resolve from the same upstream revision, so `scripts/deploy-cache-packages.json` carries one entry listing both. A second entry would duplicate an identical resolution and produce a second identical snapshot.

### Fixtures updated, synthetic fixtures left alone

Test fixtures that asserted *the checked-in bundle* are updated. Fixtures that merely need *some* world package — drift detection using `0xaaa`/`0xbbb`, the published-manifest parser's synthetic upgrade and replacement manifests, the publish-time upgrade hint — are untouched. Rewriting those to the new ids would have quietly made two of them vacuous: the parser's upgrade case and the publish hint both depend on `original-id` differing from `published-at`.

## Risks / Trade-offs

**The pin is a commit, not a tag.** That is the §4 deviation, and it is the maintainer's call. Everything else here is mechanical and verified.

**Regenerated snapshots differ from the retired ones.** That is a property of regenerating against a newer builder, not of this change; the deploy-cache layer verifies the new snapshot against the new manifest entry and passes.

**No change can be verified end to end from a test suite.** The suite proves the fixtures agree with the data. That the data is *right* is established by the checker against the live chain, which reports `2/2 targets fully verified` on this branch and `0/2` on `main`.
