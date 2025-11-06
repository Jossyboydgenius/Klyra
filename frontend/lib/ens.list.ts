// @ts-nocheck
// Browser extension script - TypeScript errors suppressed
// API Configuration
const API_BASE_URL = 'https://api.fusionens.com';
// const API_BASE_URL = 'http://localhost:3001';

// Track external API usage for analytics
async function trackExternalAPIUsage(domain: any, success: any, chain: any, network: any, externalAPI: any = 'ensdata') {
    try {
        await fetch(`${API_BASE_URL}/analytics/track-external`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: domain,
                source: 'chrome-extension',
                success: success,
                chain: chain,
                network: network,
                external_api: externalAPI
            })
        });
    } catch (error) {
        // Silently fail - analytics shouldn't break the main functionality
        console.log('Analytics tracking failed:', error);
    }
}


const invalidChars = /[!@#$%^&*()+\=\[\]{};'"\\|,<>\/?]+/;
// Updated regex to support both old format (name.chain) and new format (name.eth:chain), including emoji characters
const multiChainRegex = /^[\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}][\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}-]{0,61}[\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}](\.[\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}][\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}-]{0,61}[\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}])*(\.[\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}]+)?(:[\p{L}\p{N}\p{M}\p{S}\p{P}\p{Z}]+)?$/u;

// Rotating ENS names for the title
const rotatingEnsNames = [
    'ABENA.ETH',
    'SES.ETH:X',
    'ONSHOW.ETH:SOL',
    'JESSE.BASE.ETH',
];

let currentEnsIndex = 0;

function rotateEnsName() {
    const ensNameElement = document.getElementById('rotatingEnsName');
    if (ensNameElement) {
        ensNameElement.textContent = rotatingEnsNames[currentEnsIndex];
        currentEnsIndex = (currentEnsIndex + 1) % rotatingEnsNames.length;
    }
}

// Chain configuration
const chainConfig = {
    'eth': {
        name: 'ethereum',
        displayName: 'Ethereum',
        explorer: 'https://etherscan.io/address/',
        api: 'ens'
    },
    'btc': {
        name: 'bitcoin',
        displayName: 'Bitcoin',
        explorer: 'https://blockstream.info/address/',
        api: 'ens'
    },
    'doge': {
        name: 'dogecoin',
        displayName: 'Dogecoin',
        explorer: 'https://dogechain.info/address/',
        api: 'ens'
    },
    'xrp': {
        name: 'xrp',
        displayName: 'XRP',
        explorer: 'https://xrpscan.com/account/',
        api: 'ens'
    },
    'ltc': {
        name: 'litecoin',
        displayName: 'Litecoin',
        explorer: 'https://blockchair.com/litecoin/address/',
        api: 'ens'
    },
    'ada': {
        name: 'cardano',
        displayName: 'Cardano',
        explorer: 'https://cardanoscan.io/address/',
        api: 'ens'
    },
    'base': {
        name: 'base',
        displayName: 'Base',
        explorer: 'https://basescan.org/address/',
        api: 'ens'
    },
    'name': {
        name: 'name',
        displayName: 'Name',
        explorer: null,
        api: 'ens'
    },
    'sol': {
        name: 'SOL',
        displayName: 'Solana',
        explorer: 'https://solscan.io/account/',
        api: 'ens'
    },
    'bio': {
        name: 'bio',
        displayName: 'Bio',
        explorer: null,
        api: 'ens'
    },
    'arbi': {
        name: 'ARB1',
        displayName: 'Arbitrum',
        explorer: 'https://arbiscan.io/address/',
        api: 'ens'
    },
    'polygon': {
        name: 'polygon',
        displayName: 'Polygon',
        explorer: 'https://polygonscan.com/address/',
        api: 'ens'
    },
    'avax': {
        name: 'avalanche',
        displayName: 'Avalanche',
        explorer: 'https://snowtrace.io/address/',
        api: 'ens'
    },
    'bsc': {
        name: 'bsc',
        displayName: 'BNB Chain',
        explorer: 'https://bscscan.com/address/',
        api: 'ens'
    },
    'op': {
        name: 'optimism',
        displayName: 'Optimism',
        explorer: 'https://optimistic.etherscan.io/address/',
        api: 'ens'
    },
    'zora': {
        name: 'zora',
        displayName: 'Zora',
        explorer: 'https://explorer.zora.energy/address/',
        api: 'ens'
    },
    'linea': {
        name: 'linea',
        displayName: 'Linea',
        explorer: 'https://lineascan.build/address/',
        api: 'ens'
    },
    'scroll': {
        name: 'scroll',
        displayName: 'Scroll',
        explorer: 'https://scrollscan.com/address/',
        api: 'ens'
    },
    'mantle': {
        name: 'mantle',
        displayName: 'Mantle',
        explorer: 'https://explorer.mantle.xyz/address/',
        api: 'ens'
    },
    'celo': {
        name: 'celo',
        displayName: 'Celo',
        explorer: 'https://explorer.celo.org/address/',
        api: 'ens'
    },
    'gnosis': {
        name: 'gnosis',
        displayName: 'Gnosis',
        explorer: 'https://gnosisscan.io/address/',
        api: 'ens'
    },
    'fantom': {
        name: 'fantom',
        displayName: 'Fantom',
        explorer: 'https://ftmscan.com/address/',
        api: 'ens'
    },
    'x': {
        name: 'x',
        displayName: 'Twitter/X',
        explorer: null,
        api: 'ens'
    },
    'url': {
        name: 'url',
        displayName: 'Website',
        explorer: null,
        api: 'ens'
    },
    'github': {
        name: 'github',
        displayName: 'GitHub',
        explorer: null,
        api: 'ens'
    }
};

// Convert domain name to new format (name.eth:chain) if needed
function convertToNewFormat(domainName) {
    // If already in new format (name.eth:chain), return as-is
    if (domainName.includes(':') && domainName.includes('.eth:')) {
        return domainName;
    }

    // Handle shortcut format (name:chain) - auto-insert .eth
    const shortcutMatch = domainName.match(/^([^:]+):([^:]+)$/);
    if (shortcutMatch) {
        const [, name, chain] = shortcutMatch;
        return `${name}.eth:${chain}`;
    }

    // Handle old format (name.chain) - convert to new format
    const match = domainName.match(/\.([^.]+)$/);
    if (match && chainConfig[match[1]]) {
        const tld = match[1];
        const nameWithoutTLD = domainName.replace(`.${tld}`, '');

        // For .eth domains, return as-is
        if (tld === 'eth') {
            return domainName;
        }

        // For other chains, convert to new format
        return `${nameWithoutTLD}.eth:${tld}`;
    }

    // If no TLD or unsupported, add .eth
    if (!domainName.includes('.')) {
        return domainName + '.eth';
    }

    return domainName;
}

