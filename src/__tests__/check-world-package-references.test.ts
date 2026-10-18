import { describe, expect, it, vi } from "vitest";
import { resolve as resolvePath } from "node:path";

import { runValidation, type FetchClient } from "../../scripts/check-world-package-references";

const REPO_ROOT = resolvePath(import.meta.dirname, "..", "..");

function createManifestResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

function isSuiTestnetGraphQlEndpoint(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "https:"
    && url.hostname === "graphql.testnet.sui.io"
    && url.pathname === "/graphql";
}

const COHERENT_MANIFEST = `
[published.testnet_stillness]
published-at = "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92"
original-id = "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92"
toolchain-version = "1.78.0"

[published.testnet_utopia]
published-at = "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230"
original-id = "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230"
toolchain-version = "1.78.0"
`;

/**
 * Track GraphQL queries to return appropriate responses per object.
 */
function createGraphQLHandler(): (body: string) => Response {
  const objectTypes: Record<string, string> = {
    // Stillness objects
    "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92":
      "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92::world::World",
    "0x8fd47e6e5cf8cb9b789cef26fbb674be819d8abd6afccaf50e95451212f0813a":
      "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92::object_registry::ObjectRegistry",
    "0xebd994c8fc605a0c5c6c2f5d652822c080f3dbc50b9f21a25c7797751a92cba0":
      "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92::access::ServerAddressRegistry",
    // Utopia objects
    "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230":
      "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230::world::World",
    "0xf37ce91dc59ed7fa5f036e50b65ec99681c36c3e35e89ce5135a77cf116c159d":
      "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230::object_registry::ObjectRegistry",
    "0xe3a45eef54bd74a63aeb88ceaaf3d0a37383fd583a35616a77180f1a1cf378d5":
      "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230::access::ServerAddressRegistry",
  };

  const packageIds = new Set([
    "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
    "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230",
  ]);
  const publicationTransactions: Record<string, { originalPackageId: string; registries: readonly [string, string][] }> = {
    "GE8CbdfGtBBeZRJrg8QSWSyuNi2YnRaz6pQr8AAjn4RL": {
      originalPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
      registries: [
        ["0x8fd47e6e5cf8cb9b789cef26fbb674be819d8abd6afccaf50e95451212f0813a", objectTypes["0x8fd47e6e5cf8cb9b789cef26fbb674be819d8abd6afccaf50e95451212f0813a"]],
        ["0xebd994c8fc605a0c5c6c2f5d652822c080f3dbc50b9f21a25c7797751a92cba0", objectTypes["0xebd994c8fc605a0c5c6c2f5d652822c080f3dbc50b9f21a25c7797751a92cba0"]],
      ],
    },
    "8QZfYuNqeVXGzqxC8XZ5Z6GeWnQgSuEGTopRESHRNvo2": {
      originalPackageId: "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230",
      registries: [
        ["0xf37ce91dc59ed7fa5f036e50b65ec99681c36c3e35e89ce5135a77cf116c159d", objectTypes["0xf37ce91dc59ed7fa5f036e50b65ec99681c36c3e35e89ce5135a77cf116c159d"]],
        ["0xe3a45eef54bd74a63aeb88ceaaf3d0a37383fd583a35616a77180f1a1cf378d5", objectTypes["0xe3a45eef54bd74a63aeb88ceaaf3d0a37383fd583a35616a77180f1a1cf378d5"]],
      ],
    },
  };

  return (body: string) => {
    const parsed = JSON.parse(body) as { query?: string; variables?: Record<string, unknown> };
    const objectId = parsed.variables?.id as string | undefined;
    const digest = parsed.variables?.digest as string | undefined;

    if (digest !== undefined && digest in publicationTransactions) {
      const publication = publicationTransactions[digest];
      return new Response(JSON.stringify({
        data: {
          transaction: {
            digest,
            effects: {
              objectChanges: {
                nodes: [
                  { address: publication.originalPackageId, idCreated: true, outputState: { asMovePackage: { address: publication.originalPackageId }, asMoveObject: null } },
                  ...publication.registries.map(([address, type]) => ({ address, idCreated: true, outputState: { asMovePackage: null, asMoveObject: { contents: { type: { repr: type } } } } })),
                ],
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (objectId !== undefined && objectId in objectTypes) {
      return new Response(JSON.stringify({
        data: {
          object: {
            address: objectId,
            asMovePackage: packageIds.has(objectId) ? { address: objectId } : null,
            asMoveObject: {
              contents: {
                type: { repr: objectTypes[objectId] },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ data: { object: null } }), { status: 200, headers: { "content-type": "application/json" } });
  };
}

function createCoherentFetchClient(): FetchClient {
  const graphqlHandler = createGraphQLHandler();

  return {
    fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Current manifest (main branch)
      if (url.includes("/main/contracts/world/Published.toml")) {
        return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
      }

      // Pinned-revision manifest: both targets pin the same commit
      if (url.includes("/d3c7016b48a796ee70ecff7b892316f2d0170282/contracts/world/Published.toml")) {
        return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
      }

      // GraphQL
      if (url === "https://graphql.testnet.sui.io/graphql") {
        const body = typeof init?.body === "string" ? init.body : "";
        return Promise.resolve(graphqlHandler(body));
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }),
  };
}

describe("check-world-package-references", () => {
  describe("coherent targets (all layers agree)", () => {
    it("passes all checks when manifest, tags, cache, and on-chain data agree", async () => {
      const client = createCoherentFetchClient();
      const output = await runValidation({ client, repoRoot: REPO_ROOT });

      expect(output.allPassed).toBe(true);
      expect(output.targetSummaries.every((t) => t.passed)).toBe(true);

      for (const summary of output.targetSummaries) {
        expect(summary.resolvedUpstreamRevision).toBeDefined();
      }
    });
  });

  describe("manifest drift", () => {
    it("fails when current manifest has different published-at", async () => {
      const graphqlHandler = createGraphQLHandler();
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml")) {
            const drifted = COHERENT_MANIFEST.replace(
              "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
              "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            );
            return Promise.resolve(createManifestResponse(drifted));
          }

          if (url.includes("/d3c7016b48a796ee70ecff7b892316f2d0170282/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }
          if (isSuiTestnetGraphQlEndpoint(url)) {
            const body = typeof init?.body === "string" ? init.body : "";
            return Promise.resolve(graphqlHandler(body));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      const manifestResult = output.results.find(
        (r) => r.layer === "current-manifest" && r.targetId === "testnet:stillness" && !r.passed,
      );
      expect(manifestResult).toBeDefined();
      expect(manifestResult?.message).toContain("drifted");
    });
  });

  describe("source drift", () => {
    it("fails when pinned source tag has different identity", async () => {
      const graphqlHandler = createGraphQLHandler();
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }

          // Source tag returns different published-at for Stillness
          if (url.includes("/d3c7016b48a796ee70ecff7b892316f2d0170282/contracts/world/Published.toml")) {
            const drifted = COHERENT_MANIFEST.replace(
              "published-at = \"0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92\"",
              "published-at = \"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef\"",
            );
            return Promise.resolve(createManifestResponse(drifted));
          }

          if (url.includes("/d3c7016b48a796ee70ecff7b892316f2d0170282/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }

          if (isSuiTestnetGraphQlEndpoint(url)) {
            const body = typeof init?.body === "string" ? init.body : "";
            return Promise.resolve(graphqlHandler(body));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      const sourceResult = output.results.find(
        (r) => r.layer === "source-tag" && r.targetId === "testnet:stillness" && !r.passed,
      );
      expect(sourceResult).toBeDefined();
      expect(sourceResult?.message).toContain("identity mismatch");
    });
  });

  describe("cache drift", () => {
    it("verifies cache layer runs for each target", async () => {
      const client = createCoherentFetchClient();
      const output = await runValidation({ client, repoRoot: REPO_ROOT });

      const cacheResults = output.results.filter((r) => r.layer === "deploy-cache");
      expect(cacheResults.length).toBe(2);
      expect(cacheResults.every((r) => r.passed)).toBe(true);
    });
  });

  describe("mixed-lineage registries", () => {
    it("fails when registry type is not rooted at originalWorldPackageId", async () => {
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }
          if (url.includes("/d3c7016b48a796ee70ecff7b892316f2d0170282/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }

          if (isSuiTestnetGraphQlEndpoint(url)) {
            const body = typeof init?.body === "string" ? JSON.parse(init.body) as { variables?: { id?: string } } : {};
            const objectId = body.variables?.id ?? "0x0";
            return Promise.resolve(new Response(JSON.stringify({
              data: {
                object: {
                  address: objectId,
                  asMovePackage: { address: objectId },
                  asMoveObject: {
                    contents: {
                      type: {
                        repr: "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230::object_registry::ObjectRegistry",
                      },
                    },
                  },
                },
              },
            }), { status: 200, headers: { "content-type": "application/json" } }));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });

      // Stillness should fail because the registry type is rooted at Utopia's original ID
      const stillnessOnChain = output.results.find(
        (r) => r.targetId === "testnet:stillness" && r.layer === "on-chain" && !r.passed,
      );
      expect(stillnessOnChain).toBeDefined();
      expect(stillnessOnChain?.message).toContain("did not equal expected");
    });
  });

  describe("malformed responses", () => {
    it("fails when GraphQL returns null data", async () => {
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml") || url.includes("/d3c7016b48a796ee70ecff7b892316f2d0170282/")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }
          if (isSuiTestnetGraphQlEndpoint(url)) {
            return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      const onChainFails = output.results.filter(
        (r) => r.layer === "on-chain" && !r.passed,
      );
      expect(onChainFails.length).toBeGreaterThan(0);
    });
  });

  describe("exhausted endpoint retries", () => {
    it("fails with unreachable diagnostics when all retries fail", async () => {
      const client: FetchClient = {
        fetch: vi.fn(() => Promise.reject(new Error("Network error"))),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      // All layers should have reported unreachable/network errors
      const unreachableResults = output.results.filter(
        (r) => !r.passed && (r.message.includes("Unreachable") || r.message.includes("Network error") || r.message.includes("Exhausted") || r.message.includes("Failed to")),
      );
      expect(unreachableResults.length).toBeGreaterThan(0);
    }, 30_000);
  });
});
