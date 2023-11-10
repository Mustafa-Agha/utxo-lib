/// <reference types="node" />
import { TxInput } from 'bitcoinjs-lib';
import { ScriptType, ScriptType2Of3 } from './outputScripts';
export declare function isPlaceholderSignature(v: number | Buffer): boolean;
/**
 * @return true iff P2TR script path's control block matches BitGo's need
 */
export declare function isValidControlBock(controlBlock: Buffer): boolean;
/**
 * @return script path level for P2TR control block
 */
export declare function calculateScriptPathLevel(controlBlock: Buffer): number;
/**
 * @return leaf version for P2TR control block.
 */
export declare function getScriptPathLevel(controlBlock: Buffer): number;
interface ParsedScript {
    scriptType: ScriptType;
}
export declare type ParsedPubScript = ParsedScript;
export declare type ParsedSignatureScript = ParsedScript;
export interface ParsedSignatureScriptP2shP2pk extends ParsedSignatureScript {
    scriptType: 'p2shP2pk';
    publicKeys: [Buffer];
    signatures: [Buffer];
}
export interface ParsedPubScriptTaprootScriptPath extends ParsedPubScript {
    scriptType: 'p2tr';
    publicKeys: [Buffer, Buffer];
    pubScript: Buffer;
}
export interface ParsedPubScript2Of3 extends ParsedPubScript {
    scriptType: 'p2sh' | 'p2shP2wsh' | 'p2wsh';
    publicKeys: [Buffer, Buffer, Buffer];
    pubScript: Buffer;
    redeemScript: Buffer | undefined;
    witnessScript: Buffer | undefined;
}
export interface ParsedSignatureScript2Of3 extends ParsedSignatureScript {
    scriptType: 'p2sh' | 'p2shP2wsh' | 'p2wsh';
    publicKeys: [Buffer, Buffer, Buffer];
    signatures: [Buffer, Buffer] | [Buffer | 0, Buffer | 0, Buffer | 0];
    pubScript: Buffer;
    redeemScript: Buffer | undefined;
    witnessScript: Buffer | undefined;
}
/**
 * Keypath spends only have a single pubkey and single signature
 */
export interface ParsedSignatureScriptTaprootKeyPath extends ParsedSignatureScript {
    scriptType: 'p2tr';
    publicKeys: [Buffer];
    signatures: [Buffer];
    pubScript: Buffer;
}
/**
 * Taproot Scriptpath spends are more similar to regular p2ms spends and have two public keys and
 * two signatures
 */
export interface ParsedSignatureScriptTaprootScriptPath extends ParsedSignatureScript {
    scriptType: 'p2tr';
    publicKeys: [Buffer, Buffer];
    signatures: [Buffer, Buffer];
    controlBlock: Buffer;
    leafVersion: number;
    /** Indicates the level inside the taptree. */
    scriptPathLevel: number;
    pubScript: Buffer;
}
export declare type ParsedSignatureScriptTaproot = ParsedSignatureScriptTaprootKeyPath | ParsedSignatureScriptTaprootScriptPath;
export declare type InputPubScript = Buffer;
/**
 * Parse a transaction's signature script to obtain public keys, signatures, the sig script,
 * and other properties.
 *
 * Only supports script types used in BitGo transactions.
 *
 * @param input
 * @returns ParsedSignatureScript
 */
export declare function parseSignatureScript(input: TxInput): ParsedSignatureScriptP2shP2pk | ParsedSignatureScript2Of3 | ParsedSignatureScriptTaproot;
export declare function parseSignatureScript2Of3(input: TxInput): ParsedSignatureScript2Of3 | ParsedSignatureScriptTaproot;
/**
 * @return pubScript (scriptPubKey/redeemScript/witnessScript) is parsed.
 * P2SH => scriptType, pubScript (redeemScript), redeemScript, public keys
 * PW2SH => scriptType, pubScript (witnessScript), witnessScript, public keys.
 * P2SH-PW2SH => scriptType, pubScript (witnessScript), witnessScript, public keys.
 * P2TR => scriptType, pubScript, controlBlock, scriptPathLevel, leafVersion, pub keys, signatures.
 */
export declare function parsePubScript(inputPubScript: InputPubScript, scriptType: ScriptType2Of3): ParsedPubScript2Of3 | ParsedPubScriptTaprootScriptPath;
export {};
//# sourceMappingURL=parseInput.d.ts.map