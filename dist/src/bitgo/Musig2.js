"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMusig2Nonces = exports.createTapOutputKey = exports.createTapInternalKey = exports.decodePsbtMusig2ParticipantsKeyValData = exports.encodePsbtMusig2PubNonceKeyValData = exports.encodePsbtMusig2ParticipantsKeyValData = void 0;
const UtxoPsbt_1 = require("./UtxoPsbt");
const outputScripts_1 = require("./outputScripts");
const noble_ecc_1 = require("../noble_ecc");
const taproot_1 = require("../taproot");
const utils_1 = require("bip174/src/lib/utils");
/**
 * Psbt proprietary key val util function for participants pub keys. SubType is 0x01
 * Ref: https://gist.github.com/sanket1729/4b525c6049f4d9e034d27368c49f28a6
 * @return x-only tapOutputKey||tapInternalKey as sub keydata, plain sigining participant keys as valuedata
 */
function encodePsbtMusig2ParticipantsKeyValData(participantsKeyValData) {
    const keydata = [participantsKeyValData.tapOutputKey, participantsKeyValData.tapInternalKey].map((pubkey) => outputScripts_1.checkXOnlyPublicKey(pubkey));
    const value = participantsKeyValData.participantPubKeys.map((pubkey) => outputScripts_1.checkPlainPublicKey(pubkey));
    const key = {
        identifier: UtxoPsbt_1.PSBT_PROPRIETARY_IDENTIFIER,
        subtype: UtxoPsbt_1.ProprietaryKeySubtype.MUSIG2_PARTICIPANT_PUB_KEYS,
        keydata: Buffer.concat(keydata),
    };
    return { key, value: Buffer.concat(value) };
}
exports.encodePsbtMusig2ParticipantsKeyValData = encodePsbtMusig2ParticipantsKeyValData;
/**
 * Psbt proprietary key val util function for pub nonce. SubType is 0x02
 * Ref: https://gist.github.com/sanket1729/4b525c6049f4d9e034d27368c49f28a6
 * @return plain-participantPubKey||x-only-tapOutputKey as sub keydata, 66 bytes of 2 pub nonces as valuedata
 */
function encodePsbtMusig2PubNonceKeyValData(noncesKeyValueData) {
    if (noncesKeyValueData.pubNonces.length !== 66) {
        throw new Error(`Invalid pubNonces length ${noncesKeyValueData.pubNonces.length}`);
    }
    const keydata = Buffer.concat([
        outputScripts_1.checkPlainPublicKey(noncesKeyValueData.participantPubKey),
        outputScripts_1.checkXOnlyPublicKey(noncesKeyValueData.tapOutputKey),
    ]);
    const key = {
        identifier: UtxoPsbt_1.PSBT_PROPRIETARY_IDENTIFIER,
        subtype: UtxoPsbt_1.ProprietaryKeySubtype.MUSIG2_PUB_NONCE,
        keydata,
    };
    return { key, value: noncesKeyValueData.pubNonces };
}
exports.encodePsbtMusig2PubNonceKeyValData = encodePsbtMusig2PubNonceKeyValData;
/**
 * Decodes proprietary key value data for participant pub keys
 * @param kv
 */
