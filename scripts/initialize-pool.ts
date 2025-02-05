import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { fromB64 } from '@mysten/sui.js/utils';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

// Load environment variables
dotenv.config();

const {
  VITE_AIXCOM_PACKAGE_ID,
  VITE_AIXCOM_TREASURY_CAP,
  VITE_SWAP_POOL_ID,
  VITE_WALLET_ADDRESS,
  VITE_TOKEN_DECIMALS,
} = process.env;

// Load keypair from Sui config
// Load Sui config
const homedir = process.env.HOME || process.env.USERPROFILE;
const configPath = path.join(homedir!, '.sui', 'sui_config', 'client.yaml');
const suiConfig = YAML.parse(fs.readFileSync(configPath, 'utf-8'));

// Get the active address
const activeAddress = suiConfig.active_address;

// Load keystore
const keystorePath = suiConfig.keystore.File;
const keystoreContent = fs.readFileSync(keystorePath, 'utf-8');

// Parse the keystore content (removing any trailing characters)
const cleanKeystoreContent = keystoreContent.replace(/[^\[\]"\,\s\w\+\/\=]/g, '');
const keystore = JSON.parse(cleanKeystoreContent);

// For now, we'll use the first key in the keystore
if (!keystore[0]) {
  throw new Error('No keys found in Sui keystore');
}

// Create keypair from the first private key
const privateKeyBytes = fromB64(keystore[0]);
// Ed25519 private key is 32 bytes, remove the first byte if it's 33 bytes
const privateKey = privateKeyBytes.length === 33 ? privateKeyBytes.slice(1) : privateKeyBytes;
const keypair = Ed25519Keypair.fromSecretKey(privateKey);

// Initialize Sui client
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });


async function main() {
  try {
    console.log('Starting pool initialization...');

    // Create transaction block for minting AIXCOM tokens
    const mintTx = new TransactionBlock();
    const mintAmount = 1000000 * Math.pow(10, Number(VITE_TOKEN_DECIMALS)); // Mint 1M AIXCOM tokens

    // Mint AIXCOM tokens
    console.log('Minting AIXCOM tokens...');
    mintTx.moveCall({
      target: `${VITE_AIXCOM_PACKAGE_ID}::aixcom::mint`,
      arguments: [
        mintTx.object(VITE_AIXCOM_TREASURY_CAP!),
        mintTx.pure(mintAmount),
        mintTx.pure(VITE_WALLET_ADDRESS!),
      ],
    });

    // Execute mint transaction
    const mintResult = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: mintTx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log('Mint transaction successful:', mintResult.digest);

    // Get the minted coin from transaction effects
    const mintedCoinId = mintResult.effects?.created?.[0]?.reference?.objectId;
    if (!mintedCoinId) {
      throw new Error('Failed to get minted coin ID');
    }

    // Create transaction block for adding liquidity
    const liquidityTx = new TransactionBlock();
    // TODO: what should be the amount?
    const suiAmount = 0; //1 * 1e9; // 1 SUI
    const [coin] = liquidityTx.splitCoins(liquidityTx.gas, [liquidityTx.pure(suiAmount)]);

    // Add initial liquidity
    console.log('Adding initial liquidity to pool...');
    liquidityTx.moveCall({
      target: `${VITE_AIXCOM_PACKAGE_ID}::swap::add_liquidity`,
      arguments: [
        liquidityTx.object(VITE_SWAP_POOL_ID!),
        coin,
        liquidityTx.object(mintedCoinId),
      ],
    });

    // Execute liquidity transaction
    const liquidityResult = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: liquidityTx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log('Liquidity addition successful:', liquidityResult.digest);
    console.log('Pool initialization complete!');

  } catch (error) {
    console.error('Error initializing pool:', error);
    process.exit(1);
  }
}

main();
