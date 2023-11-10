"use strict";
/*

The values for the various fork coins can be found in these files:

property       filename                  varname                           notes
------------------------------------------------------------------------------------------------------------------------
messagePrefix  src/validation.cpp        strMessageMagic                   Format `${CoinName} Signed Message`
bech32_hrp     src/chainparams.cpp       bech32_hrp                        Only for some networks
bip32.public   src/chainparams.cpp       base58Prefixes[EXT_PUBLIC_KEY]    Mainnets have same value, testnets have same value
bip32.private  src/chainparams.cpp       base58Prefixes[EXT_SECRET_KEY]    Mainnets have same value, testnets have same value
pubKeyHash     src/chainparams.cpp       base58Prefixes[PUBKEY_ADDRESS]
scriptHash     src/chainparams.cpp       base58Prefixes[SCRIPT_ADDRESS]
wif            src/chainparams.cpp       base58Prefixes[SECRET_KEY]        Testnets have same value
forkId         src/script/interpreter.h  FORKID_*

*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsTaproot = exports.supportsSegwit = exports.isValidNetwork = exports.isZcash = exports.isLitecoin = exports.isDogecoin = exports.isDash = exports.isBitcoinSV = exports.isBitcoinGold = exports.isECash = exports.isBitcoinCash = exports.isBitcoin = exports.getTestnet = exports.isSameCoin = exports.isTestnet = exports.isMainnet = exports.getMainnet = exports.getNetworkName = exports.getNetworkList = exports.networks = void 0;
/**
 * @deprecated
 */
const coins = {
    /*
     * The original Bitcoin Cash was renamed to bitcoin-abc, and bitcoin-cash-node forked from it.
     * Later, bitcoin-abc is rebranded to ecash. Here, 'bch' corresponds to bitcoin-cash-node, and
     * 'bcha' corresponds to ecash. Ref: https://github.com/bitcoin-cash-node/bitcoin-cash-node
     * */
    BCH: 'bch',
    BCHA: 'bcha',
    BSV: 'bsv',
    BTC: 'btc',
    BTG: 'btg',
    LTC: 'ltc',
    ZEC: 'zec',
    DASH: 'dash',
    DOGE: 'doge',
    // #9286F8 PECUNIA CHANGES
    BBC: 'bbc',
};
function getDefaultBip32Mainnet() {
    return {
        // base58 'xpub'
        public: 0x0488b21e,
        // base58 'xprv'
        private: 0x0488ade4,
    };
}
function getDefaultBip32Testnet() {
    return {
        // base58 'tpub'
        public: 0x043587cf,
        // base58 'tprv'
        private: 0x04358394,
    };
}
exports.networks = {
    // https://github.com/bitcoin/bitcoin/blob/master/src/validation.cpp
    // https://github.com/bitcoin/bitcoin/blob/master/src/chainparams.cpp
    bitcoin: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bech32: 'bc',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80,
        coin: coins.BTC,
    },
    testnet: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bech32: 'tb',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef,
        coin: coins.BTC,
    },
    // https://github.com/bitcoin-cash-node/bitcoin-cash-node/blob/master/src/validation.cpp
    // https://github.com/bitcoin-cash-node/bitcoin-cash-node/blob/master/src/chainparams.cpp
    // https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md
    bitcoincash: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80,
        coin: coins.BCH,
        forkId: 0x00,
        cashAddr: {
            prefix: 'bitcoincash',
            pubKeyHash: 0x00,
            scriptHash: 0x08,
        },
    },
    bitcoincashTestnet: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef,
        coin: coins.BCH,
        cashAddr: {
            prefix: 'bchtest',
            pubKeyHash: 0x00,
            scriptHash: 0x08,
        },
    },
    // https://github.com/BTCGPU/BTCGPU/blob/master/src/validation.cpp
    // https://github.com/BTCGPU/BTCGPU/blob/master/src/chainparams.cpp
    // https://github.com/BTCGPU/BTCGPU/blob/master/src/script/interpreter.h
    bitcoingold: {
        messagePrefix: '\x18Bitcoin Gold Signed Message:\n',
        bech32: 'btg',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x26,
        scriptHash: 0x17,
        wif: 0x80,
        forkId: 79,
        coin: coins.BTG,
    },
    bitcoingoldTestnet: {
        messagePrefix: '\x18Bitcoin Gold Signed Message:\n',
        bech32: 'tbtg',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 111,
        scriptHash: 196,
        wif: 0xef,
        forkId: 79,
        coin: coins.BTG,
    },
    // https://github.com/bitcoin-sv/bitcoin-sv/blob/master/src/validation.cpp
    // https://github.com/bitcoin-sv/bitcoin-sv/blob/master/src/chainparams.cpp
    bitcoinsv: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80,
        coin: coins.BSV,
        forkId: 0x00,
    },
    bitcoinsvTestnet: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef,
        coin: coins.BSV,
        forkId: 0x00,
    },
    // https://github.com/dashpay/dash/blob/master/src/validation.cpp
    // https://github.com/dashpay/dash/blob/master/src/chainparams.cpp
    dash: {
        messagePrefix: '\x19DarkCoin Signed Message:\n',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x4c,
        scriptHash: 0x10,
        wif: 0xcc,
        coin: coins.DASH,
    },
    dashTest: {
        messagePrefix: '\x19DarkCoin Signed Message:\n',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x8c,
        scriptHash: 0x13,
        wif: 0xef,
        coin: coins.DASH,
    },
    // https://github.com/dogecoin/dogecoin/blob/master/src/validation.cpp
    // https://github.com/dogecoin/dogecoin/blob/master/src/chainparams.cpp
    // Mainnet bip32 here does not match dogecoin core, this is intended (see BG-53241)
    dogecoin: {
        messagePrefix: '\x19Dogecoin Signed Message:\n',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x1e,
        scriptHash: 0x16,
        wif: 0x9e,
        coin: coins.DOGE,
    },
    dogecoinTest: {
        messagePrefix: '\x19Dogecoin Signed Message:\n',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x71,
        scriptHash: 0xc4,
        wif: 0xf1,
        coin: coins.DOGE,
    },
    // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/src/validation.cpp
    // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/src/chainparams.cpp
    // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/src/util/message.cpp
    ecash: {
        messagePrefix: '\x16eCash Signed Message:\n',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80,
        coin: coins.BCHA,
        forkId: 0x00,
        cashAddr: {
            prefix: 'ecash',
            pubKeyHash: 0x00,
            scriptHash: 0x08,
        },
    },
    ecashTest: {
        messagePrefix: '\x16eCash Signed Message:\n',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef,
        coin: coins.BCHA,
        cashAddr: {
            prefix: 'ecashtest',
            pubKeyHash: 0x00,
            scriptHash: 0x08,
        },
    },
    // https://github.com/litecoin-project/litecoin/blob/master/src/validation.cpp
    // https://github.com/litecoin-project/litecoin/blob/master/src/chainparams.cpp
    litecoin: {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'ltc',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0,
        coin: coins.LTC,
    },
    litecoinTest: {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'tltc',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x6f,
        scriptHash: 0x3a,
        wif: 0xef,
        coin: coins.LTC,
    },
    // https://github.com/zcash/zcash/blob/master/src/validation.cpp
    // https://github.com/zcash/zcash/blob/master/src/chainparams.cpp
    zcash: {
        messagePrefix: '\x18ZCash Signed Message:\n',
        bip32: getDefaultBip32Mainnet(),
        pubKeyHash: 0x1cb8,
        scriptHash: 0x1cbd,
        wif: 0x80,
        coin: coins.ZEC,
    },
    zcashTest: {
        messagePrefix: '\x18ZCash Signed Message:\n',
        bip32: getDefaultBip32Testnet(),
        pubKeyHash: 0x1d25,
        scriptHash: 0x1cba,
        wif: 0xef,
        coin: coins.ZEC,
    },
    // #9286F8 PECUNIA CHANGES
    bbc: {
        messagePrefix: '\x19DarkCoin Signed Message:\n',
        bip32: {
            public: 0x0488ade3,
            private: 0x0488b21e,
        },
        pubKeyHash: 0x19,
        scriptHash: 0x66,
        wif: 0xcd,
        coin: coins.BBC,
    },
};
/**
 * @returns {Network[]} all known networks as array
 */