// Detect chain from domain name - supports new format (name.eth:chain), shortcut format (name:chain), and old format (name.chain)
function detectChain(domainName) {
    // Check for new format (name.eth:chain) or shortcut format (name:chain)
    const colonIndex = domainName.lastIndexOf(':');
    if (colonIndex !== -1) {
        const targetChain = domainName.substring(colonIndex + 1);
        // Check if this is a text record (like :x, :url, :github) that should be resolved as .eth
        if (['x', 'url', 'github', 'name', 'bio'].includes(targetChain)) {
            return 'eth'; // Treat as .eth domain for resolution
        }
        if (chainConfig[targetChain]) {
            return targetChain;
        }
        return null; // Return null if chain not recognized
    }

    // Handle old format (name.chain) - backward compatibility
    const match = domainName.match(/\.([^.]+)$/);
    if (match && chainConfig[match[1]]) {
        // Check if this is a text record (like .x, .url, .github) that should be resolved as .eth
        const tld = match[1];
        if (['x', 'url', 'github', 'name', 'bio'].includes(tld)) {
            return 'eth'; // Treat as .eth domain for resolution
        }
        return tld;
    }
    // If TLD is not supported, return null to indicate unsupported chain
    return null;
}

// Multi-chain resolution with timeout and parallel requests
async function resolveENS(domainName, network = 'mainnet') {
    const timeout = 5000; // 5 second timeout
    const chain = detectChain(domainName);

    // Convert to new format for server requests
    const serverDomainName = convertToNewFormat(domainName);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
    });

    let promises = [];

    // Check if this is a text record (like .x, .url, .github) that should be resolved from .eth
    const isTextRecord = ['x', 'url', 'github', 'name', 'bio'].some(tld => domainName.endsWith(`.${tld}`));

    if (isTextRecord) {
        // Use local server for text records (.x, .url, .github, etc.)
        if (network === 'testnet') {
            promises = [
                fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=sepolia&source=chrome-extension`)
                    .then(response => response.ok ? response.json() : null)
                    .then(data => data?.success ? data.data.address : null)
                    .catch(() => null)
            ];
        } else {
            promises = [
                fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=mainnet&source=chrome-extension`)
                    .then(response => response.ok ? response.json() : null)
                    .then(data => data?.success ? data.data.address : null)
                    .catch(() => null)
            ];
        }
    } else {
        // Check if this is an ETH subdomain (.base.eth, .uni.eth, etc.) first
        const isEthSubdomain = domainName.endsWith('.eth') && domainName.includes('.');

        if (isEthSubdomain) {
            // For ETH subdomains (.base.eth, .uni.eth, etc.), use Fusion API first, then ENSData API
            promises = [
                // Primary: Fusion API server (handles Base subdomains with ENSData fallback)
                fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=mainnet&source=chrome-extension`)
                    .then(response => response.ok ? response.json() : null)
                    .then(data => data?.success ? data.data.address : null)
                    .catch(() => null),

                // Fallback: ENSData API
                fetch(`https://api.ensdata.net/${domainName}`)
                    .then(response => response.ok ? response.json() : null)
                    .then(data => {
                        const success = data?.address ? true : false;
                        // Track external API usage
                        trackExternalAPIUsage(domainName, success, 'eth', 'mainnet', 'ensdata');
                        return data?.address || null;
                    })
                    .catch(() => {
                        // Track failed external API usage
                        trackExternalAPIUsage(domainName, false, 'eth', 'mainnet', 'ensdata');
                        return null;
                    })
            ];
        } else if (chain === 'eth') {
            // For .eth domains, use different APIs based on network
            if (network === 'testnet') {
                // For testnet, use local ENS server only
                promises = [
                    // Try local ENS testnet server
                    fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=sepolia&source=chrome-extension`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => data?.success ? data.data.address : null)
                        .catch(() => null)
                ];
            } else {
                // For mainnet, use local ENS server with testnet resolution logic
                promises = [
                    // Try local ENS server with mainnet network
                    fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=mainnet&source=chrome-extension`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => data?.success ? data.data.address : null)
                        .catch(() => null)
                ];
            }
        } else {
            // For multi-chain domains (.btc, .sol, .doge, etc.), use local server first
            if (network === 'testnet') {
                promises = [
                    // Try local ENS server for multi-chain resolution
                    fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=sepolia&source=chrome-extension`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => data?.success ? data.data.address : null)
                        .catch(() => null),

                    // Fallback: ENSData API
                    fetch(`https://api.ensdata.net/${domainName}`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => {
                            const success = data?.address ? true : false;
                            // Track external API usage
                            trackExternalAPIUsage(domainName, success, 'eth', 'mainnet', 'ensdata');
                            return data?.address || null;
                        })
                        .catch(() => {
                            // Track failed external API usage
                            trackExternalAPIUsage(domainName, false, 'eth', 'mainnet', 'ensdata');
                            return null;
                        })
                ];
            } else {
                promises = [
                    // Primary: Local ENS server (handles multi-chain)
                    fetch(`${API_BASE_URL}/resolve/${serverDomainName}?network=mainnet&source=chrome-extension`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => data?.success ? data.data.address : null)
                        .catch(() => null),

                    // Fallback: ENSData API
                    fetch(`https://api.ensdata.net/${domainName}`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => {
                            const success = data?.address ? true : false;
                            // Track external API usage
                            trackExternalAPIUsage(domainName, success, 'eth', 'mainnet', 'ensdata');
                            return data?.address || null;
                        })
                        .catch(() => {
                            // Track failed external API usage
                            trackExternalAPIUsage(domainName, false, 'eth', 'mainnet', 'ensdata');
                            return null;
                        }),

                    // Additional fallback: ENS Node API (keep original format for external APIs)
                    fetch(`https://api.alpha.ensnode.io/name/${domainName}`)
                        .then(response => response.ok ? response.json() : null)
                        .then(data => data?.address || data?.resolver?.address || null)
                        .catch(() => null)
                ];
            }
        }
    }

    try {
        // Try each promise sequentially until one succeeds
        for (const promise of promises) {
            try {
                const result = await Promise.race([promise, timeoutPromise]);
                if (result) {
                    return result;
                }
            } catch (error) {
                // Continue to next promise
                continue;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// DNSSEC validation function
async function validateDNSSEC(domainName) {
    try {

        // Use Cloudflare's DNS-over-HTTPS with DNSSEC validation
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domainName}&type=A&do=1`, {
            headers: {
                'Accept': 'application/dns-json'
            }
        });

        if (!response.ok) {
            return { isValid: false, reason: 'DNS query failed' };
        }

        const data = await response.json();

        // Check if DNSSEC validation was performed
        const hasDNSSEC = data.AD === true; // AD flag indicates DNSSEC validation


        return {
            isValid: hasDNSSEC,
            reason: hasDNSSEC ? 'DNSSEC validated' : 'No DNSSEC validation'
        };
    } catch (error) {
        return { isValid: false, reason: 'Validation failed' };
    }
}

// Fetch profile picture from ENS metadata
async function fetchProfilePicture(ensName, address) {
    try {
        // Try to get avatar from ENS metadata
        const response = await fetch(`https://metadata.ens.domains/mainnet/${address}/avatar`);
        if (response.ok) {
            const avatarUrl = await response.text();
            if (avatarUrl && avatarUrl !== 'data:image/svg+xml;base64,' && avatarUrl.trim() !== '') {
                return avatarUrl;
            }
        }

        // Fallback: try ENSData API for avatar
        const ensResponse = await fetch(`https://api.ensdata.net/${ensName}`);
        if (ensResponse.ok) {
            const data = await ensResponse.json();
            if (data?.avatar_small) {
                return data.avatar_small;
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

async function resolve() {
    if (isResolving) {
        return;
    }

    if (!searchElement || !lblValue || !lblHidden) {
        return;
    }

    isResolving = true;
    const userInput = searchElement.value.trim();
    hideResult();
    showLoading();

    if (!userInput) {
        hideLoading();
        toast("Please enter an ENS name", 3000);
        return;
    }

    if (invalidChars.test(userInput)) {
        hideLoading();
        toast("Request contains invalid characters", 3000);
        return;
    }

    // Add .eth suffix if not provided and no other TLD is present
    let domainName = userInput;
    if (!domainName.includes('.')) {
        domainName = domainName + '.eth';
    }

    // Basic validation for multi-chain domain format
    if (!multiChainRegex.test(domainName)) {
        hideLoading();
        toast("Invalid domain name format", 3000);
        return;
    }

    try {
        // Detect chain and resolve the domain name
        const chain = detectChain(domainName);

        if (!chain) {
            hideLoading();
            toast("Unsupported chain TLD. Supported: .eth, .btc, .doge, .xrp, .ltc, .ada, .base, .name, .sol, .bio, .arbi, .polygon, .avax, .bsc, .op, .zora, .linea, .scroll, .mantle, .celo, .gnosis, .fantom", 5000);
            return;
        }

        const address = await resolveENS(domainName, settings.network);

        if (address) {
            // Fetch profile picture (always for .eth domains on mainnet, regardless of target chain)
            let profilePicture = null;
            if (settings.network === 'mainnet') {
                // For multi-chain resolution, we need to get the Ethereum address for avatar lookup
                let ethAddress = address;
                let baseDomain = domainName;

                if (chain !== 'eth') {
                    // Extract base domain from new format (name.eth:chain) or shortcut format (name:chain)
                    const colonIndex = domainName.lastIndexOf(':');
                    if (colonIndex !== -1) {
                        baseDomain = domainName.substring(0, colonIndex);
                        // If it's shortcut format, add .eth
                        if (!baseDomain.includes('.eth')) {
                            baseDomain = baseDomain + '.eth';
                        }
                    }

                    // Get the Ethereum address for avatar lookup
                    try {
                        const ethResponse = await fetch(`${API_BASE_URL}/resolve/${baseDomain}?network=mainnet&source=chrome-extension`);
                        if (ethResponse.ok) {
                            const ethData = await ethResponse.json();
                            if (ethData.success) {
                                ethAddress = ethData.data.address;
                            }
                        }
                    } catch (error) {
                    }
                }
                profilePicture = await fetchProfilePicture(baseDomain, ethAddress);
            }

            // Validate DNSSEC for .eth domains
            let dnssecInfo = null;
            if (chain === 'eth') {
                dnssecInfo = await validateDNSSEC(domainName);
            }

            // Display result with chain information
            const chainInfo = chainConfig[chain];
            showResult(address, chainInfo);
            await display(address, profilePicture, chainInfo, dnssecInfo);
        } else if (chain !== 'eth') {
            // For non-eth chains, try to get the .eth address as fallback
            let ensName;

            // Handle new format (name.eth:chain) vs old format (name.chain)
            if (domainName.includes(':')) {
                // New format: extract base domain before colon
                ensName = domainName.substring(0, domainName.lastIndexOf(':'));
            } else {
                // Old format: replace TLD with .eth
                const nameWithoutTLD = domainName.replace(/\.[^.]+$/, '');
                ensName = nameWithoutTLD + '.eth';
            }

            // Try to resolve the .eth version
            const ethAddress = await resolveENS(ensName, settings.network);
            if (ethAddress) {
                toast(`${chainConfig[chain].displayName} address not found, but ${ensName} resolves to ${ethAddress}`, 4000);
            } else {
                toast(`${chainConfig[chain].displayName} address not found`, 3000);
            }
        } else {
            if (settings.network === 'testnet') {
                toast(`Domain not found on testnet. Most ENS domains only exist on mainnet.`, 4000);
            } else {
                toast(`${chainConfig[chain].displayName} address not found or not resolved`, 3000);
            }
        }
    } catch (error) {
        toast("Error resolving ENS name", 3000);
    } finally {
        hideLoading();
        isResolving = false;
    }
}

async function explore() {
    if (!searchElement) return;

    const userInput = searchElement.value.trim();

    if (!userInput) {
        toast("Please enter a domain name first", 3000);
        return;
    }

    if (invalidChars.test(userInput)) {
        toast("Request contains invalid characters", 3000);
        return;
    }

    let domainName = userInput;
    if (!domainName.includes('.')) {
        domainName = domainName + '.eth';
    }

    // Check for new format (name.eth:record) or shortcut format (name:record) first
    const colonIndex = domainName.lastIndexOf(':');
    if (colonIndex !== -1) {
        const baseDomain = domainName.substring(0, colonIndex);
        const recordType = domainName.substring(colonIndex + 1);

        // Convert shortcut format to new format for resolution
        const serverDomainName = convertToNewFormat(domainName);

        // Check if this is a text record
        if (['x', 'url', 'github', 'name', 'bio'].includes(recordType)) {
            const address = await resolveENS(serverDomainName, settings.network);
            if (address) {
                if (recordType === 'url') {
                    // For URLs, open the website directly
                    chrome.tabs.create({ url: address });
                } else if (recordType === 'github') {
                    // For GitHub, open the GitHub profile
                    chrome.tabs.create({ url: `https://github.com/${address}` });
                } else if (recordType === 'x') {
                    // For Twitter/X, open the profile
                    chrome.tabs.create({ url: `https://x.com/${address}` });
                } else {
                    // For name/bio, just copy to clipboard
                    navigator.clipboard.writeText(address);
                    toast(`${recordType} copied to clipboard`, 2000);
                }
            } else {
                toast(`${recordType} record not found`, 3000);
            }
            return;
        }

        // Check if this is a supported chain
        if (chainConfig[recordType]) {
            const address = await resolveENS(serverDomainName, settings.network);
            if (address) {
                const chainInfo = chainConfig[recordType];
                if (chainInfo.explorer) {
                    chrome.tabs.create({ url: `${chainInfo.explorer}${address}` });
                } else {
                    navigator.clipboard.writeText(address);
                    toast(`${chainInfo.displayName} copied to clipboard`, 2000);
                }
            } else {
                toast(`${chainInfo.displayName} address not found`, 3000);
            }
            return;
        }

        toast(`Unsupported record type: ${recordType}`, 3000);
        return;
    }

    // Handle old format (name.chain)
    const chain = detectChain(domainName);

    if (!chain) {
        toast("Unsupported chain TLD. Supported: .eth, .btc, .base, .name, .sol, .bio, .arbi, .polygon, .avax, .bsc, .op, .zora, .linea, .scroll, .mantle, .celo, .gnosis, .fantom", 5000);
        return;
    }

    const address = await resolveENS(domainName, settings.network);

    if (address) {
        // Check if this is a text record first
        const isTextRecord = ['x', 'url', 'github', 'name', 'bio'].some(tld => domainName.endsWith(`.${tld}`));

        if (isTextRecord) {
            // Handle text records
            const textRecordType = domainName.split('.').pop();
            if (textRecordType === 'url') {
                // For URLs, open the website directly
                chrome.tabs.create({ url: address });
            } else if (textRecordType === 'github') {
                // For GitHub, open the GitHub profile
                chrome.tabs.create({ url: `https://github.com/${address}` });
            } else if (textRecordType === 'x') {
                // For Twitter/X, open the profile
                chrome.tabs.create({ url: `https://x.com/${address}` });
            } else {
                // For name/bio, just copy to clipboard
                navigator.clipboard.writeText(address);
                toast(`${textRecordType} copied to clipboard`, 2000);
            }
        } else {
            // Handle regular addresses
            const chainInfo = chainConfig[chain];
            if (chainInfo.explorer) {
                chrome.tabs.create({ url: `${chainInfo.explorer}${address}` });
            } else {
                // For name/bio, just copy to clipboard
                navigator.clipboard.writeText(address);
                toast(`${chainInfo.displayName} copied to clipboard`, 2000);
            }
        }
    } else {
        toast(`${chainConfig[chain].displayName} address not found`, 3000);
    }
}

async function openEfp() {
    if (!searchElement) return;

    const userInput = searchElement.value.trim();

    if (!userInput) {
        toast("Please enter a domain name first", 3000);
        return;
    }

    if (invalidChars.test(userInput)) {
        toast("Request contains invalid characters", 3000);
        return;
    }

    let domainName = userInput;
    if (!domainName.includes('.')) {
        domainName = domainName + '.eth';
    }

    // Only open EFP for .eth domains
    if (!domainName.endsWith('.eth')) {
        toast("EFP is only available for .eth domains", 3000);
        return;
    }

    // Open EFP (Ethereum Farcaster Profile) for the domain
    chrome.tabs.create({ url: `https://efp.app/${domainName}` });
}

async function exploreEthXyz() {
    if (!searchElement) return;

    const userInput = searchElement.value.trim();

    if (!userInput) {
        toast("Please enter a domain name first", 3000);
        return;
    }

    if (invalidChars.test(userInput)) {
        toast("Request contains invalid characters", 3000);
        return;
    }

    let domainName = userInput;
    // Add .eth suffix if no TLD is provided
    if (!domainName.includes('.')) {
        domainName = domainName + '.eth';
    }

    // Detect chain and open appropriate explorer
    const chain = detectChain(domainName);

    if (!chain) {
        toast("Unsupported chain TLD. Supported: .eth, .btc, .base, .name, .sol, .bio, .arbi, .polygon, .avax, .bsc, .op, .zora, .linea, .scroll, .mantle, .celo, .gnosis, .fantom", 5000);
        return;
    }

    if (chain === 'eth') {
        // For .eth domains, open app.ens.domains profile page
        const nameForEnsDomains = domainName.replace(/\.eth$/, '');
        chrome.tabs.create({ url: `https://app.ens.domains/${nameForEnsDomains}.eth` });
    } else {
        // For non-eth domains, show a message that app.ens.domains is only for .eth domains
        toast("Shift+Enter opens app.ens.domains profile pages for .eth domains only", 3000);
    }
}

const copy = async () => {
    if (!lblValue || !lblHidden) return;

    if (lblValue.innerHTML != "..." && lblValue.innerHTML != "Invalid ENS name format") {
        try {
            // Ensure document is focused before copying
            if (!document.hasFocus()) {
                window.focus();
                // Wait a bit for focus to be established
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            await navigator.clipboard.writeText(lblHidden.innerHTML);
            toast("Copied to clipboard", 2000);
        } catch (error) {
            // Fallback: try using execCommand for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = lblHidden.innerHTML;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                toast("Copied to clipboard", 2000);
            } catch (fallbackError) {
                toast("Copy failed", 2000);
            }
        }
    }
};

const focusInput = () => {
    if (searchElement) {
        searchElement.focus();
    }
};

// Available chains and text records for suggestions (prioritized)
const availableChains = [
    // Most popular blockchain networks
    { key: 'btc', name: 'Bitcoin', description: 'BTC' },
    { key: 'sol', name: 'Solana', description: 'SOL' },
    { key: 'doge', name: 'Dogecoin', description: 'DOGE' },
    { key: 'base', name: 'Base', description: 'BASE' },
    { key: 'arbi', name: 'Arbitrum', description: 'ARB' },
    { key: 'op', name: 'Optimism', description: 'OP' },
    { key: 'matic', name: 'Polygon', description: 'MATIC' },
    { key: 'avax', name: 'Avalanche', description: 'AVAX' },
    { key: 'bsc', name: 'BSC', description: 'BSC' },
    // Text records (most common first)
    { key: 'url', name: 'Website', description: 'URL' },
    { key: 'x', name: 'Twitter/X', description: 'X' },
    { key: 'github', name: 'GitHub', description: 'GITHUB' },
    { key: 'name', name: 'Display Name', description: 'NAME' },
    { key: 'bio', name: 'Bio', description: 'BIO' },
    // Additional blockchain networks
    { key: 'xrp', name: 'XRP', description: 'XRP' },
    { key: 'ltc', name: 'Litecoin', description: 'LTC' },
    { key: 'bch', name: 'Bitcoin Cash', description: 'BCH' },
    { key: 'ada', name: 'Cardano', description: 'ADA' },
    { key: 'dot', name: 'Polkadot', description: 'DOT' }
];

// Suggestion system variables
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let suggestionDropdown = null;
let suggestionList = null;

// Auto-complete functionality with chain suggestions
const setupAutoComplete = () => {
    if (!searchElement) return;

    // Get suggestion elements
    suggestionDropdown = document.getElementById('suggestionDropdown');
    suggestionList = document.getElementById('suggestionList');

    searchElement.addEventListener('keydown', (e) => {
        const value = e.target.value.trim();
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPosition);

        // Check if user typed a colon
        if (e.key === ':') {
            // Check if we have a .eth domain before the colon
            const ethMatch = textBeforeCursor.match(/^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.eth)$/);
            if (ethMatch) {
                e.preventDefault();
                showChainSuggestions(ethMatch[1]);
                return;
            }

            // Check for shortcut format (name:chain) - auto-insert .eth
            const shortcutMatch = textBeforeCursor.match(/^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/);
            if (shortcutMatch) {
                e.preventDefault();
                const domainName = shortcutMatch[1] + '.eth';
                showChainSuggestions(domainName);
                return;
            }
        }

        // Handle arrow keys for navigation
        if (suggestionDropdown && suggestionDropdown.style.display !== 'none') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateSuggestions(1);
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateSuggestions(-1);
                return;
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < currentSuggestions.length) {
                    completeSuggestion(currentSuggestions[selectedSuggestionIndex]);
                } else {
                    // Default .eth completion if no suggestion selected
                    completeEthSuggestion(value);
                }
                return;
            } else if (e.key === 'Escape') {
                hideSuggestions();
                return;
            }
        } else if (e.key === 'Tab') {
            // Original Tab functionality for .eth completion
            e.preventDefault();
            completeEthSuggestion(value);
        }
    });

    // Handle input changes to filter suggestions
    searchElement.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPosition);

        // Check if we're in chain suggestion mode (after colon)
        const colonIndex = textBeforeCursor.lastIndexOf(':');
        if (colonIndex !== -1) {
            const ethMatch = textBeforeCursor.substring(0, colonIndex).match(/^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.eth)$/);
            if (ethMatch) {
                const typedChain = textBeforeCursor.substring(colonIndex + 1).toLowerCase();

                // Filter suggestions based on what's typed after colon
                if (typedChain) {
                    currentSuggestions = availableChains.filter(chain =>
                        chain.key.toLowerCase().includes(typedChain) ||
                        chain.name.toLowerCase().includes(typedChain) ||
                        chain.description.toLowerCase().includes(typedChain)
                    );
                } else {
                    currentSuggestions = availableChains;
                }

                selectedSuggestionIndex = 0;
                renderSuggestions();

                // Show dropdown if there are suggestions
                if (currentSuggestions.length > 0) {
                    suggestionDropdown.style.display = 'block';
                } else {
                    suggestionDropdown.style.display = 'none';
                }
            }
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchElement.contains(e.target) && !suggestionDropdown.contains(e.target)) {
            hideSuggestions();
        }
    });
};