function decodePsbtMusig2ParticipantsKeyValData(kv) {
    if (kv.key.identifier !== UtxoPsbt_1.PSBT_PROPRIETARY_IDENTIFIER ||
        kv.key.subtype !== UtxoPsbt_1.ProprietaryKeySubtype.MUSIG2_PARTICIPANT_PUB_KEYS) {
        throw new Error(`Invalid identifier ${kv.key.identifier} or subtype ${kv.key.subtype} for participants pub keys`);
    }
    const key = kv.key.keydata;
    if (key.length !== 64) {
        throw new Error(`Invalid keydata size ${key.length} for participant pub keys`);
    }
    const value = kv.value;
    if (value.length !== 66) {
        throw new Error(`Invalid valuedata size ${value.length} for participant pub keys`);
    }
    const participantPubKeys = [value.subarray(0, 33), value.subarray(33)];
    if (participantPubKeys[0].equals(participantPubKeys[1])) {
        throw new Error(`Duplicate participant pub keys found`);
    }
    return { tapOutputKey: key.subarray(0, 32), tapInternalKey: key.subarray(32), participantPubKeys };
}
exports.decodePsbtMusig2ParticipantsKeyValData = decodePsbtMusig2ParticipantsKeyValData;
function createTapInternalKey(plainPubKeys) {
    plainPubKeys.forEach((pubKey) => outputScripts_1.checkPlainPublicKey(pubKey));
    return Buffer.from(noble_ecc_1.musig.getXOnlyPubkey(noble_ecc_1.musig.keyAgg(noble_ecc_1.musig.keySort(plainPubKeys))));
}
exports.createTapInternalKey = createTapInternalKey;
function createTapOutputKey(internalPubKey, tapTreeRoot) {
    if (tapTreeRoot.length !== 32) {
        throw new Error(`Invalid tapTreeRoot size ${tapTreeRoot.length}`);
    }
    return Buffer.from(taproot_1.tapTweakPubkey(noble_ecc_1.ecc, outputScripts_1.toXOnlyPublicKey(internalPubKey), tapTreeRoot).xOnlyPubkey);
}
exports.createTapOutputKey = createTapOutputKey;
function deriveWalletPubKey(tapBip32Derivations, rootWalletKey) {
    const myDerivations = tapBip32Derivations.filter((bipDv) => {
        return bipDv.masterFingerprint.equals(rootWalletKey.fingerprint);
    });
    if (!myDerivations.length) {
        throw new Error('Need one tapBip32Derivation masterFingerprint to match the rootWalletKey fingerprint');
    }
    const myDerivation = myDerivations.filter((bipDv) => {
        const publicKey = rootWalletKey.derivePath(bipDv.path).publicKey;
        return bipDv.pubkey.equals(outputScripts_1.toXOnlyPublicKey(publicKey));
    });
    if (myDerivation.length !== 1) {
        throw new Error('root wallet key should derive one tapBip32Derivation');
    }
    return rootWalletKey.derivePath(myDerivation[0].path).publicKey;
}
function getMusig2NonceKeyValueData(psbt, inputIndex, rootWalletKey, sessionId) {
    var _a;
    const input = utils_1.checkForInput(psbt.data.inputs, inputIndex);
    if (!input.tapInternalKey) {
        return;
    }
    if (!input.tapMerkleRoot) {
        throw new Error('tapMerkleRoot is required to generate nonce');
    }
    if (!((_a = input.tapBip32Derivation) === null || _a === void 0 ? void 0 : _a.length)) {
        throw new Error('tapBip32Derivation is required to generate nonce');
    }
    const participantsKeyVals = psbt.getProprietaryKeyVals(inputIndex, {
        identifier: UtxoPsbt_1.PSBT_PROPRIETARY_IDENTIFIER,
        subtype: UtxoPsbt_1.ProprietaryKeySubtype.MUSIG2_PARTICIPANT_PUB_KEYS,
    });
    if (participantsKeyVals.length !== 1) {
        throw new Error(`Found ${participantsKeyVals.length} matching participant key value instead of 1`);
    }
    const participantKeyValData = decodePsbtMusig2ParticipantsKeyValData(participantsKeyVals[0]);
    const participantPubKeys = participantKeyValData.participantPubKeys;
    const tapInternalKey = createTapInternalKey(participantPubKeys);
    if (!tapInternalKey.equals(participantKeyValData.tapInternalKey)) {
        throw new Error('Invalid participants keyata tapInternalKey');
    }
    const tapOutputKey = createTapOutputKey(tapInternalKey, input.tapMerkleRoot);
    if (!tapOutputKey.equals(participantKeyValData.tapOutputKey)) {
        throw new Error('Invalid participants keyata tapOutputKey');
    }
    if (!tapInternalKey.equals(input.tapInternalKey)) {
        throw new Error('tapInternalKey and aggregated participant pub keys does not match');
    }
    const derivedPubKey = deriveWalletPubKey(input.tapBip32Derivation, rootWalletKey);
    const participantPubKey = participantPubKeys.find((pubKey) => pubKey.equals(derivedPubKey));
    if (!Buffer.isBuffer(participantPubKey)) {
        throw new Error('participant plain pub key should match one tapBip32Derivation plain pub key');
    }
    const { hash } = psbt.getTaprootHashForSigChecked(inputIndex);
    const nonceGenArgs = {
        sessionId,
        publicKey: participantPubKey,
        xOnlyPublicKey: tapOutputKey,
        msg: hash,
        secretKey: rootWalletKey.privateKey,
    };
    const pubNonces = Buffer.from(noble_ecc_1.musig.nonceGen(nonceGenArgs));
    return encodePsbtMusig2PubNonceKeyValData({
        participantPubKey,
        tapOutputKey,
        pubNonces,
    });
}
/**
 * Generates and sets Musig2 nonces to p2trMusig2 key path spending inputs.
 * tapInternalkey, tapMerkleRoot, tapBip32Derivation for rootWalletKey are required per p2trMusig2 key path input.
 * Also participant keys are required from psbt proprietary key values.
 * Ref: https://gist.github.com/sanket1729/4b525c6049f4d9e034d27368c49f28a6
 * @param psbt
 * @param rootWalletKey
 * @param sessionId If provided it must either be a counter unique to this secret key,
 * (converted to an array of 32 bytes), or 32 uniformly random bytes.
 */
