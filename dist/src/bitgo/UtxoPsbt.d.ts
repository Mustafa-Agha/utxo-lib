/// <reference types="node" />
import { Psbt as PsbtBase } from 'bip174';
import { HDSigner, Psbt, TxOutput, Network } from '..';
import { UtxoTransaction } from './UtxoTransaction';
import { ProprietaryKey } from 'bip174/src/lib/proprietaryKeyVal';
export declare const PSBT_PROPRIETARY_IDENTIFIER = "BITGO";
export declare enum ProprietaryKeySubtype {
    ZEC_CONSENSUS_BRANCH_ID = 0,
    MUSIG2_PARTICIPANT_PUB_KEYS = 1,
    MUSIG2_PUB_NONCE = 2
}
export interface HDTaprootSigner extends HDSigner {
    /**
     * The path string must match /^m(\/\d+'?)+$/
     * ex. m/44'/0'/0'/1/23 levels with ' must be hard derivations
     */
    derivePath(path: string): HDTaprootSigner;
    /**
     * Input hash (the "message digest") for the signature algorithm
     * Return a 64 byte signature (32 byte r and 32 byte s in that order)
     */
    signSchnorr(hash: Buffer): Buffer;
}
export interface SchnorrSigner {
    publicKey: Buffer;
    signSchnorr(hash: Buffer): Buffer;
}
export interface TaprootSigner {
    leafHashes: Buffer[];
    signer: SchnorrSigner;
}
export interface PsbtOpts {
    network: Network;
    maximumFeeRate?: number;
    bip32PathsAbsolute?: boolean;
}
/**
 * Psbt proprietary keydata object.
 * <compact size uint identifier length> <bytes identifier> <compact size uint subtype> <bytes subkeydata>
 * => <bytes valuedata>
 */
export interface ProprietaryKeyValueData {
    key: ProprietaryKey;
    value: Buffer;
}
/**
 * Psbt proprietary keydata object search fields.
 * <compact size uint identifier length> <bytes identifier> <compact size uint subtype> <bytes subkeydata>
 */
export interface ProprietaryKeySearch {
    identifier: string;
    subtype: number;
    keydata?: Buffer;
    identifierEncoding?: BufferEncoding;
}
export declare class UtxoPsbt<Tx extends UtxoTransaction<bigint> = UtxoTransaction<bigint>> extends Psbt {
    protected static transactionFromBuffer(buffer: Buffer, network: Network): UtxoTransaction<bigint>;
    static createPsbt(opts: PsbtOpts, data?: PsbtBase): UtxoPsbt;
    static fromBuffer(buffer: Buffer, opts: PsbtOpts): UtxoPsbt;
    static fromHex(data: string, opts: PsbtOpts): UtxoPsbt;
    get network(): Network;
    toHex(): string;
    /**
     * @return true iff PSBT input is finalized
     */
    isInputFinalized(inputIndex: number): boolean;
    /**
     * @return partialSig/tapScriptSig count iff input is not finalized
     */
    getSignatureCount(inputIndex: number): number;
    getNonWitnessPreviousTxids(): string[];
    addNonWitnessUtxos(txBufs: Record<string, Buffer>): this;
    static fromTransaction(transaction: UtxoTransaction<bigint>, prevOutputs: TxOutput<bigint>[]): UtxoPsbt;
    getUnsignedTx(): UtxoTransaction<bigint>;
    protected static newTransaction(network: Network): UtxoTransaction<bigint>;
    protected get tx(): Tx;
    protected checkForSignatures(propName?: string): void;
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts
     */
    finalizeAllInputs(): this;
    finalizeTaprootInput(inputIndex: number): this;
    finalizeTapInputWithSingleLeafScriptAndSignature(inputIndex: number): this;
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts
     *
     * Unlike the function it overrides, this does not take a validator. In BitGo
     * context, we know how we want to validate so we just hard code the right
     * validator.
     */
    validateSignaturesOfAllInputs(): boolean;
    validateTaprootSignaturesOfInput(inputIndex: number, pubkey?: Buffer): boolean;
    /**
     * @return array of boolean values. True when corresponding index in `publicKeys` has signed the transaction.
     * If no signature in the tx or no public key matching signature, the validation is considered as false.
     */
    getSignatureValidationArray(inputIndex: number): boolean[];
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts
     */
    signAllInputsHD(hdKeyPair: HDTaprootSigner, sighashTypes?: number[]): this;
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts:signInputHD
     */
    signTaprootInputHD(inputIndex: number, hdKeyPair: HDTaprootSigner, sighashTypes?: number[]): this;
    signTaprootInput(inputIndex: number, signer: SchnorrSigner, leafHashes: Buffer[], sighashTypes?: number[]): this;
    private getTaprootHashForSig;
    /**
     * @retuns true iff the input is taproot.
     */
    isTaprootInput(inputIndex: number): boolean;
    /**
     * @returns hash and hashType for taproot input at inputIndex
     * @throws error if input at inputIndex is not a taproot input
     */
    getTaprootHashForSigChecked(inputIndex: number, sighashTypes?: number[], leafHash?: Buffer): {
        hash: Buffer;
        sighashType: number;
    };
    /**
     * Adds proprietary key value pair to PSBT input.
     * Default identifierEncoding is utf-8 for identifier.
     */
    addProprietaryKeyValToInput(inputIndex: number, keyValueData: ProprietaryKeyValueData): this;
    /**
     * To search any data from proprietary key value againts keydata.
     * Default identifierEncoding is utf-8 for identifier.
     */
    getProprietaryKeyVals(inputIndex: number, keySearch?: ProprietaryKeySearch): ProprietaryKeyValueData[];
    clone(): this;
}
//# sourceMappingURL=UtxoPsbt.d.ts.map