// Show chain suggestions
const showChainSuggestions = (ethDomain) => {
    currentSuggestions = availableChains;
    selectedSuggestionIndex = 0;

    // Update input with colon
    searchElement.value = ethDomain + ':';
    searchElement.setSelectionRange(searchElement.value.length, searchElement.value.length);

    // Render suggestions
    renderSuggestions();

    // Show dropdown
    suggestionDropdown.style.display = 'block';
};

// Render suggestion items
const renderSuggestions = () => {
    suggestionList.innerHTML = '';

    currentSuggestions.forEach((chain, index) => {
        const item = document.createElement('div');
        item.className = `suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`;
        item.innerHTML = `
            <span class="chain-name">${chain.name}</span>
            <span class="chain-description">${chain.description}</span>
        `;

        item.addEventListener('click', () => {
            selectedSuggestionIndex = index;
            completeSuggestion(chain);
        });

        suggestionList.appendChild(item);
    });
};

// Navigate suggestions with arrow keys
const navigateSuggestions = (direction) => {
    if (currentSuggestions.length === 0) return;

    selectedSuggestionIndex += direction;

    // Wrap around
    if (selectedSuggestionIndex < 0) {
        selectedSuggestionIndex = currentSuggestions.length - 1;
    } else if (selectedSuggestionIndex >= currentSuggestions.length) {
        selectedSuggestionIndex = 0;
    }

    renderSuggestions();
};

