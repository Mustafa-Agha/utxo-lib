"use strict";
// SegWit version 1 P2TR output type for Taproot defined in
// https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2tr = void 0;
const networks_1 = require("../networks");
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const taproot = require("../taproot");
const noble_ecc_1 = require("../noble_ecc");
const necc = require("@noble/secp256k1");
const typef = require('typeforce');
const OPS = bitcoinjs_lib_1.script.OPS;
const { bech32m } = require('bech32');
const BITCOIN_NETWORK = networks_1.networks.bitcoin;
/**
 * A secp256k1 x coordinate with unknown discrete logarithm used for eliminating
 * keypath spends, equal to SHA256(uncompressedDER(SECP256K1_GENERATOR_POINT)).
 */
const H = Buffer.from('50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0', 'hex');
const EMPTY_BUFFER = Buffer.alloc(0);
function isPlainPubkey(pubKey) {
    if (pubKey.length !== 33)
        return false;
    try {
        return !!necc.Point.fromHex(pubKey);
    }
    catch (e) {
        return false;
    }
}
function isPlainPubkeys(pubkeys) {
    return pubkeys.every(isPlainPubkey);
}
// output: OP_1 {witnessProgram}
function p2tr(a, opts) {
    var _a, _b, _c, _d;
    if (!a.address && !a.pubkey && !a.pubkeys && !(a.redeems && a.redeems.length) && !a.output && !a.witness) {
        throw new TypeError('Not enough data');
    }
    opts = Object.assign({ validate: true }, opts || {});
    if (!opts.eccLib)
        throw new Error('ECC Library is required for p2tr.');
    const ecc = opts.eccLib;
    typef({
        network: typef.maybe(typef.Object),
        address: typef.maybe(typef.String),
        // the output script should be a fixed 34 bytes.
        // 1 byte for OP_1 indicating segwit version 1, one byte for 0x20 to push
        // the next 32 bytes, followed by the 32 byte witness program
        output: typef.maybe(typef.BufferN(34)),
        // a single pubkey
        pubkey: typef.maybe(ecc.isXOnlyPoint),
        // the pub key(s) used for keypath signing.
        // aggregated with MuSig2* if > 1
        pubkeys: typef.maybe(typef.anyOf(typef.arrayOf(ecc.isXOnlyPoint), typef.arrayOf(isPlainPubkey))),
        redeems: typef.maybe(typef.arrayOf({
            network: typef.maybe(typef.Object),
            output: typef.maybe(typef.Buffer),
            weight: typef.maybe(typef.Number),
            depth: typef.maybe(typef.Number),
            witness: typef.maybe(typef.arrayOf(typef.Buffer)),
        })),
        redeemIndex: typef.maybe(typef.Number),
        signature: typef.maybe(bitcoinjs_lib_1.script.isCanonicalSchnorrSignature),
        controlBlock: typef.maybe(typef.Buffer),
        annex: typef.maybe(typef.Buffer),
    }, a);
    const _address = bitcoinjs_lib_1.lazy.value(() => {
        if (!a.address)
            return undefined;
        const result = bech32m.decode(a.address);
        const version = result.words.shift();
        const data = bech32m.fromWords(result.words);
        return {
            version,
            prefix: result.prefix,
            data: Buffer.from(data),
        };
    });
    const _outputPubkey = bitcoinjs_lib_1.lazy.value(() => {
        // we remove the first two bytes (OP_1 0x20) from the output script to
        // extract the 32 byte taproot pubkey (aka witness program)
        return a.output && a.output.slice(2);
    });
    const network = a.network || BITCOIN_NETWORK;
    const o = { network };
    const _taprootPaths = bitcoinjs_lib_1.lazy.value(() => {
        if (!a.redeems)
            return;
        if (o.tapTree) {
            return taproot.getDepthFirstTaptree(o.tapTree);
        }
        const outputs = a.redeems.map(({ output }) => output);
        if (!outputs.every((output) => output))
            return;
        return taproot.getHuffmanTaptree(outputs, a.redeems.map(({ weight }) => weight));
    });
    const _parsedWitness = bitcoinjs_lib_1.lazy.value(() => {
        if (!a.witness)
            return;
        return taproot.parseTaprootWitness(a.witness);
    });
    const _parsedControlBlock = bitcoinjs_lib_1.lazy.value(() => {
        // Can't use o.controlBlock, because it could be circular
        if (a.controlBlock)
            return taproot.parseControlBlock(ecc, a.controlBlock);
        const parsedWitness = _parsedWitness();
        if (parsedWitness && parsedWitness.spendType === 'Script') {
            return taproot.parseControlBlock(ecc, parsedWitness.controlBlock);
        }
    });
    bitcoinjs_lib_1.lazy.prop(o, 'internalPubkey', () => {
        var _a;
        if (a.pubkey) {
            // single pubkey
            return a.pubkey;
        }
        else if (a.pubkeys && a.pubkeys.length === 1) {
            return a.pubkeys[0];
        }
        else if (a.pubkeys && a.pubkeys.length > 1) {
            // multiple pubkeys
            if (isPlainPubkeys(a.pubkeys)) {
                return Buffer.from(noble_ecc_1.musig.getXOnlyPubkey(noble_ecc_1.musig.keyAgg(noble_ecc_1.musig.keySort(a.pubkeys))));
            }
            return Buffer.from(taproot.aggregateMuSigPubkeys(ecc, a.pubkeys));
        }
        else if (_parsedControlBlock()) {
            return (_a = _parsedControlBlock()) === null || _a === void 0 ? void 0 : _a.internalPubkey;
        }
        else {
            // If there is no key path spending condition, we use an internal key with unknown secret key.
            // TODO: In order to avoid leaking the information that key path spending is not possible it
            // is recommended to pick a fresh integer r in the range 0...n-1 uniformly at random and use
            // H + rG as internal key. It is possible to prove that this internal key does not have a
            // known discrete logarithm with respect to G by revealing r to a verifier who can then
            // reconstruct how the internal key was created.
            return H;
        }
    });
    const _taprootPubkey = bitcoinjs_lib_1.lazy.value(() => {
        var _a;
        const parsedControlBlock = _parsedControlBlock();
        const parsedWitness = _parsedWitness();
        // Refuse to create an unspendable key
        if (!a.pubkey && !(a.pubkeys && a.pubkeys.length) && !a.redeems && !parsedControlBlock) {
            return;
        }
        let taptreeRoot;
        // Prefer to get the root via the control block because not all redeems may
        // be available
        if (parsedControlBlock) {
            let tapscript;
            if (parsedWitness && parsedWitness.spendType === 'Script') {
                tapscript = parsedWitness.tapscript;
            }
            else if (o.redeem && o.redeem.output) {
                tapscript = o.redeem.output;
            }
            if (tapscript)
                taptreeRoot = taproot.getTaptreeRoot(ecc, parsedControlBlock, tapscript);
        }
        if (!taptreeRoot && _taprootPaths())
            taptreeRoot = (_a = _taprootPaths()) === null || _a === void 0 ? void 0 : _a.root;
        return taproot.tapTweakPubkey(ecc, o === null || o === void 0 ? void 0 : o.internalPubkey, taptreeRoot);
    });
    bitcoinjs_lib_1.lazy.prop(o, 'tapTree', () => {
        if (!a.redeems)
            return;
        if (a.redeems.find(({ depth }) => depth === undefined)) {
            console.warn('Deprecation Warning: Weight-based tap tree construction will be removed in the future. ' +
                'Please use depth-first coding as specified in BIP-0371.');
            return;
        }
        if (!a.redeems.every(({ output }) => output))
            return;
        return {
            leaves: a.redeems.map(({ output, depth }) => {
                return {
                    script: output,
                    leafVersion: taproot.INITIAL_TAPSCRIPT_VERSION,
                    depth,
                };
            }),
        };
    });
    bitcoinjs_lib_1.lazy.prop(o, 'address', () => {
        var _a;
        const pubkey = _outputPubkey() || (_taprootPubkey() && ((_a = _taprootPubkey()) === null || _a === void 0 ? void 0 : _a.xOnlyPubkey));
        // only encode the 32 byte witness program as bech32m
        const words = bech32m.toWords(pubkey);
        words.unshift(0x01);
        return bech32m.encode(network.bech32, words);
    });
    bitcoinjs_lib_1.lazy.prop(o, 'controlBlock', () => {
        const parsedWitness = _parsedWitness();
        if (parsedWitness && parsedWitness.spendType === 'Script') {
            return parsedWitness.controlBlock;
        }
        const taprootPubkey = _taprootPubkey();
        const taprootPaths = _taprootPaths();
        if (!taprootPaths || !taprootPubkey || a.redeemIndex === undefined)
            return;
        return taproot.getControlBlock(taprootPubkey.parity, o.internalPubkey, taprootPaths.paths[a.redeemIndex]);
    });
    bitcoinjs_lib_1.lazy.prop(o, 'signature', () => {
        const parsedWitness = _parsedWitness();
        if (parsedWitness && parsedWitness.spendType === 'Key') {
            return parsedWitness.signature;
        }
    });
    bitcoinjs_lib_1.lazy.prop(o, 'annex', () => {
        if (!_parsedWitness())
            return;
        return _parsedWitness().annex;
    });
    bitcoinjs_lib_1.lazy.prop(o, 'output', () => {
        if (a.address) {
            const { data } = _address();
            return bitcoinjs_lib_1.script.compile([OPS.OP_1, data]);
        }
        const taprootPubkey = _taprootPubkey();
        if (!taprootPubkey)
            return;
        // OP_1 indicates segwit version 1
        return bitcoinjs_lib_1.script.compile([OPS.OP_1, Buffer.from(taprootPubkey.xOnlyPubkey)]);
    });
    bitcoinjs_lib_1.lazy.prop(o, 'witness', () => {
        if (!a.redeems) {
            if (a.signature)
                return [a.signature]; // Keypath spend
            return;
        }
        else if (!o.redeem) {
            return; // No chosen redeem script, can't make witness
        }
        else if (!o.controlBlock) {
            return;
        }
        let redeemWitness;
        // some callers may provide witness elements in the input script
        if (o.redeem.input && o.redeem.input.length > 0 && o.redeem.output && o.redeem.output.length > 0) {
            // transform redeem input to witness stack
            redeemWitness = bitcoinjs_lib_1.script.toStack(bitcoinjs_lib_1.script.decompile(o.redeem.input));
            // assigns a new object to o.redeem
            o.redeems[a.redeemIndex] = Object.assign({ witness: redeemWitness }, o.redeem);
            o.redeem.input = EMPTY_BUFFER;
        }
        else if (o.redeem.output && o.redeem.output.length > 0 && o.redeem.witness && o.redeem.witness.length > 0) {
            redeemWitness = o.redeem.witness;
        }
        else {
            return;
        }
        const witness = [...redeemWitness, o.redeem.output, o.controlBlock];
        if (a.annex) {
            witness.push(a.annex);
        }
        return witness;
    });
    bitcoinjs_lib_1.lazy.prop(o, 'name', () => {
        const nameParts = ['p2tr'];
        return nameParts.join('-');
    });
    bitcoinjs_lib_1.lazy.prop(o, 'redeem', () => {
        if (a.redeems) {
            if (a.redeemIndex === undefined)
                return;
            return a.redeems[a.redeemIndex];
        }
        const parsedWitness = _parsedWitness();
        if (parsedWitness && parsedWitness.spendType === 'Script') {
            return {
                witness: parsedWitness.scriptSig,
                output: parsedWitness.tapscript,
            };
        }
    });
    // extended validation
    if (opts.validate) {
        const taprootPubkey = _taprootPubkey();
        if (a.output) {
            if (a.output[0] !== OPS.OP_1 || a.output[1] !== 0x20) {
                throw new TypeError('Output is invalid');
            }
            // if we're passed both an output script and an address, ensure they match
            if (a.address && _outputPubkey && !((_a = _outputPubkey()) === null || _a === void 0 ? void 0 : _a.equals((_b = _address()) === null || _b === void 0 ? void 0 : _b.data))) {
                throw new TypeError('mismatch between address & output');
            }
            if (taprootPubkey && _outputPubkey && !((_c = _outputPubkey()) === null || _c === void 0 ? void 0 : _c.equals(taprootPubkey.xOnlyPubkey))) {
                throw new TypeError('mismatch between output and taproot pubkey');
            }
        }
        if (a.address) {
            if (taprootPubkey && !((_d = _address()) === null || _d === void 0 ? void 0 : _d.data.equals(taprootPubkey.xOnlyPubkey))) {
                throw new TypeError('mismatch between address and taproot pubkey');
            }
        }
        const parsedControlBlock = _parsedControlBlock();
        if (parsedControlBlock) {
            if (!parsedControlBlock.internalPubkey.equals(o === null || o === void 0 ? void 0 : o.internalPubkey)) {
                throw new TypeError('Internal pubkey mismatch');
            }
            if (taprootPubkey && parsedControlBlock.parity !== taprootPubkey.parity) {
                throw new TypeError('Parity mismatch');
            }
        }
        if (a.redeems) {
            if (!a.redeems.length)
                throw new TypeError('Empty redeems');
            if (a.redeemIndex !== undefined && (a.redeemIndex < 0 || a.redeemIndex >= a.redeems.length)) {
                throw new TypeError('invalid redeem index');
            }
            a.redeems.forEach((redeem) => {
                if (redeem.network && redeem.network !== network) {
                    throw new TypeError('Network mismatch');
                }
            });
        }
        const chosenRedeem = a.redeems && a.redeemIndex !== undefined && a.redeems[a.redeemIndex];
        const parsedWitness = _parsedWitness();
        if (parsedWitness && parsedWitness.spendType === 'Key') {
            if (a.controlBlock) {
                throw new TypeError('unexpected control block for key path');
            }
            if (a.signature && !a.signature.equals(parsedWitness.signature)) {
                throw new TypeError('mismatch between witness & signature');
            }
        }
        if (parsedWitness && parsedWitness.spendType === 'Script') {
            if (a.signature) {
                throw new TypeError('unexpected signature with script path witness');
            }
            if (a.controlBlock && !a.controlBlock.equals(parsedWitness.controlBlock)) {
                throw new TypeError('control block mismatch');
            }
            if (a.annex && parsedWitness.annex && !a.annex.equals(parsedWitness.annex)) {
                throw new TypeError('annex mismatch');
            }
            if (chosenRedeem && chosenRedeem.output && !chosenRedeem.output.equals(parsedWitness.tapscript)) {
                throw new TypeError('tapscript mismatch');
            }
        }
    }
    return Object.assign(o, a);
}
exports.p2tr = p2tr;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicDJ0ci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wYXltZW50cy9wMnRyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyREFBMkQ7QUFDM0QsaUVBQWlFOzs7QUFFakUsMENBQXVDO0FBQ3ZDLGlEQUE4RTtBQUM5RSxzQ0FBc0M7QUFDdEMsNENBQXFDO0FBQ3JDLHlDQUF5QztBQUN6QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkMsTUFBTSxHQUFHLEdBQUcsc0JBQU8sQ0FBQyxHQUFHLENBQUM7QUFFeEIsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV0QyxNQUFNLGVBQWUsR0FBRyxtQkFBUSxDQUFDLE9BQU8sQ0FBQztBQUV6Qzs7O0dBR0c7QUFDSCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2pHLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFckMsU0FBUyxhQUFhLENBQUMsTUFBa0I7SUFDdkMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLEVBQUU7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN2QyxJQUFJO1FBQ0YsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDckM7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsT0FBaUI7SUFDdkMsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFFRCxnQ0FBZ0M7QUFDaEMsU0FBZ0IsSUFBSSxDQUFDLENBQVUsRUFBRSxJQUFrQjs7SUFDakQsSUFBSSxDQUFDLENB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QyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNlZ1dpdCB2ZXJzaW9uIDEgUDJUUiBvdXRwdXQgdHlwZSBmb3IgVGFwcm9vdCBkZWZpbmVkIGluXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYml0Y29pbi9iaXBzL2Jsb2IvbWFzdGVyL2JpcC0wMzQxLm1lZGlhd2lraVxuXG5pbXBvcnQgeyBuZXR3b3JrcyB9IGZyb20gJy4uL25ldHdvcmtzJztcbmltcG9ydCB7IHNjcmlwdCBhcyBic2NyaXB0LCBQYXltZW50LCBQYXltZW50T3B0cywgbGF6eSB9IGZyb20gJ2JpdGNvaW5qcy1saWInO1xuaW1wb3J0ICogYXMgdGFwcm9vdCBmcm9tICcuLi90YXByb290JztcbmltcG9ydCB7IG11c2lnIH0gZnJvbSAnLi4vbm9ibGVfZWNjJztcbmltcG9ydCAqIGFzIG5lY2MgZnJvbSAnQG5vYmxlL3NlY3AyNTZrMSc7XG5jb25zdCB0eXBlZiA9IHJlcXVpcmUoJ3R5cGVmb3JjZScpO1xuY29uc3QgT1BTID0gYnNjcmlwdC5PUFM7XG5cbmNvbnN0IHsgYmVjaDMybSB9ID0gcmVxdWlyZSgnYmVjaDMyJyk7XG5cbmNvbnN0IEJJVENPSU5fTkVUV09SSyA9IG5ldHdvcmtzLmJpdGNvaW47XG5cbi8qKlxuICogQSBzZWNwMjU2azEgeCBjb29yZGluYXRlIHdpdGggdW5rbm93biBkaXNjcmV0ZSBsb2dhcml0aG0gdXNlZCBmb3IgZWxpbWluYXRpbmdcbiAqIGtleXBhdGggc3BlbmRzLCBlcXVhbCB0byBTSEEyNTYodW5jb21wcmVzc2VkREVSKFNFQ1AyNTZLMV9HRU5FUkFUT1JfUE9JTlQpKS5cbiAqL1xuY29uc3QgSCA9IEJ1ZmZlci5mcm9tKCc1MDkyOWI3NGMxYTA0OTU0Yjc4YjRiNjAzNWU5N2E1ZTA3OGE1YTBmMjhlYzk2ZDU0N2JmZWU5YWNlODAzYWMwJywgJ2hleCcpO1xuY29uc3QgRU1QVFlfQlVGRkVSID0gQnVmZmVyLmFsbG9jKDApO1xuXG5mdW5jdGlvbiBpc1BsYWluUHVia2V5KHB1YktleTogVWludDhBcnJheSk6IGJvb2xlYW4ge1xuICBpZiAocHViS2V5Lmxlbmd0aCAhPT0gMzMpIHJldHVybiBmYWxzZTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gISFuZWNjLlBvaW50LmZyb21IZXgocHViS2V5KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1BsYWluUHVia2V5cyhwdWJrZXlzOiBCdWZmZXJbXSkge1xuICByZXR1cm4gcHVia2V5cy5ldmVyeShpc1BsYWluUHVia2V5KTtcbn1cblxuLy8gb3V0cHV0OiBPUF8xIHt3aXRuZXNzUHJvZ3JhbX1cbmV4cG9ydCBmdW5jdGlvbiBwMnRyKGE6IFBheW1lbnQsIG9wdHM/OiBQYXltZW50T3B0cyk6IFBheW1lbnQge1xuICBpZiAoIWEuYWRkcmVzcyAmJiAhYS5wdWJrZXkgJiYgIWEucHVia2V5cyAmJiAhKGEucmVkZWVtcyAmJiBhLnJlZGVlbXMubGVuZ3RoKSAmJiAhYS5vdXRwdXQgJiYgIWEud2l0bmVzcykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBlbm91Z2ggZGF0YScpO1xuICB9XG4gIG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUgfSwgb3B0cyB8fCB7fSk7XG5cbiAgaWYgKCFvcHRzLmVjY0xpYikgdGhyb3cgbmV3IEVycm9yKCdFQ0MgTGlicmFyeSBpcyByZXF1aXJlZCBmb3IgcDJ0ci4nKTtcbiAgY29uc3QgZWNjID0gb3B0cy5lY2NMaWI7XG5cbiAgdHlwZWYoXG4gICAge1xuICAgICAgbmV0d29yazogdHlwZWYubWF5YmUodHlwZWYuT2JqZWN0KSxcblxuICAgICAgYWRkcmVzczogdHlwZWYubWF5YmUodHlwZWYuU3RyaW5nKSxcbiAgICAgIC8vIHRoZSBvdXRwdXQgc2NyaXB0IHNob3VsZCBiZSBhIGZpeGVkIDM0IGJ5dGVzLlxuICAgICAgLy8gMSBieXRlIGZvciBPUF8xIGluZGljYXRpbmcgc2Vnd2l0IHZlcnNpb24gMSwgb25lIGJ5dGUgZm9yIDB4MjAgdG8gcHVzaFxuICAgICAgLy8gdGhlIG5leHQgMzIgYnl0ZXMsIGZvbGxvd2VkIGJ5IHRoZSAzMiBieXRlIHdpdG5lc3MgcHJvZ3JhbVxuICAgICAgb3V0cHV0OiB0eXBlZi5tYXliZSh0eXBlZi5CdWZmZXJOKDM0KSksXG4gICAgICAvLyBhIHNpbmdsZSBwdWJrZXlcbiAgICAgIHB1YmtleTogdHlwZWYubWF5YmUoZWNjLmlzWE9ubHlQb2ludCksXG4gICAgICAvLyB0aGUgcHViIGtleShzKSB1c2VkIGZvciBrZXlwYXRoIHNpZ25pbmcuXG4gICAgICAvLyBhZ2dyZWdhdGVkIHdpdGggTXVTaWcyKiBpZiA+IDFcbiAgICAgIHB1YmtleXM6IHR5cGVmLm1heWJlKHR5cGVmLmFueU9mKHR5cGVmLmFycmF5T2YoZWNjLmlzWE9ubHlQb2ludCksIHR5cGVmLmFycmF5T2YoaXNQbGFpblB1YmtleSkpKSxcblxuICAgICAgcmVkZWVtczogdHlwZWYubWF5YmUoXG4gICAgICAgIHR5cGVmLmFycmF5T2Yoe1xuICAgICAgICAgIG5ldHdvcms6IHR5cGVmLm1heWJlKHR5cGVmLk9iamVjdCksXG4gICAgICAgICAgb3V0cHV0OiB0eXBlZi5tYXliZSh0eXBlZi5CdWZmZXIpLFxuICAgICAgICAgIHdlaWdodDogdHlwZWYubWF5YmUodHlwZWYuTnVtYmVyKSxcbiAgICAgICAgICBkZXB0aDogdHlwZWYubWF5YmUodHlwZWYuTnVtYmVyKSxcbiAgICAgICAgICB3aXRuZXNzOiB0eXBlZi5tYXliZSh0eXBlZi5hcnJheU9mKHR5cGVmLkJ1ZmZlcikpLFxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIHJlZGVlbUluZGV4OiB0eXBlZi5tYXliZSh0eXBlZi5OdW1iZXIpLCAvLyBTZWxlY3RzIHRoZSByZWRlZW0gdG8gc3BlbmRcblxuICAgICAgc2lnbmF0dXJlOiB0eXBlZi5tYXliZShic2NyaXB0LmlzQ2Fub25pY2FsU2Nobm9yclNpZ25hdHVyZSksXG4gICAgICBjb250cm9sQmxvY2s6IHR5cGVmLm1heWJlKHR5cGVmLkJ1ZmZlciksXG4gICAgICBhbm5leDogdHlwZWYubWF5YmUodHlwZWYuQnVmZmVyKSxcbiAgICB9LFxuICAgIGFcbiAgKTtcblxuICBjb25zdCBfYWRkcmVzcyA9IGxhenkudmFsdWUoKCkgPT4ge1xuICAgIGlmICghYS5hZGRyZXNzKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gYmVjaDMybS5kZWNvZGUoYS5hZGRyZXNzKTtcbiAgICBjb25zdCB2ZXJzaW9uID0gcmVzdWx0LndvcmRzLnNoaWZ0KCk7XG4gICAgY29uc3QgZGF0YSA9IGJlY2gzMm0uZnJvbVdvcmRzKHJlc3VsdC53b3Jkcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZlcnNpb24sXG4gICAgICBwcmVmaXg6IHJlc3VsdC5wcmVmaXgsXG4gICAgICBkYXRhOiBCdWZmZXIuZnJvbShkYXRhKSxcbiAgICB9O1xuICB9KTtcbiAgY29uc3QgX291dHB1dFB1YmtleSA9IGxhenkudmFsdWUoKCkgPT4ge1xuICAgIC8vIHdlIHJlbW92ZSB0aGUgZmlyc3QgdHdvIGJ5dGVzIChPUF8xIDB4MjApIGZyb20gdGhlIG91dHB1dCBzY3JpcHQgdG9cbiAgICAvLyBleHRyYWN0IHRoZSAzMiBieXRlIHRhcHJvb3QgcHVia2V5IChha2Egd2l0bmVzcyBwcm9ncmFtKVxuICAgIHJldHVybiBhLm91dHB1dCAmJiBhLm91dHB1dC5zbGljZSgyKTtcbiAgfSk7XG5cbiAgY29uc3QgbmV0d29yayA9IGEubmV0d29yayB8fCBCSVRDT0lOX05FVFdPUks7XG5cbiAgY29uc3QgbzogUGF5bWVudCA9IHsgbmV0d29yayB9O1xuXG4gIGNvbnN0IF90YXByb290UGF0aHMgPSBsYXp5LnZhbHVlKCgpID0+IHtcbiAgICBpZiAoIWEucmVkZWVtcykgcmV0dXJuO1xuICAgIGlmIChvLnRhcFRyZWUpIHtcbiAgICAgIHJldHVybiB0YXByb290LmdldERlcHRoRmlyc3RUYXB0cmVlKG8udGFwVHJlZSk7XG4gICAgfVxuICAgIGNvbnN0IG91dHB1dHM6IEFycmF5PEJ1ZmZlciB8IHVuZGVmaW5lZD4gPSBhLnJlZGVlbXMubWFwKCh7IG91dHB1dCB9KSA9PiBvdXRwdXQpO1xuICAgIGlmICghb3V0cHV0cy5ldmVyeSgob3V0cHV0KSA9PiBvdXRwdXQpKSByZXR1cm47XG4gICAgcmV0dXJuIHRhcHJvb3QuZ2V0SHVmZm1hblRhcHRyZWUoXG4gICAgICBvdXRwdXRzIGFzIEJ1ZmZlcltdLFxuICAgICAgYS5yZWRlZW1zLm1hcCgoeyB3ZWlnaHQgfSkgPT4gd2VpZ2h0KVxuICAgICk7XG4gIH0pO1xuICBjb25zdCBfcGFyc2VkV2l0bmVzcyA9IGxhenkudmFsdWUoKCkgPT4ge1xuICAgIGlmICghYS53aXRuZXNzKSByZXR1cm47XG4gICAgcmV0dXJuIHRhcHJvb3QucGFyc2VUYXByb290V2l0bmVzcyhhLndpdG5lc3MpO1xuICB9KTtcbiAgY29uc3QgX3BhcnNlZENvbnRyb2xCbG9jayA9IGxhenkudmFsdWUoKCkgPT4ge1xuICAgIC8vIENhbid0IHVzZSBvLmNvbnRyb2xCbG9jaywgYmVjYXVzZSBpdCBjb3VsZCBiZSBjaXJjdWxhclxuICAgIGlmIChhLmNvbnRyb2xCbG9jaykgcmV0dXJuIHRhcHJvb3QucGFyc2VDb250cm9sQmxvY2soZWNjLCBhLmNvbnRyb2xCbG9jayk7XG4gICAgY29uc3QgcGFyc2VkV2l0bmVzcyA9IF9wYXJzZWRXaXRuZXNzKCk7XG4gICAgaWYgKHBhcnNlZFdpdG5lc3MgJiYgcGFyc2VkV2l0bmVzcy5zcGVuZFR5cGUgPT09ICdTY3JpcHQnKSB7XG4gICAgICByZXR1cm4gdGFwcm9vdC5wYXJzZUNvbnRyb2xCbG9jayhlY2MsIHBhcnNlZFdpdG5lc3MuY29udHJvbEJsb2NrKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxhenkucHJvcChvLCAnaW50ZXJuYWxQdWJrZXknLCAoKSA9PiB7XG4gICAgaWYgKGEucHVia2V5KSB7XG4gICAgICAvLyBzaW5nbGUgcHVia2V5XG4gICAgICByZXR1cm4gYS5wdWJrZXk7XG4gICAgfSBlbHNlIGlmIChhLnB1YmtleXMgJiYgYS5wdWJrZXlzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIGEucHVia2V5c1swXTtcbiAgICB9IGVsc2UgaWYgKGEucHVia2V5cyAmJiBhLnB1YmtleXMubGVuZ3RoID4gMSkge1xuICAgICAgLy8gbXVsdGlwbGUgcHVia2V5c1xuICAgICAgaWYgKGlzUGxhaW5QdWJrZXlzKGEucHVia2V5cykpIHtcbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKG11c2lnLmdldFhPbmx5UHVia2V5KG11c2lnLmtleUFnZyhtdXNpZy5rZXlTb3J0KGEucHVia2V5cykpKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBCdWZmZXIuZnJvbSh0YXByb290LmFnZ3JlZ2F0ZU11U2lnUHVia2V5cyhlY2MsIGEucHVia2V5cykpO1xuICAgIH0gZWxzZSBpZiAoX3BhcnNlZENvbnRyb2xCbG9jaygpKSB7XG4gICAgICByZXR1cm4gX3BhcnNlZENvbnRyb2xCbG9jaygpPy5pbnRlcm5hbFB1YmtleTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgbm8ga2V5IHBhdGggc3BlbmRpbmcgY29uZGl0aW9uLCB3ZSB1c2UgYW4gaW50ZXJuYWwga2V5IHdpdGggdW5rbm93biBzZWNyZXQga2V5LlxuICAgICAgLy8gVE9ETzogSW4gb3JkZXIgdG8gYXZvaWQgbGVha2luZyB0aGUgaW5mb3JtYXRpb24gdGhhdCBrZXkgcGF0aCBzcGVuZGluZyBpcyBub3QgcG9zc2libGUgaXRcbiAgICAgIC8vIGlzIHJlY29tbWVuZGVkIHRvIHBpY2sgYSBmcmVzaCBpbnRlZ2VyIHIgaW4gdGhlIHJhbmdlIDAuLi5uLTEgdW5pZm9ybWx5IGF0IHJhbmRvbSBhbmQgdXNlXG4gICAgICAvLyBIICsgckcgYXMgaW50ZXJuYWwga2V5LiBJdCBpcyBwb3NzaWJsZSB0byBwcm92ZSB0aGF0IHRoaXMgaW50ZXJuYWwga2V5IGRvZXMgbm90IGhhdmUgYVxuICAgICAgLy8ga25vd24gZGlzY3JldGUgbG9nYXJpdGhtIHdpdGggcmVzcGVjdCB0byBHIGJ5IHJldmVhbGluZyByIHRvIGEgdmVyaWZpZXIgd2hvIGNhbiB0aGVuXG4gICAgICAvLyByZWNvbnN0cnVjdCBob3cgdGhlIGludGVybmFsIGtleSB3YXMgY3JlYXRlZC5cbiAgICAgIHJldHVybiBIO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgX3RhcHJvb3RQdWJrZXkgPSBsYXp5LnZhbHVlKCgpID0+IHtcbiAgICBjb25zdCBwYXJzZWRDb250cm9sQmxvY2sgPSBfcGFyc2VkQ29udHJvbEJsb2NrKCk7XG4gICAgY29uc3QgcGFyc2VkV2l0bmVzcyA9IF9wYXJzZWRXaXRuZXNzKCk7XG4gICAgLy8gUmVmdXNlIHRvIGNyZWF0ZSBhbiB1bnNwZW5kYWJsZSBrZXlcbiAgICBpZiAoIWEucHVia2V5ICYmICEoYS5wdWJrZXlzICYmIGEucHVia2V5cy5sZW5ndGgpICYmICFhLnJlZGVlbXMgJiYgIXBhcnNlZENvbnRyb2xCbG9jaykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgdGFwdHJlZVJvb3Q7XG4gICAgLy8gUHJlZmVyIHRvIGdldCB0aGUgcm9vdCB2aWEgdGhlIGNvbnRyb2wgYmxvY2sgYmVjYXVzZSBub3QgYWxsIHJlZGVlbXMgbWF5XG4gICAgLy8gYmUgYXZhaWxhYmxlXG4gICAgaWYgKHBhcnNlZENvbnRyb2xCbG9jaykge1xuICAgICAgbGV0IHRhcHNjcmlwdDtcbiAgICAgIGlmIChwYXJzZWRXaXRuZXNzICYmIHBhcnNlZFdpdG5lc3Muc3BlbmRUeXBlID09PSAnU2NyaXB0Jykge1xuICAgICAgICB0YXBzY3JpcHQgPSBwYXJzZWRXaXRuZXNzLnRhcHNjcmlwdDtcbiAgICAgIH0gZWxzZSBpZiAoby5yZWRlZW0gJiYgby5yZWRlZW0ub3V0cHV0KSB7XG4gICAgICAgIHRhcHNjcmlwdCA9IG8ucmVkZWVtLm91dHB1dDtcbiAgICAgIH1cbiAgICAgIGlmICh0YXBzY3JpcHQpIHRhcHRyZWVSb290ID0gdGFwcm9vdC5nZXRUYXB0cmVlUm9vdChlY2MsIHBhcnNlZENvbnRyb2xCbG9jaywgdGFwc2NyaXB0KTtcbiAgICB9XG4gICAgaWYgKCF0YXB0cmVlUm9vdCAmJiBfdGFwcm9vdFBhdGhzKCkpIHRhcHRyZWVSb290ID0gX3RhcHJvb3RQYXRocygpPy5yb290O1xuXG4gICAgcmV0dXJuIHRhcHJvb3QudGFwVHdlYWtQdWJrZXkoZWNjLCBvPy5pbnRlcm5hbFB1YmtleSBhcyBVaW50OEFycmF5LCB0YXB0cmVlUm9vdCk7XG4gIH0pO1xuXG4gIGxhenkucHJvcChvLCAndGFwVHJlZScsICgpID0+IHtcbiAgICBpZiAoIWEucmVkZWVtcykgcmV0dXJuO1xuICAgIGlmIChhLnJlZGVlbXMuZmluZCgoeyBkZXB0aCB9KSA9PiBkZXB0aCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAnRGVwcmVjYXRpb24gV2FybmluZzogV2VpZ2h0LWJhc2VkIHRhcCB0cmVlIGNvbnN0cnVjdGlvbiB3aWxsIGJlIHJlbW92ZWQgaW4gdGhlIGZ1dHVyZS4gJyArXG4gICAgICAgICAgJ1BsZWFzZSB1c2UgZGVwdGgtZmlyc3QgY29kaW5nIGFzIHNwZWNpZmllZCBpbiBCSVAtMDM3MS4nXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWEucmVkZWVtcy5ldmVyeSgoeyBvdXRwdXQgfSkgPT4gb3V0cHV0KSkgcmV0dXJuO1xuICAgIHJldHVybiB7XG4gICAgICBsZWF2ZXM6IGEucmVkZWVtcy5tYXAoKHsgb3V0cHV0LCBkZXB0aCB9KSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc2NyaXB0OiBvdXRwdXQsXG4gICAgICAgICAgbGVhZlZlcnNpb246IHRhcHJvb3QuSU5JVElBTF9UQVBTQ1JJUFRfVkVSU0lPTixcbiAgICAgICAgICBkZXB0aCxcbiAgICAgICAgfTtcbiAgICAgIH0pLFxuICAgIH07XG4gIH0pO1xuICBsYXp5LnByb3AobywgJ2FkZHJlc3MnLCAoKSA9PiB7XG4gICAgY29uc3QgcHVia2V5ID0gX291dHB1dFB1YmtleSgpIHx8IChfdGFwcm9vdFB1YmtleSgpICYmIF90YXByb290UHVia2V5KCk/LnhPbmx5UHVia2V5KTtcbiAgICAvLyBvbmx5IGVuY29kZSB0aGUgMzIgYnl0ZSB3aXRuZXNzIHByb2dyYW0gYXMgYmVjaDMybVxuICAgIGNvbnN0IHdvcmRzID0gYmVjaDMybS50b1dvcmRzKHB1YmtleSk7XG4gICAgd29yZHMudW5zaGlmdCgweDAxKTtcbiAgICByZXR1cm4gYmVjaDMybS5lbmNvZGUobmV0d29yay5iZWNoMzIsIHdvcmRzKTtcbiAgfSk7XG4gIGxhenkucHJvcChvLCAnY29udHJvbEJsb2NrJywgKCkgPT4ge1xuICAgIGNvbnN0IHBhcnNlZFdpdG5lc3MgPSBfcGFyc2VkV2l0bmVzcygpO1xuICAgIGlmIChwYXJzZWRXaXRuZXNzICYmIHBhcnNlZFdpdG5lc3Muc3BlbmRUeXBlID09PSAnU2NyaXB0Jykge1xuICAgICAgcmV0dXJuIHBhcnNlZFdpdG5lc3MuY29udHJvbEJsb2NrO1xuICAgIH1cbiAgICBjb25zdCB0YXByb290UHVia2V5ID0gX3RhcHJvb3RQdWJrZXkoKTtcbiAgICBjb25zdCB0YXByb290UGF0aHMgPSBfdGFwcm9vdFBhdGhzKCk7XG4gICAgaWYgKCF0YXByb290UGF0aHMgfHwgIXRhcHJvb3RQdWJrZXkgfHwgYS5yZWRlZW1JbmRleCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgcmV0dXJuIHRhcHJvb3QuZ2V0Q29udHJvbEJsb2NrKHRhcHJvb3RQdWJrZXkucGFyaXR5LCBvLmludGVybmFsUHVia2V5ISwgdGFwcm9vdFBhdGhzLnBhdGhzW2EucmVkZWVtSW5kZXhdKTtcbiAgfSk7XG4gIGxhenkucHJvcChvLCAnc2lnbmF0dXJlJywgKCkgPT4ge1xuICAgIGNvbnN0IHBhcnNlZFdpdG5lc3MgPSBfcGFyc2VkV2l0bmVzcygpO1xuICAgIGlmIChwYXJzZWRXaXRuZXNzICYmIHBhcnNlZFdpdG5lc3Muc3BlbmRUeXBlID09PSAnS2V5Jykge1xuICAgICAgcmV0dXJuIHBhcnNlZFdpdG5lc3Muc2lnbmF0dXJlO1xuICAgIH1cbiAgfSk7XG4gIGxhenkucHJvcChvLCAnYW5uZXgnLCAoKSA9PiB7XG4gICAgaWYgKCFfcGFyc2VkV2l0bmVzcygpKSByZXR1cm47XG4gICAgcmV0dXJuIF9wYXJzZWRXaXRuZXNzKCkhLmFubmV4O1xuICB9KTtcbiAgbGF6eS5wcm9wKG8sICdvdXRwdXQnLCAoKSA9PiB7XG4gICAgaWYgKGEuYWRkcmVzcykge1xuICAgICAgY29uc3QgeyBkYXRhIH0gPSBfYWRkcmVzcygpITtcbiAgICAgIHJldHVybiBic2NyaXB0LmNvbXBpbGUoW09QUy5PUF8xLCBkYXRhXSk7XG4gICAgfVxuXG4gICAgY29uc3QgdGFwcm9vdFB1YmtleSA9IF90YXByb290UHVia2V5KCk7XG4gICAgaWYgKCF0YXByb290UHVia2V5KSByZXR1cm47XG5cbiAgICAvLyBPUF8xIGluZGljYXRlcyBzZWd3aXQgdmVyc2lvbiAxXG4gICAgcmV0dXJuIGJzY3JpcHQuY29tcGlsZShbT1BTLk9QXzEsIEJ1ZmZlci5mcm9tKHRhcHJvb3RQdWJrZXkueE9ubHlQdWJrZXkpXSk7XG4gIH0pO1xuICBsYXp5LnByb3AobywgJ3dpdG5lc3MnLCAoKSA9PiB7XG4gICAgaWYgKCFhLnJlZGVlbXMpIHtcbiAgICAgIGlmIChhLnNpZ25hdHVyZSkgcmV0dXJuIFthLnNpZ25hdHVyZV07IC8vIEtleXBhdGggc3BlbmRcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKCFvLnJlZGVlbSkge1xuICAgICAgcmV0dXJuOyAvLyBObyBjaG9zZW4gcmVkZWVtIHNjcmlwdCwgY2FuJ3QgbWFrZSB3aXRuZXNzXG4gICAgfSBlbHNlIGlmICghby5jb250cm9sQmxvY2spIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgcmVkZWVtV2l0bmVzcztcbiAgICAvLyBzb21lIGNhbGxlcnMgbWF5IHByb3ZpZGUgd2l0bmVzcyBlbGVtZW50cyBpbiB0aGUgaW5wdXQgc2NyaXB0XG4gICAgaWYgKG8ucmVkZWVtLmlucHV0ICYmIG8ucmVkZWVtLmlucHV0Lmxlbmd0aCA+IDAgJiYgby5yZWRlZW0ub3V0cHV0ICYmIG8ucmVkZWVtLm91dHB1dC5sZW5ndGggPiAwKSB7XG4gICAgICAvLyB0cmFuc2Zvcm0gcmVkZWVtIGlucHV0IHRvIHdpdG5lc3Mgc3RhY2tcbiAgICAgIHJlZGVlbVdpdG5lc3MgPSBic2NyaXB0LnRvU3RhY2soYnNjcmlwdC5kZWNvbXBpbGUoby5yZWRlZW0uaW5wdXQpISk7XG5cbiAgICAgIC8vIGFzc2lnbnMgYSBuZXcgb2JqZWN0IHRvIG8ucmVkZWVtXG4gICAgICBvLnJlZGVlbXMhW2EucmVkZWVtSW5kZXghXSA9IE9iamVjdC5hc3NpZ24oeyB3aXRuZXNzOiByZWRlZW1XaXRuZXNzIH0sIG8ucmVkZWVtKTtcbiAgICAgIG8ucmVkZWVtLmlucHV0ID0gRU1QVFlfQlVGRkVSO1xuICAgIH0gZWxzZSBpZiAoby5yZWRlZW0ub3V0cHV0ICYmIG8ucmVkZWVtLm91dHB1dC5sZW5ndGggPiAwICYmIG8ucmVkZWVtLndpdG5lc3MgJiYgby5yZWRlZW0ud2l0bmVzcy5sZW5ndGggPiAwKSB7XG4gICAgICByZWRlZW1XaXRuZXNzID0gby5yZWRlZW0ud2l0bmVzcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHdpdG5lc3MgPSBbLi4ucmVkZWVtV2l0bmVzcywgby5yZWRlZW0ub3V0cHV0LCBvLmNvbnRyb2xCbG9ja107XG5cbiAgICBpZiAoYS5hbm5leCkge1xuICAgICAgd2l0bmVzcy5wdXNoKGEuYW5uZXgpO1xuICAgIH1cblxuICAgIHJldHVybiB3aXRuZXNzO1xuICB9KTtcbiAgbGF6eS5wcm9wKG8sICduYW1lJywgKCkgPT4ge1xuICAgIGNvbnN0IG5hbWVQYXJ0cyA9IFsncDJ0ciddO1xuICAgIHJldHVybiBuYW1lUGFydHMuam9pbignLScpO1xuICB9KTtcbiAgbGF6eS5wcm9wKG8sICdyZWRlZW0nLCAoKSA9PiB7XG4gICAgaWYgKGEucmVkZWVtcykge1xuICAgICAgaWYgKGEucmVkZWVtSW5kZXggPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgICAgcmV0dXJuIGEucmVkZWVtc1thLnJlZGVlbUluZGV4XTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VkV2l0bmVzcyA9IF9wYXJzZWRXaXRuZXNzKCk7XG4gICAgaWYgKHBhcnNlZFdpdG5lc3MgJiYgcGFyc2VkV2l0bmVzcy5zcGVuZFR5cGUgPT09ICdTY3JpcHQnKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB3aXRuZXNzOiBwYXJzZWRXaXRuZXNzLnNjcmlwdFNpZyxcbiAgICAgICAgb3V0cHV0OiBwYXJzZWRXaXRuZXNzLnRhcHNjcmlwdCxcbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICAvLyBleHRlbmRlZCB2YWxpZGF0aW9uXG4gIGlmIChvcHRzLnZhbGlkYXRlKSB7XG4gICAgY29uc3QgdGFwcm9vdFB1YmtleSA9IF90YXByb290UHVia2V5KCk7XG5cbiAgICBpZiAoYS5vdXRwdXQpIHtcbiAgICAgIGlmIChhLm91dHB1dFswXSAhPT0gT1BTLk9QXzEgfHwgYS5vdXRwdXRbMV0gIT09IDB4MjApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT3V0cHV0IGlzIGludmFsaWQnKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UncmUgcGFzc2VkIGJvdGggYW4gb3V0cHV0IHNjcmlwdCBhbmQgYW4gYWRkcmVzcywgZW5zdXJlIHRoZXkgbWF0Y2hcbiAgICAgIGlmIChhLmFkZHJlc3MgJiYgX291dHB1dFB1YmtleSAmJiAhX291dHB1dFB1YmtleSgpPy5lcXVhbHMoX2FkZHJlc3MoKT8uZGF0YSBhcyBCdWZmZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ21pc21hdGNoIGJldHdlZW4gYWRkcmVzcyAmIG91dHB1dCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGFwcm9vdFB1YmtleSAmJiBfb3V0cHV0UHVia2V5ICYmICFfb3V0cHV0UHVia2V5KCk/LmVxdWFscyh0YXByb290UHVia2V5LnhPbmx5UHVia2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtaXNtYXRjaCBiZXR3ZWVuIG91dHB1dCBhbmQgdGFwcm9vdCBwdWJrZXknKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYS5hZGRyZXNzKSB7XG4gICAgICBpZiAodGFwcm9vdFB1YmtleSAmJiAhX2FkZHJlc3MoKT8uZGF0YS5lcXVhbHModGFwcm9vdFB1YmtleS54T25seVB1YmtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbWlzbWF0Y2ggYmV0d2VlbiBhZGRyZXNzIGFuZCB0YXByb290IHB1YmtleScpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlZENvbnRyb2xCbG9jayA9IF9wYXJzZWRDb250cm9sQmxvY2soKTtcbiAgICBpZiAocGFyc2VkQ29udHJvbEJsb2NrKSB7XG4gICAgICBpZiAoIXBhcnNlZENvbnRyb2xCbG9jay5pbnRlcm5hbFB1YmtleS5lcXVhbHMobz8uaW50ZXJuYWxQdWJrZXkgYXMgVWludDhBcnJheSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW50ZXJuYWwgcHVia2V5IG1pc21hdGNoJyk7XG4gICAgICB9XG4gICAgICBpZiAodGFwcm9vdFB1YmtleSAmJiBwYXJzZWRDb250cm9sQmxvY2sucGFyaXR5ICE9PSB0YXByb290UHVia2V5LnBhcml0eSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQYXJpdHkgbWlzbWF0Y2gnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYS5yZWRlZW1zKSB7XG4gICAgICBpZiAoIWEucmVkZWVtcy5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VtcHR5IHJlZGVlbXMnKTtcbiAgICAgIGlmIChhLnJlZGVlbUluZGV4ICE9PSB1bmRlZmluZWQgJiYgKGEucmVkZWVtSW5kZXggPCAwIHx8IGEucmVkZWVtSW5kZXggPj0gYS5yZWRlZW1zLmxlbmd0aCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaW52YWxpZCByZWRlZW0gaW5kZXgnKTtcbiAgICAgIH1cbiAgICAgIGEucmVkZWVtcy5mb3JFYWNoKChyZWRlZW0pID0+IHtcbiAgICAgICAgaWYgKHJlZGVlbS5uZXR3b3JrICYmIHJlZGVlbS5uZXR3b3JrICE9PSBuZXR3b3JrKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTmV0d29yayBtaXNtYXRjaCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjaG9zZW5SZWRlZW0gPSBhLnJlZGVlbXMgJiYgYS5yZWRlZW1JbmRleCAhPT0gdW5kZWZpbmVkICYmIGEucmVkZWVtc1thLnJlZGVlbUluZGV4XTtcblxuICAgIGNvbnN0IHBhcnNlZFdpdG5lc3MgPSBfcGFyc2VkV2l0bmVzcygpO1xuICAgIGlmIChwYXJzZWRXaXRuZXNzICYmIHBhcnNlZFdpdG5lc3Muc3BlbmRUeXBlID09PSAnS2V5Jykge1xuICAgICAgaWYgKGEuY29udHJvbEJsb2NrKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3VuZXhwZWN0ZWQgY29udHJvbCBibG9jayBmb3Iga2V5IHBhdGgnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEuc2lnbmF0dXJlICYmICFhLnNpZ25hdHVyZS5lcXVhbHMocGFyc2VkV2l0bmVzcy5zaWduYXR1cmUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ21pc21hdGNoIGJldHdlZW4gd2l0bmVzcyAmIHNpZ25hdHVyZScpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGFyc2VkV2l0bmVzcyAmJiBwYXJzZWRXaXRuZXNzLnNwZW5kVHlwZSA9PT0gJ1NjcmlwdCcpIHtcbiAgICAgIGlmIChhLnNpZ25hdHVyZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd1bmV4cGVjdGVkIHNpZ25hdHVyZSB3aXRoIHNjcmlwdCBwYXRoIHdpdG5lc3MnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEuY29udHJvbEJsb2NrICYmICFhLmNvbnRyb2xCbG9jay5lcXVhbHMocGFyc2VkV2l0bmVzcy5jb250cm9sQmxvY2spKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NvbnRyb2wgYmxvY2sgbWlzbWF0Y2gnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEuYW5uZXggJiYgcGFyc2VkV2l0bmVzcy5hbm5leCAmJiAhYS5hbm5leC5lcXVhbHMocGFyc2VkV2l0bmVzcy5hbm5leCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW5uZXggbWlzbWF0Y2gnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNob3NlblJlZGVlbSAmJiBjaG9zZW5SZWRlZW0ub3V0cHV0ICYmICFjaG9zZW5SZWRlZW0ub3V0cHV0LmVxdWFscyhwYXJzZWRXaXRuZXNzLnRhcHNjcmlwdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGFwc2NyaXB0IG1pc21hdGNoJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24obywgYSk7XG59XG4iXX0=