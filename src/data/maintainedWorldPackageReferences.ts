export type MaintainedRemoteTargetId = "testnet:stillness" | "testnet:utopia";

export interface MaintainedWorldPackageReference {
  readonly targetId: MaintainedRemoteTargetId;
  readonly environmentLabel: string;
  readonly worldPackageId: string;
  readonly originalWorldPackageId: string;
  readonly objectRegistryId: string;
  readonly serverAddressRegistryId: string;
  readonly sourceVersionTag: string;
  readonly toolchainVersion: string;
  readonly publicationTransaction: string;
  readonly source: string;
  readonly lastVerifiedOn: string;
}

export const RESOURCE_SOURCE = "https://docs.evefrontier.com/tools/resources";
export const LAST_VERIFIED_ON = "2026-10-18";

/**
 * Authoritative checked-in remote bundles. Keep every field in each entry
 * synchronized as one reviewed, lineage-bound deployment reference.
 */
export const MAINTAINED_WORLD_PACKAGE_REFERENCES: readonly MaintainedWorldPackageReference[] = [
  {
    targetId: "testnet:stillness",
    environmentLabel: "Stillness",
    worldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
    originalWorldPackageId: "0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92",
    objectRegistryId: "0x8fd47e6e5cf8cb9b789cef26fbb674be819d8abd6afccaf50e95451212f0813a",
    serverAddressRegistryId: "0xebd994c8fc605a0c5c6c2f5d652822c080f3dbc50b9f21a25c7797751a92cba0",
    sourceVersionTag: "d3c7016b48a796ee70ecff7b892316f2d0170282",
    toolchainVersion: "1.78.0",
    publicationTransaction: "GE8CbdfGtBBeZRJrg8QSWSyuNi2YnRaz6pQr8AAjn4RL",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
  {
    targetId: "testnet:utopia",
    environmentLabel: "Utopia",
    worldPackageId: "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230",
    originalWorldPackageId: "0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230",
    objectRegistryId: "0xf37ce91dc59ed7fa5f036e50b65ec99681c36c3e35e89ce5135a77cf116c159d",
    serverAddressRegistryId: "0xe3a45eef54bd74a63aeb88ceaaf3d0a37383fd583a35616a77180f1a1cf378d5",
    sourceVersionTag: "d3c7016b48a796ee70ecff7b892316f2d0170282",
    toolchainVersion: "1.78.0",
    publicationTransaction: "8QZfYuNqeVXGzqxC8XZ5Z6GeWnQgSuEGTopRESHRNvo2",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
];

export const MAINTAINED_REMOTE_TARGET_IDS: readonly MaintainedRemoteTargetId[] = MAINTAINED_WORLD_PACKAGE_REFERENCES.map(
  ({ targetId }) => targetId,
);