// Complete suggestion
const completeSuggestion = (chain) => {
    const currentValue = searchElement.value;
    const ethMatch = currentValue.match(/^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.eth):?$/);

    if (ethMatch) {
        searchElement.value = ethMatch[1] + ':' + chain.key;
        searchElement.setSelectionRange(searchElement.value.length, searchElement.value.length);
    }

    hideSuggestions();
};

// Complete .eth suggestion (original functionality)
const completeEthSuggestion = (value) => {
    // Only auto-complete if doesn't already have a TLD
    if (value && !value.includes('.')) {
        // Check if it looks like a domain name (alphanumeric, no spaces)
        if (/^[a-zA-Z0-9-]+$/.test(value)) {
            searchElement.value = value + '.eth';
            // Position cursor at the end of the text (after .eth)
            const newLength = searchElement.value.length;
            searchElement.setSelectionRange(newLength, newLength);
        }
    }
};

// Hide suggestions
const hideSuggestions = () => {
    if (suggestionDropdown) {
        suggestionDropdown.style.display = 'none';
    }
    currentSuggestions = [];
    selectedSuggestionIndex = -1;
};

const showLoading = () => {
    const btnContent = document.querySelector('.btn-content');
    const btnLoading = document.querySelector('.btn-loading');
    const resolveBtn = document.getElementById('btnResolve');

    if (btnContent && btnLoading && resolveBtn) {
        btnContent.style.display = 'none';
        btnLoading.style.display = 'flex';
        resolveBtn.classList.add('loading');
        resolveBtn.disabled = true;
    }
};

