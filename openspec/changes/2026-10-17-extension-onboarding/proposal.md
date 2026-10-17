## Why

`shared-extension-authorization` lets a turret owner authorize a package published by anyone, but every person doing so has to be handed a package id and a module name and type them into the right field on the right network. For one person that is a minor chore. For a group adopting one agreed contract it is the whole experience, repeated per member, with a transcription error at the end of it producing an authorization that fails on chain for no visible reason.

@Scetrov raised this in review on #134: his original model was that a builder authors a contract in Frontier Flow and then uses another tool to make it available for others to install, and he suggested a simple onboarding route hosted in Frontier Flow would in practice be better.

## What Changes

- Add an `/onboard` route carrying the contract in query parameters: `package`, `module`, and `network`.
- Resolve the named package through the same verification path the authorize field uses, and refuse the link when the module it names disagrees with the module the package declares, rather than silently preferring either.
- Show what is being offered before a wallet is involved: contract name, module, the full package id, and the network, alongside the standing trust notice.
- On explicit confirmation, save the contract as a shared extension and open the authorize view, where the reader still chooses which turrets to authorize.
- Offer a share action beside each saved shared extension that copies the matching link.

## Capabilities

### New Capabilities

- `extension-onboarding`: a published turret extension MAY be shared as a link that resolves to a verified, reviewable contract, so a turret owner can adopt it without transcribing identifiers, while consent remains an explicit act taken after the contract is shown.

### Modified Capabilities

None. `shared-extension-authorization` is used as-is: the route resolves, verifies, and stores through its existing behaviour, and authorization itself is unchanged. This change adds a way to reach a contract, not a new way to authorize one.

## Impact

- New `src/utils/onboardingLink.ts`, `src/components/OnboardPage.tsx`, and `src/components/SharedExtensionTrustNotice.tsx`.
- `src/App.tsx` gains one pathname branch; `src/components/AuthorizeView.tsx` gains the share action and now renders the shared trust notice rather than its own copy of the text.
- Tests: 15 link cases, 9 route cases, and 1 share-action case.
- The route is public and unauthenticated, as any link must be. It reads and writes only the browser's own storage.

## Deliberately out of scope

- **No tribe or group model.** The route onboards one person to one contract. Showing which members' turrets already run a contract needs a concept of membership the application does not have, and that is the expensive half of the idea.
- **No directory of contracts.** Links are exchanged the way package ids already are.
- **No preselection or auto-authorization from the link.** See `design.md`; this is the central safety property of the change rather than a simplification.
