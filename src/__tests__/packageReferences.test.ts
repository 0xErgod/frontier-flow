import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMoveBuilderGitHubAccessTokenProvider } from "../compiler/moveBuilderLite";
import { getLocalDeploymentEnvironmentLabel, saveLocalEnvironmentConfig } from "../data/localEnvironment";

import {
  PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
  WORLD_PACKAGE_OVERRIDE_STORAGE_KEY,
  computeManifestFreshness,
  getPackageReferenceBundle,
  getPackageReferenceBundleMap,
  parsePublishedWorldPackageManifest,
  refreshPublishedWorldPackageManifest,
  shouldRefreshPublishedWorldPackageManifest,
  verifyPublishedWorldPackageExists,
} from "../data/packageReferences";

describe("packageReferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMoveBuilderGitHubAccessTokenProvider(null);
  });

  afterEach(() => {
    window.localStorage.clear();
    setMoveBuilderGitHubAccessTokenProvider(null);
  });

  it("parses stillness and utopia world package ids from Published.toml", () => {
    expect(parsePublishedWorldPackageManifest(`
[published.testnet_stillness]
published-at = "0x111"
original-id = "0x222"
toolchain-version = "1.70.0"

[published.testnet_utopia]
published-at = "0x333"
original-id = "0x444"
toolchain-version = "1.68.0"
`)).toEqual({
  "testnet:stillness": {
    worldPackageId: "0x111",
    originalWorldPackageId: "0x222",
    toolchainVersion: "1.70.0",
  },
  "testnet:utopia": {
    worldPackageId: "0x333",
    originalWorldPackageId: "0x444",
    toolchainVersion: "1.68.0",
  },
    });
  });

  it("returns strict observed metadata without applying overrides to the resolved bundle", async () => {
    const fetchFn: typeof fetch = (_input) => {
      return Promise.resolve(new Response(`
[published.testnet_stillness]
published-at = "0xaaa"
original-id = "0xbbb"
    toolchain-version = "1.70.0"

[published.testnet_utopia]
published-at = "0xccc"
original-id = "0xddd"
    toolchain-version = "1.68.1"
`, { status: 200, headers: { "content-type": "text/plain" } }));
    };

    const observed = await refreshPublishedWorldPackageManifest({ fetchFn, storage: window.localStorage });

    // Observation is returned for drift detection.
    expect(observed["testnet:stillness"]?.worldPackageId).toBe("0xaaa");
    expect(observed["testnet:utopia"]?.worldPackageId).toBe("0xccc");

    // The active bundle is NOT modified by the observation.
    expect(getPackageReferenceBundle("testnet:stillness").worldPackageId).toBe(
      "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
    );
    expect(getPackageReferenceBundle("testnet:stillness").toolchainVersion).toBe("1.78.0");
    expect(getPackageReferenceBundle("testnet:utopia").toolchainVersion).toBe("1.78.0");

    // No stored overrides are written.
    expect(window.localStorage.getItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY)).toBeNull();
  });

  it("rejects malformed manifest observations", async () => {
    await expect(refreshPublishedWorldPackageManifest({
      fetchFn: () => Promise.resolve(new Response(`
[published.testnet_stillness]
published-at = "0xaaa"
published-at = "0xbbb"
original-id = "0xccc"
toolchain-version = "1.70.0"

[published.testnet_utopia]
published-at = "0xddd"
original-id = "0xeee"
toolchain-version = "1.68.0"
`, { status: 200 })),
    })).rejects.toThrow("Duplicate key");
  });

  it("uses the signed-in GitHub token when refreshing the published manifest from raw GitHub", async () => {
    setMoveBuilderGitHubAccessTokenProvider(() => "test-token");

    const fetchFn: typeof fetch = (input, init) => {
      const requestedUrl = input instanceof URL ? input.href : typeof input === "string" ? input : input.url;

      expect(requestedUrl).toBe("https://api.github.com/repos/evefrontier/world-contracts/contents/contracts/world/Published.toml?ref=main");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
      expect(new Headers(init?.headers).get("Accept")).toBe("application/vnd.github.raw");

      return Promise.resolve(new Response(`
[published.testnet_stillness]
published-at = "0xaaa"
original-id = "0xbbb"
toolchain-version = "1.70.0"

[published.testnet_utopia]
published-at = "0xccc"
original-id = "0xddd"
toolchain-version = "1.68.0"
`, { status: 200, headers: { "content-type": "text/plain" } }));
    };

    const observed = await refreshPublishedWorldPackageManifest({ fetchFn, storage: window.localStorage });
    expect(observed["testnet:stillness"]?.worldPackageId).toBe("0xaaa");
    expect(observed["testnet:utopia"]?.worldPackageId).toBe("0xccc");
  });

  it("exposes deploy-grade source metadata for each supported target", () => {
    expect(getPackageReferenceBundle("local")).toMatchObject({
      environmentLabel: getLocalDeploymentEnvironmentLabel(),
      originalWorldPackageId: "0xcf6b5da20b0c6540895b79b91580ec0734fcfa4298848f0e8382ef217965bfd5",
      sourceVersionTag: "v0.0.18",
      toolchainVersion: "1.67.1",
    });
    expect(getPackageReferenceBundle("testnet:stillness")).toMatchObject({
      originalWorldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
      worldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
      objectRegistryId: "0x8fd47e6e5cf8cb9b789cef26fbb674be819d8abd6afccaf50e95451212f0813a",
      serverAddressRegistryId: "0xebd994c8fc605a0c5c6c2f5d652822c080f3dbc50b9f21a25c7797751a92cba0",
      sourceVersionTag: "d3c7016b48a796ee70ecff7b892316f2d0170282",
      toolchainVersion: "1.78.0",
    });
    expect(getPackageReferenceBundle("testnet:utopia")).toMatchObject({
      originalWorldPackageId: "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230",
      sourceVersionTag: "d3c7016b48a796ee70ecff7b892316f2d0170282",
      toolchainVersion: "1.78.0",
    });
  });

  it("applies saved local environment overrides to the local bundle", () => {
    saveLocalEnvironmentConfig(window.localStorage, {
      rpcUrl: "http://localhost:9000",
      graphQlUrl: "http://localhost:9125/graphql",
      worldPackageId: "0xabc123",
      worldPackageVersion: "0.0.21",
      useEphemeralKeypair: true,
    });

    expect(getPackageReferenceBundle("local")).toMatchObject({
      environmentLabel: getLocalDeploymentEnvironmentLabel({
        version: 1,
        rpcUrl: "http://localhost:9000",
        graphQlUrl: "http://localhost:9125/graphql",
        worldPackageId: "0xabc123",
        worldPackageVersion: "0.0.21",
        useEphemeralKeypair: true,
        updatedAt: "2026-03-26T00:00:00.000Z",
      }),
      worldPackageId: "0xabc123",
      originalWorldPackageId: "0xabc123",
      sourceVersionTag: "v0.0.21",
      source: "http://localhost:9125/graphql",
    });
  });

  it("does not apply legacy stored overrides to remote bundles", () => {
    // Write a legacy version-3 override that differs from the checked-in bundle.
    window.localStorage.setItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY, JSON.stringify({
      version: 3,
      lastVerifiedOn: new Date().toISOString().slice(0, 10),
      source: PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
      targets: {
        "testnet:stillness": {
          worldPackageId: "0xaaa",
          originalWorldPackageId: "0xbbb",
          toolchainVersion: "1.70.0",
        },
      },
    }));

    // The active bundle must remain the checked-in value, not the stored override.
    expect(getPackageReferenceBundle("testnet:stillness").worldPackageId).toBe(
      "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
    );
  });

  it("returns the cached bundle map across calls (remote bundles are stable)", async () => {
    const initialMap = getPackageReferenceBundleMap();
    expect(getPackageReferenceBundleMap()).toBe(initialMap);

    // Refreshing the manifest does NOT change the cached bundle map.
    await refreshPublishedWorldPackageManifest({
      fetchFn: () => Promise.resolve(new Response(`
[published.testnet_stillness]
published-at = "0xaaa"
original-id = "0xbbb"
toolchain-version = "1.70.0"

[published.testnet_utopia]
published-at = "0xccc"
original-id = "0xddd"
toolchain-version = "1.68.1"
`, { status: 200, headers: { "content-type": "text/plain" } })),
      storage: window.localStorage,
    });

    expect(getPackageReferenceBundleMap()).toBe(initialMap);
  });

  it("always recommends a manifest refresh (no stored-state short-circuit)", () => {
    // Without stored overrides
    expect(shouldRefreshPublishedWorldPackageManifest(window.localStorage)).toBe(true);

    // With stored overrides from today
    window.localStorage.setItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY, JSON.stringify({
      version: 3,
      lastVerifiedOn: new Date().toISOString().slice(0, 10),
      source: PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
      targets: {},
    }));
    expect(shouldRefreshPublishedWorldPackageManifest(window.localStorage)).toBe(true);
  });

  it("treats RPC object-error payloads as missing published world packages", async () => {
    const client = {
      getObject: vi.fn(() => Promise.resolve({
        error: {
          code: "notExists",
        },
      })),
    };

    await expect(verifyPublishedWorldPackageExists("testnet:stillness", client)).resolves.toBe(false);
    expect(client.getObject).toHaveBeenCalledTimes(1);
  });

  describe("manifest freshness outcomes", () => {
    it("returns matched when observation matches checked-in bundle", () => {
      const observation = {
        worldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
        originalWorldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
        toolchainVersion: "1.78.0",
      };

      const outcome = computeManifestFreshness("testnet:stillness", observation);
      expect(outcome.status).toBe("matched");
    });

    it("returns stale when published-at differs from checked-in bundle", () => {
      const observation = {
        worldPackageId: "0xdeadbeef",
        originalWorldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
        toolchainVersion: "1.78.0",
      };

      const outcome = computeManifestFreshness("testnet:stillness", observation);
      expect(outcome.status).toBe("stale");
      if (outcome.status === "stale") {
        expect(outcome.driftedFields.length).toBeGreaterThan(0);
        expect(outcome.driftedFields[0].field).toBe("published-at");
      }
    });

    it("returns stale when toolchain-version differs", () => {
      const observation = {
        worldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
        originalWorldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
        toolchainVersion: "1.80.0",
      };

      const outcome = computeManifestFreshness("testnet:stillness", observation);
      expect(outcome.status).toBe("stale");
    });

    it("returns unavailable when observation is missing", () => {
      const outcome = computeManifestFreshness("testnet:stillness", undefined);
      expect(outcome.status).toBe("unavailable");
    });
  });
});