const hideLoading = () => {
    const btnContent = document.querySelector('.btn-content');
    const btnLoading = document.querySelector('.btn-loading');
    const resolveBtn = document.getElementById('btnResolve');

    if (btnContent && btnLoading && resolveBtn) {
        btnContent.style.display = 'flex';
        btnLoading.style.display = 'none';
        resolveBtn.classList.remove('loading');
        resolveBtn.disabled = false;
    }
};

const showResult = (address, chainInfo) => {
    const resultCard = document.getElementById("resultCard");
    if (resultCard) {
        resultCard.style.display = "block";

        // Update the result label to show chain information
        const resultLabel = resultCard.querySelector('.result-label');
        if (resultLabel) {
            resultLabel.textContent = `Resolved ${chainInfo.displayName} Address`;
        }

        // Show/hide EFP button based on whether it's an .eth domain
        if (efpBtn) {
            if (chainInfo.name === 'ethereum') {
                efpBtn.style.display = 'flex';
            } else {
                efpBtn.style.display = 'none';
            }
        }
    }
};

const hideResult = () => {
    const resultCard = document.getElementById("resultCard");
    if (resultCard) {
        resultCard.style.display = "none";
    }
};

const toast = (message, duration) => {
    var tt = document.getElementById("snackbar");
    tt.innerHTML = message;
    tt.className = "show";
    setTimeout(function () {
        tt.className = tt.className.replace("show", "");
    }, duration);
};

