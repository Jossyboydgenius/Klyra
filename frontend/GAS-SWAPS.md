Route	Description
Chains	Returns available chains
User	Returns a user's usage history
Deposit	Returns deposit status and associated outbound txs
Outbound	Returns outbound tx details and related deposit info
Search	Combined search endpoint for both /deposit and /outbound
Quote	Returns expected output from bridging
Quote Reverse	Returns required deposit amount for a given output
Call Data	Returns ready-to-use calldata for a given deposit and outbound chain


Chains
Including public chain details, this route also returns the current gas price, gas usage, and the total Gas.zip refueler balance on the chain.


https://backend.gas.zip/v2/chains
Schema

interface Chains {
  chains: [
    {
      name: string
      chain: number // native chain id
      short: number // unique Gas.zip id
      gas: string // gas usage of a simple transfer
      gwei: string // current gas price
      bal: string // balance of the Gas.zip reloader
      rpcs: string[]
      symbol: string
      price: number
    },
  ]
}


User
This route returns the Gas.Zip history of a given address.


https://backend.gas.zip/v2/user/<address>
Schema

type Status = 'SEEN' | 'PENDING' | 'CONFIRMED' | 'PRIORITY' | 'CANCELLED'
 
interface UserHistory {
  user: [
    {
      deposit: Deposit
      txs: Transaction[]
    },
  ]
}
 
interface Deposit {
  block: number
  chain: number
  hash: string
  log: number
  sender: string
  shorts: number[]
  status: Status
  time: number
  to: string
  usd: number
  value: string
}
 
interface Transaction {
  chain: number
  hash: string
  nonce: number
  refund: boolean
  cancelled: boolean
  signer: string
  status: Status
  time: number
  to: string
  usd: number
  value: number
}



Outbound
This route can be used to search for an outbound transaction (the inverse of the deposit hash route). It provides the live status and details of a given outbound transaction as well as its corresponding deposit details.


https://backend.gas.zip/v2/outbound/<hash>
Schema

type Status = 'SEEN' | 'PENDING' | 'CONFIRMED' | 'PRIORITY' | 'CANCELLED'
 
interface TransactionStatusData {
  deposit: Deposit
  txs: Transaction[]
}
 
interface Deposit {
  block: number
  chain: number
  hash: string
  log: number
  sender: string
  shorts: number[]
  status: Status
  time: number
  to: string
  usd: number
  value: string
}
 
interface Transaction {
  chain: number
  hash: string
  nonce: number
  refund: boolean
  cancelled: boolean
  signer: string
  status: Status
  time: number
  to: string
  usd: number
  value: number
}



Deposit
This route fetches the live status and details of a specific deposit transaction as well as corrosponding outbound transaction(s).


https://backend.gas.zip/v2/deposit/<hash>
Schema

type Status = 'SEEN' | 'PENDING' | 'CONFIRMED' | 'PRIORITY' | 'CANCELLED'
 
interface TransactionStatusData {
  deposit: Deposit
  txs: Transaction[]
}
 
interface Deposit {
  block: number
  chain: number
  hash: string
  log: number
  sender: string
  shorts: number[]
  status: Status
  time: number
  to: string
  usd: number
  value: string
}
 
interface Transaction {
  chain: number
  hash: string
  nonce: number
  refund: boolean
  cancelled: boolean
  signer: string
  status: Status
  time: number
  to: string
  usd: number
  value: number
}



Search
This route can be used to search for either an outbound transaction or a deposit transaction. It provides the live status and details of a given outbound transaction as well as its corresponding deposit details.


https://backend.gas.zip/v2/search/<hash>
Schema

type Status = 'SEEN' | 'PENDING' | 'CONFIRMED' | 'PRIORITY' | 'CANCELLED'
 
interface TransactionStatusData {
  deposit: Deposit
  txs: Transaction[]
}
 
interface Deposit {
  block: number
  chain: number
  hash: string
  log: number
  sender: string
  shorts: number[]
  status: Status
  time: number
  to: string
  usd: number
  value: string
}
 
interface Transaction {
  chain: number
  hash: string
  nonce: number
  refund: boolean
  cancelled: boolean
  signer: string
  status: Status
  time: number
  to: string
  usd: number
  value: number
}



Quote
This route gives a live quote returning the amount received on the given outbound chains.


https://backend.gas.zip/v2/quotes/<deposit_chain>/<deposit_wei>/<outbound_chains>
All chain IDs on this route use the native chain ID, not the Gas.zip ID.

