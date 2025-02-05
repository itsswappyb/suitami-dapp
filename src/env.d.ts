/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AIXCOM_PACKAGE_ID: string;
  readonly VITE_AIXCOM_TREASURY_CAP: string;
  readonly VITE_AIXCOM_METADATA: string;
  readonly VITE_SWAP_POOL_ID: string;
  readonly VITE_WALLET_ADDRESS: string;
  readonly VITE_TOKEN_DECIMALS: string;
  readonly VITE_TOKENS_PER_SUI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
