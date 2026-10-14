import { describe, expect, it } from "vitest";

import {
  createDependencyResolutionRequest,
  createSyntheticFiles,
  type CacheSnapshotConfig,
} from "../../scripts/preload-deploy-cache";

const SNAPSHOT: CacheSnapshotConfig = {
  sourceVersionTag: "v0.0.24",
  repositoryUrl: "https://github.com/evefrontier/world-contracts.git",
  subdirectory: "contracts/world",
  outputPath: "public/deploy-grade-resolution-snapshots/v0.0.24.json",
  targets: ["testnet:stillness"],
};

function manifestOf(snapshot: CacheSnapshotConfig): string {
  const files = createSyntheticFiles(snapshot.sourceVersionTag, snapshot.repositoryUrl, snapshot.subdirectory);
  return files["Move.toml"] ?? "";
}

describe("preload-deploy-cache", () => {
  it("pins the world dependency to the requested revision and subdirectory", () => {
    expect(manifestOf(SNAPSHOT)).toContain(
      'world = { git = "https://github.com/evefrontier/world-contracts.git", rev = "v0.0.24", subdir = "contracts/world" }',
    );
  });

  it("does not declare a named address that collides with the world dependency name", () => {
    const addresses = manifestOf(SNAPSHOT).split("[addresses]").at(1) ?? "";

    // Move.lock V4: "package 'starter_contract' has duplicate named address 'world'".
    expect(addresses).not.toMatch(/^\s*world\s*=/m);
    expect(addresses).toContain('builder_extensions = "0x0"');
    expect(addresses).toContain('starter_contract = "0x0"');
  });

  it("emits a compilable root module alongside the manifest", () => {
    const files = createSyntheticFiles(SNAPSHOT.sourceVersionTag, SNAPSHOT.repositoryUrl, SNAPSHOT.subdirectory);

    expect(Object.keys(files)).toContain("sources/starter_contract.move");
    expect(files["Move.toml"]).toContain('name = "starter_contract"');
  });

  it("resolves the synthetic root as a local package rather than a git root", () => {
    const request = createDependencyResolutionRequest(SNAPSHOT);

    // Describing the local root with the same git/rev/subdir as its own `world`
    // dependency yields "Dependency cycle detected: starter_contract -> starter_contract".
    expect(request).not.toHaveProperty("rootGit");
    expect(request.network).toBe("testnet");
    expect(request.files["Move.toml"]).toBe(manifestOf(SNAPSHOT));
  });

  it("carries each snapshot's own revision into its resolution request", () => {
    const other = createDependencyResolutionRequest({ ...SNAPSHOT, sourceVersionTag: "v0.0.18" });

    expect(other.files["Move.toml"]).toContain('rev = "v0.0.18"');
  });
});