function getNetworkList() {
    return Object.values(exports.networks);
}
exports.getNetworkList = getNetworkList;
/**
 * @param {Network} network
 * @returns {NetworkName} the name of the network. Returns undefined if network is not a value
 *                        of `networks`
 */
function getNetworkName(network) {
    return Object.keys(exports.networks).find((n) => exports.networks[n] === network);
}
exports.getNetworkName = getNetworkName;
/**
 * @param {Network} network
 * @returns {Object} the mainnet corresponding to a testnet
 */
function getMainnet(network) {
    switch (network.forkChain) {
        case 'bitcoin':
            return exports.networks.bitcoin;
        case 'bitcoincash':
            return exports.networks.bitcoincash;
        case 'bitcoingold':
            return exports.networks.bitcoingold;
        case 'bitcoinsv':
            return exports.networks.bitcoinsv;
        case 'dash':
            return exports.networks.dash;
        case 'ecash':
            return exports.networks.ecash;
        case 'litecoin':
            return exports.networks.litecoin;
        case 'zcash':
            return exports.networks.zcash;
        case 'dogecoin':
            return exports.networks.dogecoin;
        // #9286F8 PECUNIA CHANGES
        default:
            return exports.networks.bitcoin;
    }
}
exports.getMainnet = getMainnet;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is a mainnet
 */
function isMainnet(network) {
    return getMainnet(network) === network;
}
exports.isMainnet = isMainnet;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is a testnet
 */
function isTestnet(network) {
    return getMainnet(network) !== network;
}
exports.isTestnet = isTestnet;
/**
 *
 * @param {Network} network
 * @param {Network} otherNetwork
 * @returns {boolean} true iff both networks are for the same coin
 */
function isSameCoin(network, otherNetwork) {
    return getMainnet(network) === getMainnet(otherNetwork);
}
exports.isSameCoin = isSameCoin;
const mainnets = getNetworkList().filter(isMainnet);
const testnets = getNetworkList().filter(isTestnet);
/**
 * Map where keys are mainnet networks and values are testnet networks
 * @type {Map<Network, Network[]>}
 */
const mainnetTestnetPairs = new Map(mainnets.map((m) => [m, testnets.filter((t) => getMainnet(t) === m)]));
/**
 * @param {Network} network
 * @returns {Network|undefined} - The testnet corresponding to a mainnet.
 *                               Returns undefined if a network has no testnet.
 */
function getTestnet(network) {
    if (isTestnet(network)) {
        return network;
    }
    const testnets = mainnetTestnetPairs.get(network);
    if (testnets === undefined) {
        throw new Error(`invalid argument`);
    }
    if (testnets.length === 0) {
        return;
    }
    if (testnets.length === 1) {
        return testnets[0];
    }
    throw new Error(`more than one testnet for ${getNetworkName(network)}`);
}
exports.getTestnet = getTestnet;
/**
 * @param {Network} network
 * @returns {boolean} true iff network bitcoin or testnet
 */
function isBitcoin(network) {
    return getMainnet(network) === exports.networks.bitcoin;
}
exports.isBitcoin = isBitcoin;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is bitcoincash or bitcoincashTestnet
 */
function isBitcoinCash(network) {
    return getMainnet(network) === exports.networks.bitcoincash;
}
exports.isBitcoinCash = isBitcoinCash;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is ecash or ecashTest
 */
function isECash(network) {
    return getMainnet(network) === exports.networks.ecash;
}
exports.isECash = isECash;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is bitcoingold
 */
function isBitcoinGold(network) {
    return getMainnet(network) === exports.networks.bitcoingold;
}
exports.isBitcoinGold = isBitcoinGold;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is bitcoinsv or bitcoinsvTestnet
 */
function isBitcoinSV(network) {
    return getMainnet(network) === exports.networks.bitcoinsv;
}
exports.isBitcoinSV = isBitcoinSV;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is dash or dashTest
 */
function isDash(network) {
    return getMainnet(network) === exports.networks.dash;
}
exports.isDash = isDash;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is dogecoin or dogecoinTest
 */
