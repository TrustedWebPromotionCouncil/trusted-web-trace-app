export type Extensible = Record<string, any>;

export interface DIDResolutionResult {
  didDocument: DIDDocument | null;
}

export interface DIDDocument {
  id: string;
  controller?: string | string[];
  verificationMethod?: VerificationMethod[];
}

interface JsonWebKey extends Extensible {
  alg?: string;
  crv?: string;
  e?: string;
  ext?: boolean;
  key_ops?: string[];
  kid?: string;
  kty: string;
  n?: string;
  use?: string;
  x?: string;
  y?: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyBase58?: string;
  publicKeyBase64?: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyHex?: string;
  publicKeyMultibase?: string;
  blockchainAccountId?: string;
  ethereumAddress?: string;
}
