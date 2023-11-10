import { BIP32Interface } from 'bip32';
import { Triple } from '../bitgo';
import { RootWalletKeys } from '../bitgo';
export declare type KeyTriple = Triple<BIP32Interface>;
export declare function getKey(seed: string): BIP32Interface;
export declare function getKeyTriple(seed: string): KeyTriple;
export declare function getKeyName(triple: Triple<BIP32Interface>, k: BIP32Interface): string | undefined;
export declare function getDefaultCosigner<T>(keyset: Triple<T>, signer: T): T;
export declare function getDefaultWalletKeys(): RootWalletKeys;
//# sourceMappingURL=keys.d.ts.map