function setMusig2Nonces(psbt, rootWalletKey, sessionId) {
    if (rootWalletKey.isNeutered()) {
        throw new Error('private key is required to generate nonce');
    }
    if (Buffer.isBuffer(sessionId) && sessionId.length !== 32) {
        throw new Error(`Invalid sessionId size ${sessionId.length}`);
    }
    psbt.data.inputs.forEach((input, inputIndex) => {
        const noncesKeyValueData = getMusig2NonceKeyValueData(psbt, inputIndex, rootWalletKey, sessionId);
        if (noncesKeyValueData) {
            psbt.addProprietaryKeyValToInput(inputIndex, noncesKeyValueData);
        }
    });
}
exports.setMusig2Nonces = setMusig2Nonces;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTXVzaWcyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2JpdGdvL011c2lnMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5Q0FBbUg7QUFDbkgsbURBQTZGO0FBRTdGLDRDQUEwQztBQUUxQyx3Q0FBNEM7QUFFNUMsZ0RBQXFEO0FBb0JyRDs7OztHQUlHO0FBQ0gsU0FBZ0Isc0NBQXNDLENBQ3BELHNCQUEwRDtJQUUxRCxNQUFNLE9BQU8sR0FBRyxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUMxRyxtQ0FBbUIsQ0FBQyxNQUFNLENBQUMsQ0FDNUIsQ0FBQztJQUNGLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsbUNBQW1CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNyRyxNQUFNLEdBQUcsR0FBRztRQUNWLFVBQVUsRUFBRSxzQ0FBMkI7UUFDdkMsT0FBTyxFQUFFLGdDQUFxQixDQUFDLDJCQUEyQjtRQUMxRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7S0FDaEMsQ0FBQztJQUNGLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUM5QyxDQUFDO0FBYkQsd0ZBYUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0Isa0NBQWtDLENBQ2hELGtCQUFnRDtJQUVoRCxJQUFJLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFO1FBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0tBQ3BGO0lBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUM1QixtQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQztRQUN6RCxtQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7S0FDckQsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxHQUFHLEdBQUc7UUFDVixVQUFVLEVBQUUsc0NBQTJCO1FBQ3ZDLE9BQU8sRUFBRSxnQ0FBcUIsQ0FBQyxnQkFBZ0I7UUFDL0MsT0FBTztLQUNSLENBQUM7SUFDRixPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN0RCxDQUFDO0FBaEJELGdGQWdCQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLHNDQUFzQyxDQUNwRCxFQUEyQjtJQUUzQixJQUNFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLHNDQUEyQjtRQUNqRCxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sS0FBSyxnQ0FBcUIsQ0FBQywyQkFBMkIsRUFDcEU7UUFDQSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsZUFBZSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sNEJBQTRCLENBQUMsQ0FBQztLQUNuSDtJQUVELE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQzNCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLE1BQU0sMkJBQTJCLENBQUMsQ0FBQztLQUNoRjtJQUVELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDdkIsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtRQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixLQUFLLENBQUMsTUFBTSwyQkFBMkIsQ0FBQyxDQUFDO0tBQ3BGO0lBQ0QsTUFBTSxrQkFBa0IsR0FBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEYsSUFBSSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUN2RCxNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7S0FDekQ7SUFFRCxPQUFPLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLENBQUM7QUFDckcsQ0FBQztBQXpCRCx3RkF5QkM7QUFFRCxTQUFnQixvQkFBb0IsQ0FBQyxZQUFzQjtJQUN6RCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxtQ0FBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzlELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBSyxDQUFDLGNBQWMsQ0FBQyxpQkFBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RixDQUFDO0FBSEQsb0RBR0M7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxjQUFzQixFQUFFLFdBQW1CO0lBQzVFLElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7S0FDbkU7SUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQWMsQ0FBQyxlQUFHLEVBQUUsZ0NBQWdCLENBQUMsY0FBYyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckcsQ0FBQztBQUxELGdEQUtDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxtQkFBeUMsRUFBRSxhQUE2QjtJQUNsRyxNQUFNLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUN6RCxPQUFPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25FLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzRkFBc0YsQ0FBQyxDQUFDO0tBQ3pHO0lBRUQsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ2xELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNqRSxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGdDQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQztLQUN6RTtJQUNELE9BQU8sYUFBYSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUNqQyxJQUFjLEVBQ2QsVUFBa0IsRUFDbEIsYUFBNkIsRUFDN0IsU0FBa0I7O0lBRWxCLE1BQU0sS0FBSyxHQUFHLHFCQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUU7UUFDekIsT0FBTztLQUNSO0lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0tBQ2hFO0lBRUQsSUFBSSxDQUFDLENBQUEsTUFBQSxLQUFLLENBQUMsa0JBQWtCLDBDQUFFLE1BQU0sQ0FBQSxFQUFFO1FBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQztLQUNyRTtJQUVELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRTtRQUNqRSxVQUFVLEVBQUUsc0NBQTJCO1FBQ3ZDLE9BQU8sRUFBRSxnQ0FBcUIsQ0FBQywyQkFBMkI7S0FDM0QsQ0FBQyxDQUFDO0lBRUgsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsU0FBUyxtQkFBbUIsQ0FBQyxNQUFNLDhDQUE4QyxDQUFDLENBQUM7S0FDcEc7SUFFRCxNQUFNLHFCQUFxQixHQUFHLHNDQUFzQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0YsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FBQztJQUVwRSxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztLQUMvRDtJQUVELE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDNUQsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0tBQzdEO0lBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsbUVBQW1FLENBQUMsQ0FBQztLQUN0RjtJQUVELE1BQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNsRixNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBRTVGLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7UUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2RUFBNkUsQ0FBQyxDQUFDO0tBQ2hHO0lBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU5RCxNQUFNLFlBQVksR0FBRztRQUNuQixTQUFTO1FBQ1QsU0FBUyxFQUFFLGlCQUFpQjtRQUM1QixjQUFjLEVBQUUsWUFBWTtRQUM1QixHQUFHLEVBQUUsSUFBSTtRQUNULFNBQVMsRUFBRSxhQUFhLENBQUMsVUFBVTtLQUNwQyxDQUFDO0lBRUYsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBRTVELE9BQU8sa0NBQWtDLENBQUM7UUFDeEMsaUJBQWlCO1FBQ2pCLFlBQVk7UUFDWixTQUFTO0tBQ1YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxJQUFjLEVBQUUsYUFBNkIsRUFBRSxTQUFrQjtJQUMvRixJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUUsRUFBRTtRQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7S0FDOUQ7SUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7UUFDekQsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7S0FDL0Q7SUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUU7UUFDN0MsTUFBTSxrQkFBa0IsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRyxJQUFJLGtCQUFrQixFQUFFO1lBQ3RCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztTQUNsRTtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQWJELDBDQWFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUFNCVF9QUk9QUklFVEFSWV9JREVOVElGSUVSLCBQcm9wcmlldGFyeUtleVZhbHVlRGF0YSwgVXR4b1BzYnQsIFByb3ByaWV0YXJ5S2V5U3VidHlwZSB9IGZyb20gJy4vVXR4b1BzYnQnO1xuaW1wb3J0IHsgY2hlY2tQbGFpblB1YmxpY0tleSwgY2hlY2tYT25seVB1YmxpY0tleSwgdG9YT25seVB1YmxpY0tleSB9IGZyb20gJy4vb3V0cHV0U2NyaXB0cyc7XG5pbXBvcnQgeyBCSVAzMkludGVyZmFjZSB9IGZyb20gJ2JpcDMyJztcbmltcG9ydCB7IGVjYywgbXVzaWcgfSBmcm9tICcuLi9ub2JsZV9lY2MnO1xuaW1wb3J0IHsgVHVwbGUgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHRhcFR3ZWFrUHVia2V5IH0gZnJvbSAnLi4vdGFwcm9vdCc7XG5pbXBvcnQgeyBUYXBCaXAzMkRlcml2YXRpb24gfSBmcm9tICdiaXAxNzQvc3JjL2xpYi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNoZWNrRm9ySW5wdXQgfSBmcm9tICdiaXAxNzQvc3JjL2xpYi91dGlscyc7XG5cbi8qKlxuICogIFBhcnRpY2lwYW50IGtleSB2YWx1ZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHNidE11c2lnMlBhcnRpY2lwYW50c0tleVZhbHVlRGF0YSB7XG4gIHRhcE91dHB1dEtleTogQnVmZmVyO1xuICB0YXBJbnRlcm5hbEtleTogQnVmZmVyO1xuICBwYXJ0aWNpcGFudFB1YktleXM6IFR1cGxlPEJ1ZmZlcj47XG59XG5cbi8qKlxuICogIE5vbmNlIGtleSB2YWx1ZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHNidE11c2lnMk5vbmNlc0tleVZhbHVlRGF0YSB7XG4gIHBhcnRpY2lwYW50UHViS2V5OiBCdWZmZXI7XG4gIHRhcE91dHB1dEtleTogQnVmZmVyO1xuICBwdWJOb25jZXM6IEJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBQc2J0IHByb3ByaWV0YXJ5IGtleSB2YWwgdXRpbCBmdW5jdGlvbiBmb3IgcGFydGljaXBhbnRzIHB1YiBrZXlzLiBTdWJUeXBlIGlzIDB4MDFcbiAqIFJlZjogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vc2Fua2V0MTcyOS80YjUyNWM2MDQ5ZjRkOWUwMzRkMjczNjhjNDlmMjhhNlxuICogQHJldHVybiB4LW9ubHkgdGFwT3V0cHV0S2V5fHx0YXBJbnRlcm5hbEtleSBhcyBzdWIga2V5ZGF0YSwgcGxhaW4gc2lnaW5pbmcgcGFydGljaXBhbnQga2V5cyBhcyB2YWx1ZWRhdGFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVBzYnRNdXNpZzJQYXJ0aWNpcGFudHNLZXlWYWxEYXRhKFxuICBwYXJ0aWNpcGFudHNLZXlWYWxEYXRhOiBQc2J0TXVzaWcyUGFydGljaXBhbnRzS2V5VmFsdWVEYXRhXG4pOiBQcm9wcmlldGFyeUtleVZhbHVlRGF0YSB7XG4gIGNvbnN0IGtleWRhdGEgPSBbcGFydGljaXBhbnRzS2V5VmFsRGF0YS50YXBPdXRwdXRLZXksIHBhcnRpY2lwYW50c0tleVZhbERhdGEudGFwSW50ZXJuYWxLZXldLm1hcCgocHVia2V5KSA9PlxuICAgIGNoZWNrWE9ubHlQdWJsaWNLZXkocHVia2V5KVxuICApO1xuICBjb25zdCB2YWx1ZSA9IHBhcnRpY2lwYW50c0tleVZhbERhdGEucGFydGljaXBhbnRQdWJLZXlzLm1hcCgocHVia2V5KSA9PiBjaGVja1BsYWluUHVibGljS2V5KHB1YmtleSkpO1xuICBjb25zdCBrZXkgPSB7XG4gICAgaWRlbnRpZmllcjogUFNCVF9QUk9QUklFVEFSWV9JREVOVElGSUVSLFxuICAgIHN1YnR5cGU6IFByb3ByaWV0YXJ5S2V5U3VidHlwZS5NVVNJRzJfUEFSVElDSVBBTlRfUFVCX0tFWVMsXG4gICAga2V5ZGF0YTogQnVmZmVyLmNvbmNhdChrZXlkYXRhKSxcbiAgfTtcbiAgcmV0dXJuIHsga2V5LCB2YWx1ZTogQnVmZmVyLmNvbmNhdCh2YWx1ZSkgfTtcbn1cblxuLyoqXG4gKiBQc2J0IHByb3ByaWV0YXJ5IGtleSB2YWwgdXRpbCBmdW5jdGlvbiBmb3IgcHViIG5vbmNlLiBTdWJUeXBlIGlzIDB4MDJcbiAqIFJlZjogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vc2Fua2V0MTcyOS80YjUyNWM2MDQ5ZjRkOWUwMzRkMjczNjhjNDlmMjhhNlxuICogQHJldHVybiBwbGFpbi1wYXJ0aWNpcGFudFB1YktleXx8eC1vbmx5LXRhcE91dHB1dEtleSBhcyBzdWIga2V5ZGF0YSwgNjYgYnl0ZXMgb2YgMiBwdWIgbm9uY2VzIGFzIHZhbHVlZGF0YVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlUHNidE11c2lnMlB1Yk5vbmNlS2V5VmFsRGF0YShcbiAgbm9uY2VzS2V5VmFsdWVEYXRhOiBQc2J0TXVzaWcyTm9uY2VzS2V5VmFsdWVEYXRhXG4pOiBQcm9wcmlldGFyeUtleVZhbHVlRGF0YSB7XG4gIGlmIChub25jZXNLZXlWYWx1ZURhdGEucHViTm9uY2VzLmxlbmd0aCAhPT0gNjYpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHViTm9uY2VzIGxlbmd0aCAke25vbmNlc0tleVZhbHVlRGF0YS5wdWJOb25jZXMubGVuZ3RofWApO1xuICB9XG4gIGNvbnN0IGtleWRhdGEgPSBCdWZmZXIuY29uY2F0KFtcbiAgICBjaGVja1BsYWluUHVibGljS2V5KG5vbmNlc0tleVZhbHVlRGF0YS5wYXJ0aWNpcGFudFB1YktleSksXG4gICAgY2hlY2tYT25seVB1YmxpY0tleShub25jZXNLZXlWYWx1ZURhdGEudGFwT3V0cHV0S2V5KSxcbiAgXSk7XG4gIGNvbnN0IGtleSA9IHtcbiAgICBpZGVudGlmaWVyOiBQU0JUX1BST1BSSUVUQVJZX0lERU5USUZJRVIsXG4gICAgc3VidHlwZTogUHJvcHJpZXRhcnlLZXlTdWJ0eXBlLk1VU0lHMl9QVUJfTk9OQ0UsXG4gICAga2V5ZGF0YSxcbiAgfTtcbiAgcmV0dXJuIHsga2V5LCB2YWx1ZTogbm9uY2VzS2V5VmFsdWVEYXRhLnB1Yk5vbmNlcyB9O1xufVxuXG4vKipcbiAqIERlY29kZXMgcHJvcHJpZXRhcnkga2V5IHZhbHVlIGRhdGEgZm9yIHBhcnRpY2lwYW50IHB1YiBrZXlzXG4gKiBAcGFyYW0ga3ZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVBzYnRNdXNpZzJQYXJ0aWNpcGFudHNLZXlWYWxEYXRhKFxuICBrdjogUHJvcHJpZXRhcnlLZXlWYWx1ZURhdGFcbik6IFBzYnRNdXNpZzJQYXJ0aWNpcGFudHNLZXlWYWx1ZURhdGEge1xuICBpZiAoXG4gICAga3Yua2V5LmlkZW50aWZpZXIgIT09IFBTQlRfUFJPUFJJRVRBUllfSURFTlRJRklFUiB8fFxuICAgIGt2LmtleS5zdWJ0eXBlICE9PSBQcm9wcmlldGFyeUtleVN1YnR5cGUuTVVTSUcyX1BBUlRJQ0lQQU5UX1BVQl9LRVlTXG4gICkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBpZGVudGlmaWVyICR7a3Yua2V5LmlkZW50aWZpZXJ9IG9yIHN1YnR5cGUgJHtrdi5rZXkuc3VidHlwZX0gZm9yIHBhcnRpY2lwYW50cyBwdWIga2V5c2ApO1xuICB9XG5cbiAgY29uc3Qga2V5ID0ga3Yua2V5LmtleWRhdGE7XG4gIGlmIChrZXkubGVuZ3RoICE9PSA2NCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBrZXlkYXRhIHNpemUgJHtrZXkubGVuZ3RofSBmb3IgcGFydGljaXBhbnQgcHViIGtleXNgKTtcbiAgfVxuXG4gIGNvbnN0IHZhbHVlID0ga3YudmFsdWU7XG4gIGlmICh2YWx1ZS5sZW5ndGggIT09IDY2KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHZhbHVlZGF0YSBzaXplICR7dmFsdWUubGVuZ3RofSBmb3IgcGFydGljaXBhbnQgcHViIGtleXNgKTtcbiAgfVxuICBjb25zdCBwYXJ0aWNpcGFudFB1YktleXM6IFR1cGxlPEJ1ZmZlcj4gPSBbdmFsdWUuc3ViYXJyYXkoMCwgMzMpLCB2YWx1ZS5zdWJhcnJheSgzMyldO1xuICBpZiAocGFydGljaXBhbnRQdWJLZXlzWzBdLmVxdWFscyhwYXJ0aWNpcGFudFB1YktleXNbMV0pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBEdXBsaWNhdGUgcGFydGljaXBhbnQgcHViIGtleXMgZm91bmRgKTtcbiAgfVxuXG4gIHJldHVybiB7IHRhcE91dHB1dEtleToga2V5LnN1YmFycmF5KDAsIDMyKSwgdGFwSW50ZXJuYWxLZXk6IGtleS5zdWJhcnJheSgzMiksIHBhcnRpY2lwYW50UHViS2V5cyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGFwSW50ZXJuYWxLZXkocGxhaW5QdWJLZXlzOiBCdWZmZXJbXSk6IEJ1ZmZlciB7XG4gIHBsYWluUHViS2V5cy5mb3JFYWNoKChwdWJLZXkpID0+IGNoZWNrUGxhaW5QdWJsaWNLZXkocHViS2V5KSk7XG4gIHJldHVybiBCdWZmZXIuZnJvbShtdXNpZy5nZXRYT25seVB1YmtleShtdXNpZy5rZXlBZ2cobXVzaWcua2V5U29ydChwbGFpblB1YktleXMpKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGFwT3V0cHV0S2V5KGludGVybmFsUHViS2V5OiBCdWZmZXIsIHRhcFRyZWVSb290OiBCdWZmZXIpOiBCdWZmZXIge1xuICBpZiAodGFwVHJlZVJvb3QubGVuZ3RoICE9PSAzMikge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YXBUcmVlUm9vdCBzaXplICR7dGFwVHJlZVJvb3QubGVuZ3RofWApO1xuICB9XG4gIHJldHVybiBCdWZmZXIuZnJvbSh0YXBUd2Vha1B1YmtleShlY2MsIHRvWE9ubHlQdWJsaWNLZXkoaW50ZXJuYWxQdWJLZXkpLCB0YXBUcmVlUm9vdCkueE9ubHlQdWJrZXkpO1xufVxuXG5mdW5jdGlvbiBkZXJpdmVXYWxsZXRQdWJLZXkodGFwQmlwMzJEZXJpdmF0aW9uczogVGFwQmlwMzJEZXJpdmF0aW9uW10sIHJvb3RXYWxsZXRLZXk6IEJJUDMySW50ZXJmYWNlKTogQnVmZmVyIHtcbiAgY29uc3QgbXlEZXJpdmF0aW9ucyA9IHRhcEJpcDMyRGVyaXZhdGlvbnMuZmlsdGVyKChiaXBEdikgPT4ge1xuICAgIHJldHVybiBiaXBEdi5tYXN0ZXJGaW5nZXJwcmludC5lcXVhbHMocm9vdFdhbGxldEtleS5maW5nZXJwcmludCk7XG4gIH0pO1xuXG4gIGlmICghbXlEZXJpdmF0aW9ucy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05lZWQgb25lIHRhcEJpcDMyRGVyaXZhdGlvbiBtYXN0ZXJGaW5nZXJwcmludCB0byBtYXRjaCB0aGUgcm9vdFdhbGxldEtleSBmaW5nZXJwcmludCcpO1xuICB9XG5cbiAgY29uc3QgbXlEZXJpdmF0aW9uID0gbXlEZXJpdmF0aW9ucy5maWx0ZXIoKGJpcER2KSA9PiB7XG4gICAgY29uc3QgcHVibGljS2V5ID0gcm9vdFdhbGxldEtleS5kZXJpdmVQYXRoKGJpcER2LnBhdGgpLnB1YmxpY0tleTtcbiAgICByZXR1cm4gYmlwRHYucHVia2V5LmVxdWFscyh0b1hPbmx5UHVibGljS2V5KHB1YmxpY0tleSkpO1xuICB9KTtcblxuICBpZiAobXlEZXJpdmF0aW9uLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncm9vdCB3YWxsZXQga2V5IHNob3VsZCBkZXJpdmUgb25lIHRhcEJpcDMyRGVyaXZhdGlvbicpO1xuICB9XG4gIHJldHVybiByb290V2FsbGV0S2V5LmRlcml2ZVBhdGgobXlEZXJpdmF0aW9uWzBdLnBhdGgpLnB1YmxpY0tleTtcbn1cblxuZnVuY3Rpb24gZ2V0TXVzaWcyTm9uY2VLZXlWYWx1ZURhdGEoXG4gIHBzYnQ6IFV0eG9Qc2J0LFxuICBpbnB1dEluZGV4OiBudW1iZXIsXG4gIHJvb3RXYWxsZXRLZXk6IEJJUDMySW50ZXJmYWNlLFxuICBzZXNzaW9uSWQ/OiBCdWZmZXJcbik6IFByb3ByaWV0YXJ5S2V5VmFsdWVEYXRhIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgaW5wdXQgPSBjaGVja0ZvcklucHV0KHBzYnQuZGF0YS5pbnB1dHMsIGlucHV0SW5kZXgpO1xuICBpZiAoIWlucHV0LnRhcEludGVybmFsS2V5KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCFpbnB1dC50YXBNZXJrbGVSb290KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0YXBNZXJrbGVSb290IGlzIHJlcXVpcmVkIHRvIGdlbmVyYXRlIG5vbmNlJyk7XG4gIH1cblxuICBpZiAoIWlucHV0LnRhcEJpcDMyRGVyaXZhdGlvbj8ubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0YXBCaXAzMkRlcml2YXRpb24gaXMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgbm9uY2UnKTtcbiAgfVxuXG4gIGNvbnN0IHBhcnRpY2lwYW50c0tleVZhbHMgPSBwc2J0LmdldFByb3ByaWV0YXJ5S2V5VmFscyhpbnB1dEluZGV4LCB7XG4gICAgaWRlbnRpZmllcjogUFNCVF9QUk9QUklFVEFSWV9JREVOVElGSUVSLFxuICAgIHN1YnR5cGU6IFByb3ByaWV0YXJ5S2V5U3VidHlwZS5NVVNJRzJfUEFSVElDSVBBTlRfUFVCX0tFWVMsXG4gIH0pO1xuXG4gIGlmIChwYXJ0aWNpcGFudHNLZXlWYWxzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRm91bmQgJHtwYXJ0aWNpcGFudHNLZXlWYWxzLmxlbmd0aH0gbWF0Y2hpbmcgcGFydGljaXBhbnQga2V5IHZhbHVlIGluc3RlYWQgb2YgMWApO1xuICB9XG5cbiAgY29uc3QgcGFydGljaXBhbnRLZXlWYWxEYXRhID0gZGVjb2RlUHNidE11c2lnMlBhcnRpY2lwYW50c0tleVZhbERhdGEocGFydGljaXBhbnRzS2V5VmFsc1swXSk7XG4gIGNvbnN0IHBhcnRpY2lwYW50UHViS2V5cyA9IHBhcnRpY2lwYW50S2V5VmFsRGF0YS5wYXJ0aWNpcGFudFB1YktleXM7XG5cbiAgY29uc3QgdGFwSW50ZXJuYWxLZXkgPSBjcmVhdGVUYXBJbnRlcm5hbEtleShwYXJ0aWNpcGFudFB1YktleXMpO1xuICBpZiAoIXRhcEludGVybmFsS2V5LmVxdWFscyhwYXJ0aWNpcGFudEtleVZhbERhdGEudGFwSW50ZXJuYWxLZXkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBhcnRpY2lwYW50cyBrZXlhdGEgdGFwSW50ZXJuYWxLZXknKTtcbiAgfVxuXG4gIGNvbnN0IHRhcE91dHB1dEtleSA9IGNyZWF0ZVRhcE91dHB1dEtleSh0YXBJbnRlcm5hbEtleSwgaW5wdXQudGFwTWVya2xlUm9vdCk7XG4gIGlmICghdGFwT3V0cHV0S2V5LmVxdWFscyhwYXJ0aWNpcGFudEtleVZhbERhdGEudGFwT3V0cHV0S2V5KSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwYXJ0aWNpcGFudHMga2V5YXRhIHRhcE91dHB1dEtleScpO1xuICB9XG5cbiAgaWYgKCF0YXBJbnRlcm5hbEtleS5lcXVhbHMoaW5wdXQudGFwSW50ZXJuYWxLZXkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0YXBJbnRlcm5hbEtleSBhbmQgYWdncmVnYXRlZCBwYXJ0aWNpcGFudCBwdWIga2V5cyBkb2VzIG5vdCBtYXRjaCcpO1xuICB9XG5cbiAgY29uc3QgZGVyaXZlZFB1YktleSA9IGRlcml2ZVdhbGxldFB1YktleShpbnB1dC50YXBCaXAzMkRlcml2YXRpb24sIHJvb3RXYWxsZXRLZXkpO1xuICBjb25zdCBwYXJ0aWNpcGFudFB1YktleSA9IHBhcnRpY2lwYW50UHViS2V5cy5maW5kKChwdWJLZXkpID0+IHB1YktleS5lcXVhbHMoZGVyaXZlZFB1YktleSkpO1xuXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHBhcnRpY2lwYW50UHViS2V5KSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncGFydGljaXBhbnQgcGxhaW4gcHViIGtleSBzaG91bGQgbWF0Y2ggb25lIHRhcEJpcDMyRGVyaXZhdGlvbiBwbGFpbiBwdWIga2V5Jyk7XG4gIH1cblxuICBjb25zdCB7IGhhc2ggfSA9IHBzYnQuZ2V0VGFwcm9vdEhhc2hGb3JTaWdDaGVja2VkKGlucHV0SW5kZXgpO1xuXG4gIGNvbnN0IG5vbmNlR2VuQXJncyA9IHtcbiAgICBzZXNzaW9uSWQsXG4gICAgcHVibGljS2V5OiBwYXJ0aWNpcGFudFB1YktleSxcbiAgICB4T25seVB1YmxpY0tleTogdGFwT3V0cHV0S2V5LFxuICAgIG1zZzogaGFzaCxcbiAgICBzZWNyZXRLZXk6IHJvb3RXYWxsZXRLZXkucHJpdmF0ZUtleSxcbiAgfTtcblxuICBjb25zdCBwdWJOb25jZXMgPSBCdWZmZXIuZnJvbShtdXNpZy5ub25jZUdlbihub25jZUdlbkFyZ3MpKTtcblxuICByZXR1cm4gZW5jb2RlUHNidE11c2lnMlB1Yk5vbmNlS2V5VmFsRGF0YSh7XG4gICAgcGFydGljaXBhbnRQdWJLZXksXG4gICAgdGFwT3V0cHV0S2V5LFxuICAgIHB1Yk5vbmNlcyxcbiAgfSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuZCBzZXRzIE11c2lnMiBub25jZXMgdG8gcDJ0ck11c2lnMiBrZXkgcGF0aCBzcGVuZGluZyBpbnB1dHMuXG4gKiB0YXBJbnRlcm5hbGtleSwgdGFwTWVya2xlUm9vdCwgdGFwQmlwMzJEZXJpdmF0aW9uIGZvciByb290V2FsbGV0S2V5IGFyZSByZXF1aXJlZCBwZXIgcDJ0ck11c2lnMiBrZXkgcGF0aCBpbnB1dC5cbiAqIEFsc28gcGFydGljaXBhbnQga2V5cyBhcmUgcmVxdWlyZWQgZnJvbSBwc2J0IHByb3ByaWV0YXJ5IGtleSB2YWx1ZXMuXG4gKiBSZWY6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3NhbmtldDE3MjkvNGI1MjVjNjA0OWY0ZDllMDM0ZDI3MzY4YzQ5ZjI4YTZcbiAqIEBwYXJhbSBwc2J0XG4gKiBAcGFyYW0gcm9vdFdhbGxldEtleVxuICogQHBhcmFtIHNlc3Npb25JZCBJZiBwcm92aWRlZCBpdCBtdXN0IGVpdGhlciBiZSBhIGNvdW50ZXIgdW5pcXVlIHRvIHRoaXMgc2VjcmV0IGtleSxcbiAqIChjb252ZXJ0ZWQgdG8gYW4gYXJyYXkgb2YgMzIgYnl0ZXMpLCBvciAzMiB1bmlmb3JtbHkgcmFuZG9tIGJ5dGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TXVzaWcyTm9uY2VzKHBzYnQ6IFV0eG9Qc2J0LCByb290V2FsbGV0S2V5OiBCSVAzMkludGVyZmFjZSwgc2Vzc2lvbklkPzogQnVmZmVyKTogdm9pZCB7XG4gIGlmIChyb290V2FsbGV0S2V5LmlzTmV1dGVyZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJpdmF0ZSBrZXkgaXMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgbm9uY2UnKTtcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHNlc3Npb25JZCkgJiYgc2Vzc2lvbklkLmxlbmd0aCAhPT0gMzIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc2Vzc2lvbklkIHNpemUgJHtzZXNzaW9uSWQubGVuZ3RofWApO1xuICB9XG4gIHBzYnQuZGF0YS5pbnB1dHMuZm9yRWFjaCgoaW5wdXQsIGlucHV0SW5kZXgpID0+IHtcbiAgICBjb25zdCBub25jZXNLZXlWYWx1ZURhdGEgPSBnZXRNdXNpZzJOb25jZUtleVZhbHVlRGF0YShwc2J0LCBpbnB1dEluZGV4LCByb290V2FsbGV0S2V5LCBzZXNzaW9uSWQpO1xuICAgIGlmIChub25jZXNLZXlWYWx1ZURhdGEpIHtcbiAgICAgIHBzYnQuYWRkUHJvcHJpZXRhcnlLZXlWYWxUb0lucHV0KGlucHV0SW5kZXgsIG5vbmNlc0tleVZhbHVlRGF0YSk7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==