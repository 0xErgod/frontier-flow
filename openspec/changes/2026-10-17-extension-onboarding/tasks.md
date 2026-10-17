## 1. Define the link

- [x] 1.1 Add `src/utils/onboardingLink.ts` with `ONBOARDING_ROUTE`, a parser, and a builder.
- [x] 1.2 Validate package id, module name, and network, reporting which part is unusable.
- [x] 1.3 Distinguish an empty link from a malformed one, so a stripped link does not read as a bad package id.
- [x] 1.4 Build links that parse back to the same contract, tolerating a trailing slash on the origin.

## 2. Add the route

- [x] 2.1 Add `src/components/OnboardPage.tsx` and dispatch `/onboard` from `App()`, lazily, matching the existing page routes.
- [x] 2.2 Resolve the named package through `resolveSharedAuthorizationContract` rather than reimplementing verification.
- [x] 2.3 Refuse a link whose module disagrees with the resolved module, naming both.
- [x] 2.4 Surface the resolver's own message when a package cannot be used.
- [x] 2.5 Present contract name, module, full package id, and network before any confirmation.

## 3. Keep consent explicit

- [x] 3.1 Save nothing and change no view state until the reader confirms.
- [x] 3.2 On confirmation, save the shared extension and open the authorize view with the link's network selected.
- [x] 3.3 Never preselect turrets or authorize from the link.
- [x] 3.4 Extract `SharedExtensionTrustNotice` so the route and the authorize field render one copy of the warning.

## 4. Let an author share a contract

- [x] 4.1 Add a share action beside each saved shared extension that copies its onboarding link.
- [x] 4.2 Leave the label unchanged when clipboard access is refused, rather than claiming a copy that did not happen.

## 5. Cover it with tests

- [x] 5.1 15 link cases: well-formed, reordered parameters, empty link, ten malformed shapes, round-trip, trailing-slash origin.
- [x] 5.2 9 route cases: verified presentation, trust notice, nothing saved before confirmation, three refused links with no network call, module mismatch, resolver failure, confirmation saving and opening authorize.
- [x] 5.3 1 share case asserting the copied link's route and all three parameters.
- [x] 5.4 Confirm the pre-existing authorize and navigation suites still pass.

## 6. Verify

- [x] 6.1 Run `bun run lint` and `bunx tsc -b`.
- [x] 6.2 Run the full `vitest run` suite.
- [x] 6.3 Capture onboarding screenshots for the pull request, driving the route with Playwright against a stubbed package response.
