"use strict";
// Taproot-specific key aggregation and taptree logic as defined in:
// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
// https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTweakedOutputKey = exports.getTaptreeRoot = exports.getTapleafHash = exports.parseControlBlock = exports.parseTaprootWitness = exports.getControlBlock = exports.getHuffmanTaptree = exports.getDepthFirstTaptree = exports.tapTweakPubkey = exports.tapTweakPrivkey = exports.hashTapBranch = exports.hashTapLeaf = exports.serializeScriptSize = exports.aggregateMuSigPubkeys = exports.INITIAL_TAPSCRIPT_VERSION = exports.EVEN_Y_COORD_PREFIX = void 0;
const assert = require("assert");
const FastPriorityQueue = require("fastpriorityqueue");
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const varuint = require('varuint-bitcoin');
/**
 * The 0x02 prefix indicating an even Y coordinate which is implicitly assumed
 * on all 32 byte x-only pub keys as defined in BIP340.
 */
exports.EVEN_Y_COORD_PREFIX = Buffer.of(0x02);
exports.INITIAL_TAPSCRIPT_VERSION = 0xc0;
/**
 * Aggregates a list of public keys into a single MuSig2* public key
 * according to the MuSig2 paper.
 * @param ecc Elliptic curve implementation
 * @param pubkeys The list of pub keys to aggregate
 * @returns a 32 byte Buffer representing the aggregate key
 */
function aggregateMuSigPubkeys(ecc, pubkeys) {
    // TODO: Consider enforcing key uniqueness.
    assert(pubkeys.length > 1, 'at least two pubkeys are required for musig key aggregation');
    // Sort the keys in ascending order
    pubkeys.sort(Buffer.compare);
    // In MuSig all signers contribute key material to a single signing key,
    // using the equation
    //
    //     P = sum_i µ_i * P_i
    //
    // where `P_i` is the public key of the `i`th signer and `µ_i` is a so-called
    // _MuSig coefficient_ computed according to the following equation
    //
    // L = H(P_1 || P_2 || ... || P_n)
    // µ_i = H(L || P_i)
    const L = bitcoinjs_lib_1.crypto.taggedHash('KeyAgg list', Buffer.concat(pubkeys));
    const secondUniquePubkey = pubkeys.find((pubkey) => !pubkeys[0].equals(pubkey));
    const tweakedPubkeys = pubkeys.map((pubkey) => {
        const xyPubkey = Buffer.concat([exports.EVEN_Y_COORD_PREFIX, pubkey]);
        if (secondUniquePubkey !== undefined && secondUniquePubkey.equals(pubkey)) {
            // The second unique key in the pubkey list given to ''KeyAgg'' (as well
            // as any keys identical to this key) gets the constant KeyAgg
            // coefficient 1 which saves an exponentiation (see the MuSig2* appendix
            // in the MuSig2 paper).
            return xyPubkey;
        }
        const c = bitcoinjs_lib_1.crypto.taggedHash('KeyAgg coefficient', Buffer.concat([L, pubkey]));
        const tweakedPubkey = ecc.pointMultiply(xyPubkey, c);
        if (!tweakedPubkey) {
            throw new Error('Failed to multiply pubkey by coefficient');
        }
        return tweakedPubkey;
    });
    const aggregatePubkey = tweakedPubkeys.reduce((prev, curr) => {
        const next = ecc.pointAdd(prev, curr);
        if (!next)
            throw new Error('Failed to sum pubkeys');
        return next;
    });
    return aggregatePubkey.slice(1);
}
exports.aggregateMuSigPubkeys = aggregateMuSigPubkeys;
/**
 * Encodes the length of a script as a bitcoin variable length integer.
 * @param script
 * @returns
 */
function serializeScriptSize(script) {
    return varuint.encode(script.length);
}
exports.serializeScriptSize = serializeScriptSize;
/**
 * Gets a tapleaf tagged hash from a script.
 * @param script
 * @returns
 */
function hashTapLeaf(script, leafVersion = exports.INITIAL_TAPSCRIPT_VERSION) {
    const size = serializeScriptSize(script);
    return bitcoinjs_lib_1.crypto.taggedHash('TapLeaf', Buffer.concat([Buffer.of(leafVersion), size, script]));
}
exports.hashTapLeaf = hashTapLeaf;
/**
 * Creates a lexicographically sorted tapbranch from two child taptree nodes
 * and returns its tagged hash.
 * @param child1
 * @param child2
 * @returns the tagged tapbranch hash
 */
function hashTapBranch(child1, child2) {
    // sort the children lexicographically
    const sortedChildren = [child1, child2].sort(Buffer.compare);
    return bitcoinjs_lib_1.crypto.taggedHash('TapBranch', Buffer.concat(sortedChildren));
}
exports.hashTapBranch = hashTapBranch;
function calculateTapTweak(pubkey, taptreeRoot) {
    if (taptreeRoot) {
        return bitcoinjs_lib_1.crypto.taggedHash('TapTweak', Buffer.concat([pubkey, taptreeRoot]));
    }
    // If the spending conditions do not require a script path, the output key should commit to an
    // unspendable script path instead of having no script path.
    // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#cite_note-22
    return bitcoinjs_lib_1.crypto.taggedHash('TapTweak', Buffer.from(pubkey));
}
/**
 * Tweaks a privkey, using the tagged hash of its pubkey, and (optionally) a taptree root
 * @param ecc Elliptic curve implementation
 * @param pubkey public key, used to calculate the tweak
 * @param privkey the privkey to tweak
 * @param taptreeRoot the taptree root tagged hash
 * @returns {Buffer} the tweaked privkey
 */
function tapTweakPrivkey(ecc, pubkey, privkey, taptreeRoot) {
    const tapTweak = calculateTapTweak(pubkey, taptreeRoot);
    const point = ecc.pointFromScalar(privkey);
    if (!point)
        throw new Error('Invalid private key');
    if (point[0] % 2 === 1)
        privkey = ecc.privateNegate(privkey);
    const result = ecc.privateAdd(privkey, tapTweak);
    if (!result)
        throw new Error('Invalid private key');
    return result;
}
exports.tapTweakPrivkey = tapTweakPrivkey;
/**
 * Tweaks an internal pubkey, using the tagged hash of itself, and (optionally) a taptree root
 * @param ecc Elliptic curve implementation
 * @param pubkey the internal pubkey to tweak
 * @param taptreeRoot the taptree root tagged hash
 * @returns {TweakedPubkey} the tweaked pubkey
 */
function tapTweakPubkey(ecc, pubkey, taptreeRoot) {
    const tapTweak = calculateTapTweak(pubkey, taptreeRoot);
    const result = ecc.xOnlyPointAddTweak(pubkey, tapTweak);
    if (!result)
        throw new Error('Invalid pubkey');
    return result;
}
exports.tapTweakPubkey = tapTweakPubkey;
function recurseTaptree(leaves, targetDepth = 0) {
    const { value, done } = leaves.next();
    assert(!done, 'insufficient leaves to reconstruct tap tree');
    const [index, leaf] = value;
    const tree = {
        root: hashTapLeaf(leaf.script, leaf.leafVersion),
        paths: [],
    };
    tree.paths[index] = [];
    for (let depth = leaf.depth; depth > targetDepth; depth--) {
        const sibling = recurseTaptree(leaves, depth);
        tree.paths.forEach((path) => path.push(sibling.root));
        sibling.paths.forEach((path) => path.push(tree.root));
        tree.root = hashTapBranch(tree.root, sibling.root);
        // Merge disjoint sparse arrays of paths into tree.paths
        Object.assign(tree.paths, sibling.paths);
    }
    return tree;
}
/**
 * Gets the root hash and hash-paths of a taptree from the depth-first
 * construction used in BIP-0371 PSBTs
 * @param tree
 * @returns {Taptree} the tree, represented by its root hash, and the paths to
 * that root from each of the input scripts
 */
function getDepthFirstTaptree(tree) {
    const iter = tree.leaves.entries();
    const ret = recurseTaptree(iter);
    assert(iter.next().done, 'invalid tap tree, no path to some leaves');
    return ret;
}
exports.getDepthFirstTaptree = getDepthFirstTaptree;
/**
 * Gets the root hash of a taptree using a weighted Huffman construction from a
 * list of scripts and corresponding weights.
 * @param scripts
 * @param weights
 * @returns {Taptree} the tree, represented by its root hash, and the paths to that root from each of the input scripts
 */
