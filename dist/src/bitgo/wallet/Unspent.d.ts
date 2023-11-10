/// <reference types="node" />
import { Network } from '../..';
import { UtxoTransactionBuilder } from '../UtxoTransactionBuilder';
import { WalletUnspentSigner } from './WalletUnspentSigner';
import { KeyName, RootWalletKeys } from './WalletKeys';
import { UtxoTransaction } from '../UtxoTransaction';
import { Triple } from '../types';
import { UnspentWithPrevTx, Unspent } from '../Unspent';
import { ChainCode } from './chains';
import { UtxoPsbt } from '../UtxoPsbt';
export interface WalletUnspent<TNumber extends number | bigint = number> extends Unspent<TNumber> {
    chain: ChainCode;
    index: number;
}
export interface NonWitnessWalletUnspent<TNumber extends number | bigint = number> extends UnspentWithPrevTx<TNumber>, WalletUnspent<TNumber> {
}
export declare function isWalletUnspent<TNumber extends number | bigint>(u: Unspent<TNumber>): u is WalletUnspent<TNumber>;
export declare function signInputWithUnspent<TNumber extends number | bigint>(txBuilder: UtxoTransactionBuilder<TNumber>, inputIndex: number, unspent: WalletUnspent<TNumber>, unspentSigner: WalletUnspentSigner<RootWalletKeys>): void;
/**
 * @param tx
 * @param inputIndex
 * @param unspents
 * @param walletKeys
 * @return triple of booleans indicating a valid signature for each pubkey
 */
export declare function verifySignatureWithUnspent<TNumber extends number | bigint>(tx: UtxoTransaction<TNumber>, inputIndex: number, unspents: Unspent<TNumber>[], walletKeys: RootWalletKeys): Triple<boolean>;
/**
 * @deprecated
 * Used in certain legacy signing methods that do not derive signing data from index/chain
 */
export interface WalletUnspentLegacy<TNumber extends number | bigint = number> extends WalletUnspent<TNumber> {
    /** @deprecated - obviated by signWithUnspent */
    redeemScript?: string;
    /** @deprecated - obviated by verifyWithUnspent */
    witnessScript?: string;
}
export declare function addReplayProtectionUnspentToPsbt(psbt: UtxoPsbt, u: Unspent<bigint>, redeemScript: Buffer, 
/**
 * @deprecated
 */
network?: Network): void;
export declare function addWalletUnspentToPsbt(psbt: UtxoPsbt, u: WalletUnspent<bigint>, rootWalletKeys: RootWalletKeys, signer: KeyName, cosigner: KeyName, 
/**
 * @deprecated
 */
network?: Network): void;
//# sourceMappingURL=Unspent.d.ts.map