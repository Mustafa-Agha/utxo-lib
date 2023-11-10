/// <reference types="node" />
import { ProprietaryKeyValueData, UtxoPsbt } from './UtxoPsbt';
import { BIP32Interface } from 'bip32';
import { Tuple } from './types';
/**
 *  Participant key value object.
 */
export interface PsbtMusig2ParticipantsKeyValueData {
    tapOutputKey: Buffer;
    tapInternalKey: Buffer;
    participantPubKeys: Tuple<Buffer>;
}
/**
 *  Nonce key value object.
 */
export interface PsbtMusig2NoncesKeyValueData {
    participantPubKey: Buffer;
    tapOutputKey: Buffer;
    pubNonces: Buffer;
}
/**
 * Psbt proprietary key val util function for participants pub keys. SubType is 0x01
 * Ref: https://gist.github.com/sanket1729/4b525c6049f4d9e034d27368c49f28a6
 * @return x-only tapOutputKey||tapInternalKey as sub keydata, plain sigining participant keys as valuedata
 */
export declare function encodePsbtMusig2ParticipantsKeyValData(participantsKeyValData: PsbtMusig2ParticipantsKeyValueData): ProprietaryKeyValueData;
/**
 * Psbt proprietary key val util function for pub nonce. SubType is 0x02
 * Ref: https://gist.github.com/sanket1729/4b525c6049f4d9e034d27368c49f28a6
 * @return plain-participantPubKey||x-only-tapOutputKey as sub keydata, 66 bytes of 2 pub nonces as valuedata
 */
export declare function encodePsbtMusig2PubNonceKeyValData(noncesKeyValueData: PsbtMusig2NoncesKeyValueData): ProprietaryKeyValueData;
/**
 * Decodes proprietary key value data for participant pub keys
 * @param kv
 */
export declare function decodePsbtMusig2ParticipantsKeyValData(kv: ProprietaryKeyValueData): PsbtMusig2ParticipantsKeyValueData;
export declare function createTapInternalKey(plainPubKeys: Buffer[]): Buffer;
export declare function createTapOutputKey(internalPubKey: Buffer, tapTreeRoot: Buffer): Buffer;
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
export declare function setMusig2Nonces(psbt: UtxoPsbt, rootWalletKey: BIP32Interface, sessionId?: Buffer): void;
//# sourceMappingURL=Musig2.d.ts.map