const shorten = (text) => {
    return `${text.substr(0, 12)}...${text.slice(-12)}`;
};

// Typewriter effect for displaying addresses
const typewriterEffect = async (element, text, speed = 100) => {
    element.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
        element.innerHTML += text[i];
        // Add a blinking cursor effect
        element.innerHTML += '<span class="cursor">|</span>';
        await new Promise(resolve => setTimeout(resolve, speed));
        // Remove cursor before adding next character
        element.innerHTML = element.innerHTML.replace('<span class="cursor">|</span>', '');
    }
    // Add a brief pause at the end
    await new Promise(resolve => setTimeout(resolve, 200));
};

const display = async (info, profilePicture = null, chainInfo = null, dnssecInfo = null) => {
    if (!lblValue || !lblHidden) {
        return;
    }

    try {
        // Update profile picture if available (for all .eth domains)
        const profilePicElement = document.getElementById('profilePicture');
        const defaultIcon = document.querySelector('.default-icon');
        if (profilePicElement && defaultIcon) {
            if (profilePicture) {
                profilePicElement.src = profilePicture;
                profilePicElement.style.display = 'block';
                defaultIcon.style.display = 'none';
                profilePicElement.onerror = () => {
                    profilePicElement.style.display = 'none';
                    defaultIcon.style.display = 'block';
                };
            } else {
                profilePicElement.style.display = 'none';
                defaultIcon.style.display = 'block';
            }
        }

        // Display address with typewriter effect
        await typewriterEffect(lblValue, info, 80);
        lblHidden.innerHTML = info;

        // Show DNSSEC trust indicator in footer
        if (dnssecInfo && dnssecInfo.isValid) {
            showFooterTrustIndicator('DNSSEC Validated', 'success');
        } else if (dnssecInfo && !dnssecInfo.isValid) {
            showFooterTrustIndicator('No DNSSEC', 'warning');
        } else {
            hideFooterTrustIndicator();
        }

        // Wait a bit before copying to clipboard
        setTimeout(() => {
            copy();
        }, 500);
    } catch (error) {
        // Fallback: just set the text directly
        if (lblValue && lblHidden) {
            lblValue.innerHTML = info;
            lblHidden.innerHTML = info;
        }
    }
};

// Show inline trust indicator in the resolved address section
const showInlineTrustIndicator = (message, type) => {

    // Remove existing trust indicator
    const existingIndicator = document.getElementById('inlineTrustIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Find the container that comes after the keyboard shortcuts section
    let targetContainer = null;

    // Look for the keyboard shortcuts section first
    const keyboardShortcuts = document.querySelector('.keyboard-shortcuts') ||
        document.querySelector('[class*="shortcut"]') ||
        document.querySelector('div:contains("Keyboard Shortcuts")') ||
        Array.from(document.querySelectorAll('div')).find(div =>
            div.textContent?.includes('Keyboard Shortcuts') ||
            div.textContent?.includes('Tab') ||
            div.textContent?.includes('Enter')
        );

    // Hide the keyboard shortcuts section
    if (keyboardShortcuts) {
        keyboardShortcuts.style.display = 'none';
    }

    if (keyboardShortcuts) {
        // Find the next sibling or parent's next sibling
        targetContainer = keyboardShortcuts.nextElementSibling ||
            keyboardShortcuts.parentElement?.nextElementSibling ||
            keyboardShortcuts.parentElement;
    } else {
        // Fallback: look for the main container
        targetContainer = document.querySelector('.container') ||
            document.querySelector('main') ||
            document.body;
    }

    if (!targetContainer) {
        return;
    }

    // Create new inline trust indicator
    const indicator = document.createElement('div');
    indicator.id = 'inlineTrustIndicator';
    indicator.textContent = message; // Use textContent to avoid encoding issues
    indicator.style.cssText = `
        display: block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
        clear: both;
        position: relative;
        z-index: 10;
        ${type === 'success' ?
            'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' :
            'background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7;'
        }
    `;

    // Insert the indicator right after the keyboard shortcuts section
    if (keyboardShortcuts && keyboardShortcuts.nextElementSibling) {
        // Insert after the keyboard shortcuts section
        keyboardShortcuts.parentElement.insertBefore(indicator, keyboardShortcuts.nextElementSibling);
    } else if (keyboardShortcuts) {
        // Insert after the keyboard shortcuts section
        keyboardShortcuts.parentElement.appendChild(indicator);
    } else {
        // Fallback: insert at the beginning of the target container
        targetContainer.insertBefore(indicator, targetContainer.firstChild);
    }


    // Auto-remove after 10 seconds and show keyboard shortcuts back
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.remove();
        }

        // Show the keyboard shortcuts section back
        if (keyboardShortcuts) {
            keyboardShortcuts.style.display = '';
        }
    }, 10000);
};

// Show trust indicator (keeping the old function for compatibility)
const showTrustIndicator = (message, type) => {

    // Remove existing trust indicator
    const existingIndicator = document.getElementById('trustIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create new trust indicator
    const indicator = document.createElement('div');
    indicator.id = 'trustIndicator';
    indicator.textContent = message;
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ${type === 'success' ?
            'background-color: #d4edda; color: #155724; border: 2px solid #c3e6cb;' :
            'background-color: #fff3cd; color: #856404; border: 2px solid #ffeaa7;'
        }
    `;

    // Add to the popup container
    const container = document.querySelector('.container') || document.body;
    container.appendChild(indicator);


    // Auto-remove after 8 seconds (longer for testing)
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.remove();
        }
    }, 8000);
};

// Show DNSSEC trust indicator in footer
const showFooterTrustIndicator = (message, type) => {
    // Remove existing footer trust indicator
    const existingIndicator = document.getElementById('footerTrustIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create new footer trust indicator
    const indicator = document.createElement('div');
    indicator.id = 'footerTrustIndicator';
    indicator.textContent = message;

    const bgColor = type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)';
    const borderColor = type === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(245, 158, 11, 0.5)';
    const textColor = type === 'success' ? '#22c55e' : '#f59e0b';

    indicator.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        color: ${textColor};
        z-index: 1000;
        backdrop-filter: blur(10px);
    `;

    // Add to footer
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.appendChild(indicator);
    }
};

