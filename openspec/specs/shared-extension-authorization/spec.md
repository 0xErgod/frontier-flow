# shared-extension-authorization Specification

## Purpose

Let a turret owner authorize their turrets against a turret extension published by another account, without republishing it, while keeping the identity and witness checks applied to their own packages.

## Requirements

### Requirement: A turret owner may authorize an extension published by another account
The application MUST allow a turret owner to authorize their turrets against a turret extension package published by any account, without republishing it and without owning its `UpgradeCap`. Authorization MUST continue to apply its existing turret ownership, selection, and transaction validity rules; this requirement widens which contracts may be selected, not who may authorize a turret. The application MUST NOT present a shared extension as having been published by the connected wallet.

#### Scenario: Coalition member authorizes shared logic
- **WHEN** a turret owner supplies the package id of a turret extension published by another account, on a supported published network
- **THEN** the package is offered as a selectable authorization contract, and authorizing a turret against it requires no republication of that package

#### Scenario: Wallet holds no deployment of its own
- **WHEN** a turret owner has never deployed a contract and has saved at least one shared extension
- **THEN** the saved extension is offered for authorization, resolved against the network that entry names

#### Scenario: Own deployment and shared extension both present
- **WHEN** a turret owner has both a deployment of their own and a saved shared extension
- **THEN** both are offered, and the owner's own deployment is presented first

### Requirement: A shared package is verified before it is offered
The application MUST resolve a supplied package id by reading the package from the selected network and confirming that the returned package identity matches the request. It MUST require a `TurretAuth` witness declared locally in the candidate module, and MUST NOT accept an imported witness reference from another module. A package id that is not a valid object identity MUST be refused before any network request. The application MUST NOT fabricate a module name, publication transaction, or publication time for a package it did not publish. The application MUST state, at the point a shared package is entered, that this verification establishes identity and the presence of a `TurretAuth` declaration rather than the safety of the package's behaviour.

#### Scenario: Package carries no turret extension
- **WHEN** resolution finds no locally declared `TurretAuth` witness in the package
- **THEN** the application reports that the package has no turret extension module, and no entry is saved

#### Scenario: Returned package identity does not match
- **WHEN** the network returns a package whose identity differs from the requested id, or omits it
- **THEN** resolution fails closed and no entry is saved

#### Scenario: Malformed package id
- **WHEN** the supplied value is not a `0x`-prefixed hex object identity of at most 64 digits
- **THEN** the application reports the expected format and issues no network request

#### Scenario: Player is told what verification does not cover
- **WHEN** the shared logic field is presented
- **THEN** it states that only trusted logic should be authorized, and that checking a package confirms its identity and `TurretAuth` declaration rather than that its behaviour is safe

### Requirement: Opted-in shared extensions persist and survive corruption
The application MUST persist the shared extensions a player opted into, per browser, and MUST re-validate every stored entry's package id, module name, and target on each read. Malformed entries MUST be discarded individually and MUST NOT prevent the remaining entries from loading. Unparseable or non-array stored data MUST read as an empty list rather than failing. A local validator target MUST NOT be stored as a shared extension target. Storage being unavailable MUST NOT raise.

#### Scenario: Stored data is partially corrupt
- **WHEN** the stored list contains both valid and malformed entries
- **THEN** the valid entries load and the malformed ones are discarded

#### Scenario: Same package added twice
- **WHEN** a player adds a package id and network that is already saved
- **THEN** the existing entry is replaced rather than duplicated, while the same package on a different network remains a distinct entry

#### Scenario: Saved list changes
- **WHEN** the saved list is written
- **THEN** the application announces the change so that state outside the authorize view observes it, including in another open tab

### Requirement: The authorize view is reachable without a deployment of one's own
The application MUST allow a turret owner to open the authorize view when they hold no deployment of their own, so that a shared extension can be added and used. Navigation to the authorize view MUST NOT be gated on the presence of a local deployment record. The simulate view MUST remain gated on having a contract to run against — either the player's own deployment or a saved shared extension — and any message explaining that gate MUST name both routes rather than only deployment.

#### Scenario: Player with no deployment opens authorize
- **WHEN** a turret owner who has never deployed a contract requests the authorize view
- **THEN** the view opens, and no redirect to the visual or deploy view occurs

#### Scenario: Simulate is gated while authorize is not
- **WHEN** a turret owner holds neither a deployment nor a saved shared extension
- **THEN** the authorize view remains available, the simulate view is unavailable, and the explanation names both deploying a contract and adding a shared logic package

#### Scenario: Simulate becomes available through a shared extension
- **WHEN** a turret owner with no deployment of their own saves a shared extension
- **THEN** the simulate view becomes available without any deployment being created

#### Scenario: Restored session preserves authorize
- **WHEN** the application restarts with a persisted authorize view and no deployment of the player's own
- **THEN** the authorize view is restored rather than replaced by the visual view

#### Scenario: Restored session discards an unusable simulate view
- **WHEN** the application restarts with a persisted simulate view, no deployment, and no saved shared extension
- **THEN** the visual view is presented instead, and the simulate view is not mounted first

### Requirement: Logic published by another account reports whether it has been exercised
Before a turret owner authorizes a turret extension published by another account, the application MUST state whether that contract has produced a simulation result in the current session, and MUST point at the existing simulation action as the way to produce one. A simulation result belonging to a different contract MUST NOT be reported as covering the selected one.

The application MUST NOT prevent authorization on the grounds that a contract has not been simulated, and MUST NOT present a verdict about whether a contract's behaviour is acceptable. Simulation output remains the player's to read.

The application MUST NOT describe a simulation as establishing how an extension behaves in game. A simulation submits a single candidate described by the player under one behaviour reason they choose, while in play the turret supplies the candidate list and the reason; any statement about simulation MUST reflect that difference rather than implying a contract has been cleared.

This requirement adds no simulation capability: it reports on the existing turret simulation, which calls an extension's target-priority entry point directly and therefore does not require the extension to be authorized first.

#### Scenario: Shared logic has not been exercised
- **WHEN** a turret owner has selected a contract saved from another account and no simulation result exists for it in this session
- **THEN** the application says so before the authorize action, and directs the owner to simulate a turret against a candidate

#### Scenario: Shared logic has been exercised
- **WHEN** a simulation for the selected shared contract has produced a result in this session
- **THEN** the application says the contract has been simulated, and invites a further run against a different candidate

#### Scenario: A result for a different contract
- **WHEN** the most recent simulation result belongs to a contract other than the one selected
- **THEN** the selected contract is still reported as not exercised

#### Scenario: Authorization is never blocked
- **WHEN** a turret owner authorizes a shared contract that has not been simulated
- **THEN** the authorization proceeds, having been reported rather than prevented

#### Scenario: What a simulation is said to show
- **WHEN** the application reports on a contract's simulation, exercised or not
- **THEN** it describes the simulation as submitting one player-chosen candidate under one player-chosen behaviour reason, and does not present it as establishing in-game behaviour

#### Scenario: The wallet's own deployment
- **WHEN** the selected contract is the wallet's own deployment rather than one saved from another account
- **THEN** no shared-logic simulation advisory is shown
