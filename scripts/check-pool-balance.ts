import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

// Load environment variables
dotenv.config();

const {
  VITE_SWAP_POOL_ID,
  VITE_TOKEN_DECIMALS,
} = process.env;

// Load Sui config
const homedir = process.env.HOME || process.env.USERPROFILE;
const suiConfig = YAML.parse(fs.readFileSync(path.join(homedir!, '.sui', 'sui_config', 'client.yaml'), 'utf-8'));

// Initialize Sui client
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

async function main() {
  try {
    console.log('Fetching pool balance...');

    // Fetch pool object
    const poolObject = await client.getObject({
      id: VITE_SWAP_POOL_ID!,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!poolObject.data?.content) {
      throw new Error('Failed to fetch pool data');
    }

    // Extract pool data from the content
    const content = poolObject.data.content;
    
    if (content.dataType !== 'moveObject') {
      throw new Error('Invalid pool object type');
    }

    console.log('Pool Object:', JSON.stringify(content.fields, null, 2));

    const fields = content.fields as {
      sui_reserve: string;
      aixcom_reserve: string;
      lp_supply: string;
      id: { id: string };
    };
    
    // Calculate actual balances considering decimals
    const suiBalance = Number(fields.sui_reserve) / 1e9;
    const aixcomBalance = Number(fields.aixcom_reserve) / Math.pow(10, Number(VITE_TOKEN_DECIMALS));
    const lpSupply = Number(fields.lp_supply) / 1e9; // Assuming LP tokens have 9 decimals

    console.log('\nPool Balance:');
    console.log('-------------');
    console.log(`SUI: ${suiBalance.toFixed(6)} SUI`);
    console.log(`AIXCOM: ${aixcomBalance.toFixed(6)} AIXCOM`);
    console.log(`LP Supply: ${lpSupply.toFixed(6)} LP`);
    
    console.log('\nPool Metrics:');
    console.log('-------------');
    if (suiBalance > 0 && aixcomBalance > 0) {
      console.log(`AIXCOM/SUI Price: ${(suiBalance / aixcomBalance).toFixed(6)}`);
      console.log(`SUI/AIXCOM Price: ${(aixcomBalance / suiBalance).toFixed(6)}`);
    } else {
      console.log('Pool is empty');
    }

  } catch (error) {
    console.error('Error fetching pool balance:', error);
    process.exit(1);
  }
}

main();