// Hide footer trust indicator
const hideFooterTrustIndicator = () => {
    const indicator = document.getElementById('footerTrustIndicator');
    if (indicator) {
        indicator.remove();
    }
};

const clearFields = () => {
    if (searchElement) searchElement.value = "";
    if (lblValue) lblValue.innerHTML = "...";

    // Clear profile picture
    const profilePicElement = document.getElementById('profilePicture');
    const defaultIcon = document.querySelector('.default-icon');
    if (profilePicElement && defaultIcon) {
        profilePicElement.style.display = 'none';
        defaultIcon.style.display = 'block';
    }

    // Clear trust indicators
    const trustIndicator = document.getElementById('trustIndicator');
    if (trustIndicator) {
        trustIndicator.remove();
    }

    // Clear footer trust indicator
    hideFooterTrustIndicator();
    const inlineTrustIndicator = document.getElementById('inlineTrustIndicator');
    if (inlineTrustIndicator) {
        inlineTrustIndicator.remove();
    }

    // Show keyboard shortcuts back if they were hidden
    const keyboardShortcuts = document.querySelector('.keyboard-shortcuts') ||
        document.querySelector('[class*="shortcut"]') ||
        Array.from(document.querySelectorAll('div')).find(div =>
            div.textContent?.includes('Keyboard Shortcuts') ||
            div.textContent?.includes('Tab') ||
            div.textContent?.includes('Enter')
        );

    if (keyboardShortcuts && keyboardShortcuts.style.display === 'none') {
        keyboardShortcuts.style.display = '';
    }

    hideResult();
};

// Settings management
let settings = {
    autoReplace: true,
    network: 'mainnet', // 'mainnet' or 'testnet'
};

// Prevent multiple rapid resolve calls
let isResolving = false;

// DOM elements (will be initialized in window.onload)
let searchElement, resolveBtn, resultCard, lblValue, lblHidden, copyBtn, explorerBtn, efpBtn, settingsBtn, helpBtn, settingsModal, closeSettingsBtn, autoReplaceToggle, ethPriceText, mainnetBtn, testnetBtn, networkIndicator, customResolverInput, deployResolverBtn, resolverStatusIndicator, resolverStatusText;

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['ensResolverSettings']);
        if (result.ensResolverSettings) {
            settings = { ...settings, ...result.ensResolverSettings };
        }

        // Only set toggle states if elements exist
        if (autoReplaceToggle) {
            autoReplaceToggle.checked = settings.autoReplace;
        }

        // Load custom resolver if set (DISABLED)
        // if (customResolverInput && result.ensResolverSettings?.customResolver) {
        //     customResolverInput.value = result.ensResolverSettings.customResolver;
        //     validateCustomResolver();
        // }

        // Set network button states
        if (mainnetBtn && testnetBtn) {
            if (settings.network === 'mainnet') {
                mainnetBtn.classList.add('active');
                testnetBtn.classList.remove('active');
            } else {
                mainnetBtn.classList.remove('active');
                testnetBtn.classList.add('active');
            }
        }

        // Update header network indicator
        updateNetworkIndicator();

        // Set initial in-page resolution state (only if we have an active tab)
        try {
            // This function is no longer used, so we remove it.
        } catch (error) {
            // This is normal when popup is opened without an active tab
        }
    } catch (error) {
    }
}

// Save settings to storage
async function saveSettings() {
    try {
        await chrome.storage.sync.set({ ensResolverSettings: settings });
    } catch (error) {
    }
}

// Update network indicator in header
function updateNetworkIndicator() {
    if (!networkIndicator) return;

    const networkDot = networkIndicator.querySelector('.network-dot');
    const networkText = networkIndicator.querySelector('.network-text');

    if (networkDot && networkText) {
        if (settings.network === 'mainnet') {
            networkDot.className = 'network-dot mainnet';
            networkText.textContent = 'Mainnet';
        } else {
            networkDot.className = 'network-dot testnet';
            networkText.textContent = 'Testnet';
        }
    }
}

// Fetch and display ETH price
async function fetchEthPrice() {
    if (!ethPriceText) return;

    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();

        if (data.ethereum) {
            const price = data.ethereum.usd;
            const change24h = data.ethereum.usd_24h_change;
            const isUp = change24h >= 0;
            const changeColor = isUp ? '#4CAF50' : '#FF6B6B';
            const arrowSVG = isUp
                ? `<svg style="vertical-align:middle" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5M12 5L6 11M12 5L18 11" stroke="${changeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                : `<svg style="vertical-align:middle" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M12 19l6-6M12 19l-6-6" stroke="${changeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            ethPriceText.innerHTML = `
                <span style="font-weight: bold;">$${price.toLocaleString()}</span>
                <span style="color: ${changeColor}; margin-left: 4px;">${arrowSVG} ${Math.abs(change24h).toFixed(2)}%</span>
            `;
        } else {
            ethPriceText.textContent = 'Price unavailable';
        }
    } catch (error) {
        ethPriceText.textContent = 'Price unavailable';
    }
}

// Fetch and display ENS price
async function fetchEnsPrice() {
    const ensPriceText = document.getElementById('ensPriceText');
    if (!ensPriceText) return;

    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum-name-service&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();

        if (data['ethereum-name-service']) {
            const price = data['ethereum-name-service'].usd;
            const change24h = data['ethereum-name-service'].usd_24h_change;
            const isUp = change24h >= 0;
            const changeColor = isUp ? '#4CAF50' : '#FF6B6B';
            const arrowSVG = isUp
                ? `<svg style="vertical-align:middle" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5M12 5L6 11M12 5L18 11" stroke="${changeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                : `<svg style="vertical-align:middle" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M12 19l6-6M12 19l-6-6" stroke="${changeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            ensPriceText.innerHTML = `
                <span style="font-weight: bold;">$${price.toLocaleString()}</span>
                <span style="color: ${changeColor}; margin-left: 4px;">${arrowSVG} ${Math.abs(change24h).toFixed(2)}%</span>
            `;
        } else {
            ensPriceText.textContent = 'Price unavailable';
        }
    } catch (error) {
        ensPriceText.textContent = 'Price unavailable';
    }
}



