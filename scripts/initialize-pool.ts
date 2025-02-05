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

// Try both keys to find the one matching our active address
let keypair: Ed25519Keypair | null = null;

for (const key of keystore) {
  try {
    const privateKeyBytes = fromB64(key);
    const privateKey = privateKeyBytes.length === 33 ? privateKeyBytes.slice(1) : privateKeyBytes;
    const kp = Ed25519Keypair.fromSecretKey(privateKey);
    if (kp.toSuiAddress() === activeAddress) {
      console.log('Found matching keypair for active address');
      keypair = kp;
      break;
    }
  } catch (error) {
    console.log('Error with key:', error);
  }
}

if (!keypair) {
  throw new Error('No matching keypair found for active address');
}

// Initialize Sui client
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });


async function main() {
  // Get available gas coins
  const { data: gasData } = await client.getCoins({
    owner: keypair.toSuiAddress(),
    coinType: '0x2::sui::SUI',
  });

  if (gasData.length === 0) {
    throw new Error('No SUI coins found in wallet');
  }

  const gasCoin = gasData[0].coinObjectId;
  try {
    console.log('Starting pool initialization...');

    // Create transaction block for minting AIXCOM tokens
    const mintTx = new TransactionBlock();
    const mintAmount = 1000 * Math.pow(10, Number(VITE_TOKEN_DECIMALS)); // Mint 1000 AIXCOM tokens

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
    const suiAmount = 0.1 * 1e9; // 0.1 SUI

    // Add initial liquidity
    console.log('Adding initial liquidity to pool...');
    liquidityTx.moveCall({
      target: `${VITE_AIXCOM_PACKAGE_ID}::swap::add_liquidity`,
      arguments: [
        liquidityTx.object(VITE_SWAP_POOL_ID!),
        liquidityTx.splitCoins(liquidityTx.gas, [liquidityTx.pure(suiAmount)])[0],
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
