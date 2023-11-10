import { UtxoPsbt } from '../UtxoPsbt';
import { RootWalletKeys } from './WalletKeys';
import { ChainCode } from './chains';
/**
 * Add a verifiable wallet output to the PSBT. The output and all data
 * needed to verify it from public keys only are added to the PSBT.
 * Typically these are change outputs
 *
 * @param psbt the PSBT to add change output to
 * @param rootWalletKeys keys that will be able to spend the output
 * @param chain chain code to use for deriving scripts (and to determine script
 *              type) chain is an API parameter in the BitGo API, and may be
 *              any valid ChainCode
 * @param index derivation index for the change address
 * @param value value of the change output
 */
export declare function addWalletOutputToPsbt(psbt: UtxoPsbt, rootWalletKeys: RootWalletKeys, chain: ChainCode, index: number, value: bigint): void;
//# sourceMappingURL=WalletOutput.d.ts.map