// Custom Resolver Functions (DISABLED)
function validateCustomResolver() {
    // Custom resolver functionality is disabled
    return;

    // const resolverUrl = customResolverInput.value.trim();
    // const statusIndicator = resolverStatusIndicator;
    // const statusText = resolverStatusText;

    // if (!resolverUrl) {
    //     statusIndicator.className = 'status-indicator';
    //     statusText.textContent = 'Using default resolver';
    //     return;
    // }

    // try {
    //     new URL(resolverUrl);
    //     statusIndicator.className = 'status-indicator';
    //     statusText.textContent = 'Custom resolver configured';

    //     // Save custom resolver to storage
    //     chrome.storage.sync.set({
    //         customResolver: resolverUrl
    //     });
    // } catch (error) {
    //     statusIndicator.className = 'status-indicator error';
    //     statusText.textContent = 'Invalid URL format';
    // }
}

async function openRemixWithResolver() {
    // Solidity code for a basic ENS resolver
    const resolverCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";

/**
 * @title Basic ENS Resolver
 * @dev A simple ENS resolver that can be customized for your needs
 * @author Fusion ENS
 */
contract BasicResolver is Resolver {
    
    // Mapping to store addresses for names
    mapping(bytes32 => address) private addresses;
    
    // Events
    event AddressChanged(bytes32 indexed node, address a);
    
    /**
     * @dev Sets the address for a given ENS name
     * @param node The ENS node hash
     * @param a The address to set
     */
    function setAddr(bytes32 node, address a) external {
        addresses[node] = a;
        emit AddressChanged(node, a);
    }
    
    /**
     * @dev Returns the address for a given ENS name
     * @param node The ENS node hash
     * @return The address associated with the node
     */
    function addr(bytes32 node) public view override returns (address) {
        return addresses[node];
    }
    
    /**
     * @dev Sets multiple records for a node
     * @param node The ENS node hash
     * @param key The record key
     * @param value The record value
     */
    function setText(bytes32 node, string calldata key, string calldata value) external {
        _setText(node, key, value);
    }
    
    /**
     * @dev Sets the content hash for a node
     * @param node The ENS node hash
     * @param hash The content hash
     */
    function setContenthash(bytes32 node, bytes calldata hash) external {
        _setContenthash(node, hash);
    }
}`;

    try {
        // Copy the code to clipboard
        await navigator.clipboard.writeText(resolverCode);

        // Open Remix in a new tab
        chrome.tabs.create({ url: 'https://remix.ethereum.org/' });

        // Show instructions
        toast('Code copied! Paste it in Remix and create a new file called "BasicResolver.sol"', 5000);

    } catch (error) {

        // Fallback: just open Remix
        chrome.tabs.create({ url: 'https://remix.ethereum.org/' });
        toast('Opening Remix... Create a new file and use the resolver template from the documentation', 4000);
    }
}

// Initialize extension
window.onload = async () => {
    // Initialize DOM elements
    searchElement = document.getElementById("uinput");
    resolveBtn = document.getElementById("btnResolve");
    resultCard = document.getElementById("resultCard");
    lblValue = document.getElementById("lblValue");
    lblHidden = document.getElementById("lblHidden");
    copyBtn = document.getElementById("copyBtn");
    explorerBtn = document.getElementById("btnExplorer");
    efpBtn = document.getElementById("btnEfp");
    settingsBtn = document.getElementById("settingsBtn");
    helpBtn = document.getElementById("helpBtn");
    settingsModal = document.getElementById("settingsModal");
    closeSettingsBtn = document.getElementById("closeSettingsBtn");
    autoReplaceToggle = document.getElementById("autoReplaceToggle");
    ethPriceText = document.getElementById("ethPriceText");
    mainnetBtn = document.getElementById("mainnetBtn");
    testnetBtn = document.getElementById("testnetBtn");
    networkIndicator = document.getElementById("networkIndicator");
    customResolverInput = document.getElementById("customResolverInput");
    deployResolverBtn = document.getElementById("deployResolverBtn");
    resolverStatusIndicator = document.getElementById("resolverStatusIndicator");
    resolverStatusText = document.getElementById("resolverStatusText");

    // Start rotating ENS names in the title
    rotateEnsName(); // Set initial name
    setInterval(rotateEnsName, 1000); // Rotate every second

    // Set up event listeners
    explorerBtn.onclick = explore;
    efpBtn.onclick = openEfp;
    resolveBtn.onclick = resolve;
    copyBtn.onclick = copy;
    // deployResolverBtn.onclick = openRemixWithResolver; // DISABLED
    // customResolverInput.addEventListener('input', validateCustomResolver); // DISABLED
    settingsBtn.onclick = () => {
        settingsModal.style.display = "flex";
    };
    helpBtn.onclick = () => {
        chrome.tabs.create({ url: 'https://fusionens.com/chrome-extension' });
    };
    closeSettingsBtn.onclick = () => {
        settingsModal.style.display = "none";
    };

    // Close modal when clicking outside
    settingsModal.onclick = (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = "none";
        }
    };

    // Handle toggle changes
    if (autoReplaceToggle) {
        autoReplaceToggle.onchange = () => {
            settings.autoReplace = autoReplaceToggle.checked;
            saveSettings();

            // Send setting to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateAutoReplace',
                        enabled: settings.autoReplace
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            // Content script not available, ignore
                        }
                    });
                }
            });
        };
    }

    // Handle network button changes
    if (mainnetBtn && testnetBtn) {
        mainnetBtn.onclick = () => {
            settings.network = 'mainnet';
            mainnetBtn.classList.add('active');
            testnetBtn.classList.remove('active');
            updateNetworkIndicator();
            saveSettings();

            // Send network setting to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateNetwork',
                        network: settings.network
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            // Content script not available, ignore
                        }
                    });
                }
            });
        };

        testnetBtn.onclick = () => {
            settings.network = 'testnet';
            mainnetBtn.classList.remove('active');
            testnetBtn.classList.add('active');
            updateNetworkIndicator();
            saveSettings();

            // Send network setting to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateNetwork',
                        network: settings.network
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            // Content script not available, ignore
                        }
                    });
                }
            });
        };
    }

    if (searchElement) {
        searchElement.addEventListener("keydown", function (event) {
            if (event.code === "Enter" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                event.preventDefault();
                resolve();
            } else if (event.code === "Space") {
                event.preventDefault();
            }
        });
    }

    // Add keyboard shortcuts
    document.addEventListener("keydown", function (event) {
        // Ctrl/Cmd + Enter: Open on Etherscan
        if ((event.ctrlKey || event.metaKey) && event.code === "Enter") {
            event.preventDefault();
            explore();
        }
        // Shift + Enter: Open on app.ens.domains
        if (event.shiftKey && event.code === "Enter") {
            event.preventDefault();
            exploreEthXyz();
        }
    });

    // Load settings first
    await loadSettings();

    // Focus input immediately
    if (searchElement) {
        focusInput();
    }

    // Add auto-complete functionality
    if (searchElement) {
        setupAutoComplete();
    }

    // Fetch ETH and ENS prices
    fetchEthPrice();
    fetchEnsPrice();
}; 