The outbound chains parameter is a comma separated string

Ex: /quotes/1/74176868561679620/7777777,81457,3776,666666666

Add 'from' and 'to' parameters for calldata generation and guaranteed output for 60s.

Ex: /quotes/1/10000000000000000/8453?from=0xabcd&to=0xabcd

Schema

interface Quote {
  quotes: [
      {
        chain: number
        expected: number // estimated output in wei
        gas: number // estimated gas cost in wei
        speed: number // estimated time (s) to inclusion
        usd: number
      }
    | {
        chain: number
        error: string
      },
  ],
  error: string,
  calldata: string, // constructed data for Direct Deposit
  expires: number // time the quote is no longer guaranteed after
}



Quote
This route gives a live quote returning the deposit amount required to receive a given output.


https://backend.gas.zip/v2/quoteReverse/<deposit_chain>/<outbound_wei>/<outbound_chain>
All chain IDs on this route use the native chain ID, not the Gas.zip ID.

Schema

interface Quote {
    {
      chain: number
      required: number // estimated required deposit amount in wei
      gas: number // estimated gas cost in wei
      speed: number // estimated time (s) to inclusion
      usd: number
    }
}


Calldata Builder
This route extends the quote endpoint to provide ready-to-use calldata for your transaction. The calldata is formatted as a hex string, which can be used directly in your transaction without additional encoding.

Warning: This Calldata Builder only works for the EVM v2 Direct Deposit method. For EVM Contract Deposit, see the Contract Deposit methods. For Solana deposit, see the Solana Deposit method.


https://backend.gas.zip/v2/quotes/<deposit_chain>/<deposit_wei>/<outbound_chains>?to=<address>&from=<address>
Parameters
deposit_chain: The native chain ID of the deposit
deposit_wei: The amount of native currency to deposit in wei
to: The destination address that will receive the bridged funds
outbound_chains: Comma-separated list of native chain IDs (e.g., [42161,10] for Arbitrum and Optimism)
from: (Optional) The deposit address sending the transaction
If targeting the same outbound address as the deposit address, the from parameter is recommended to save on gas fees via calldata construction

Example request with a single outbound chain:


https://backend.gas.zip/v2/quotes/1/600000000000000/42161?to=0x7Ed2A81B7054Dc5D393234B7a3A33B9ba125cAc9&from=0x7Ed2A81B7054Dc5D393234B7a3A33B9ba125cAc9
Example request with multiple outbound chains:


https://backend.gas.zip/v2/quotes/1/11000000000000000/42161,10?to=0x7Ed2A81B7054Dc5D393234B7a3A33B9ba125cAc9&from=0x7Ed2A81B7054Dc5D393234B7a3A33B9ba125cAc9
Response

interface CalldataQuoteResponse {
  calldata: string
  quotes: {
    chain: number
    expected: string
    gas: string
    speed: number
    usd: number
  }[]
}
Example Response (Single Outbound):

{
  "calldata": "0x010039",
  "quotes": [
    {
      "chain": 42161,
      "expected": "599131010000000",
      "gas": "868990000000",
      "speed": 7,
      "usd": 2.078004
    }
  ]
}
Example Response with Multiple Outbounds:

{
  "calldata": "0x027Ed2A81B7054Dc5D393234B7a3A33B9ba125cAc900390037",
  "quotes": [
    {
      "chain": 42161,
      "expected": "5498052599999999",
      "gas": "847400000000",
      "speed": 7,
      "usd": 19.008707498
    },
    {
      "chain": 10,
      "expected": "5498878990738999",
      "gas": "21009261000",
      "speed": 8,
      "usd": 19.008707498
    }
  ]
}



Code Example for Direct Deposit
Below are example implementations for setting up and executing deposits into the Gas.zip V2 Direct Deposit address.

Using the Direct Deposit method must include calldata defining the output chains. Use the example code for an up-to-date spec of how to format the calldata. You can use the Calldata API to generate the calldata for you, or you can manually create the calldata. It is recommended to use the API for most use cases.

For a list of all supported chains for Direct Deposit, please refer to the Direct Deposit Supported Chains section.

Deposits using this method MUST be a high-level transaction sending directly to the Direct Deposit address. For integrators looking to deposit with a low-level call, please use the Contract Deposit

If you use the Calldata API, you can ignore this section.