function getHuffmanTaptree(scripts, weights) {
    assert(scripts.length > 0, 'at least one script is required to construct a tap tree');
    // Create a queue/heap of the provided scripts prioritized according to their
    // corresponding weights.
    const queue = new FastPriorityQueue((a, b) => {
        return a.weight < b.weight;
    });
    scripts.forEach((script, index) => {
        const weight = weights[index] || 1;
        assert(weight > 0, 'script weight must be a positive value');
        queue.add({
            weight,
            taggedHash: hashTapLeaf(script),
            paths: { [index]: [] },
        });
    });
    // Now that we have a queue of weighted scripts, we begin a loop whereby we
    // remove the two lowest weighted items from the queue. We create a tap branch
    // node from the two items, and add the branch back to the queue with the
    // combined weight of both its children. Each loop reduces the number of items
    // in the queue by one, and we repeat until we are left with only one item -
    // this becomes the tap tree root.
    //
    // For example, if we begin with scripts A, B, C, D with weights 6, 3, 1, 1
    // After first loop: A(6), B(3), CD(1 + 1)
    // After second loop: A(6), B[CD](3 + 2)
    // Final loop: A[B[CD]](6+5)
    // The final tree will look like:
    //
    //        A[B[CD]]
    //       /        \
    //      A         B[CD]
    //               /     \
    //              B      [CD]
    //                    /    \
    //                   C      D
    //
    // This ensures that the spending conditions we believe to have the highest
    // probability of being used are further up the tree than less likely scripts,
    // thereby reducing the size of the merkle proofs for the more likely scripts.
    while (queue.size > 1) {
        // We can safely expect two polls to return non-null elements since we've
        // checked that the queue has at least two elements before looping.
        const child1 = queue.poll();
        const child2 = queue.poll();
        Object.values(child1.paths).forEach((path) => path.push(child2.taggedHash));
        Object.values(child2.paths).forEach((path) => path.push(child1.taggedHash));
        queue.add({
            taggedHash: hashTapBranch(child1.taggedHash, child2.taggedHash),
            weight: child1.weight + child2.weight,
            paths: { ...child1.paths, ...child2.paths },
        });
    }
    // After the while loop above completes we should have exactly one element
    // remaining in the queue, which we can safely extract below.
    const rootNode = queue.poll();
    const paths = Object.entries(rootNode.paths).reduce((acc, [index, path]) => {
        acc[Number(index)] = path; // TODO: Why doesn't TS know it's a number?
        return acc;
    }, Array(scripts.length));
    return { root: rootNode.taggedHash, paths };
}
exports.getHuffmanTaptree = getHuffmanTaptree;
function getControlBlock(parity, pubkey, path, leafVersion = exports.INITIAL_TAPSCRIPT_VERSION) {
    const parityVersion = leafVersion + parity;
    return Buffer.concat([Buffer.of(parityVersion), pubkey, ...path]);
}
exports.getControlBlock = getControlBlock;
/**
 * Parses a taproot witness stack and extracts key data elements.
 * @param witnessStack
 * @returns {ScriptPathWitness|KeyPathWitness} an object representing the
 * parsed witness for a script path or key path spend.
 * @throws {Error} if the witness stack does not conform to the BIP 341 script validation rules
 */
function parseTaprootWitness(witnessStack) {
    let annex;
    if (witnessStack.length >= 2 && witnessStack[witnessStack.length - 1][0] === 0x50) {
        // If there are at least two witness elements, and the first byte of the last element is
        // 0x50, this last element is called annex a and is removed from the witness stack
        annex = witnessStack[witnessStack.length - 1];
        witnessStack = witnessStack.slice(0, -1);
    }
    if (witnessStack.length < 1) {
        throw new Error('witness stack must have at least one element');
    }
    else if (witnessStack.length === 1) {
        // key path spend
        const signature = witnessStack[0];
        if (!bitcoinjs_lib_1.script.isCanonicalSchnorrSignature(signature)) {
            throw new Error('invalid signature');
        }
        return { spendType: 'Key', signature, annex };
    }
    // script path spend
    // second to last element is the tapscript
    const tapscript = witnessStack[witnessStack.length - 2];
    const tapscriptChunks = bitcoinjs_lib_1.script.decompile(tapscript);
    if (!tapscriptChunks || tapscriptChunks.length === 0) {
        throw new Error('tapscript is not a valid script');
    }
    // The last stack element is called the control block c, and must have length 33 + 32m,
    // for a value of m that is an integer between 0 and 128, inclusive
    const controlBlock = witnessStack[witnessStack.length - 1];
    if (controlBlock.length < 33 || controlBlock.length > 33 + 32 * 128 || controlBlock.length % 32 !== 1) {
        throw new Error('invalid control block length');
    }
    return {
        spendType: 'Script',
        scriptSig: witnessStack.slice(0, -2),
        tapscript,
        controlBlock,
        annex,
    };
}
exports.parseTaprootWitness = parseTaprootWitness;
/**
 * Parses a taproot control block.
 * @param ecc Elliptic curve implementation
 * @param controlBlock the control block to parse
 * @returns {ControlBlock} the parsed control block
 * @throws {Error} if the witness stack does not conform to the BIP 341 script validation rules
 */
function parseControlBlock(ecc, controlBlock) {
    if ((controlBlock.length - 1) % 32 !== 0) {
        throw new TypeError('Invalid control block length');
    }
    const parity = controlBlock[0] & 0x01;
    // Let p = c[1:33] and let P = lift_x(int(p)) where lift_x and [:] are defined as in BIP340.
    // Fail if this point is not on the curve
    const internalPubkey = controlBlock.slice(1, 33);
    if (!ecc.isXOnlyPoint(internalPubkey)) {
        throw new Error('internal pubkey is not an EC point');
    }
    // The leaf version cannot be 0x50 as that would result in ambiguity with the annex.
    const leafVersion = controlBlock[0] & 0xfe;
    if (leafVersion === 0x50) {
        throw new Error('invalid leaf version');
    }
    const path = [];
    for (let j = 33; j < controlBlock.length; j += 32) {
        path.push(controlBlock.slice(j, j + 32));
    }
    return {
        parity,
        internalPubkey,
        leafVersion,
        path,
    };
}
exports.parseControlBlock = parseControlBlock;
/**
 * Calculates the tapleaf hash from a control block and script.
 * @param ecc Elliptic curve implementation
 * @param controlBlock the control block, either raw or parsed
 * @param tapscript the leaf script corresdponding to the control block
 * @returns {Buffer} the tapleaf hash
 */
function getTapleafHash(ecc, controlBlock, tapscript) {
    if (Buffer.isBuffer(controlBlock)) {
        controlBlock = parseControlBlock(ecc, controlBlock);
    }
    const { leafVersion } = controlBlock;
    return bitcoinjs_lib_1.crypto.taggedHash('TapLeaf', Buffer.concat([Buffer.of(leafVersion), serializeScriptSize(tapscript), tapscript]));
}
exports.getTapleafHash = getTapleafHash;
/**
 * Calculates the taptree root hash from a control block and script.
 * @param ecc Elliptic curve implementation
 * @param controlBlock the control block, either raw or parsed
 * @param tapscript the leaf script corresdponding to the control block
 * @param tapleafHash the leaf hash if already calculated
 * @returns {Buffer} the taptree root hash
 */
