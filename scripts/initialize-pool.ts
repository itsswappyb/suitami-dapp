// import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromB64 } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
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

    // First, mint AIXCOM tokens
    // const mintTx = new TransactionBlock();
    const mintTx = new Transaction();
    const mintAmount = 1000 * Math.pow(10, Number(VITE_TOKEN_DECIMALS)); // Mint 1000 AIXCOM tokens

    console.log('Minting AIXCOM tokens...');
    mintTx.moveCall({
      target: `${VITE_AIXCOM_PACKAGE_ID}::aixcom::mint`,
      arguments: [
        mintTx.object(VITE_AIXCOM_TREASURY_CAP!),
        mintTx.pure.u64(mintAmount),
        mintTx.pure.address(keypair.toSuiAddress()),
      ],
    });

    // Execute mint transaction
    const mintResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: mintTx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log('Mint transaction successful:', mintResult.digest);

    console.log('Mint transaction effects:', JSON.stringify(mintResult.effects, null, 2));

    // Get the minted coin from transaction effects
    const mintedCoinId = mintResult.effects?.created?.[0]?.reference?.objectId;
    if (!mintedCoinId) {
      throw new Error('Failed to get minted coin ID');
    }

    console.log('Found minted coin ID:', mintedCoinId);

    // Wait for a moment to ensure the minted coin is available
    console.log('Waiting for coin to be available...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the minted coin exists
    console.log('Verifying minted coin...');
    const mintedCoin = await client.getObject({
      id: mintedCoinId,
      options: { showContent: true },
    });

    console.log('Minted coin details:', JSON.stringify(mintedCoin, null, 2));

    if (!mintedCoin) {
      throw new Error('Failed to verify minted coin');
    }

    console.log('Minted coin verified:', mintedCoinId);
    console.log('Pool ID:', VITE_SWAP_POOL_ID);

    // Now add liquidity
    // const liquidityTx = new TransactionBlock();
    const liquidityTx = new Transaction();
    const suiAmount = 0.1 * 1e9; // 0.1 SUI
    console.log('SUI amount for liquidity:', suiAmount);

    const [suiCoin] = liquidityTx.splitCoins(liquidityTx.gas, [liquidityTx.pure.u64(suiAmount)]);

    console.log('Adding initial liquidity to pool...');
    liquidityTx.moveCall({
      target: `${VITE_AIXCOM_PACKAGE_ID}::swap::add_liquidity`,
      arguments: [
        liquidityTx.object(VITE_SWAP_POOL_ID!),
        suiCoin,
        liquidityTx.object(mintedCoinId),
      ],
    });

    console.log('Transaction prepared, executing...');

    // Execute liquidity transaction
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: liquidityTx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log('Transaction successful:', result.digest);
    console.log('Pool initialization complete!');

  } catch (error) {
    console.error('Error initializing pool:', error);
    process.exit(1);
  }
}

main();