function isDogecoin(network) {
    return getMainnet(network) === exports.networks.dogecoin;
}
exports.isDogecoin = isDogecoin;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is litecoin or litecoinTest
 */
function isLitecoin(network) {
    return getMainnet(network) === exports.networks.litecoin;
}
exports.isLitecoin = isLitecoin;
/**
 * @param {Network} network
 * @returns {boolean} true iff network is zcash or zcashTest
 */
function isZcash(network) {
    return getMainnet(network) === exports.networks.zcash;
}
exports.isZcash = isZcash;
/**
 * @param {unknown} network
 * @returns {boolean} returns true iff network is any of the network stated in the argument
 */
function isValidNetwork(network) {
    return getNetworkList().includes(network);
}
exports.isValidNetwork = isValidNetwork;
function supportsSegwit(network) {
    return [exports.networks.bitcoin, exports.networks.litecoin, exports.networks.bitcoingold].includes(getMainnet(network));
}
exports.supportsSegwit = supportsSegwit;
function supportsTaproot(network) {
    return getMainnet(network) === exports.networks.bitcoin;
}
exports.supportsTaproot = supportsTaproot;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29ya3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbmV0d29ya3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7RUFlRTs7O0FBRUY7O0dBRUc7QUFDSCxNQUFNLEtBQUssR0FBRztJQUNaOzs7O1NBSUs7SUFDTCxHQUFHLEVBQUUsS0FBSztJQUNWLElBQUksRUFBRSxNQUFNO0lBQ1osR0FBRyxFQUFFLEtBQUs7SUFDVixHQUFHLEVBQUUsS0FBSztJQUNWLEdBQUcsRUFBRSxLQUFLO0lBQ1YsR0FBRyxFQUFFLEtBQUs7SUFDVixHQUFHLEVBQUUsS0FBSztJQUNWLElBQUksRUFBRSxNQUFNO0lBQ1osSUFBSSxFQUFFLE1BQU07SUFDWiwwQkFBMEI7SUFDMUIsR0FBRyxFQUFFLEtBQUs7Q0FDRixDQUFDO0FBK0NYLFNBQVMsc0JBQXNCO0lBQzdCLE9BQU87UUFDTCxnQkFBZ0I7UUFDaEIsTUFBTSxFQUFFLFVBQVU7UUFDbEIsZ0JBQWdCO1FBQ2hCLE9BQU8sRUFBRSxVQUFVO0tBQ3BCLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxzQkFBc0I7SUFDN0IsT0FBTztRQUNMLGdCQUFnQjtRQUNoQixNQUFNLEVBQUUsVUFBVTtRQUNsQixnQkFBZ0I7UUFDaEIsT0FBTyxFQUFFLFVBQVU7S0FDcEIsQ0FBQztBQUNKLENBQUM7QUFFWSxRQUFBLFFBQVEsR0FBaUM7SUFDcEQsb0VBQW9FO0lBQ3BFLHFFQUFxRTtJQUNyRSxPQUFPLEVBQUU7UUFDUCxhQUFhLEVBQUUsK0JBQStCO1FBQzlDLE1BQU0sRUFBRSxJQUFJO1FBQ1osS0FBSyxFQUFFLHNCQUFzQixFQUFFO1FBQy9CLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLEdBQUcsRUFBRSxJQUFJO1FBQ1QsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHO0tBQ2hCO0lBQ0QsT0FBTyxFQUFFO1FBQ1AsYUFBYSxFQUFFLCtC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QyxLQUFLLGdCQUFRLENBQUMsT0FBTyxDQUFDO0FBQ2xELENBQUM7QUFGRCwwQ0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG5cblRoZSB2YWx1ZXMgZm9yIHRoZSB2YXJpb3VzIGZvcmsgY29pbnMgY2FuIGJlIGZvdW5kIGluIHRoZXNlIGZpbGVzOlxuXG5wcm9wZXJ0eSAgICAgICBmaWxlbmFtZSAgICAgICAgICAgICAgICAgIHZhcm5hbWUgICAgICAgICAgICAgICAgICAgICAgICAgICBub3Rlc1xuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tZXNzYWdlUHJlZml4ICBzcmMvdmFsaWRhdGlvbi5jcHAgICAgICAgIHN0ck1lc3NhZ2VNYWdpYyAgICAgICAgICAgICAgICAgICBGb3JtYXQgYCR7Q29pbk5hbWV9IFNpZ25lZCBNZXNzYWdlYFxuYmVjaDMyX2hycCAgICAgc3JjL2NoYWlucGFyYW1zLmNwcCAgICAgICBiZWNoMzJfaHJwICAgICAgICAgICAgICAgICAgICAgICAgT25seSBmb3Igc29tZSBuZXR3b3Jrc1xuYmlwMzIucHVibGljICAgc3JjL2NoYWlucGFyYW1zLmNwcCAgICAgICBiYXNlNThQcmVmaXhlc1tFWFRfUFVCTElDX0tFWV0gICAgTWFpbm5ldHMgaGF2ZSBzYW1lIHZhbHVlLCB0ZXN0bmV0cyBoYXZlIHNhbWUgdmFsdWVcbmJpcDMyLnByaXZhdGUgIHNyYy9jaGFpbnBhcmFtcy5jcHAgICAgICAgYmFzZTU4UHJlZml4ZXNbRVhUX1NFQ1JFVF9LRVldICAgIE1haW5uZXRzIGhhdmUgc2FtZSB2YWx1ZSwgdGVzdG5ldHMgaGF2ZSBzYW1lIHZhbHVlXG5wdWJLZXlIYXNoICAgICBzcmMvY2hhaW5wYXJhbXMuY3BwICAgICAgIGJhc2U1OFByZWZpeGVzW1BVQktFWV9BRERSRVNTXVxuc2NyaXB0SGFzaCAgICAgc3JjL2NoYWlucGFyYW1zLmNwcCAgICAgICBiYXNlNThQcmVmaXhlc1tTQ1JJUFRfQUREUkVTU11cbndpZiAgICAgICAgICAgIHNyYy9jaGFpbnBhcmFtcy5jcHAgICAgICAgYmFzZTU4UHJlZml4ZXNbU0VDUkVUX0tFWV0gICAgICAgIFRlc3RuZXRzIGhhdmUgc2FtZSB2YWx1ZVxuZm9ya0lkICAgICAgICAgc3JjL3NjcmlwdC9pbnRlcnByZXRlci5oICBGT1JLSURfKlxuXG4qL1xuXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmNvbnN0IGNvaW5zID0ge1xuICAvKlxuICAgKiBUaGUgb3JpZ2luYWwgQml0Y29pbiBDYXNoIHdhcyByZW5hbWVkIHRvIGJpdGNvaW4tYWJjLCBhbmQgYml0Y29pbi1jYXNoLW5vZGUgZm9ya2VkIGZyb20gaXQuXG4gICAqIExhdGVyLCBiaXRjb2luLWFiYyBpcyByZWJyYW5kZWQgdG8gZWNhc2guIEhlcmUsICdiY2gnIGNvcnJlc3BvbmRzIHRvIGJpdGNvaW4tY2FzaC1ub2RlLCBhbmRcbiAgICogJ2JjaGEnIGNvcnJlc3BvbmRzIHRvIGVjYXNoLiBSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9iaXRjb2luLWNhc2gtbm9kZS9iaXRjb2luLWNhc2gtbm9kZVxuICAgKiAqL1xuICBCQ0g6ICdiY2gnLFxuICBCQ0hBOiAnYmNoYScsXG4gIEJTVjogJ2JzdicsXG4gIEJUQzogJ2J0YycsXG4gIEJURzogJ2J0ZycsXG4gIExUQzogJ2x0YycsXG4gIFpFQzogJ3plYycsXG4gIERBU0g6ICdkYXNoJyxcbiAgRE9HRTogJ2RvZ2UnLFxuICAvLyAjOTI4NkY4IFBFQ1VOSUEgQ0hBTkdFU1xuICBCQkM6ICdiYmMnLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgTmV0d29ya05hbWUgPVxuICB8ICdiaXRjb2luJ1xuICB8ICd0ZXN0bmV0J1xuICB8ICdiaXRjb2luY2FzaCdcbiAgfCAnYml0Y29pbmNhc2hUZXN0bmV0J1xuICB8ICdlY2FzaCdcbiAgfCAnZWNhc2hUZXN0J1xuICB8ICdiaXRjb2luZ29sZCdcbiAgfCAnYml0Y29pbmdvbGRUZXN0bmV0J1xuICB8ICdiaXRjb2luc3YnXG4gIHwgJ2JpdGNvaW5zdlRlc3RuZXQnXG4gIHwgJ2Rhc2gnXG4gIHwgJ2Rhc2hUZXN0J1xuICB8ICdkb2dlY29pbidcbiAgfCAnZG9nZWNvaW5UZXN0J1xuICB8ICdsaXRlY29pbidcbiAgfCAnbGl0ZWNvaW5UZXN0J1xuICB8ICd6Y2FzaCdcbiAgfCAnemNhc2hUZXN0J1xuICAvLyAjOTI4NkY4IFBFQ1VOSUEgQ0hBTkdFU1xuICB8ICdiYmMnO1xuXG5leHBvcnQgdHlwZSBOZXR3b3JrID0ge1xuICBtZXNzYWdlUHJlZml4OiBzdHJpbmc7XG4gIHB1YktleUhhc2g6IG51bWJlcjtcbiAgc2NyaXB0SGFzaDogbnVtYmVyO1xuICB3aWY6IG51bWJlcjtcbiAgYmlwMzI6IHtcbiAgICBwdWJsaWM6IG51bWJlcjtcbiAgICBwcml2YXRlOiBudW1iZXI7XG4gIH07XG4gIGNhc2hBZGRyPzoge1xuICAgIHByZWZpeDogc3RyaW5nO1xuICAgIHB1YktleUhhc2g6IG51bWJlcjtcbiAgICBzY3JpcHRIYXNoOiBudW1iZXI7XG4gIH07XG4gIGJlY2gzMj86IHN0cmluZztcbiAgZm9ya0lkPzogbnVtYmVyO1xuICAvKipcbiAgICogQGRlcHJlY2F0ZWRcbiAgICovXG4gIGNvaW46IHN0cmluZztcbiAgZm9ya0NoYWluPzogc3RyaW5nO1xufTtcblxuZnVuY3Rpb24gZ2V0RGVmYXVsdEJpcDMyTWFpbm5ldCgpIHtcbiAgcmV0dXJuIHtcbiAgICAvLyBiYXNlNTggJ3hwdWInXG4gICAgcHVibGljOiAweDA0ODhiMjFlLFxuICAgIC8vIGJhc2U1OCAneHBydidcbiAgICBwcml2YXRlOiAweDA0ODhhZGU0LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0QmlwMzJUZXN0bmV0KCkge1xuICByZXR1cm4ge1xuICAgIC8vIGJhc2U1OCAndHB1YidcbiAgICBwdWJsaWM6IDB4MDQzNTg3Y2YsXG4gICAgLy8gYmFzZTU4ICd0cHJ2J1xuICAgIHByaXZhdGU6IDB4MDQzNTgzOTQsXG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCBuZXR3b3JrczogUmVjb3JkPE5ldHdvcmtOYW1lLCBOZXR3b3JrPiA9IHtcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4vYml0Y29pbi9ibG9iL21hc3Rlci9zcmMvdmFsaWRhdGlvbi5jcHBcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4vYml0Y29pbi9ibG9iL21hc3Rlci9zcmMvY2hhaW5wYXJhbXMuY3BwXG4gIGJpdGNvaW46IHtcbiAgICBtZXNzYWdlUHJlZml4OiAnXFx4MThCaXRjb2luIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmVjaDMyOiAnYmMnLFxuICAgIGJpcDMyOiBnZXREZWZhdWx0QmlwMzJNYWlubmV0KCksXG4gICAgcHViS2V5SGFzaDogMHgwMCxcbiAgICBzY3JpcHRIYXNoOiAweDA1LFxuICAgIHdpZjogMHg4MCxcbiAgICBjb2luOiBjb2lucy5CVEMsXG4gIH0sXG4gIHRlc3RuZXQ6IHtcbiAgICBtZXNzYWdlUHJlZml4OiAnXFx4MThCaXRjb2luIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmVjaDMyOiAndGInLFxuICAgIGJpcDMyOiBnZXREZWZhdWx0QmlwMzJUZXN0bmV0KCksXG4gICAgcHViS2V5SGFzaDogMHg2ZixcbiAgICBzY3JpcHRIYXNoOiAweGM0LFxuICAgIHdpZjogMHhlZixcbiAgICBjb2luOiBjb2lucy5CVEMsXG4gIH0sXG5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4tY2FzaC1ub2RlL2JpdGNvaW4tY2FzaC1ub2RlL2Jsb2IvbWFzdGVyL3NyYy92YWxpZGF0aW9uLmNwcFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vYml0Y29pbi1jYXNoLW5vZGUvYml0Y29pbi1jYXNoLW5vZGUvYmxvYi9tYXN0ZXIvc3JjL2NoYWlucGFyYW1zLmNwcFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vYml0Y29pbmNhc2hvcmcvYml0Y29pbmNhc2gub3JnL2Jsb2IvbWFzdGVyL3NwZWMvY2FzaGFkZHIubWRcbiAgYml0Y29pbmNhc2g6IHtcbiAgICBtZXNzYWdlUHJlZml4OiAnXFx4MThCaXRjb2luIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmlwMzI6IGdldERlZmF1bHRCaXAzMk1haW5uZXQoKSxcbiAgICBwdWJLZXlIYXNoOiAweDAwLFxuICAgIHNjcmlwdEhhc2g6IDB4MDUsXG4gICAgd2lmOiAweDgwLFxuICAgIGNvaW46IGNvaW5zLkJDSCxcbiAgICBmb3JrSWQ6IDB4MDAsXG4gICAgY2FzaEFkZHI6IHtcbiAgICAgIHByZWZpeDogJ2JpdGNvaW5jYXNoJyxcbiAgICAgIHB1YktleUhhc2g6IDB4MDAsXG4gICAgICBzY3JpcHRIYXNoOiAweDA4LFxuICAgIH0sXG4gIH0sXG4gIGJpdGNvaW5jYXNoVGVzdG5ldDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOEJpdGNvaW4gU2lnbmVkIE1lc3NhZ2U6XFxuJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyVGVzdG5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4NmYsXG4gICAgc2NyaXB0SGFzaDogMHhjNCxcbiAgICB3aWY6IDB4ZWYsXG4gICAgY29pbjogY29pbnMuQkNILFxuICAgIGNhc2hBZGRyOiB7XG4gICAgICBwcmVmaXg6ICdiY2h0ZXN0JyxcbiAgICAgIHB1YktleUhhc2g6IDB4MDAsXG4gICAgICBzY3JpcHRIYXNoOiAweDA4LFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0JUQ0dQVS9CVENHUFUvYmxvYi9tYXN0ZXIvc3JjL3ZhbGlkYXRpb24uY3BwXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9CVENHUFUvQlRDR1BVL2Jsb2IvbWFzdGVyL3NyYy9jaGFpbnBhcmFtcy5jcHBcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0JUQ0dQVS9CVENHUFUvYmxvYi9tYXN0ZXIvc3JjL3NjcmlwdC9pbnRlcnByZXRlci5oXG4gIGJpdGNvaW5nb2xkOiB7XG4gICAgbWVzc2FnZVByZWZpeDogJ1xceDE4Qml0Y29pbiBHb2xkIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmVjaDMyOiAnYnRnJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyTWFpbm5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4MjYsXG4gICAgc2NyaXB0SGFzaDogMHgxNyxcbiAgICB3aWY6IDB4ODAsXG4gICAgZm9ya0lkOiA3OSxcbiAgICBjb2luOiBjb2lucy5CVEcsXG4gIH0sXG4gIGJpdGNvaW5nb2xkVGVzdG5ldDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOEJpdGNvaW4gR29sZCBTaWduZWQgTWVzc2FnZTpcXG4nLFxuICAgIGJlY2gzMjogJ3RidGcnLFxuICAgIGJpcDMyOiBnZXREZWZhdWx0QmlwMzJUZXN0bmV0KCksXG4gICAgcHViS2V5SGFzaDogMTExLFxuICAgIHNjcmlwdEhhc2g6IDE5NixcbiAgICB3aWY6IDB4ZWYsXG4gICAgZm9ya0lkOiA3OSxcbiAgICBjb2luOiBjb2lucy5CVEcsXG4gIH0sXG5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4tc3YvYml0Y29pbi1zdi9ibG9iL21hc3Rlci9zcmMvdmFsaWRhdGlvbi5jcHBcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4tc3YvYml0Y29pbi1zdi9ibG9iL21hc3Rlci9zcmMvY2hhaW5wYXJhbXMuY3BwXG4gIGJpdGNvaW5zdjoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOEJpdGNvaW4gU2lnbmVkIE1lc3NhZ2U6XFxuJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyTWFpbm5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4MDAsXG4gICAgc2NyaXB0SGFzaDogMHgwNSxcbiAgICB3aWY6IDB4ODAsXG4gICAgY29pbjogY29pbnMuQlNWLFxuICAgIGZvcmtJZDogMHgwMCxcbiAgfSxcbiAgYml0Y29pbnN2VGVzdG5ldDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOEJpdGNvaW4gU2lnbmVkIE1lc3NhZ2U6XFxuJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyVGVzdG5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4NmYsXG4gICAgc2NyaXB0SGFzaDogMHhjNCxcbiAgICB3aWY6IDB4ZWYsXG4gICAgY29pbjogY29pbnMuQlNWLFxuICAgIGZvcmtJZDogMHgwMCxcbiAgfSxcblxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZGFzaHBheS9kYXNoL2Jsb2IvbWFzdGVyL3NyYy92YWxpZGF0aW9uLmNwcFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZGFzaHBheS9kYXNoL2Jsb2IvbWFzdGVyL3NyYy9jaGFpbnBhcmFtcy5jcHBcbiAgZGFzaDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOURhcmtDb2luIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmlwMzI6IGdldERlZmF1bHRCaXAzMk1haW5uZXQoKSxcbiAgICBwdWJLZXlIYXNoOiAweDRjLFxuICAgIHNjcmlwdEhhc2g6IDB4MTAsXG4gICAgd2lmOiAweGNjLFxuICAgIGNvaW46IGNvaW5zLkRBU0gsXG4gIH0sXG4gIGRhc2hUZXN0OiB7XG4gICAgbWVzc2FnZVByZWZpeDogJ1xceDE5RGFya0NvaW4gU2lnbmVkIE1lc3NhZ2U6XFxuJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyVGVzdG5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4OGMsXG4gICAgc2NyaXB0SGFzaDogMHgxMyxcbiAgICB3aWY6IDB4ZWYsXG4gICAgY29pbjogY29pbnMuREFTSCxcbiAgfSxcblxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZG9nZWNvaW4vZG9nZWNvaW4vYmxvYi9tYXN0ZXIvc3JjL3ZhbGlkYXRpb24uY3BwXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb2dlY29pbi9kb2dlY29pbi9ibG9iL21hc3Rlci9zcmMvY2hhaW5wYXJhbXMuY3BwXG4gIC8vIE1haW5uZXQgYmlwMzIgaGVyZSBkb2VzIG5vdCBtYXRjaCBkb2dlY29pbiBjb3JlLCB0aGlzIGlzIGludGVuZGVkIChzZWUgQkctNTMyNDEpXG4gIGRvZ2Vjb2luOiB7XG4gICAgbWVzc2FnZVByZWZpeDogJ1xceDE5RG9nZWNvaW4gU2lnbmVkIE1lc3NhZ2U6XFxuJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyTWFpbm5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4MWUsXG4gICAgc2NyaXB0SGFzaDogMHgxNixcbiAgICB3aWY6IDB4OWUsXG4gICAgY29pbjogY29pbnMuRE9HRSxcbiAgfSxcbiAgZG9nZWNvaW5UZXN0OiB7XG4gICAgbWVzc2FnZVByZWZpeDogJ1xceDE5RG9nZWNvaW4gU2lnbmVkIE1lc3NhZ2U6XFxuJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyVGVzdG5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4NzEsXG4gICAgc2NyaXB0SGFzaDogMHhjNCxcbiAgICB3aWY6IDB4ZjEsXG4gICAgY29pbjogY29pbnMuRE9HRSxcbiAgfSxcblxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vQml0Y29pbi1BQkMvYml0Y29pbi1hYmMvYmxvYi9tYXN0ZXIvc3JjL3ZhbGlkYXRpb24uY3BwXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9CaXRjb2luLUFCQy9iaXRjb2luLWFiYy9ibG9iL21hc3Rlci9zcmMvY2hhaW5wYXJhbXMuY3BwXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9CaXRjb2luLUFCQy9iaXRjb2luLWFiYy9ibG9iL21hc3Rlci9zcmMvdXRpbC9tZXNzYWdlLmNwcFxuICBlY2FzaDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxNmVDYXNoIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmlwMzI6IGdldERlZmF1bHRCaXAzMk1haW5uZXQoKSxcbiAgICBwdWJLZXlIYXNoOiAweDAwLFxuICAgIHNjcmlwdEhhc2g6IDB4MDUsXG4gICAgd2lmOiAweDgwLFxuICAgIGNvaW46IGNvaW5zLkJDSEEsXG4gICAgZm9ya0lkOiAweDAwLFxuICAgIGNhc2hBZGRyOiB7XG4gICAgICBwcmVmaXg6ICdlY2FzaCcsXG4gICAgICBwdWJLZXlIYXNoOiAweDAwLFxuICAgICAgc2NyaXB0SGFzaDogMHgwOCxcbiAgICB9LFxuICB9LFxuICBlY2FzaFRlc3Q6IHtcbiAgICBtZXNzYWdlUHJlZml4OiAnXFx4MTZlQ2FzaCBTaWduZWQgTWVzc2FnZTpcXG4nLFxuICAgIGJpcDMyOiBnZXREZWZhdWx0QmlwMzJUZXN0bmV0KCksXG4gICAgcHViS2V5SGFzaDogMHg2ZixcbiAgICBzY3JpcHRIYXNoOiAweGM0LFxuICAgIHdpZjogMHhlZixcbiAgICBjb2luOiBjb2lucy5CQ0hBLFxuICAgIGNhc2hBZGRyOiB7XG4gICAgICBwcmVmaXg6ICdlY2FzaHRlc3QnLFxuICAgICAgcHViS2V5SGFzaDogMHgwMCxcbiAgICAgIHNjcmlwdEhhc2g6IDB4MDgsXG4gICAgfSxcbiAgfSxcblxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vbGl0ZWNvaW4tcHJvamVjdC9saXRlY29pbi9ibG9iL21hc3Rlci9zcmMvdmFsaWRhdGlvbi5jcHBcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2xpdGVjb2luLXByb2plY3QvbGl0ZWNvaW4vYmxvYi9tYXN0ZXIvc3JjL2NoYWlucGFyYW1zLmNwcFxuICBsaXRlY29pbjoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOUxpdGVjb2luIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmVjaDMyOiAnbHRjJyxcbiAgICBiaXAzMjogZ2V0RGVmYXVsdEJpcDMyTWFpbm5ldCgpLFxuICAgIHB1YktleUhhc2g6IDB4MzAsXG4gICAgc2NyaXB0SGFzaDogMHgzMixcbiAgICB3aWY6IDB4YjAsXG4gICAgY29pbjogY29pbnMuTFRDLFxuICB9LFxuICBsaXRlY29pblRlc3Q6IHtcbiAgICBtZXNzYWdlUHJlZml4OiAnXFx4MTlMaXRlY29pbiBTaWduZWQgTWVzc2FnZTpcXG4nLFxuICAgIGJlY2gzMjogJ3RsdGMnLFxuICAgIGJpcDMyOiBnZXREZWZhdWx0QmlwMzJUZXN0bmV0KCksXG4gICAgcHViS2V5SGFzaDogMHg2ZixcbiAgICBzY3JpcHRIYXNoOiAweDNhLFxuICAgIHdpZjogMHhlZixcbiAgICBjb2luOiBjb2lucy5MVEMsXG4gIH0sXG5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3pjYXNoL3pjYXNoL2Jsb2IvbWFzdGVyL3NyYy92YWxpZGF0aW9uLmNwcFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vemNhc2gvemNhc2gvYmxvYi9tYXN0ZXIvc3JjL2NoYWlucGFyYW1zLmNwcFxuICB6Y2FzaDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOFpDYXNoIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmlwMzI6IGdldERlZmF1bHRCaXAzMk1haW5uZXQoKSxcbiAgICBwdWJLZXlIYXNoOiAweDFjYjgsXG4gICAgc2NyaXB0SGFzaDogMHgxY2JkLFxuICAgIHdpZjogMHg4MCxcbiAgICBjb2luOiBjb2lucy5aRUMsXG4gIH0sXG4gIHpjYXNoVGVzdDoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOFpDYXNoIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmlwMzI6IGdldERlZmF1bHRCaXAzMlRlc3RuZXQoKSxcbiAgICBwdWJLZXlIYXNoOiAweDFkMjUsXG4gICAgc2NyaXB0SGFzaDogMHgxY2JhLFxuICAgIHdpZjogMHhlZixcbiAgICBjb2luOiBjb2lucy5aRUMsXG4gIH0sXG4gIC8vICM5Mjg2RjggUEVDVU5JQSBDSEFOR0VTXG4gIGJiYzoge1xuICAgIG1lc3NhZ2VQcmVmaXg6ICdcXHgxOURhcmtDb2luIFNpZ25lZCBNZXNzYWdlOlxcbicsXG4gICAgYmlwMzI6IHtcbiAgICAgIHB1YmxpYzogMHgwNDg4YWRlMyxcbiAgICAgIHByaXZhdGU6IDB4MDQ4OGIyMWUsXG4gICAgfSxcbiAgICBwdWJLZXlIYXNoOiAweDE5LFxuICAgIHNjcmlwdEhhc2g6IDB4NjYsXG4gICAgd2lmOiAweGNkLFxuICAgIGNvaW46IGNvaW5zLkJCQyxcbiAgfSxcbn07XG5cbi8qKlxuICogQHJldHVybnMge05ldHdvcmtbXX0gYWxsIGtub3duIG5ldHdvcmtzIGFzIGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXROZXR3b3JrTGlzdCgpOiBOZXR3b3JrW10ge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhuZXR3b3Jrcyk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7TmV0d29ya05hbWV9IHRoZSBuYW1lIG9mIHRoZSBuZXR3b3JrLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBuZXR3b3JrIGlzIG5vdCBhIHZhbHVlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgIG9mIGBuZXR3b3Jrc2BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE5ldHdvcmtOYW1lKG5ldHdvcms6IE5ldHdvcmspOiBOZXR3b3JrTmFtZSB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhuZXR3b3JrcykuZmluZCgobikgPT4gKG5ldHdvcmtzIGFzIFJlY29yZDxzdHJpbmcsIE5ldHdvcms+KVtuXSA9PT0gbmV0d29yaykgYXNcbiAgICB8IE5ldHdvcmtOYW1lXG4gICAgfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB0aGUgbWFpbm5ldCBjb3JyZXNwb25kaW5nIHRvIGEgdGVzdG5ldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWFpbm5ldChuZXR3b3JrOiBOZXR3b3JrKTogTmV0d29yayB7XG4gIHN3aXRjaCAobmV0d29yay5mb3JrQ2hhaW4pIHtcbiAgICBjYXNlICdiaXRjb2luJzpcbiAgICAgIHJldHVybiBuZXR3b3Jrcy5iaXRjb2luO1xuXG4gICAgY2FzZSAnYml0Y29pbmNhc2gnOlxuICAgICAgcmV0dXJuIG5ldHdvcmtzLmJpdGNvaW5jYXNoO1xuXG4gICAgY2FzZSAnYml0Y29pbmdvbGQnOlxuICAgICAgcmV0dXJuIG5ldHdvcmtzLmJpdGNvaW5nb2xkO1xuXG4gICAgY2FzZSAnYml0Y29pbnN2JzpcbiAgICAgIHJldHVybiBuZXR3b3Jrcy5iaXRjb2luc3Y7XG5cbiAgICBjYXNlICdkYXNoJzpcbiAgICAgIHJldHVybiBuZXR3b3Jrcy5kYXNoO1xuXG4gICAgY2FzZSAnZWNhc2gnOlxuICAgICAgcmV0dXJuIG5ldHdvcmtzLmVjYXNoO1xuXG4gICAgY2FzZSAnbGl0ZWNvaW4nOlxuICAgICAgcmV0dXJuIG5ldHdvcmtzLmxpdGVjb2luO1xuXG4gICAgY2FzZSAnemNhc2gnOlxuICAgICAgcmV0dXJuIG5ldHdvcmtzLnpjYXNoO1xuXG4gICAgY2FzZSAnZG9nZWNvaW4nOlxuICAgICAgcmV0dXJuIG5ldHdvcmtzLmRvZ2Vjb2luO1xuICAgIC8vICM5Mjg2RjggUEVDVU5JQSBDSEFOR0VTXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBuZXR3b3Jrcy5iaXRjb2luO1xuICB9XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgbmV0d29yayBpcyBhIG1haW5uZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWFpbm5ldChuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRNYWlubmV0KG5ldHdvcmspID09PSBuZXR3b3JrO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7TmV0d29ya30gbmV0d29ya1xuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWZmIG5ldHdvcmsgaXMgYSB0ZXN0bmV0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Rlc3RuZXQobmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0TWFpbm5ldChuZXR3b3JrKSAhPT0gbmV0d29yaztcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcGFyYW0ge05ldHdvcmt9IG90aGVyTmV0d29ya1xuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWZmIGJvdGggbmV0d29ya3MgYXJlIGZvciB0aGUgc2FtZSBjb2luXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1NhbWVDb2luKG5ldHdvcms6IE5ldHdvcmssIG90aGVyTmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0TWFpbm5ldChuZXR3b3JrKSA9PT0gZ2V0TWFpbm5ldChvdGhlck5ldHdvcmspO1xufVxuXG5jb25zdCBtYWlubmV0cyA9IGdldE5ldHdvcmtMaXN0KCkuZmlsdGVyKGlzTWFpbm5ldCk7XG5jb25zdCB0ZXN0bmV0cyA9IGdldE5ldHdvcmtMaXN0KCkuZmlsdGVyKGlzVGVzdG5ldCk7XG5cbi8qKlxuICogTWFwIHdoZXJlIGtleXMgYXJlIG1haW5uZXQgbmV0d29ya3MgYW5kIHZhbHVlcyBhcmUgdGVzdG5ldCBuZXR3b3Jrc1xuICogQHR5cGUge01hcDxOZXR3b3JrLCBOZXR3b3JrW10+fVxuICovXG5jb25zdCBtYWlubmV0VGVzdG5ldFBhaXJzID0gbmV3IE1hcChtYWlubmV0cy5tYXAoKG0pID0+IFttLCB0ZXN0bmV0cy5maWx0ZXIoKHQpID0+IGdldE1haW5uZXQodCkgPT09IG0pXSkpO1xuXG4vKipcbiAqIEBwYXJhbSB7TmV0d29ya30gbmV0d29ya1xuICogQHJldHVybnMge05ldHdvcmt8dW5kZWZpbmVkfSAtIFRoZSB0ZXN0bmV0IGNvcnJlc3BvbmRpbmcgdG8gYSBtYWlubmV0LlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUmV0dXJucyB1bmRlZmluZWQgaWYgYSBuZXR3b3JrIGhhcyBubyB0ZXN0bmV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVzdG5ldChuZXR3b3JrOiBOZXR3b3JrKTogTmV0d29yayB8IHVuZGVmaW5lZCB7XG4gIGlmIChpc1Rlc3RuZXQobmV0d29yaykpIHtcbiAgICByZXR1cm4gbmV0d29yaztcbiAgfVxuICBjb25zdCB0ZXN0bmV0cyA9IG1haW5uZXRUZXN0bmV0UGFpcnMuZ2V0KG5ldHdvcmspO1xuICBpZiAodGVzdG5ldHMgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBhcmd1bWVudGApO1xuICB9XG4gIGlmICh0ZXN0bmV0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHRlc3RuZXRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiB0ZXN0bmV0c1swXTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYG1vcmUgdGhhbiBvbmUgdGVzdG5ldCBmb3IgJHtnZXROZXR3b3JrTmFtZShuZXR3b3JrKX1gKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05ldHdvcmt9IG5ldHdvcmtcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBuZXR3b3JrIGJpdGNvaW4gb3IgdGVzdG5ldFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCaXRjb2luKG5ldHdvcms6IE5ldHdvcmspOiBib29sZWFuIHtcbiAgcmV0dXJuIGdldE1haW5uZXQobmV0d29yaykgPT09IG5ldHdvcmtzLmJpdGNvaW47XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgbmV0d29yayBpcyBiaXRjb2luY2FzaCBvciBiaXRjb2luY2FzaFRlc3RuZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQml0Y29pbkNhc2gobmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0TWFpbm5ldChuZXR3b3JrKSA9PT0gbmV0d29ya3MuYml0Y29pbmNhc2g7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgbmV0d29yayBpcyBlY2FzaCBvciBlY2FzaFRlc3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRUNhc2gobmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0TWFpbm5ldChuZXR3b3JrKSA9PT0gbmV0d29ya3MuZWNhc2g7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgbmV0d29yayBpcyBiaXRjb2luZ29sZFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCaXRjb2luR29sZChuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRNYWlubmV0KG5ldHdvcmspID09PSBuZXR3b3Jrcy5iaXRjb2luZ29sZDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05ldHdvcmt9IG5ldHdvcmtcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBuZXR3b3JrIGlzIGJpdGNvaW5zdiBvciBiaXRjb2luc3ZUZXN0bmV0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JpdGNvaW5TVihuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRNYWlubmV0KG5ldHdvcmspID09PSBuZXR3b3Jrcy5iaXRjb2luc3Y7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOZXR3b3JrfSBuZXR3b3JrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgbmV0d29yayBpcyBkYXNoIG9yIGRhc2hUZXN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Rhc2gobmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0TWFpbm5ldChuZXR3b3JrKSA9PT0gbmV0d29ya3MuZGFzaDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05ldHdvcmt9IG5ldHdvcmtcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBuZXR3b3JrIGlzIGRvZ2Vjb2luIG9yIGRvZ2Vjb2luVGVzdFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEb2dlY29pbihuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRNYWlubmV0KG5ldHdvcmspID09PSBuZXR3b3Jrcy5kb2dlY29pbjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05ldHdvcmt9IG5ldHdvcmtcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBuZXR3b3JrIGlzIGxpdGVjb2luIG9yIGxpdGVjb2luVGVzdFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNMaXRlY29pbihuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRNYWlubmV0KG5ldHdvcmspID09PSBuZXR3b3Jrcy5saXRlY29pbjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05ldHdvcmt9IG5ldHdvcmtcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBuZXR3b3JrIGlzIHpjYXNoIG9yIHpjYXNoVGVzdFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNaY2FzaChuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRNYWlubmV0KG5ldHdvcmspID09PSBuZXR3b3Jrcy56Y2FzaDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3Vua25vd259IG5ldHdvcmtcbiAqIEByZXR1cm5zIHtib29sZWFufSByZXR1cm5zIHRydWUgaWZmIG5ldHdvcmsgaXMgYW55IG9mIHRoZSBuZXR3b3JrIHN0YXRlZCBpbiB0aGUgYXJndW1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWROZXR3b3JrKG5ldHdvcms6IHVua25vd24pOiBuZXR3b3JrIGlzIE5ldHdvcmsge1xuICByZXR1cm4gZ2V0TmV0d29ya0xpc3QoKS5pbmNsdWRlcyhuZXR3b3JrIGFzIE5ldHdvcmspO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3VwcG9ydHNTZWd3aXQobmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gKFtuZXR3b3Jrcy5iaXRjb2luLCBuZXR3b3Jrcy5saXRlY29pbiwgbmV0d29ya3MuYml0Y29pbmdvbGRdIGFzIE5ldHdvcmtbXSkuaW5jbHVkZXMoZ2V0TWFpbm5ldChuZXR3b3JrKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdXBwb3J0c1RhcHJvb3QobmV0d29yazogTmV0d29yayk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0TWFpbm5ldChuZXR3b3JrKSA9PT0gbmV0d29ya3MuYml0Y29pbjtcbn1cbiJdfQ==