function getTaptreeRoot(ecc, controlBlock, tapscript, tapleafHash) {
    if (Buffer.isBuffer(controlBlock)) {
        controlBlock = parseControlBlock(ecc, controlBlock);
    }
    const { path } = controlBlock;
    tapleafHash = tapleafHash || getTapleafHash(ecc, controlBlock, tapscript);
    // `taptreeMerkleHash` begins as our tapscript tapleaf hash and its value iterates
    // through its parent tapbranch hashes until it ends up as the taptree root hash
    let taptreeMerkleHash = tapleafHash;
    for (const taptreeSiblingHash of path) {
        taptreeMerkleHash =
            Buffer.compare(taptreeMerkleHash, taptreeSiblingHash) === -1
                ? bitcoinjs_lib_1.crypto.taggedHash('TapBranch', Buffer.concat([taptreeMerkleHash, taptreeSiblingHash]))
                : bitcoinjs_lib_1.crypto.taggedHash('TapBranch', Buffer.concat([taptreeSiblingHash, taptreeMerkleHash]));
    }
    return taptreeMerkleHash;
}
exports.getTaptreeRoot = getTaptreeRoot;
function getTweakedOutputKey(payment) {
    var _a;
    assert(payment.output);
    if (payment.output.length === 34) {
        return (_a = payment.output) === null || _a === void 0 ? void 0 : _a.subarray(2);
    }
    throw new Error(`invalid p2tr tweaked output key size ${payment.output.length}`);
}
exports.getTweakedOutputKey = getTweakedOutputKey;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFwcm9vdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy90YXByb290LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxvRUFBb0U7QUFDcEUsaUVBQWlFO0FBQ2pFLGlFQUFpRTs7O0FBR2pFLGlDQUFrQztBQUNsQyx1REFBd0Q7QUFDeEQsaURBQTRGO0FBQzVGLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTNDOzs7R0FHRztBQUNVLFFBQUEsbUJBQW1CLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxRQUFBLHlCQUF5QixHQUFHLElBQUksQ0FBQztBQVk5Qzs7Ozs7O0dBTUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxHQUEyQixFQUFFLE9BQWlCO0lBQ2xGLDJDQUEyQztJQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsNkRBQTZELENBQUMsQ0FBQztJQUUxRixtQ0FBbUM7SUFDbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFN0Isd0VBQXdFO0lBQ3hFLHFCQUFxQjtJQUNyQixFQUFFO0lBQ0YsMEJBQTBCO0lBQzFCLEVBQUU7SUFDRiw2RUFBNkU7SUFDN0UsbUVBQW1FO0lBQ25FLEVBQUU7SUFDRixrQ0FBa0M7SUFDbEMsb0JBQW9CO0lBRXBCLE1BQU0sQ0FBQyxHQUFHLHNCQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFcEUsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUVoRixNQUFNLGNBQWMsR0FBaUIsT0FB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QUFrRjtJQUNsRixnRkFBZ0Y7SUFDaEYsSUFBSSxpQkFBaUIsR0FBRyxXQUFXLENBQUM7SUFDcEMsS0FBSyxNQUFNLGtCQUFrQixJQUFJLElBQUksRUFBRTtRQUNyQyxpQkFBaUI7WUFDZixNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxRCxDQUFDLENBQUMsc0JBQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pGLENBQUMsQ0FBQyxzQkFBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQy9GO0lBRUQsT0FBTyxpQkFBaUIsQ0FBQztBQUMzQixDQUFDO0FBeEJELHdDQXdCQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLE9BQTBCOztJQUM1RCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZCLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFO1FBQ2hDLE9BQU8sTUFBQSxPQUFPLENBQUMsTUFBTSwwQ0FBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDcEM7SUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDbkYsQ0FBQztBQU5ELGtEQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVGFwcm9vdC1zcGVjaWZpYyBrZXkgYWdncmVnYXRpb24gYW5kIHRhcHRyZWUgbG9naWMgYXMgZGVmaW5lZCBpbjpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaXRjb2luL2JpcHMvYmxvYi9tYXN0ZXIvYmlwLTAzNDAubWVkaWF3aWtpXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYml0Y29pbi9iaXBzL2Jsb2IvbWFzdGVyL2JpcC0wMzQxLm1lZGlhd2lraVxuXG5pbXBvcnQgeyBUYXBUcmVlIGFzIFBzYnRUYXBUcmVlLCBUYXBMZWFmIGFzIFBzYnRUYXBMZWFmIH0gZnJvbSAnYmlwMTc0L3NyYy9saWIvaW50ZXJmYWNlcyc7XG5pbXBvcnQgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0Jyk7XG5pbXBvcnQgRmFzdFByaW9yaXR5UXVldWUgPSByZXF1aXJlKCdmYXN0cHJpb3JpdHlxdWV1ZScpO1xuaW1wb3J0IHsgc2NyaXB0IGFzIGJzY3JpcHQsIGNyeXB0byBhcyBiY3J5cHRvLCBwYXltZW50cyBhcyBicGF5bWVudHMgfSBmcm9tICdiaXRjb2luanMtbGliJztcbmNvbnN0IHZhcnVpbnQgPSByZXF1aXJlKCd2YXJ1aW50LWJpdGNvaW4nKTtcblxuLyoqXG4gKiBUaGUgMHgwMiBwcmVmaXggaW5kaWNhdGluZyBhbiBldmVuIFkgY29vcmRpbmF0ZSB3aGljaCBpcyBpbXBsaWNpdGx5IGFzc3VtZWRcbiAqIG9uIGFsbCAzMiBieXRlIHgtb25seSBwdWIga2V5cyBhcyBkZWZpbmVkIGluIEJJUDM0MC5cbiAqL1xuZXhwb3J0IGNvbnN0IEVWRU5fWV9DT09SRF9QUkVGSVggPSBCdWZmZXIub2YoMHgwMik7XG5leHBvcnQgY29uc3QgSU5JVElBTF9UQVBTQ1JJUFRfVkVSU0lPTiA9IDB4YzA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGlueVNlY3AyNTZrMUludGVyZmFjZSB7XG4gIGlzWE9ubHlQb2ludChwOiBVaW50OEFycmF5KTogYm9vbGVhbjtcbiAgeE9ubHlQb2ludEFkZFR3ZWFrKHA6IFVpbnQ4QXJyYXksIHR3ZWFrOiBVaW50OEFycmF5KTogWE9ubHlQb2ludEFkZFR3ZWFrUmVzdWx0IHwgbnVsbDtcbiAgcG9pbnRGcm9tU2NhbGFyKHNrOiBVaW50OEFycmF5LCBjb21wcmVzc2VkPzogYm9vbGVhbik6IFVpbnQ4QXJyYXkgfCBudWxsO1xuICBwb2ludE11bHRpcGx5KGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBVaW50OEFycmF5IHwgbnVsbDtcbiAgcG9pbnRBZGQoYTogVWludDhBcnJheSwgYjogVWludDhBcnJheSk6IFVpbnQ4QXJyYXkgfCBudWxsO1xuICBwcml2YXRlQWRkKGQ6IFVpbnQ4QXJyYXksIHR3ZWFrOiBVaW50OEFycmF5KTogVWludDhBcnJheSB8IG51bGw7XG4gIHByaXZhdGVOZWdhdGUoZDogVWludDhBcnJheSk6IFVpbnQ4QXJyYXk7XG59XG5cbi8qKlxuICogQWdncmVnYXRlcyBhIGxpc3Qgb2YgcHVibGljIGtleXMgaW50byBhIHNpbmdsZSBNdVNpZzIqIHB1YmxpYyBrZXlcbiAqIGFjY29yZGluZyB0byB0aGUgTXVTaWcyIHBhcGVyLlxuICogQHBhcmFtIGVjYyBFbGxpcHRpYyBjdXJ2ZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIHB1YmtleXMgVGhlIGxpc3Qgb2YgcHViIGtleXMgdG8gYWdncmVnYXRlXG4gKiBAcmV0dXJucyBhIDMyIGJ5dGUgQnVmZmVyIHJlcHJlc2VudGluZyB0aGUgYWdncmVnYXRlIGtleVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWdncmVnYXRlTXVTaWdQdWJrZXlzKGVjYzogVGlueVNlY3AyNTZrMUludGVyZmFjZSwgcHVia2V5czogQnVmZmVyW10pOiBVaW50OEFycmF5IHtcbiAgLy8gVE9ETzogQ29uc2lkZXIgZW5mb3JjaW5nIGtleSB1bmlxdWVuZXNzLlxuICBhc3NlcnQocHVia2V5cy5sZW5ndGggPiAxLCAnYXQgbGVhc3QgdHdvIHB1YmtleXMgYXJlIHJlcXVpcmVkIGZvciBtdXNpZyBrZXkgYWdncmVnYXRpb24nKTtcblxuICAvLyBTb3J0IHRoZSBrZXlzIGluIGFzY2VuZGluZyBvcmRlclxuICBwdWJrZXlzLnNvcnQoQnVmZmVyLmNvbXBhcmUpO1xuXG4gIC8vIEluIE11U2lnIGFsbCBzaWduZXJzIGNvbnRyaWJ1dGUga2V5IG1hdGVyaWFsIHRvIGEgc2luZ2xlIHNpZ25pbmcga2V5LFxuICAvLyB1c2luZyB0aGUgZXF1YXRpb25cbiAgLy9cbiAgLy8gICAgIFAgPSBzdW1faSDCtV9pICogUF9pXG4gIC8vXG4gIC8vIHdoZXJlIGBQX2lgIGlzIHRoZSBwdWJsaWMga2V5IG9mIHRoZSBgaWB0aCBzaWduZXIgYW5kIGDCtV9pYCBpcyBhIHNvLWNhbGxlZFxuICAvLyBfTXVTaWcgY29lZmZpY2llbnRfIGNvbXB1dGVkIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGVxdWF0aW9uXG4gIC8vXG4gIC8vIEwgPSBIKFBfMSB8fCBQXzIgfHwgLi4uIHx8IFBfbilcbiAgLy8gwrVfaSA9IEgoTCB8fCBQX2kpXG5cbiAgY29uc3QgTCA9IGJjcnlwdG8udGFnZ2VkSGFzaCgnS2V5QWdnIGxpc3QnLCBCdWZmZXIuY29uY2F0KHB1YmtleXMpKTtcblxuICBjb25zdCBzZWNvbmRVbmlxdWVQdWJrZXkgPSBwdWJrZXlzLmZpbmQoKHB1YmtleSkgPT4gIXB1YmtleXNbMF0uZXF1YWxzKHB1YmtleSkpO1xuXG4gIGNvbnN0IHR3ZWFrZWRQdWJrZXlzOiBVaW50OEFycmF5W10gPSBwdWJrZXlzLm1hcCgocHVia2V5KSA9PiB7XG4gICAgY29uc3QgeHlQdWJrZXkgPSBCdWZmZXIuY29uY2F0KFtFVkVOX1lfQ09PUkRfUFJFRklYLCBwdWJrZXldKTtcblxuICAgIGlmIChzZWNvbmRVbmlxdWVQdWJrZXkgIT09IHVuZGVmaW5lZCAmJiBzZWNvbmRVbmlxdWVQdWJrZXkuZXF1YWxzKHB1YmtleSkpIHtcbiAgICAgIC8vIFRoZSBzZWNvbmQgdW5pcXVlIGtleSBpbiB0aGUgcHVia2V5IGxpc3QgZ2l2ZW4gdG8gJydLZXlBZ2cnJyAoYXMgd2VsbFxuICAgICAgLy8gYXMgYW55IGtleXMgaWRlbnRpY2FsIHRvIHRoaXMga2V5KSBnZXRzIHRoZSBjb25zdGFudCBLZXlBZ2dcbiAgICAgIC8vIGNvZWZmaWNpZW50IDEgd2hpY2ggc2F2ZXMgYW4gZXhwb25lbnRpYXRpb24gKHNlZSB0aGUgTXVTaWcyKiBhcHBlbmRpeFxuICAgICAgLy8gaW4gdGhlIE11U2lnMiBwYXBlcikuXG4gICAgICByZXR1cm4geHlQdWJrZXk7XG4gICAgfVxuXG4gICAgY29uc3QgYyA9IGJjcnlwdG8udGFnZ2VkSGFzaCgnS2V5QWdnIGNvZWZmaWNpZW50JywgQnVmZmVyLmNvbmNhdChbTCwgcHVia2V5XSkpO1xuXG4gICAgY29uc3QgdHdlYWtlZFB1YmtleSA9IGVjYy5wb2ludE11bHRpcGx5KHh5UHVia2V5LCBjKTtcbiAgICBpZiAoIXR3ZWFrZWRQdWJrZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIG11bHRpcGx5IHB1YmtleSBieSBjb2VmZmljaWVudCcpO1xuICAgIH1cbiAgICByZXR1cm4gdHdlYWtlZFB1YmtleTtcbiAgfSk7XG4gIGNvbnN0IGFnZ3JlZ2F0ZVB1YmtleSA9IHR3ZWFrZWRQdWJrZXlzLnJlZHVjZSgocHJldiwgY3VycikgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBlY2MucG9pbnRBZGQocHJldiwgY3Vycik7XG4gICAgaWYgKCFuZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBzdW0gcHVia2V5cycpO1xuICAgIHJldHVybiBuZXh0O1xuICB9KTtcblxuICByZXR1cm4gYWdncmVnYXRlUHVia2V5LnNsaWNlKDEpO1xufVxuXG4vKipcbiAqIEVuY29kZXMgdGhlIGxlbmd0aCBvZiBhIHNjcmlwdCBhcyBhIGJpdGNvaW4gdmFyaWFibGUgbGVuZ3RoIGludGVnZXIuXG4gKiBAcGFyYW0gc2NyaXB0XG4gKiBAcmV0dXJuc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplU2NyaXB0U2l6ZShzY3JpcHQ6IEJ1ZmZlcik6IEJ1ZmZlciB7XG4gIHJldHVybiB2YXJ1aW50LmVuY29kZShzY3JpcHQubGVuZ3RoKTtcbn1cblxuLyoqXG4gKiBHZXRzIGEgdGFwbGVhZiB0YWdnZWQgaGFzaCBmcm9tIGEgc2NyaXB0LlxuICogQHBhcmFtIHNjcmlwdFxuICogQHJldHVybnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc2hUYXBMZWFmKHNjcmlwdDogQnVmZmVyLCBsZWFmVmVyc2lvbiA9IElOSVRJQUxfVEFQU0NSSVBUX1ZFUlNJT04pOiBCdWZmZXIge1xuICBjb25zdCBzaXplID0gc2VyaWFsaXplU2NyaXB0U2l6ZShzY3JpcHQpO1xuICByZXR1cm4gYmNyeXB0by50YWdnZWRIYXNoKCdUYXBMZWFmJywgQnVmZmVyLmNvbmNhdChbQnVmZmVyLm9mKGxlYWZWZXJzaW9uKSwgc2l6ZSwgc2NyaXB0XSkpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBsZXhpY29ncmFwaGljYWxseSBzb3J0ZWQgdGFwYnJhbmNoIGZyb20gdHdvIGNoaWxkIHRhcHRyZWUgbm9kZXNcbiAqIGFuZCByZXR1cm5zIGl0cyB0YWdnZWQgaGFzaC5cbiAqIEBwYXJhbSBjaGlsZDFcbiAqIEBwYXJhbSBjaGlsZDJcbiAqIEByZXR1cm5zIHRoZSB0YWdnZWQgdGFwYnJhbmNoIGhhc2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc2hUYXBCcmFuY2goY2hpbGQxOiBCdWZmZXIsIGNoaWxkMjogQnVmZmVyKTogQnVmZmVyIHtcbiAgLy8gc29ydCB0aGUgY2hpbGRyZW4gbGV4aWNvZ3JhcGhpY2FsbHlcbiAgY29uc3Qgc29ydGVkQ2hpbGRyZW4gPSBbY2hpbGQxLCBjaGlsZDJdLnNvcnQoQnVmZmVyLmNvbXBhcmUpO1xuXG4gIHJldHVybiBiY3J5cHRvLnRhZ2dlZEhhc2goJ1RhcEJyYW5jaCcsIEJ1ZmZlci5jb25jYXQoc29ydGVkQ2hpbGRyZW4pKTtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlVGFwVHdlYWsocHVia2V5OiBVaW50OEFycmF5LCB0YXB0cmVlUm9vdD86IFVpbnQ4QXJyYXkpOiBVaW50OEFycmF5IHtcbiAgaWYgKHRhcHRyZWVSb290KSB7XG4gICAgcmV0dXJuIGJjcnlwdG8udGFnZ2VkSGFzaCgnVGFwVHdlYWsnLCBCdWZmZXIuY29uY2F0KFtwdWJrZXksIHRhcHRyZWVSb290XSkpO1xuICB9XG4gIC8vIElmIHRoZSBzcGVuZGluZyBjb25kaXRpb25zIGRvIG5vdCByZXF1aXJlIGEgc2NyaXB0IHBhdGgsIHRoZSBvdXRwdXQga2V5IHNob3VsZCBjb21taXQgdG8gYW5cbiAgLy8gdW5zcGVuZGFibGUgc2NyaXB0IHBhdGggaW5zdGVhZCBvZiBoYXZpbmcgbm8gc2NyaXB0IHBhdGguXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaXRjb2luL2JpcHMvYmxvYi9tYXN0ZXIvYmlwLTAzNDEubWVkaWF3aWtpI2NpdGVfbm90ZS0yMlxuICByZXR1cm4gYmNyeXB0by50YWdnZWRIYXNoKCdUYXBUd2VhaycsIEJ1ZmZlci5mcm9tKHB1YmtleSkpO1xufVxuXG4vKipcbiAqIFR3ZWFrcyBhIHByaXZrZXksIHVzaW5nIHRoZSB0YWdnZWQgaGFzaCBvZiBpdHMgcHVia2V5LCBhbmQgKG9wdGlvbmFsbHkpIGEgdGFwdHJlZSByb290XG4gKiBAcGFyYW0gZWNjIEVsbGlwdGljIGN1cnZlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gcHVia2V5IHB1YmxpYyBrZXksIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSB0d2Vha1xuICogQHBhcmFtIHByaXZrZXkgdGhlIHByaXZrZXkgdG8gdHdlYWtcbiAqIEBwYXJhbSB0YXB0cmVlUm9vdCB0aGUgdGFwdHJlZSByb290IHRhZ2dlZCBoYXNoXG4gKiBAcmV0dXJucyB7QnVmZmVyfSB0aGUgdHdlYWtlZCBwcml2a2V5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YXBUd2Vha1ByaXZrZXkoXG4gIGVjYzogVGlueVNlY3AyNTZrMUludGVyZmFjZSxcbiAgcHVia2V5OiBVaW50OEFycmF5LFxuICBwcml2a2V5OiBVaW50OEFycmF5LFxuICB0YXB0cmVlUm9vdD86IFVpbnQ4QXJyYXlcbik6IFVpbnQ4QXJyYXkge1xuICBjb25zdCB0YXBUd2VhayA9IGNhbGN1bGF0ZVRhcFR3ZWFrKHB1YmtleSwgdGFwdHJlZVJvb3QpO1xuXG4gIGNvbnN0IHBvaW50ID0gZWNjLnBvaW50RnJvbVNjYWxhcihwcml2a2V5KTtcbiAgaWYgKCFwb2ludCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHByaXZhdGUga2V5Jyk7XG4gIGlmIChwb2ludFswXSAlIDIgPT09IDEpIHByaXZrZXkgPSBlY2MucHJpdmF0ZU5lZ2F0ZShwcml2a2V5KTtcbiAgY29uc3QgcmVzdWx0ID0gZWNjLnByaXZhdGVBZGQocHJpdmtleSwgdGFwVHdlYWspO1xuICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHByaXZhdGUga2V5Jyk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgWE9ubHlQb2ludEFkZFR3ZWFrUmVzdWx0IHtcbiAgcGFyaXR5OiAxIHwgMDtcbiAgeE9ubHlQdWJrZXk6IFVpbnQ4QXJyYXk7XG59XG5cbi8qKlxuICogVHdlYWtzIGFuIGludGVybmFsIHB1YmtleSwgdXNpbmcgdGhlIHRhZ2dlZCBoYXNoIG9mIGl0c2VsZiwgYW5kIChvcHRpb25hbGx5KSBhIHRhcHRyZWUgcm9vdFxuICogQHBhcmFtIGVjYyBFbGxpcHRpYyBjdXJ2ZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIHB1YmtleSB0aGUgaW50ZXJuYWwgcHVia2V5IHRvIHR3ZWFrXG4gKiBAcGFyYW0gdGFwdHJlZVJvb3QgdGhlIHRhcHRyZWUgcm9vdCB0YWdnZWQgaGFzaFxuICogQHJldHVybnMge1R3ZWFrZWRQdWJrZXl9IHRoZSB0d2Vha2VkIHB1YmtleVxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFwVHdlYWtQdWJrZXkoXG4gIGVjYzogVGlueVNlY3AyNTZrMUludGVyZmFjZSxcbiAgcHVia2V5OiBVaW50OEFycmF5LFxuICB0YXB0cmVlUm9vdD86IEJ1ZmZlclxuKTogWE9ubHlQb2ludEFkZFR3ZWFrUmVzdWx0IHtcbiAgY29uc3QgdGFwVHdlYWsgPSBjYWxjdWxhdGVUYXBUd2VhayhwdWJrZXksIHRhcHRyZWVSb290KTtcbiAgY29uc3QgcmVzdWx0ID0gZWNjLnhPbmx5UG9pbnRBZGRUd2VhayhwdWJrZXksIHRhcFR3ZWFrKTtcbiAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwdWJrZXknKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYXB0cmVlIHtcbiAgcm9vdDogQnVmZmVyO1xuICBwYXRoczogQnVmZmVyW11bXTtcbn1cblxuaW50ZXJmYWNlIFdlaWdodGVkVGFwU2NyaXB0IHtcbiAgLyoqIEEgVGFwTGVhZiBvciBUYXBCcmFuY2ggdGFnZ2VkIGhhc2ggKi9cbiAgdGFnZ2VkSGFzaDogQnVmZmVyO1xuICB3ZWlnaHQ6IG51bWJlcjtcbiAgcGF0aHM6IHtcbiAgICBbaW5kZXg6IG51bWJlcl06IEJ1ZmZlcltdO1xuICB9O1xufVxuXG5mdW5jdGlvbiByZWN1cnNlVGFwdHJlZShsZWF2ZXM6IEl0ZXJhdG9yPFtudW1iZXIsIFBzYnRUYXBMZWFmXT4sIHRhcmdldERlcHRoID0gMCk6IFRhcHRyZWUge1xuICBjb25zdCB7IHZhbHVlLCBkb25lIH0gPSBsZWF2ZXMubmV4dCgpO1xuICBhc3NlcnQoIWRvbmUsICdpbnN1ZmZpY2llbnQgbGVhdmVzIHRvIHJlY29uc3RydWN0IHRhcCB0cmVlJyk7XG4gIGNvbnN0IFtpbmRleCwgbGVhZl0gPSB2YWx1ZTtcbiAgY29uc3QgdHJlZTogVGFwdHJlZSA9IHtcbiAgICByb290OiBoYXNoVGFwTGVhZihsZWFmLnNjcmlwdCwgbGVhZi5sZWFmVmVyc2lvbiksXG4gICAgcGF0aHM6IFtdLFxuICB9O1xuICB0cmVlLnBhdGhzW2luZGV4XSA9IFtdO1xuICBmb3IgKGxldCBkZXB0aCA9IGxlYWYuZGVwdGg7IGRlcHRoID4gdGFyZ2V0RGVwdGg7IGRlcHRoLS0pIHtcbiAgICBjb25zdCBzaWJsaW5nID0gcmVjdXJzZVRhcHRyZWUobGVhdmVzLCBkZXB0aCk7XG4gICAgdHJlZS5wYXRocy5mb3JFYWNoKChwYXRoKSA9PiBwYXRoLnB1c2goc2libGluZy5yb290KSk7XG4gICAgc2libGluZy5wYXRocy5mb3JFYWNoKChwYXRoKSA9PiBwYXRoLnB1c2godHJlZS5yb290KSk7XG4gICAgdHJlZS5yb290ID0gaGFzaFRhcEJyYW5jaCh0cmVlLnJvb3QsIHNpYmxpbmcucm9vdCk7XG4gICAgLy8gTWVyZ2UgZGlzam9pbnQgc3BhcnNlIGFycmF5cyBvZiBwYXRocyBpbnRvIHRyZWUucGF0aHNcbiAgICBPYmplY3QuYXNzaWduKHRyZWUucGF0aHMsIHNpYmxpbmcucGF0aHMpO1xuICB9XG4gIHJldHVybiB0cmVlO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIHJvb3QgaGFzaCBhbmQgaGFzaC1wYXRocyBvZiBhIHRhcHRyZWUgZnJvbSB0aGUgZGVwdGgtZmlyc3RcbiAqIGNvbnN0cnVjdGlvbiB1c2VkIGluIEJJUC0wMzcxIFBTQlRzXG4gKiBAcGFyYW0gdHJlZVxuICogQHJldHVybnMge1RhcHRyZWV9IHRoZSB0cmVlLCByZXByZXNlbnRlZCBieSBpdHMgcm9vdCBoYXNoLCBhbmQgdGhlIHBhdGhzIHRvXG4gKiB0aGF0IHJvb3QgZnJvbSBlYWNoIG9mIHRoZSBpbnB1dCBzY3JpcHRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREZXB0aEZpcnN0VGFwdHJlZSh0cmVlOiBQc2J0VGFwVHJlZSk6IFRhcHRyZWUge1xuICBjb25zdCBpdGVyID0gdHJlZS5sZWF2ZXMuZW50cmllcygpO1xuICBjb25zdCByZXQgPSByZWN1cnNlVGFwdHJlZShpdGVyKTtcbiAgYXNzZXJ0KGl0ZXIubmV4dCgpLmRvbmUsICdpbnZhbGlkIHRhcCB0cmVlLCBubyBwYXRoIHRvIHNvbWUgbGVhdmVzJyk7XG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgcm9vdCBoYXNoIG9mIGEgdGFwdHJlZSB1c2luZyBhIHdlaWdodGVkIEh1ZmZtYW4gY29uc3RydWN0aW9uIGZyb20gYVxuICogbGlzdCBvZiBzY3JpcHRzIGFuZCBjb3JyZXNwb25kaW5nIHdlaWdodHMuXG4gKiBAcGFyYW0gc2NyaXB0c1xuICogQHBhcmFtIHdlaWdodHNcbiAqIEByZXR1cm5zIHtUYXB0cmVlfSB0aGUgdHJlZSwgcmVwcmVzZW50ZWQgYnkgaXRzIHJvb3QgaGFzaCwgYW5kIHRoZSBwYXRocyB0byB0aGF0IHJvb3QgZnJvbSBlYWNoIG9mIHRoZSBpbnB1dCBzY3JpcHRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIdWZmbWFuVGFwdHJlZShzY3JpcHRzOiBCdWZmZXJbXSwgd2VpZ2h0czogQXJyYXk8bnVtYmVyIHwgdW5kZWZpbmVkPik6IFRhcHRyZWUge1xuICBhc3NlcnQoc2NyaXB0cy5sZW5ndGggPiAwLCAnYXQgbGVhc3Qgb25lIHNjcmlwdCBpcyByZXF1aXJlZCB0byBjb25zdHJ1Y3QgYSB0YXAgdHJlZScpO1xuXG4gIC8vIENyZWF0ZSBhIHF1ZXVlL2hlYXAgb2YgdGhlIHByb3ZpZGVkIHNjcmlwdHMgcHJpb3JpdGl6ZWQgYWNjb3JkaW5nIHRvIHRoZWlyXG4gIC8vIGNvcnJlc3BvbmRpbmcgd2VpZ2h0cy5cbiAgY29uc3QgcXVldWUgPSBuZXcgRmFzdFByaW9yaXR5UXVldWU8V2VpZ2h0ZWRUYXBTY3JpcHQ+KChhLCBiKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIGEud2VpZ2h0IDwgYi53ZWlnaHQ7XG4gIH0pO1xuICBzY3JpcHRzLmZvckVhY2goKHNjcmlwdCwgaW5kZXgpID0+IHtcbiAgICBjb25zdCB3ZWlnaHQgPSB3ZWlnaHRzW2luZGV4XSB8fCAxO1xuICAgIGFzc2VydCh3ZWlnaHQgPiAwLCAnc2NyaXB0IHdlaWdodCBtdXN0IGJlIGEgcG9zaXRpdmUgdmFsdWUnKTtcblxuICAgIHF1ZXVlLmFkZCh7XG4gICAgICB3ZWlnaHQsXG4gICAgICB0YWdnZWRIYXNoOiBoYXNoVGFwTGVhZihzY3JpcHQpLFxuICAgICAgcGF0aHM6IHsgW2luZGV4XTogW10gfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gTm93IHRoYXQgd2UgaGF2ZSBhIHF1ZXVlIG9mIHdlaWdodGVkIHNjcmlwdHMsIHdlIGJlZ2luIGEgbG9vcCB3aGVyZWJ5IHdlXG4gIC8vIHJlbW92ZSB0aGUgdHdvIGxvd2VzdCB3ZWlnaHRlZCBpdGVtcyBmcm9tIHRoZSBxdWV1ZS4gV2UgY3JlYXRlIGEgdGFwIGJyYW5jaFxuICAvLyBub2RlIGZyb20gdGhlIHR3byBpdGVtcywgYW5kIGFkZCB0aGUgYnJhbmNoIGJhY2sgdG8gdGhlIHF1ZXVlIHdpdGggdGhlXG4gIC8vIGNvbWJpbmVkIHdlaWdodCBvZiBib3RoIGl0cyBjaGlsZHJlbi4gRWFjaCBsb29wIHJlZHVjZXMgdGhlIG51bWJlciBvZiBpdGVtc1xuICAvLyBpbiB0aGUgcXVldWUgYnkgb25lLCBhbmQgd2UgcmVwZWF0IHVudGlsIHdlIGFyZSBsZWZ0IHdpdGggb25seSBvbmUgaXRlbSAtXG4gIC8vIHRoaXMgYmVjb21lcyB0aGUgdGFwIHRyZWUgcm9vdC5cbiAgLy9cbiAgLy8gRm9yIGV4YW1wbGUsIGlmIHdlIGJlZ2luIHdpdGggc2NyaXB0cyBBLCBCLCBDLCBEIHdpdGggd2VpZ2h0cyA2LCAzLCAxLCAxXG4gIC8vIEFmdGVyIGZpcnN0IGxvb3A6IEEoNiksIEIoMyksIENEKDEgKyAxKVxuICAvLyBBZnRlciBzZWNvbmQgbG9vcDogQSg2KSwgQltDRF0oMyArIDIpXG4gIC8vIEZpbmFsIGxvb3A6IEFbQltDRF1dKDYrNSlcbiAgLy8gVGhlIGZpbmFsIHRyZWUgd2lsbCBsb29rIGxpa2U6XG4gIC8vXG4gIC8vICAgICAgICBBW0JbQ0RdXVxuICAvLyAgICAgICAvICAgICAgICBcXFxuICAvLyAgICAgIEEgICAgICAgICBCW0NEXVxuICAvLyAgICAgICAgICAgICAgIC8gICAgIFxcXG4gIC8vICAgICAgICAgICAgICBCICAgICAgW0NEXVxuICAvLyAgICAgICAgICAgICAgICAgICAgLyAgICBcXFxuICAvLyAgICAgICAgICAgICAgICAgICBDICAgICAgRFxuICAvL1xuICAvLyBUaGlzIGVuc3VyZXMgdGhhdCB0aGUgc3BlbmRpbmcgY29uZGl0aW9ucyB3ZSBiZWxpZXZlIHRvIGhhdmUgdGhlIGhpZ2hlc3RcbiAgLy8gcHJvYmFiaWxpdHkgb2YgYmVpbmcgdXNlZCBhcmUgZnVydGhlciB1cCB0aGUgdHJlZSB0aGFuIGxlc3MgbGlrZWx5IHNjcmlwdHMsXG4gIC8vIHRoZXJlYnkgcmVkdWNpbmcgdGhlIHNpemUgb2YgdGhlIG1lcmtsZSBwcm9vZnMgZm9yIHRoZSBtb3JlIGxpa2VseSBzY3JpcHRzLlxuICB3aGlsZSAocXVldWUuc2l6ZSA+IDEpIHtcbiAgICAvLyBXZSBjYW4gc2FmZWx5IGV4cGVjdCB0d28gcG9sbHMgdG8gcmV0dXJuIG5vbi1udWxsIGVsZW1lbnRzIHNpbmNlIHdlJ3ZlXG4gICAgLy8gY2hlY2tlZCB0aGF0IHRoZSBxdWV1ZSBoYXMgYXQgbGVhc3QgdHdvIGVsZW1lbnRzIGJlZm9yZSBsb29waW5nLlxuICAgIGNvbnN0IGNoaWxkMSA9IHF1ZXVlLnBvbGwoKSBhcyBXZWlnaHRlZFRhcFNjcmlwdDtcbiAgICBjb25zdCBjaGlsZDIgPSBxdWV1ZS5wb2xsKCkgYXMgV2VpZ2h0ZWRUYXBTY3JpcHQ7XG5cbiAgICBPYmplY3QudmFsdWVzKGNoaWxkMS5wYXRocykuZm9yRWFjaCgocGF0aCkgPT4gcGF0aC5wdXNoKGNoaWxkMi50YWdnZWRIYXNoKSk7XG4gICAgT2JqZWN0LnZhbHVlcyhjaGlsZDIucGF0aHMpLmZvckVhY2goKHBhdGgpID0+IHBhdGgucHVzaChjaGlsZDEudGFnZ2VkSGFzaCkpO1xuXG4gICAgcXVldWUuYWRkKHtcbiAgICAgIHRhZ2dlZEhhc2g6IGhhc2hUYXBCcmFuY2goY2hpbGQxLnRhZ2dlZEhhc2gsIGNoaWxkMi50YWdnZWRIYXNoKSxcbiAgICAgIHdlaWdodDogY2hpbGQxLndlaWdodCArIGNoaWxkMi53ZWlnaHQsXG4gICAgICBwYXRoczogeyAuLi5jaGlsZDEucGF0aHMsIC4uLmNoaWxkMi5wYXRocyB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWZ0ZXIgdGhlIHdoaWxlIGxvb3AgYWJvdmUgY29tcGxldGVzIHdlIHNob3VsZCBoYXZlIGV4YWN0bHkgb25lIGVsZW1lbnRcbiAgLy8gcmVtYWluaW5nIGluIHRoZSBxdWV1ZSwgd2hpY2ggd2UgY2FuIHNhZmVseSBleHRyYWN0IGJlbG93LlxuICBjb25zdCByb290Tm9kZSA9IHF1ZXVlLnBvbGwoKSBhcyBXZWlnaHRlZFRhcFNjcmlwdDtcblxuICBjb25zdCBwYXRocyA9IE9iamVjdC5lbnRyaWVzKHJvb3ROb2RlLnBhdGhzKS5yZWR1Y2UoKGFjYywgW2luZGV4LCBwYXRoXSkgPT4ge1xuICAgIGFjY1tOdW1iZXIoaW5kZXgpXSA9IHBhdGg7IC8vIFRPRE86IFdoeSBkb2Vzbid0IFRTIGtub3cgaXQncyBhIG51bWJlcj9cbiAgICByZXR1cm4gYWNjO1xuICB9LCBBcnJheShzY3JpcHRzLmxlbmd0aCkpO1xuICByZXR1cm4geyByb290OiByb290Tm9kZS50YWdnZWRIYXNoLCBwYXRocyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udHJvbEJsb2NrKFxuICBwYXJpdHk6IDAgfCAxLFxuICBwdWJrZXk6IFVpbnQ4QXJyYXksXG4gIHBhdGg6IEJ1ZmZlcltdLFxuICBsZWFmVmVyc2lvbiA9IElOSVRJQUxfVEFQU0NSSVBUX1ZFUlNJT05cbik6IEJ1ZmZlciB7XG4gIGNvbnN0IHBhcml0eVZlcnNpb24gPSBsZWFmVmVyc2lvbiArIHBhcml0eTtcblxuICByZXR1cm4gQnVmZmVyLmNvbmNhdChbQnVmZmVyLm9mKHBhcml0eVZlcnNpb24pLCBwdWJrZXksIC4uLnBhdGhdKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBLZXlQYXRoV2l0bmVzcyB7XG4gIHNwZW5kVHlwZTogJ0tleSc7XG4gIHNpZ25hdHVyZTogQnVmZmVyO1xuICBhbm5leD86IEJ1ZmZlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY3JpcHRQYXRoV2l0bmVzcyB7XG4gIHNwZW5kVHlwZTogJ1NjcmlwdCc7XG4gIHNjcmlwdFNpZzogQnVmZmVyW107XG4gIHRhcHNjcmlwdDogQnVmZmVyO1xuICBjb250cm9sQmxvY2s6IEJ1ZmZlcjtcbiAgYW5uZXg/OiBCdWZmZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udHJvbEJsb2NrIHtcbiAgcGFyaXR5OiBudW1iZXI7XG4gIGludGVybmFsUHVia2V5OiBCdWZmZXI7XG4gIGxlYWZWZXJzaW9uOiBudW1iZXI7XG4gIHBhdGg6IEJ1ZmZlcltdO1xufVxuXG4vKipcbiAqIFBhcnNlcyBhIHRhcHJvb3Qgd2l0bmVzcyBzdGFjayBhbmQgZXh0cmFjdHMga2V5IGRhdGEgZWxlbWVudHMuXG4gKiBAcGFyYW0gd2l0bmVzc1N0YWNrXG4gKiBAcmV0dXJucyB7U2NyaXB0UGF0aFdpdG5lc3N8S2V5UGF0aFdpdG5lc3N9IGFuIG9iamVjdCByZXByZXNlbnRpbmcgdGhlXG4gKiBwYXJzZWQgd2l0bmVzcyBmb3IgYSBzY3JpcHQgcGF0aCBvciBrZXkgcGF0aCBzcGVuZC5cbiAqIEB0aHJvd3Mge0Vycm9yfSBpZiB0aGUgd2l0bmVzcyBzdGFjayBkb2VzIG5vdCBjb25mb3JtIHRvIHRoZSBCSVAgMzQxIHNjcmlwdCB2YWxpZGF0aW9uIHJ1bGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRhcHJvb3RXaXRuZXNzKHdpdG5lc3NTdGFjazogQnVmZmVyW10pOiBTY3JpcHRQYXRoV2l0bmVzcyB8IEtleVBhdGhXaXRuZXNzIHtcbiAgbGV0IGFubmV4O1xuICBpZiAod2l0bmVzc1N0YWNrLmxlbmd0aCA+PSAyICYmIHdpdG5lc3NTdGFja1t3aXRuZXNzU3RhY2subGVuZ3RoIC0gMV1bMF0gPT09IDB4NTApIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgYXQgbGVhc3QgdHdvIHdpdG5lc3MgZWxlbWVudHMsIGFuZCB0aGUgZmlyc3QgYnl0ZSBvZiB0aGUgbGFzdCBlbGVtZW50IGlzXG4gICAgLy8gMHg1MCwgdGhpcyBsYXN0IGVsZW1lbnQgaXMgY2FsbGVkIGFubmV4IGEgYW5kIGlzIHJlbW92ZWQgZnJvbSB0aGUgd2l0bmVzcyBzdGFja1xuICAgIGFubmV4ID0gd2l0bmVzc1N0YWNrW3dpdG5lc3NTdGFjay5sZW5ndGggLSAxXTtcbiAgICB3aXRuZXNzU3RhY2sgPSB3aXRuZXNzU3RhY2suc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKHdpdG5lc3NTdGFjay5sZW5ndGggPCAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd3aXRuZXNzIHN0YWNrIG11c3QgaGF2ZSBhdCBsZWFzdCBvbmUgZWxlbWVudCcpO1xuICB9IGVsc2UgaWYgKHdpdG5lc3NTdGFjay5sZW5ndGggPT09IDEpIHtcbiAgICAvLyBrZXkgcGF0aCBzcGVuZFxuICAgIGNvbnN0IHNpZ25hdHVyZSA9IHdpdG5lc3NTdGFja1swXTtcbiAgICBpZiAoIWJzY3JpcHQuaXNDYW5vbmljYWxTY2hub3JyU2lnbmF0dXJlKHNpZ25hdHVyZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBzaWduYXR1cmUnKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgc3BlbmRUeXBlOiAnS2V5Jywgc2lnbmF0dXJlLCBhbm5leCB9O1xuICB9XG5cbiAgLy8gc2NyaXB0IHBhdGggc3BlbmRcbiAgLy8gc2Vjb25kIHRvIGxhc3QgZWxlbWVudCBpcyB0aGUgdGFwc2NyaXB0XG4gIGNvbnN0IHRhcHNjcmlwdCA9IHdpdG5lc3NTdGFja1t3aXRuZXNzU3RhY2subGVuZ3RoIC0gMl07XG4gIGNvbnN0IHRhcHNjcmlwdENodW5rcyA9IGJzY3JpcHQuZGVjb21waWxlKHRhcHNjcmlwdCk7XG5cbiAgaWYgKCF0YXBzY3JpcHRDaHVua3MgfHwgdGFwc2NyaXB0Q2h1bmtzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndGFwc2NyaXB0IGlzIG5vdCBhIHZhbGlkIHNjcmlwdCcpO1xuICB9XG5cbiAgLy8gVGhlIGxhc3Qgc3RhY2sgZWxlbWVudCBpcyBjYWxsZWQgdGhlIGNvbnRyb2wgYmxvY2sgYywgYW5kIG11c3QgaGF2ZSBsZW5ndGggMzMgKyAzMm0sXG4gIC8vIGZvciBhIHZhbHVlIG9mIG0gdGhhdCBpcyBhbiBpbnRlZ2VyIGJldHdlZW4gMCBhbmQgMTI4LCBpbmNsdXNpdmVcbiAgY29uc3QgY29udHJvbEJsb2NrID0gd2l0bmVzc1N0YWNrW3dpdG5lc3NTdGFjay5sZW5ndGggLSAxXTtcbiAgaWYgKGNvbnRyb2xCbG9jay5sZW5ndGggPCAzMyB8fCBjb250cm9sQmxvY2subGVuZ3RoID4gMzMgKyAzMiAqIDEyOCB8fCBjb250cm9sQmxvY2subGVuZ3RoICUgMzIgIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgY29udHJvbCBibG9jayBsZW5ndGgnKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3BlbmRUeXBlOiAnU2NyaXB0JyxcbiAgICBzY3JpcHRTaWc6IHdpdG5lc3NTdGFjay5zbGljZSgwLCAtMiksXG4gICAgdGFwc2NyaXB0LFxuICAgIGNvbnRyb2xCbG9jayxcbiAgICBhbm5leCxcbiAgfTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgYSB0YXByb290IGNvbnRyb2wgYmxvY2suXG4gKiBAcGFyYW0gZWNjIEVsbGlwdGljIGN1cnZlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gY29udHJvbEJsb2NrIHRoZSBjb250cm9sIGJsb2NrIHRvIHBhcnNlXG4gKiBAcmV0dXJucyB7Q29udHJvbEJsb2NrfSB0aGUgcGFyc2VkIGNvbnRyb2wgYmxvY2tcbiAqIEB0aHJvd3Mge0Vycm9yfSBpZiB0aGUgd2l0bmVzcyBzdGFjayBkb2VzIG5vdCBjb25mb3JtIHRvIHRoZSBCSVAgMzQxIHNjcmlwdCB2YWxpZGF0aW9uIHJ1bGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNvbnRyb2xCbG9jayhlY2M6IFRpbnlTZWNwMjU2azFJbnRlcmZhY2UsIGNvbnRyb2xCbG9jazogQnVmZmVyKTogQ29udHJvbEJsb2NrIHtcbiAgaWYgKChjb250cm9sQmxvY2subGVuZ3RoIC0gMSkgJSAzMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY29udHJvbCBibG9jayBsZW5ndGgnKTtcbiAgfVxuXG4gIGNvbnN0IHBhcml0eSA9IGNvbnRyb2xCbG9ja1swXSAmIDB4MDE7XG5cbiAgLy8gTGV0IHAgPSBjWzE6MzNdIGFuZCBsZXQgUCA9IGxpZnRfeChpbnQocCkpIHdoZXJlIGxpZnRfeCBhbmQgWzpdIGFyZSBkZWZpbmVkIGFzIGluIEJJUDM0MC5cbiAgLy8gRmFpbCBpZiB0aGlzIHBvaW50IGlzIG5vdCBvbiB0aGUgY3VydmVcbiAgY29uc3QgaW50ZXJuYWxQdWJrZXkgPSBjb250cm9sQmxvY2suc2xpY2UoMSwgMzMpO1xuICBpZiAoIWVjYy5pc1hPbmx5UG9pbnQoaW50ZXJuYWxQdWJrZXkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnRlcm5hbCBwdWJrZXkgaXMgbm90IGFuIEVDIHBvaW50Jyk7XG4gIH1cblxuICAvLyBUaGUgbGVhZiB2ZXJzaW9uIGNhbm5vdCBiZSAweDUwIGFzIHRoYXQgd291bGQgcmVzdWx0IGluIGFtYmlndWl0eSB3aXRoIHRoZSBhbm5leC5cbiAgY29uc3QgbGVhZlZlcnNpb24gPSBjb250cm9sQmxvY2tbMF0gJiAweGZlO1xuICBpZiAobGVhZlZlcnNpb24gPT09IDB4NTApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgbGVhZiB2ZXJzaW9uJyk7XG4gIH1cblxuICBjb25zdCBwYXRoOiBCdWZmZXJbXSA9IFtdO1xuICBmb3IgKGxldCBqID0gMzM7IGogPCBjb250cm9sQmxvY2subGVuZ3RoOyBqICs9IDMyKSB7XG4gICAgcGF0aC5wdXNoKGNvbnRyb2xCbG9jay5zbGljZShqLCBqICsgMzIpKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcGFyaXR5LFxuICAgIGludGVybmFsUHVia2V5LFxuICAgIGxlYWZWZXJzaW9uLFxuICAgIHBhdGgsXG4gIH07XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlcyB0aGUgdGFwbGVhZiBoYXNoIGZyb20gYSBjb250cm9sIGJsb2NrIGFuZCBzY3JpcHQuXG4gKiBAcGFyYW0gZWNjIEVsbGlwdGljIGN1cnZlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gY29udHJvbEJsb2NrIHRoZSBjb250cm9sIGJsb2NrLCBlaXRoZXIgcmF3IG9yIHBhcnNlZFxuICogQHBhcmFtIHRhcHNjcmlwdCB0aGUgbGVhZiBzY3JpcHQgY29ycmVzZHBvbmRpbmcgdG8gdGhlIGNvbnRyb2wgYmxvY2tcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IHRoZSB0YXBsZWFmIGhhc2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRhcGxlYWZIYXNoKFxuICBlY2M6IFRpbnlTZWNwMjU2azFJbnRlcmZhY2UsXG4gIGNvbnRyb2xCbG9jazogQnVmZmVyIHwgQ29udHJvbEJsb2NrLFxuICB0YXBzY3JpcHQ6IEJ1ZmZlclxuKTogQnVmZmVyIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjb250cm9sQmxvY2spKSB7XG4gICAgY29udHJvbEJsb2NrID0gcGFyc2VDb250cm9sQmxvY2soZWNjLCBjb250cm9sQmxvY2spO1xuICB9XG4gIGNvbnN0IHsgbGVhZlZlcnNpb24gfSA9IGNvbnRyb2xCbG9jaztcblxuICByZXR1cm4gYmNyeXB0by50YWdnZWRIYXNoKFxuICAgICdUYXBMZWFmJyxcbiAgICBCdWZmZXIuY29uY2F0KFtCdWZmZXIub2YobGVhZlZlcnNpb24pLCBzZXJpYWxpemVTY3JpcHRTaXplKHRhcHNjcmlwdCksIHRhcHNjcmlwdF0pXG4gICk7XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlcyB0aGUgdGFwdHJlZSByb290IGhhc2ggZnJvbSBhIGNvbnRyb2wgYmxvY2sgYW5kIHNjcmlwdC5cbiAqIEBwYXJhbSBlY2MgRWxsaXB0aWMgY3VydmUgaW1wbGVtZW50YXRpb25cbiAqIEBwYXJhbSBjb250cm9sQmxvY2sgdGhlIGNvbnRyb2wgYmxvY2ssIGVpdGhlciByYXcgb3IgcGFyc2VkXG4gKiBAcGFyYW0gdGFwc2NyaXB0IHRoZSBsZWFmIHNjcmlwdCBjb3JyZXNkcG9uZGluZyB0byB0aGUgY29udHJvbCBibG9ja1xuICogQHBhcmFtIHRhcGxlYWZIYXNoIHRoZSBsZWFmIGhhc2ggaWYgYWxyZWFkeSBjYWxjdWxhdGVkXG4gKiBAcmV0dXJucyB7QnVmZmVyfSB0aGUgdGFwdHJlZSByb290IGhhc2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRhcHRyZWVSb290KFxuICBlY2M6IFRpbnlTZWNwMjU2azFJbnRlcmZhY2UsXG4gIGNvbnRyb2xCbG9jazogQnVmZmVyIHwgQ29udHJvbEJsb2NrLFxuICB0YXBzY3JpcHQ6IEJ1ZmZlcixcbiAgdGFwbGVhZkhhc2g/OiBCdWZmZXJcbik6IEJ1ZmZlciB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoY29udHJvbEJsb2NrKSkge1xuICAgIGNvbnRyb2xCbG9jayA9IHBhcnNlQ29udHJvbEJsb2NrKGVjYywgY29udHJvbEJsb2NrKTtcbiAgfVxuICBjb25zdCB7IHBhdGggfSA9IGNvbnRyb2xCbG9jaztcblxuICB0YXBsZWFmSGFzaCA9IHRhcGxlYWZIYXNoIHx8IGdldFRhcGxlYWZIYXNoKGVjYywgY29udHJvbEJsb2NrLCB0YXBzY3JpcHQpO1xuXG4gIC8vIGB0YXB0cmVlTWVya2xlSGFzaGAgYmVnaW5zIGFzIG91ciB0YXBzY3JpcHQgdGFwbGVhZiBoYXNoIGFuZCBpdHMgdmFsdWUgaXRlcmF0ZXNcbiAgLy8gdGhyb3VnaCBpdHMgcGFyZW50IHRhcGJyYW5jaCBoYXNoZXMgdW50aWwgaXQgZW5kcyB1cCBhcyB0aGUgdGFwdHJlZSByb290IGhhc2hcbiAgbGV0IHRhcHRyZWVNZXJrbGVIYXNoID0gdGFwbGVhZkhhc2g7XG4gIGZvciAoY29uc3QgdGFwdHJlZVNpYmxpbmdIYXNoIG9mIHBhdGgpIHtcbiAgICB0YXB0cmVlTWVya2xlSGFzaCA9XG4gICAgICBCdWZmZXIuY29tcGFyZSh0YXB0cmVlTWVya2xlSGFzaCwgdGFwdHJlZVNpYmxpbmdIYXNoKSA9PT0gLTFcbiAgICAgICAgPyBiY3J5cHRvLnRhZ2dlZEhhc2goJ1RhcEJyYW5jaCcsIEJ1ZmZlci5jb25jYXQoW3RhcHRyZWVNZXJrbGVIYXNoLCB0YXB0cmVlU2libGluZ0hhc2hdKSlcbiAgICAgICAgOiBiY3J5cHRvLnRhZ2dlZEhhc2goJ1RhcEJyYW5jaCcsIEJ1ZmZlci5jb25jYXQoW3RhcHRyZWVTaWJsaW5nSGFzaCwgdGFwdHJlZU1lcmtsZUhhc2hdKSk7XG4gIH1cblxuICByZXR1cm4gdGFwdHJlZU1lcmtsZUhhc2g7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUd2Vha2VkT3V0cHV0S2V5KHBheW1lbnQ6IGJwYXltZW50cy5QYXltZW50KTogQnVmZmVyIHtcbiAgYXNzZXJ0KHBheW1lbnQub3V0cHV0KTtcbiAgaWYgKHBheW1lbnQub3V0cHV0Lmxlbmd0aCA9PT0gMzQpIHtcbiAgICByZXR1cm4gcGF5bWVudC5vdXRwdXQ/LnN1YmFycmF5KDIpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBwMnRyIHR3ZWFrZWQgb3V0cHV0IGtleSBzaXplICR7cGF5bWVudC5vdXRwdXQubGVuZ3RofWApO1xufVxuIl19