The first byte of calldata defines how the 'to' address will be parsed. Only one address type can be used per transaction:

01: Send to msg.sender
02: Send to the next 20 bytes as an EVM address
03: Send to the next 32 bytes as a SVM (Solana/Eclipse etc) address / Tron address
04: Send to the next 32 bytes as a MOVE/FUEL address
05: Send to XRP address (decoded from Base58)
06: Send to Initia address (decoded from Bech32)
Address Format Detection:

EVM addresses: 42 characters (0x prefix + 40 hex chars)
SVM addresses: Base58 string that decodes to 32 bytes and validates on curve
MOVE/FUEL addresses: 66 characters (0x prefix + 64 hex chars)
Tron addresses: Base58 string that decodes to a specific format
XRP addresses: Base58 string starting with 'r' followed by 24-34 alphanumeric characters
Initia addresses: Bech32 string starting with 'init' followed by 39 alphanumeric characters
Example:

0x010039 - Send to msg.sender on Arbitrum

viem (with Calldata API)
viem (with manual Calldata)
python

import { parseEther, http, createWalletClient, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { optimism } from 'viem/chains'
 
const DIRECT_DEPOSIT_ADDRESS = '0x391E7C679d29bD940d63be94AD22A25d25b5A604'
 
// Create a wallet from a private key
const account = privateKeyToAccount('0x...')
 
// Connect the wallet to a provider
const client = createWalletClient({
  account,
  chain: optimism,
  transport: http(),
}).extend(publicActions)
 
// Replace with the destination address.
const toAddress = account.address
 
const amount: bigint = parseEther('0.0006')
const outboundChains = [42161, 10] // Arbitrum (42161), Optimism (10) - These are native chain IDs
 
async function getCalldata({
  fromAddress,
  toAddress,
  amount,
  chainIds,
}: {
  fromAddress: string
  toAddress: string
  amount: bigint
  chainIds: number[]
}) {
  const chainIdsStr = chainIds.join(',')
  // For CallData API documentation, see: https://docs.gas.zip/gas/api/calldata
  const url = `https://backend.gas.zip/v2/quotes/${optimism.id}/${amount}/${chainIdsStr}?from=${fromAddress}&to=${toAddress}`
 
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch calldata')
 
  const data = await response.json()
  return data.calldata
}
 
;(async () => {
  const txData = await getCalldata({
    fromAddress: account.address,
    toAddress,
    amount,
    chainIds: outboundChains,
  })
 
  const hash = await client.sendTransaction({
    to: DIRECT_DEPOSIT_ADDRESS,
    value: amount,
    data: txData,
  })
 
  console.log('Transaction hash:', hash)
})()


Code Example for Contract Deposit
This section provides example implementations for calling the deposit() function on the v1 Deposit Contracts.

The Contract Deposit method is maintained for existing integrations, but new implementations should use the Direct Deposit method.

The Direct Deposit method offers improved simplicity and efficiency. Only use this Contract Deposit method if you specifically require low-level call functionality.

Supported Chains and Contract Addresses
For a comprehensive list of all supported chains and their respective contract addresses for v1 contract deposits, please refer to the Contract Deposit Supported Chains section.

Implementation Examples
The following code snippets demonstrate how to interact with the deposit() function across various programming languages and libraries:

viem
ethers
python
depositABI.ts

import { parseEther, http, createWalletClient, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { optimism } from 'viem/chains'
import { depositABI } from './depositABI'
 
// Create a wallet from a private key
const account = privateKeyToAccount('0x...')
 
// Connect the wallet to a provider
const client = createWalletClient({
  account,
  chain: optimism, // Target Chain
  transport: http(),
}).extend(publicActions)
 
// Replace with address you want to send funds to
const toAddress = account.address
 
// Each chain will receive an equal portion of the value sent
const amount: bigint = parseEther('0.0006')
 
// This example is targeting zkSync (51), Polygon zkEVM (52) - These are Gas.zip short chain IDs
const gasZipShortChainIDs = [51, 52]
 
// Prepare targeted chains parameter for deposit()
const chainsBN = gasZipShortChainIDs.reduce((p, c) => (p << BigInt(8)) + BigInt(c), BigInt(0))
 
;(async () => {
  // Prepare the contract write configuration
  const { request } = await client.simulateContract({
    address: '0x9e22ebec84c7e4c4bd6d4ae7ff6f4d436d6d8390', // Targeting Gas.zip Optimism Contract
    abi: depositABI,
    functionName: 'deposit',
    value: amount,
    args: [chainsBN, toAddress],
  })
 
  // Call the deposit() function
  await client.writeContract(request)
})()



Code Example for Solana Deposit
Below are example implementations for setting up and executing deposits into the Gas.zip Solana deposit program.

Deposits using the Solana method must include instruction data defining the output chains and destination address. Use the example code for an up-to-date spec of how to format the instruction data.

The instruction data format consists of:

Program discriminator (8 bytes)
Value in lamports (u64)
Array of destination chain IDs (vec<u16>)
Destination address (32 bytes)
The destination address handling:

EVM addresses: 20 bytes padded with leading zeros to 32 bytes
Solana addresses:
Regular addresses: Decoded from base58 to 32 bytes
Program Derived Addresses (PDAs): First byte removed, last 8 bytes (bump seed) removed, padded if needed
Currently supported VM types for destination chains include: EVM, Solana, Fuel, Tron, Sui, and Aptos. Other VM types (Initia, XRP, etc.) are not supported at this time.

typescript
python

import { TransactionInstruction, PublicKey, Transaction, Connection } from '@solana/web3.js'
import { serialize, field, vec, fixedArray } from '@dao-xyz/borsh'
import bs58 from 'bs58'
 
// Constants
const PROGRAM_ID = new PublicKey('FzuVV5WeLyWHDuX6SPbeLgqkvePDTzMCRKYAhDbiP3z3')
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')
const GAS_RECIPIENT = new PublicKey('gasZT2bpe7mxu5wMgQbvry84vok5CuF2huCEokyC3qh')
const PROGRAM_DISCRIMINATOR = [242, 35, 198, 137, 82, 225, 242, 182]
 
class DepositArgs {
  @field({ type: 'u64' })
  value: bigint
 
  @field({ type: vec('u16') })
  chains: number[]
 
  @field({ type: fixedArray('u8', 32) })
  to: number[]
 
  constructor(value: bigint, chains: number[], to: number[]) {
    this.value = value
    this.chains = chains
    this.to = to
  }
}
 
interface CreateDepositTransactionParams {
  connection: Connection
  payer: PublicKey
  value: bigint
  destinationChains: number[]
  destinationAddress: string
}
 
function addressToBytes(address: string): number[] {
  // Handle Solana addresses
  if (new RegExp(/^[1-9A-HJ-NP-Za-km-z]{32,44}/).test(address)) {
    const decoded = bs58.decode(address)
    const hexaddr = Buffer.from(decoded).toString('hex')
 
    // If the address is already 32 bytes (64 hex chars), convert directly
    if (hexaddr.length === 64) return addressToBytes(`0x${hexaddr}`)
 
    // Otherwise, handle as a program derived address
    const rawAddr = Buffer.from(bs58.decode(address).subarray(1)).toString('hex')
    return addressToBytes(`0x${rawAddr.substring(0, rawAddr.length - 8)}`)
  }
 
  // Handle EVM addresses
  const arr: number[] = []
  let cleanAddress = address.slice(2).padStart(64, '0')
 
  while (cleanAddress !== '') {
    arr.push(Number(`0x${cleanAddress.slice(0, 2)}`) & 0xff)
    cleanAddress = cleanAddress.slice(2)
  }
 
  return arr
}
 
export async function createDepositTransaction({
  connection,
  payer,
  value,
  destinationChains,
  destinationAddress,
}: CreateDepositTransactionParams): Promise<Transaction> {
  const args = new DepositArgs(value, destinationChains, addressToBytes(destinationAddress))
 
  const serializedArgs = serialize(args)
 
  const instruction = new TransactionInstruction({
    keys: [
      { isSigner: true, isWritable: true, pubkey: payer },
      { isSigner: false, isWritable: false, pubkey: SYSTEM_PROGRAM_ID },
      { isSigner: false, isWritable: true, pubkey: GAS_RECIPIENT },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(PROGRAM_DISCRIMINATOR.concat(Array.from(serializedArgs))),
  })
 
  const transaction = new Transaction()
  const latestBlockhash = await connection.getLatestBlockhash()
 
  transaction.feePayer = payer
  transaction.recentBlockhash = latestBlockhash.blockhash
  transaction.add(instruction)
 
  return transaction
}
 
export interface SendDepositTransactionParams extends CreateDepositTransactionParams {
  signTransaction: (transaction: Transaction) => Promise<Transaction>
}
 
export async function sendDepositTransaction(params: SendDepositTransactionParams): Promise<string> {
  const { signTransaction, connection, ...createParams } = params
 
  const transaction = await createDepositTransaction({ connection, ...createParams })
  const signedTransaction = await signTransaction(transaction)
 
  const signature = await connection.sendRawTransaction(signedTransaction.serialize())
  await connection.confirmTransaction(signature)
 
  return signature
}



Inbound: Direct Forwarder
Chain Name	Native ID	Contract Address
Ethereum	1	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Arbitrum	42161	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Optimism	10	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Avalanche	43114	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Base	8453	0x391E7C679d29bD940d63be94AD22A25d25b5A604
BSC	56	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Polygon	137	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Scroll	534352	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Linea	59144	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Blast	81457	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Zora	7777777	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Mode	34443	0x391E7C679d29bD940d63be94AD22A25d25b5A604
zkSync	324	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Gnosis	100	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Metis	1088	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Mantle	5000	0x391E7C679d29bD940d63be94AD22A25d25b5A604
X Layer	196	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Gravity	1625	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Taiko	167000	0x391E7C679d29bD940d63be94AD22A25d25b5A604
World Chain	480	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Morph	2818	0x391E7C679d29bD940d63be94AD22A25d25b5A604
APE	33139	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Lisk	1135	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Ink	57073	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Sonic	146	0x391E7C679d29bD940d63be94AD22A25d25b5A604
BitLayer	200901	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Sei	1329	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Celo	42220	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Cronos	25	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Rootstock	30	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Fraxtal	252	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Abstract	2741	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Soneium	1868	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Berachain	80094	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Unichain	130	0x391E7C679d29bD940d63be94AD22A25d25b5A604
HyperEVM	999	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Swell	1923	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Etherlink	42793	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Corn	21000000	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Hemi	43111	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Superposition	55244	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Story	1514	0x391E7C679d29bD940d63be94AD22A25d25b5A604
BOB	60808	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Superseed	5330	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Lens	232	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Mint	185	0x391E7C679d29bD940d63be94AD22A25d25b5A604
XDC	50	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Viction	88	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Ronin	2020	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Plume	98866	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Flare	14	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Katana	747474	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Vana	1480	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Humanity	6985385	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Nibiru	6900	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Aurora	1313161554	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Fuse	122	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Immutable zkEVM	13371	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Kaia	8217	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Moonbeam	1284	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Moonriver	1285	0x391E7C679d29bD940d63be94AD22A25d25b5A604
opBNB	204	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Polygon zkEVM	1101	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Converge	432	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Sophon	50104	0x391E7C679d29bD940d63be94AD22A25d25b5A604
CAMP	484	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Mitosis	124816	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Plasma	9745	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Flow	747	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Botanix	3637	0x391E7C679d29bD940d63be94AD22A25d25b5A604
Inbound: Contract Forwarder
Chain Name	Native ID	Contract Address
Ethereum	1	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Arbitrum	42161	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Optimism	10	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Avalanche	43114	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Base	8453	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
BSC	56	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Polygon	137	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Scroll	534352	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Linea	59144	0xA60768b03eB14d940F6c9a8553329B7F9037C91b
Blast	81457	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Zora	7777777	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Mode	34443	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
zkSync	324	0x252fb662e4d7435d2a5ded8ec94d8932cf76c178
Gnosis	100	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Metis	1088	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Mantle	5000	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
X Layer	196	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Gravity	1625	0x6Efc6Ead40786bD87A884382b6EA4BcA3C985e99
Taiko	167000	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
World Chain	480	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Morph	2818	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
APE	33139	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Lisk	1135	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Ink	57073	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Sonic	146	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
BitLayer	200901	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Sei	1329	0x3ac2cD998cB96a699f88C3C665abC767A9800cc8
Celo	42220	0xA60768b03eB14d940F6c9a8553329B7F9037C91b
Cronos	25	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Rootstock	30	0x1a4FABce513633A9Bbb67A08c52F0CB195eb0591
Fraxtal	252	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Abstract	2741	0x252fb662e4D7435D2a5DED8EC94d8932CF76C178
Soneium	1868	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Berachain	80094	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Unichain	130	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
HyperEVM	999	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Swell	1923	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Etherlink	42793	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Corn	21000000	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Hemi	43111	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Superposition	55244	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Story	1514	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
BOB	60808	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Superseed	5330	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Lens	232	0xDeb8609F3f6c1A3EA814ED571C7d7C61a9Cfa76A
Mint	185	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
XDC	50	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Viction	88	0x549Fd6feFAe192deFd626279d479F8F754B85fB7
Ronin	2020	0x31030df252cb281d8b94863af6af4af8774adb7e
Plume	98866	0xc62155f48D2aEE12FFF6Bb3b7946385d3A98854C
Flare	14	0x431F08321d06e41CB062D370cc4Ba2BAc39Ffef0
Katana	747474	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Vana	1480	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Humanity	6985385	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Nibiru	6900	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Aurora	1313161554	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Fuse	122	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Immutable zkEVM	13371	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Kaia	8217	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Moonbeam	1284	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Moonriver	1285	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
opBNB	204	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Polygon zkEVM	1101	0x2a37D63EAdFe4b4682a3c28C1c2cD4F109Cc2762
Converge	432	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Sophon	50104	0x6CbC57A6162839d782B2B4a1BD18554135e4Fafa
CAMP	484	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Mitosis	124816	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Plasma	9745	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Flow	747	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390
Botanix	3637	0x9E22ebeC84c7e4C4bD6D4aE7FF6f4D436D6D8390



Outbound: Mainnet
Chain Name	Gas.zip ID	Native ID
0G	508	16661
Abstract	110	2741
AILayer	261	2649
ApeChain	296	33139
Aptos	348	1000011
Arbitrum Nova	53	42170
Arbitrum One	57	42161
Astar	40	592
Aurora	62	1313161554
Avalanche	15	43114
Base Mainnet	54	8453
Base USDC	509	845310001
Battle for Blockchain	479	3920262608331171
Beam	24	4337
Berachain	143	80094
BEVM	138	11501
Bitlayer	147	200901
Blast	96	81457
BOB	150	60808
Boba ETH	140	288
Botanix	496	3637
BSC Mainnet	14	56
B² Network	148	223
Callisto	126	820
CAMP	502	484
Celo	21	42220
Civitia	458	1000024
Codex	357	81224
Converge	498	432
CoreDAO	34	1116
Corn	391	21000000
Cronos	36	25
Cronos zkEVM	276	388
Cyber	135	7560
DeBank	300	20240603
Degen	133	666666666
Derive	365	957
Dogechain	46	2000
Dymension	134	1100
Echelon	459	1000025
Eclipse	328	1000002
Embr	474	2598901095158506
Ethereum	255	1
Etherlink	346	42793
Ethernity	364	183
ETHW	71	10001
EVMOS	39	9001
ExSat	403	7200
Flame	354	253368190
Flare	38	14
Flow EVM	437	747
Fluence	304	9999999
Forma	267	984122
Fraxtal	10	252
Fuse	31	122
Gnosis	16	100
GOAT	440	2345
Gravity	240	1625
Ham	247	5112
Harmony	66	1666600000
Hashkey	408	177
Hemi	397	43111
Humanity	495	6985385
Humanode	501	5234
HyperCore	291	88778877
HyperEVM	430	999
Immutable zkEVM	95	13371
ING	480	2780922216980457
Initia	456	1000023
Injective EVM	78	2525
Ink	392	57073
INRT	460	1000026
Intergaze	461	1000027
Jovay	507	5734951
Kaia	33	8217
Katana	485	747474
Kava	22	2222
LayerEdge	478	4207
Lens	442	232
Linea	59	59144
Lisk	238	1135
Lukso	87	42
Manta	60	169
Mantle Mainnet	13	5000
Matchain	294	698
Merlin	9	4200
Metal	144	1750
Metis	30	1088
Mezo	499	31612
MilkyWay	483	1000033
Mint	253	185
Mitosis	503	124816
Mode	73	34443
Monad Mainnet	511	143
Moonbeam	28	1284
Moonriver	29	1285
Morph	340	2818
Neon EVM	92	245022934
Nibiru	477	6900
Numbers	259	10507
Onyx	492	80888
OP Mainnet	55	10
opBNB	58	204
Optopia	236	62050
Peaq	423	3338
Phala	422	2035
Plasma	506	9745
Plume	450	98866
Polygon	17	137
Polygon USDC	512	13710001
Polygon zkEVM	52	1101
Polynomial	367	8008
Prom	378	227
Pulsechain	12	369
R5 Testnet	452	337
Rari	82	1380012617
Rave	482	555110192329996
Rena Nuwa	466	1000032
River	396	550
Ronin	413	2020
Rootstock	254	30
Saakuru	295	7225878
Sanko	131	1996
SatoshiVM	6	3109
Sei	246	1329
Shape	327	360
Silicon	356	2355
Skate	398	5050
Solana	245	501474
Somnia	504	5031
Soneium	414	1868
Sonic	389	146
Sophon	484	50104
Story	181	1514
Sui	347	1000010
Superposition	303	55244
Superseed	366	5330
Swan	256	254
Swell	385	1923
Syndicate Frame	137	5101
Taiko	249	167000
Telos	47	40
ThunderCore	258	108
Tron	75	1000001
Unichain	362	130
UNIT0	419	88811
Vana	488	1480
Viction	43	88
Wemix	81	1111
WorldChain	269	480
X Layer	146	196
XAI	77	660279
XDC	420	50
XRP	377	1000016
XRPL EVM	487	1440000
Yominet EVM	471	428962654539583
Zaar	481	1335097526422335
ZERO	361	543210
Zeta	94	7000
Zircuit	353	48900
zkCandy	455	320
zkLink Nova	136	810180
zkScroll	41	534352
zkSync Era	51	324
Zora	56	7777777
Outbound: Testnet
Search testnet chains...
Chain Name	Gas.zip ID	Native ID
0G Galileo	475	16601
Abstract Sepolia	284	11124
Ancient8 Sepolia	192	28122024
Arbitrum Sepolia	158	421614
Avalanche Fuji	105	43113
B4 Sepolia	425	19934
Base Sepolia	167	84532
Beam Testnet	169	13337
Berachain Bepolia	438	80069
BitTorrent Donau	172	1029
Blast Sepolia	119	168587773
BNB Testnet	104	97
Boba Sepolia	373	28882
CAMP Testnet	473	123420001114
Chainbase Sepolia	285	2233
Citrea Testnet	314	5115
Cyber Sepolia	223	111557560
DFK	117	335
Eclipse Devnet	342	1000008
Eclipse Testnet	334	1000003
Fogo Faucet	500	1000034
Fuel Testnet	350	1000013
GIWA Sepolia	505	91342
GLHF Sepolia	424	10211403
Gnosis Chiado	170	10200
Haust Testnet	453	1523903251
Hemi Sepolia	323	743111
Holesky	107	17000
HyperEVM Testnet	390	998
Initia Initiation	352	1000015
Ink Sepolia	359	763373
Irys Testnet	454	1270
Lens Sepolia	371	37111
LightLink Pegasus	177	1891
Lisk Sepolia	215	4202
MegaETH Testnet	435	6342
Merlin Testnet	122	686868
Metal Sepolia	222	1740
Metis Sepolia	213	59902
Mint Sepolia	204	1686
Mode Sepolia	163	919
Monad Testnet	433	10143
Moonbase Testnet	111	1287
Neura Testnet	472	267
opBNB Testnet	157	5611
Optimism Sepolia	161	11155420
Orderly Sepolia	316	4460
Pharos Testnet	476	688688
Plasma Testnet	497	9746
PlayAI Sepolia	321	30821
Polygon Amoy	205	80002
Polygon zkEVM Sepolia	182	2442
Polynomial Sepolia	317	80008
Race Sepolia	305	6806
Reddio Devnet	426	50341
REYA Sepolia	226	89346162
RISE Testnet	451	11155931
Sahara AI Testnet	405	313313
Sanko Testnet	193	1992
Sei Testnet	486	1328
Sepolia	102	11155111
Shape Sepolia	275	11011
Signet Pecorino	449	14174
Solana Devnet	341	1000007
Solana Testnet	335	1000004
Somnia Testnet	434	50312
Soneium Minato	307	1946
Sonic Blaze	381	57054
Sui Testnet	349	1000012
Superseed Sepolia	282	53302
Swell Sepolia	386	1924
Tabi Testnet v2	330	9788
Taker Testnet	427	2748
TEA Sepolia	470	10218
Unichain Sepolia	329	1301
UNIT0 Testnet	312	88817
Worldchain Sepolia	372	4801
Zenchain Testnet	337	8408
zkScroll Sepolia	171	534351
zkSync Sepolia	187	300
Zora Sepolia	183	999999999