/// <reference types="node" />
import { UtxoPsbt } from '../UtxoPsbt';
import { UtxoTransaction } from '../UtxoTransaction';
import { RootWalletKeys } from './WalletKeys';
import { BIP32Interface } from 'bip32';
import { WalletUnspent } from './Unspent';
import { ParsedPubScript2Of3, ParsedPubScriptTaprootScriptPath } from '../parseInput';
declare type Signatures = [Buffer] | [Buffer, Buffer] | undefined;
export interface ParsedPsbt2Of3 extends ParsedPubScript2Of3 {
    signatures: Signatures;
}
export interface ParsedPsbtP2TR extends ParsedPubScriptTaprootScriptPath {
    signatures: Signatures;
    controlBlock: Buffer;
    leafVersion: number;
    /** Indicates the level inside the taptree. */
    scriptPathLevel: number;
}
/**
 * @return PSBT filled with metatdata as per input params tx, unspents and rootWalletKeys.
 * Unsigned PSBT for taproot input with witnessUtxo
 * Unsigned PSBT for other input with witnessUtxo/nonWitnessUtxo, redeemScript/witnessScript, bip32Derivation
 * Signed PSBT for taproot input with witnessUtxo, tapLeafScript, tapBip32Derivation, tapScriptSig
 * Signed PSBT for other input with witnessUtxo/nonWitnessUtxo, redeemScript/witnessScript, bip32Derivation, partialSig
 */
export declare function toWalletPsbt(tx: UtxoTransaction<bigint>, unspents: WalletUnspent<bigint>[], rootWalletKeys: RootWalletKeys): UtxoPsbt;
/**
 * @param psbt
 * @param inputIndex
 * @param signer
 * @param unspent
 * @return signed PSBT with signer's key for unspent
 */
export declare function signWalletPsbt(psbt: UtxoPsbt, inputIndex: number, signer: BIP32Interface, unspent: WalletUnspent<bigint>): void;
/**
 * @return psbt metadata are parsed as per below conditions.
 * redeemScript/witnessScript/tapLeafScript matches BitGo.
 * signature and public key count matches BitGo.
 * P2SH => scriptType, redeemScript, public keys, signatures.
 * PW2SH => scriptType, witnessScript, public keys, signatures.
 * P2SH-PW2SH => scriptType, redeemScript, witnessScript, public keys, signatures.
 * P2TR => scriptType, pubScript (witnessScript), controlBlock, scriptPathLevel, leafVersion, public keys, signatures.
 * Any unsigned PSBT and without required metadata is returned with undefined.
 */
export declare function parsePsbtInput(psbt: UtxoPsbt, inputIndex: number): ParsedPsbt2Of3 | ParsedPsbtP2TR | undefined;
export {};
//# sourceMappingURL=Psbt.d.ts.map