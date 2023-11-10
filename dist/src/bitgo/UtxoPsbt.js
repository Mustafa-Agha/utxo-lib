"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtxoPsbt = exports.ProprietaryKeySubtype = exports.PSBT_PROPRIETARY_IDENTIFIER = void 0;
const bip174_1 = require("bip174");
const utils_1 = require("bip174/src/lib/utils");
const bufferutils_1 = require("bitcoinjs-lib/src/bufferutils");
const __1 = require("..");
const UtxoTransaction_1 = require("./UtxoTransaction");
const Unspent_1 = require("./Unspent");
const scriptTypes_1 = require("./psbt/scriptTypes");
const fromHalfSigned_1 = require("./psbt/fromHalfSigned");
const outputScripts_1 = require("./outputScripts");
const parseInput_1 = require("./parseInput");
const bip32_1 = require("bip32");
const bs58check = require("bs58check");
const proprietaryKeyVal_1 = require("bip174/src/lib/proprietaryKeyVal");
exports.PSBT_PROPRIETARY_IDENTIFIER = 'BITGO';
var ProprietaryKeySubtype;
(function (ProprietaryKeySubtype) {
    ProprietaryKeySubtype[ProprietaryKeySubtype["ZEC_CONSENSUS_BRANCH_ID"] = 0] = "ZEC_CONSENSUS_BRANCH_ID";
    ProprietaryKeySubtype[ProprietaryKeySubtype["MUSIG2_PARTICIPANT_PUB_KEYS"] = 1] = "MUSIG2_PARTICIPANT_PUB_KEYS";
    ProprietaryKeySubtype[ProprietaryKeySubtype["MUSIG2_PUB_NONCE"] = 2] = "MUSIG2_PUB_NONCE";
})(ProprietaryKeySubtype = exports.ProprietaryKeySubtype || (exports.ProprietaryKeySubtype = {}));
// TODO: upstream does `checkInputsForPartialSigs` before doing things like
// `setVersion`. Our inputs could have tapscriptsigs (or in future tapkeysigs)
// and not fail that check. Do we want to do anything about that?
class UtxoPsbt extends __1.Psbt {
    static transactionFromBuffer(buffer, network) {
        return UtxoTransaction_1.UtxoTransaction.fromBuffer(buffer, false, 'bigint', network);
    }
    static createPsbt(opts, data) {
        return new UtxoPsbt(opts, data || new bip174_1.Psbt(new __1.PsbtTransaction({ tx: new UtxoTransaction_1.UtxoTransaction(opts.network) })));
    }
    static fromBuffer(buffer, opts) {
        const transactionFromBuffer = (buffer) => {
            const tx = this.transactionFromBuffer(buffer, opts.network);
            return new __1.PsbtTransaction({ tx });
        };
        const psbtBase = bip174_1.Psbt.fromBuffer(buffer, transactionFromBuffer, {
            bip32PathsAbsolute: opts.bip32PathsAbsolute,
        });
        const psbt = this.createPsbt(opts, psbtBase);
        // Upstream checks for duplicate inputs here, but it seems to be of dubious value.
        return psbt;
    }
    static fromHex(data, opts) {
        return this.fromBuffer(Buffer.from(data, 'hex'), opts);
    }
    get network() {
        return this.tx.network;
    }
    toHex() {
        return this.toBuffer().toString('hex');
    }
    /**
     * @return true iff PSBT input is finalized
     */
    isInputFinalized(inputIndex) {
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        return Buffer.isBuffer(input.finalScriptSig) || Buffer.isBuffer(input.finalScriptWitness);
    }
    /**
     * @return partialSig/tapScriptSig count iff input is not finalized
     */
    getSignatureCount(inputIndex) {
        if (this.isInputFinalized(inputIndex)) {
            throw new Error('Input is already finalized');
        }
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        return Math.max(Array.isArray(input.partialSig) ? input.partialSig.length : 0, Array.isArray(input.tapScriptSig) ? input.tapScriptSig.length : 0);
    }
    getNonWitnessPreviousTxids() {
        const txInputs = this.txInputs; // These are somewhat costly to extract
        const txidSet = new Set();
        this.data.inputs.forEach((input, index) => {
            if (!input.witnessUtxo) {
                throw new Error('Must have witness UTXO for all inputs');
            }
            if (!scriptTypes_1.isSegwit(input.witnessUtxo.script, input.redeemScript)) {
                txidSet.add(Unspent_1.getOutputIdForInput(txInputs[index]).txid);
            }
        });
        return [...txidSet];
    }
    addNonWitnessUtxos(txBufs) {
        const txInputs = this.txInputs; // These are somewhat costly to extract
        this.data.inputs.forEach((input, index) => {
            if (!input.witnessUtxo) {
                throw new Error('Must have witness UTXO for all inputs');
            }
            if (!scriptTypes_1.isSegwit(input.witnessUtxo.script, input.redeemScript)) {
                const { txid } = Unspent_1.getOutputIdForInput(txInputs[index]);
                if (txBufs[txid] === undefined) {
                    throw new Error('Not all required previous transactions provided');
                }
                this.updateInput(index, { nonWitnessUtxo: txBufs[txid] });
            }
        });
        return this;
    }
    static fromTransaction(transaction, prevOutputs) {
        if (prevOutputs.length !== transaction.ins.length) {
            throw new Error(`Transaction has ${transaction.ins.length} inputs, but ${prevOutputs.length} previous outputs provided`);
        }
        const clonedTransaction = transaction.clone();
        const updates = fromHalfSigned_1.unsign(clonedTransaction, prevOutputs);
        const psbtBase = new bip174_1.Psbt(new __1.PsbtTransaction({ tx: clonedTransaction }));
        clonedTransaction.ins.forEach(() => psbtBase.inputs.push({ unknownKeyVals: [] }));
        clonedTransaction.outs.forEach(() => psbtBase.outputs.push({ unknownKeyVals: [] }));
        const psbt = this.createPsbt({ network: transaction.network }, psbtBase);
        updates.forEach((update, index) => {
            psbt.updateInput(index, update);
            psbt.updateInput(index, { witnessUtxo: { script: prevOutputs[index].script, value: prevOutputs[index].value } });
        });
        return psbt;
    }
    getUnsignedTx() {
        return this.tx.clone();
    }
    static newTransaction(network) {
        return new UtxoTransaction_1.UtxoTransaction(network);
    }
    get tx() {
        return this.data.globalMap.unsignedTx.tx;
    }
    checkForSignatures(propName) {
        this.data.inputs.forEach((input) => {
            var _a, _b;
            if (((_a = input.tapScriptSig) === null || _a === void 0 ? void 0 : _a.length) || input.tapKeySig || ((_b = input.partialSig) === null || _b === void 0 ? void 0 : _b.length)) {
                throw new Error(`Cannot modify ${propName !== null && propName !== void 0 ? propName : 'transaction'} - signatures exist.`);
            }
        });
    }
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts
     */
    finalizeAllInputs() {
        utils_1.checkForInput(this.data.inputs, 0); // making sure we have at least one
        this.data.inputs.map((input, idx) => {
            var _a;
            return ((_a = input.tapScriptSig) === null || _a === void 0 ? void 0 : _a.length) ? this.finalizeTaprootInput(idx) : this.finalizeInput(idx);
        });
        return this;
    }
    finalizeTaprootInput(inputIndex) {
        var _a, _b;
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        // witness = control-block script first-sig second-sig
        if (((_a = input.tapLeafScript) === null || _a === void 0 ? void 0 : _a.length) !== 1) {
            throw new Error('Only one leaf script supported for finalizing');
        }
        const { controlBlock, script } = input.tapLeafScript[0];
        const witness = [script, controlBlock];
        const [pubkey1, pubkey2] = parseInput_1.parsePubScript(script, 'p2tr').publicKeys;
        for (const pk of [pubkey1, pubkey2]) {
            const sig = (_b = input.tapScriptSig) === null || _b === void 0 ? void 0 : _b.find(({ pubkey }) => pubkey.equals(pk));
            if (!sig) {
                throw new Error('Could not find signatures in Script Sig.');
            }
            witness.unshift(sig.signature);
        }
        const witnessLength = witness.reduce((s, b) => s + b.length + bufferutils_1.varuint.encodingLength(b.length), 1);
        const bufferWriter = bufferutils_1.BufferWriter.withCapacity(witnessLength);
        bufferWriter.writeVector(witness);
        const finalScriptWitness = bufferWriter.end();
        this.data.updateInput(inputIndex, { finalScriptWitness });
        this.data.clearFinalizedInput(inputIndex);
        return this;
    }
    finalizeTapInputWithSingleLeafScriptAndSignature(inputIndex) {
        var _a, _b;
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        if (((_a = input.tapLeafScript) === null || _a === void 0 ? void 0 : _a.length) !== 1) {
            throw new Error('Only one leaf script supported for finalizing');
        }
        if (((_b = input.tapScriptSig) === null || _b === void 0 ? void 0 : _b.length) !== 1) {
            throw new Error('Could not find signatures in Script Sig.');
        }
        const { controlBlock, script } = input.tapLeafScript[0];
        const witness = [input.tapScriptSig[0].signature, script, controlBlock];
        const witnessLength = witness.reduce((s, b) => s + b.length + bufferutils_1.varuint.encodingLength(b.length), 1);
        const bufferWriter = bufferutils_1.BufferWriter.withCapacity(witnessLength);
        bufferWriter.writeVector(witness);
        const finalScriptWitness = bufferWriter.end();
        this.data.updateInput(inputIndex, { finalScriptWitness });
        this.data.clearFinalizedInput(inputIndex);
        return this;
    }
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts
     *
     * Unlike the function it overrides, this does not take a validator. In BitGo
     * context, we know how we want to validate so we just hard code the right
     * validator.
     */
    validateSignaturesOfAllInputs() {
        utils_1.checkForInput(this.data.inputs, 0); // making sure we have at least one
        const results = this.data.inputs.map((input, idx) => {
            var _a;
            return ((_a = input.tapScriptSig) === null || _a === void 0 ? void 0 : _a.length)
                ? this.validateTaprootSignaturesOfInput(idx)
                : this.validateSignaturesOfInput(idx, (p, m, s) => __1.ecc.verify(m, p, s));
        });
        return results.reduce((final, res) => res && final, true);
    }
    validateTaprootSignaturesOfInput(inputIndex, pubkey) {
        const input = this.data.inputs[inputIndex];
        const tapSigs = (input || {}).tapScriptSig;
        if (!input || !tapSigs || tapSigs.length < 1) {
            throw new Error('No signatures to validate');
        }
        let mySigs;
        if (pubkey) {
            const xOnlyPubkey = outputScripts_1.toXOnlyPublicKey(pubkey);
            mySigs = tapSigs.filter((sig) => sig.pubkey.equals(xOnlyPubkey));
            if (mySigs.length < 1) {
                throw new Error('No signatures for this pubkey');
            }
        }
        else {
            mySigs = tapSigs;
        }
        const results = [];
        for (const pSig of mySigs) {
            const { signature, leafHash, pubkey } = pSig;
            let sigHashType;
            let sig;
            if (signature.length === 65) {
                sigHashType = signature[64];
                sig = signature.slice(0, 64);
            }
            else {
                sigHashType = __1.Transaction.SIGHASH_DEFAULT;
                sig = signature;
            }
            const { hash } = this.getTaprootHashForSig(inputIndex, [sigHashType], leafHash);
            results.push(__1.ecc.verifySchnorr(hash, pubkey, sig));
        }
        return results.every((res) => res === true);
    }
    /**
     * @return array of boolean values. True when corresponding index in `publicKeys` has signed the transaction.
     * If no signature in the tx or no public key matching signature, the validation is considered as false.
     */
    getSignatureValidationArray(inputIndex) {
        var _a;
        const noSigErrorMessages = ['No signatures to validate', 'No signatures for this pubkey'];
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        const isP2tr = (_a = input.tapScriptSig) === null || _a === void 0 ? void 0 : _a.length;
        if (!this.data.globalMap.globalXpub) {
            throw new Error('Cannot get signature validation array without global xpubs');
        }
        if (this.data.globalMap.globalXpub.length !== 3) {
            throw new Error(`There must be 3 global xpubs and there are ${this.data.globalMap.globalXpub.length}`);
        }
        return this.data.globalMap.globalXpub.map((xpub) => {
            // const bip32 = ECPair.fromPublicKey(xpub.extendedPubkey, { network: (this as any).opts.network });
            const bip32 = bip32_1.BIP32Factory(__1.ecc).fromBase58(bs58check.encode(xpub.extendedPubkey));
            try {
                return isP2tr
                    ? this.validateTaprootSignaturesOfInput(inputIndex, bip32.publicKey)
                    : this.validateSignaturesOfInput(inputIndex, (p, m, s) => __1.ecc.verify(m, p, s), bip32.publicKey);
            }
            catch (err) {
                // Not an elegant solution. Might need upstream changes like custom error types.
                if (noSigErrorMessages.includes(err.message)) {
                    return false;
                }
                throw err;
            }
        });
    }
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts
     */
    signAllInputsHD(hdKeyPair, sighashTypes = [__1.Transaction.SIGHASH_DEFAULT, __1.Transaction.SIGHASH_ALL]) {
        var _a;
        if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
            throw new Error('Need HDSigner to sign input');
        }
        const results = [];
        for (let i = 0; i < this.data.inputs.length; i++) {
            try {
                if ((_a = this.data.inputs[i].tapBip32Derivation) === null || _a === void 0 ? void 0 : _a.length) {
                    this.signTaprootInputHD(i, hdKeyPair, sighashTypes);
                }
                else {
                    this.signInputHD(i, hdKeyPair, sighashTypes);
                }
                results.push(true);
            }
            catch (err) {
                results.push(false);
            }
        }
        if (results.every((v) => v === false)) {
            throw new Error('No inputs were signed');
        }
        return this;
    }
    /**
     * Mostly copied from bitcoinjs-lib/ts_src/psbt.ts:signInputHD
     */
    signTaprootInputHD(inputIndex, hdKeyPair, sighashTypes = [__1.Transaction.SIGHASH_DEFAULT, __1.Transaction.SIGHASH_ALL]) {
        if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
            throw new Error('Need HDSigner to sign input');
        }
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        if (!input.tapBip32Derivation || input.tapBip32Derivation.length === 0) {
            throw new Error('Need tapBip32Derivation to sign Taproot with HD');
        }
        const myDerivations = input.tapBip32Derivation
            .map((bipDv) => {
            if (bipDv.masterFingerprint.equals(hdKeyPair.fingerprint)) {
                return bipDv;
            }
        })
            .filter((v) => !!v);
        if (myDerivations.length === 0) {
            throw new Error('Need one tapBip32Derivation masterFingerprint to match the HDSigner fingerprint');
        }
        const signers = myDerivations.map((bipDv) => {
            const node = hdKeyPair.derivePath(bipDv.path);
            if (!bipDv.pubkey.equals(node.publicKey.slice(1))) {
                throw new Error('pubkey did not match tapBip32Derivation');
            }
            return { signer: node, leafHashes: bipDv.leafHashes };
        });
        signers.forEach(({ signer, leafHashes }) => this.signTaprootInput(inputIndex, signer, leafHashes, sighashTypes));
        return this;
    }
    signTaprootInput(inputIndex, signer, leafHashes, sighashTypes = [__1.Transaction.SIGHASH_DEFAULT, __1.Transaction.SIGHASH_ALL]) {
        var _a;
        const pubkey = outputScripts_1.toXOnlyPublicKey(signer.publicKey);
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        // Figure out if this is script path or not, if not, tweak the private key
        if (!((_a = input.tapLeafScript) === null || _a === void 0 ? void 0 : _a.length)) {
            // See BitGo/BitGoJS/modules/utxo_lib/src/transaction_builder.ts:trySign for how to support it.
            throw new Error('Taproot key path signing is not supported.');
        }
        if (input.tapLeafScript.length !== 1) {
            throw new Error('Only one leaf script supported for signing');
        }
        const tapLeafScript = input.tapLeafScript[0];
        const parsedControlBlock = __1.taproot.parseControlBlock(__1.ecc, tapLeafScript.controlBlock);
        const { leafVersion } = parsedControlBlock;
        if (leafVersion !== tapLeafScript.leafVersion) {
            throw new Error('Tap script leaf version mismatch with control block');
        }
        const leafHash = __1.taproot.getTapleafHash(__1.ecc, parsedControlBlock, tapLeafScript.script);
        if (!leafHashes.find((l) => l.equals(leafHash))) {
            throw new Error(`Signer cannot sign for leaf hash ${leafHash.toString('hex')}`);
        }
        const { hash, sighashType } = this.getTaprootHashForSig(inputIndex, sighashTypes, leafHash);
        let signature = signer.signSchnorr(hash);
        if (sighashType !== __1.Transaction.SIGHASH_DEFAULT) {
            signature = Buffer.concat([signature, Buffer.of(sighashType)]);
        }
        this.data.updateInput(inputIndex, {
            tapScriptSig: [
                {
                    pubkey,
                    signature,
                    leafHash,
                },
            ],
        });
        return this;
    }
    getTaprootHashForSig(inputIndex, sighashTypes, leafHash) {
        const sighashType = this.data.inputs[inputIndex].sighashType || __1.Transaction.SIGHASH_DEFAULT;
        if (sighashTypes && sighashTypes.indexOf(sighashType) < 0) {
            throw new Error(`Sighash type is not allowed. Retry the sign method passing the ` +
                `sighashTypes array of whitelisted types. Sighash type: ${sighashType}`);
        }
        const txInputs = this.txInputs; // These are somewhat costly to extract
        const prevoutScripts = [];
        const prevoutValues = [];
        this.data.inputs.forEach((input, i) => {
            let prevout;
            if (input.nonWitnessUtxo) {
                // TODO: This could be costly, either cache it here, or find a way to share with super
                const nonWitnessUtxoTx = this.constructor.transactionFromBuffer(input.nonWitnessUtxo, this.tx.network);
                const prevoutHash = txInputs[i].hash;
                const utxoHash = nonWitnessUtxoTx.getHash();
                // If a non-witness UTXO is provided, its hash must match the hash specified in the prevout
                if (!prevoutHash.equals(utxoHash)) {
                    throw new Error(`Non-witness UTXO hash for input #${i} doesn't match the hash specified in the prevout`);
                }
                const prevoutIndex = txInputs[i].index;
                prevout = nonWitnessUtxoTx.outs[prevoutIndex];
            }
            else if (input.witnessUtxo) {
                prevout = input.witnessUtxo;
            }
            else {
                throw new Error('Need a Utxo input item for signing');
            }
            prevoutScripts.push(prevout.script);
            prevoutValues.push(prevout.value);
        });
        const hash = this.tx.hashForWitnessV1(inputIndex, prevoutScripts, prevoutValues, sighashType, leafHash);
        return { hash, sighashType };
    }
    /**
     * @retuns true iff the input is taproot.
     */
    isTaprootInput(inputIndex) {
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        function isP2tr(output) {
            try {
                __1.p2trPayments.p2tr({ output }, { eccLib: __1.ecc });
                return true;
            }
            catch (err) {
                return false;
            }
        }
        return !!(input.tapInternalKey ||
            input.tapMerkleRoot ||
            (input.tapLeafScript && input.tapLeafScript.length) ||
            (input.tapBip32Derivation && input.tapBip32Derivation.length) ||
            (input.witnessUtxo && isP2tr(input.witnessUtxo.script)));
    }
    /**
     * @returns hash and hashType for taproot input at inputIndex
     * @throws error if input at inputIndex is not a taproot input
     */
    getTaprootHashForSigChecked(inputIndex, sighashTypes = [__1.Transaction.SIGHASH_DEFAULT, __1.Transaction.SIGHASH_ALL], leafHash) {
        if (!this.isTaprootInput(inputIndex)) {
            throw new Error(`${inputIndex} input is not a taproot type to take taproot tx hash`);
        }
        return this.getTaprootHashForSig(inputIndex, sighashTypes, leafHash);
    }
    /**
     * Adds proprietary key value pair to PSBT input.
     * Default identifierEncoding is utf-8 for identifier.
     */
    addProprietaryKeyValToInput(inputIndex, keyValueData) {
        return this.addUnknownKeyValToInput(inputIndex, {
            key: proprietaryKeyVal_1.encodeProprietaryKey(keyValueData.key),
            value: keyValueData.value,
        });
    }
    /**
     * To search any data from proprietary key value againts keydata.
     * Default identifierEncoding is utf-8 for identifier.
     */
    getProprietaryKeyVals(inputIndex, keySearch) {
        const input = utils_1.checkForInput(this.data.inputs, inputIndex);
        if (!input.unknownKeyVals || input.unknownKeyVals.length === 0) {
            return [];
        }
        const keyVals = input.unknownKeyVals.map(({ key, value }, i) => {
            return { key: proprietaryKeyVal_1.decodeProprietaryKey(key), value };
        });
        return keyVals.filter((keyVal) => {
            return (keySearch === undefined ||
                (keySearch.identifier === keyVal.key.identifier &&
                    keySearch.subtype === keyVal.key.subtype &&
                    (!Buffer.isBuffer(keySearch.keydata) || keySearch.keydata.equals(keyVal.key.keydata))));
        });
    }
    clone() {
        return super.clone();
    }
}
exports.UtxoPsbt = UtxoPsbt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXR4b1BzYnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYml0Z28vVXR4b1BzYnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQTBDO0FBRTFDLGdEQUFxRDtBQUNyRCwrREFBc0U7QUFFdEUsMEJBVVk7QUFDWix1REFBb0Q7QUFDcEQsdUNBQWdEO0FBQ2hELG9EQUE4QztBQUM5QywwREFBK0M7QUFDL0MsbURBQW1EO0FBQ25ELDZDQUE4QztBQUM5QyxpQ0FBcUM7QUFDckMsdUNBQXVDO0FBQ3ZDLHdFQUE4RztBQUVqRyxRQUFBLDJCQUEyQixHQUFHLE9BQU8sQ0FBQztBQUVuRCxJQUFZLHFCQUlYO0FBSkQsV0FBWSxxQkFBcUI7SUFDL0IsdUdBQThCLENBQUE7SUFDOUIsK0dBQWtDLENBQUE7SUFDbEMseUZBQXVCLENBQUE7QUFDekIsQ0FBQyxFQUpXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBSWhDO0FBb0RELDJFQUEyRTtBQUMzRSw4RUFBOEU7QUFDOUUsaUVBQWlFO0FBQ2pFLE1BQWEsUUFBdUUsU0FBUSxRQUFJO0lBQ3BGLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFjLEVBQUUsT0FBZ0I7UUFDckUsT0FBTyxpQ0FBZSxDQUFDLFVBQVUsQ0FBUyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFjLEVBQUUsSUFBZTtRQUMvQyxPQUFPLElBQUksUUFBUSxDQUNqQixJQUFJLEVBQ0osSUFBSSxJQUFJLElBQUksYUFBUSxDQUFDLElBQUksbUJBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLGlDQUFlLENBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUM3RixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBYyxFQUFF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RCxPQUFPLEVBQUUsR0FBRyxFQUFFLHdDQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDL0IsT0FBTyxDQUNMLFNBQVMsS0FBSyxTQUFTO2dCQUN2QixDQUFDLFNBQVMsQ0FBQyxVQUFVLEtBQUssTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVO29CQUM3QyxTQUFTLENBQUMsT0FBTyxLQUFLLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTztvQkFDeEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUN6RixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSztRQUNILE9BQU8sS0FBSyxDQUFDLEtBQUssRUFBVSxDQUFDO0lBQy9CLENBQUM7Q0FDRjtBQWpnQkQsNEJBaWdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBzYnQgYXMgUHNidEJhc2UgfSBmcm9tICdiaXAxNzQnO1xuaW1wb3J0IHsgVGFwQmlwMzJEZXJpdmF0aW9uLCBUcmFuc2FjdGlvbiBhcyBJVHJhbnNhY3Rpb24sIFRyYW5zYWN0aW9uRnJvbUJ1ZmZlciB9IGZyb20gJ2JpcDE3NC9zcmMvbGliL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY2hlY2tGb3JJbnB1dCB9IGZyb20gJ2JpcDE3NC9zcmMvbGliL3V0aWxzJztcbmltcG9ydCB7IEJ1ZmZlcldyaXRlciwgdmFydWludCB9IGZyb20gJ2JpdGNvaW5qcy1saWIvc3JjL2J1ZmZlcnV0aWxzJztcblxuaW1wb3J0IHtcbiAgdGFwcm9vdCxcbiAgSERTaWduZXIsXG4gIFBzYnQsXG4gIFBzYnRUcmFuc2FjdGlvbixcbiAgVHJhbnNhY3Rpb24sXG4gIFR4T3V0cHV0LFxuICBOZXR3b3JrLFxuICBlY2MgYXMgZWNjTGliLFxuICBwMnRyUGF5bWVudHMsXG59IGZyb20gJy4uJztcbmltcG9ydCB7IFV0eG9UcmFuc2FjdGlvbiB9IGZyb20gJy4vVXR4b1RyYW5zYWN0aW9uJztcbmltcG9ydCB7IGdldE91dHB1dElkRm9ySW5wdXQgfSBmcm9tICcuL1Vuc3BlbnQnO1xuaW1wb3J0IHsgaXNTZWd3aXQgfSBmcm9tICcuL3BzYnQvc2NyaXB0VHlwZXMnO1xuaW1wb3J0IHsgdW5zaWduIH0gZnJvbSAnLi9wc2J0L2Zyb21IYWxmU2lnbmVkJztcbmltcG9ydCB7IHRvWE9ubHlQdWJsaWNLZXkgfSBmcm9tICcuL291dHB1dFNjcmlwdHMnO1xuaW1wb3J0IHsgcGFyc2VQdWJTY3JpcHQgfSBmcm9tICcuL3BhcnNlSW5wdXQnO1xuaW1wb3J0IHsgQklQMzJGYWN0b3J5IH0gZnJvbSAnYmlwMzInO1xuaW1wb3J0ICogYXMgYnM1OGNoZWNrIGZyb20gJ2JzNThjaGVjayc7XG5pbXBvcnQgeyBkZWNvZGVQcm9wcmlldGFyeUtleSwgZW5jb2RlUHJvcHJpZXRhcnlLZXksIFByb3ByaWV0YXJ5S2V5IH0gZnJvbSAnYmlwMTc0L3NyYy9saWIvcHJvcHJpZXRhcnlLZXlWYWwnO1xuXG5leHBvcnQgY29uc3QgUFNCVF9QUk9QUklFVEFSWV9JREVOVElGSUVSID0gJ0JJVEdPJztcblxuZXhwb3J0IGVudW0gUHJvcHJpZXRhcnlLZXlTdWJ0eXBlIHtcbiAgWkVDX0NPTlNFTlNVU19CUkFOQ0hfSUQgPSAweDAwLFxuICBNVVNJRzJfUEFSVElDSVBBTlRfUFVCX0tFWVMgPSAweDAxLFxuICBNVVNJRzJfUFVCX05PTkNFID0gMHgwMixcbn1cblxuZXhwb3J0IGludGVyZmFjZSBIRFRhcHJvb3RTaWduZXIgZXh0ZW5kcyBIRFNpZ25lciB7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCBzdHJpbmcgbXVzdCBtYXRjaCAvXm0oXFwvXFxkKyc/KSskL1xuICAgKiBleC4gbS80NCcvMCcvMCcvMS8yMyBsZXZlbHMgd2l0aCAnIG11c3QgYmUgaGFyZCBkZXJpdmF0aW9uc1xuICAgKi9cbiAgZGVyaXZlUGF0aChwYXRoOiBzdHJpbmcpOiBIRFRhcHJvb3RTaWduZXI7XG4gIC8qKlxuICAgKiBJbnB1dCBoYXNoICh0aGUgXCJtZXNzYWdlIGRpZ2VzdFwiKSBmb3IgdGhlIHNpZ25hdHVyZSBhbGdvcml0aG1cbiAgICogUmV0dXJuIGEgNjQgYnl0ZSBzaWduYXR1cmUgKDMyIGJ5dGUgciBhbmQgMzIgYnl0ZSBzIGluIHRoYXQgb3JkZXIpXG4gICAqL1xuICBzaWduU2Nobm9ycihoYXNoOiBCdWZmZXIpOiBCdWZmZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2Nobm9yclNpZ25lciB7XG4gIHB1YmxpY0tleTogQnVmZmVyO1xuICBzaWduU2Nobm9ycihoYXNoOiBCdWZmZXIpOiBCdWZmZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFwcm9vdFNpZ25lciB7XG4gIGxlYWZIYXNoZXM6IEJ1ZmZlcltdO1xuICBzaWduZXI6IFNjaG5vcnJTaWduZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHNidE9wdHMge1xuICBuZXR3b3JrOiBOZXR3b3JrO1xuICBtYXhpbXVtRmVlUmF0ZT86IG51bWJlcjsgLy8gW3NhdC9ieXRlXVxuICBiaXAzMlBhdGhzQWJzb2x1dGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFBzYnQgcHJvcHJpZXRhcnkga2V5ZGF0YSBvYmplY3QuXG4gKiA8Y29tcGFjdCBzaXplIHVpbnQgaWRlbnRpZmllciBsZW5ndGg+IDxieXRlcyBpZGVudGlmaWVyPiA8Y29tcGFjdCBzaXplIHVpbnQgc3VidHlwZT4gPGJ5dGVzIHN1YmtleWRhdGE+XG4gKiA9PiA8Ynl0ZXMgdmFsdWVkYXRhPlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3ByaWV0YXJ5S2V5VmFsdWVEYXRhIHtcbiAga2V5OiBQcm9wcmlldGFyeUtleTtcbiAgdmFsdWU6IEJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBQc2J0IHByb3ByaWV0YXJ5IGtleWRhdGEgb2JqZWN0IHNlYXJjaCBmaWVsZHMuXG4gKiA8Y29tcGFjdCBzaXplIHVpbnQgaWRlbnRpZmllciBsZW5ndGg+IDxieXRlcyBpZGVudGlmaWVyPiA8Y29tcGFjdCBzaXplIHVpbnQgc3VidHlwZT4gPGJ5dGVzIHN1YmtleWRhdGE+XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvcHJpZXRhcnlLZXlTZWFyY2gge1xuICBpZGVudGlmaWVyOiBzdHJpbmc7XG4gIHN1YnR5cGU6IG51bWJlcjtcbiAga2V5ZGF0YT86IEJ1ZmZlcjtcbiAgaWRlbnRpZmllckVuY29kaW5nPzogQnVmZmVyRW5jb2Rpbmc7XG59XG5cbi8vIFRPRE86IHVwc3RyZWFtIGRvZXMgYGNoZWNrSW5wdXRzRm9yUGFydGlhbFNpZ3NgIGJlZm9yZSBkb2luZyB0aGluZ3MgbGlrZVxuLy8gYHNldFZlcnNpb25gLiBPdXIgaW5wdXRzIGNvdWxkIGhhdmUgdGFwc2NyaXB0c2lncyAob3IgaW4gZnV0dXJlIHRhcGtleXNpZ3MpXG4vLyBhbmQgbm90IGZhaWwgdGhhdCBjaGVjay4gRG8gd2Ugd2FudCB0byBkbyBhbnl0aGluZyBhYm91dCB0aGF0P1xuZXhwb3J0IGNsYXNzIFV0eG9Qc2J0PFR4IGV4dGVuZHMgVXR4b1RyYW5zYWN0aW9uPGJpZ2ludD4gPSBVdHhvVHJhbnNhY3Rpb248YmlnaW50Pj4gZXh0ZW5kcyBQc2J0IHtcbiAgcHJvdGVjdGVkIHN0YXRpYyB0cmFuc2FjdGlvbkZyb21CdWZmZXIoYnVmZmVyOiBCdWZmZXIsIG5ldHdvcms6IE5ldHdvcmspOiBVdHhvVHJhbnNhY3Rpb248YmlnaW50PiB7XG4gICAgcmV0dXJuIFV0eG9UcmFuc2FjdGlvbi5mcm9tQnVmZmVyPGJpZ2ludD4oYnVmZmVyLCBmYWxzZSwgJ2JpZ2ludCcsIG5ldHdvcmspO1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVBzYnQob3B0czogUHNidE9wdHMsIGRhdGE/OiBQc2J0QmFzZSk6IFV0eG9Qc2J0IHtcbiAgICByZXR1cm4gbmV3IFV0eG9Qc2J0KFxuICAgICAgb3B0cyxcbiAgICAgIGRhdGEgfHwgbmV3IFBzYnRCYXNlKG5ldyBQc2J0VHJhbnNhY3Rpb24oeyB0eDogbmV3IFV0eG9UcmFuc2FjdGlvbjxiaWdpbnQ+KG9wdHMubmV0d29yaykgfSkpXG4gICAgKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tQnVmZmVyKGJ1ZmZlcjogQnVmZmVyLCBvcHRzOiBQc2J0T3B0cyk6IFV0eG9Qc2J0IHtcbiAgICBjb25zdCB0cmFuc2FjdGlvbkZyb21CdWZmZXI6IFRyYW5zYWN0aW9uRnJvbUJ1ZmZlciA9IChidWZmZXI6IEJ1ZmZlcik6IElUcmFuc2FjdGlvbiA9PiB7XG4gICAgICBjb25zdCB0eCA9IHRoaXMudHJhbnNhY3Rpb25Gcm9tQnVmZmVyKGJ1ZmZlciwgb3B0cy5uZXR3b3JrKTtcbiAgICAgIHJldHVybiBuZXcgUHNidFRyYW5zYWN0aW9uKHsgdHggfSk7XG4gICAgfTtcbiAgICBjb25zdCBwc2J0QmFzZSA9IFBzYnRCYXNlLmZyb21CdWZmZXIoYnVmZmVyLCB0cmFuc2FjdGlvbkZyb21CdWZmZXIsIHtcbiAgICAgIGJpcDMyUGF0aHNBYnNvbHV0ZTogb3B0cy5iaXAzMlBhdGhzQWJzb2x1dGUsXG4gICAgfSk7XG4gICAgY29uc3QgcHNidCA9IHRoaXMuY3JlYXRlUHNidChvcHRzLCBwc2J0QmFzZSk7XG4gICAgLy8gVXBzdHJlYW0gY2hlY2tzIGZvciBkdXBsaWNhdGUgaW5wdXRzIGhlcmUsIGJ1dCBpdCBzZWVtcyB0byBiZSBvZiBkdWJpb3VzIHZhbHVlLlxuICAgIHJldHVybiBwc2J0O1xuICB9XG5cbiAgc3RhdGljIGZyb21IZXgoZGF0YTogc3RyaW5nLCBvcHRzOiBQc2J0T3B0cyk6IFV0eG9Qc2J0IHtcbiAgICByZXR1cm4gdGhpcy5mcm9tQnVmZmVyKEJ1ZmZlci5mcm9tKGRhdGEsICdoZXgnKSwgb3B0cyk7XG4gIH1cblxuICBnZXQgbmV0d29yaygpOiBOZXR3b3JrIHtcbiAgICByZXR1cm4gdGhpcy50eC5uZXR3b3JrO1xuICB9XG5cbiAgdG9IZXgoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy50b0J1ZmZlcigpLnRvU3RyaW5nKCdoZXgnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHRydWUgaWZmIFBTQlQgaW5wdXQgaXMgZmluYWxpemVkXG4gICAqL1xuICBpc0lucHV0RmluYWxpemVkKGlucHV0SW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlucHV0ID0gY2hlY2tGb3JJbnB1dCh0aGlzLmRhdGEuaW5wdXRzLCBpbnB1dEluZGV4KTtcbiAgICByZXR1cm4gQnVmZmVyLmlzQnVmZmVyKGlucHV0LmZpbmFsU2NyaXB0U2lnKSB8fCBCdWZmZXIuaXNCdWZmZXIoaW5wdXQuZmluYWxTY3JpcHRXaXRuZXNzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHBhcnRpYWxTaWcvdGFwU2NyaXB0U2lnIGNvdW50IGlmZiBpbnB1dCBpcyBub3QgZmluYWxpemVkXG4gICAqL1xuICBnZXRTaWduYXR1cmVDb3VudChpbnB1dEluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmlzSW5wdXRGaW5hbGl6ZWQoaW5wdXRJbmRleCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW5wdXQgaXMgYWxyZWFkeSBmaW5hbGl6ZWQnKTtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSBjaGVja0ZvcklucHV0KHRoaXMuZGF0YS5pbnB1dHMsIGlucHV0SW5kZXgpO1xuICAgIHJldHVybiBNYXRoLm1heChcbiAgICAgIEFycmF5LmlzQXJyYXkoaW5wdXQucGFydGlhbFNpZykgPyBpbnB1dC5wYXJ0aWFsU2lnLmxlbmd0aCA6IDAsXG4gICAgICBBcnJheS5pc0FycmF5KGlucHV0LnRhcFNjcmlwdFNpZykgPyBpbnB1dC50YXBTY3JpcHRTaWcubGVuZ3RoIDogMFxuICAgICk7XG4gIH1cblxuICBnZXROb25XaXRuZXNzUHJldmlvdXNUeGlkcygpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgdHhJbnB1dHMgPSB0aGlzLnR4SW5wdXRzOyAvLyBUaGVzZSBhcmUgc29tZXdoYXQgY29zdGx5IHRvIGV4dHJhY3RcbiAgICBjb25zdCB0eGlkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgdGhpcy5kYXRhLmlucHV0cy5mb3JFYWNoKChpbnB1dCwgaW5kZXgpID0+IHtcbiAgICAgIGlmICghaW5wdXQud2l0bmVzc1V0eG8pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGhhdmUgd2l0bmVzcyBVVFhPIGZvciBhbGwgaW5wdXRzJyk7XG4gICAgICB9XG4gICAgICBpZiAoIWlzU2Vnd2l0KGlucHV0LndpdG5lc3NVdHhvLnNjcmlwdCwgaW5wdXQucmVkZWVtU2NyaXB0KSkge1xuICAgICAgICB0eGlkU2V0LmFkZChnZXRPdXRwdXRJZEZvcklucHV0KHR4SW5wdXRzW2luZGV4XSkudHhpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIFsuLi50eGlkU2V0XTtcbiAgfVxuXG4gIGFkZE5vbldpdG5lc3NVdHhvcyh0eEJ1ZnM6IFJlY29yZDxzdHJpbmcsIEJ1ZmZlcj4pOiB0aGlzIHtcbiAgICBjb25zdCB0eElucHV0cyA9IHRoaXMudHhJbnB1dHM7IC8vIFRoZXNlIGFyZSBzb21ld2hhdCBjb3N0bHkgdG8gZXh0cmFjdFxuICAgIHRoaXMuZGF0YS5pbnB1dHMuZm9yRWFjaCgoaW5wdXQsIGluZGV4KSA9PiB7XG4gICAgICBpZiAoIWlucHV0LndpdG5lc3NVdHhvKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTXVzdCBoYXZlIHdpdG5lc3MgVVRYTyBmb3IgYWxsIGlucHV0cycpO1xuICAgICAgfVxuICAgICAgaWYgKCFpc1NlZ3dpdChpbnB1dC53aXRuZXNzVXR4by5zY3JpcHQsIGlucHV0LnJlZGVlbVNjcmlwdCkpIHtcbiAgICAgICAgY29uc3QgeyB0eGlkIH0gPSBnZXRPdXRwdXRJZEZvcklucHV0KHR4SW5wdXRzW2luZGV4XSk7XG4gICAgICAgIGlmICh0eEJ1ZnNbdHhpZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IGFsbCByZXF1aXJlZCBwcmV2aW91cyB0cmFuc2FjdGlvbnMgcHJvdmlkZWQnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZUlucHV0KGluZGV4LCB7IG5vbldpdG5lc3NVdHhvOiB0eEJ1ZnNbdHhpZF0gfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzdGF0aWMgZnJvbVRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uOiBVdHhvVHJhbnNhY3Rpb248YmlnaW50PiwgcHJldk91dHB1dHM6IFR4T3V0cHV0PGJpZ2ludD5bXSk6IFV0eG9Qc2J0IHtcbiAgICBpZiAocHJldk91dHB1dHMubGVuZ3RoICE9PSB0cmFuc2FjdGlvbi5pbnMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUcmFuc2FjdGlvbiBoYXMgJHt0cmFuc2FjdGlvbi5pbnMubGVuZ3RofSBpbnB1dHMsIGJ1dCAke3ByZXZPdXRwdXRzLmxlbmd0aH0gcHJldmlvdXMgb3V0cHV0cyBwcm92aWRlZGBcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGNsb25lZFRyYW5zYWN0aW9uID0gdHJhbnNhY3Rpb24uY2xvbmUoKTtcbiAgICBjb25zdCB1cGRhdGVzID0gdW5zaWduKGNsb25lZFRyYW5zYWN0aW9uLCBwcmV2T3V0cHV0cyk7XG5cbiAgICBjb25zdCBwc2J0QmFzZSA9IG5ldyBQc2J0QmFzZShuZXcgUHNidFRyYW5zYWN0aW9uKHsgdHg6IGNsb25lZFRyYW5zYWN0aW9uIH0pKTtcbiAgICBjbG9uZWRUcmFuc2FjdGlvbi5pbnMuZm9yRWFjaCgoKSA9PiBwc2J0QmFzZS5pbnB1dHMucHVzaCh7IHVua25vd25LZXlWYWxzOiBbXSB9KSk7XG4gICAgY2xvbmVkVHJhbnNhY3Rpb24ub3V0cy5mb3JFYWNoKCgpID0+IHBzYnRCYXNlLm91dHB1dHMucHVzaCh7IHVua25vd25LZXlWYWxzOiBbXSB9KSk7XG4gICAgY29uc3QgcHNidCA9IHRoaXMuY3JlYXRlUHNidCh7IG5ldHdvcms6IHRyYW5zYWN0aW9uLm5ldHdvcmsgfSwgcHNidEJhc2UpO1xuXG4gICAgdXBkYXRlcy5mb3JFYWNoKCh1cGRhdGUsIGluZGV4KSA9PiB7XG4gICAgICBwc2J0LnVwZGF0ZUlucHV0KGluZGV4LCB1cGRhdGUpO1xuICAgICAgcHNidC51cGRhdGVJbnB1dChpbmRleCwgeyB3aXRuZXNzVXR4bzogeyBzY3JpcHQ6IHByZXZPdXRwdXRzW2luZGV4XS5zY3JpcHQsIHZhbHVlOiBwcmV2T3V0cHV0c1tpbmRleF0udmFsdWUgfSB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwc2J0O1xuICB9XG5cbiAgZ2V0VW5zaWduZWRUeCgpOiBVdHhvVHJhbnNhY3Rpb248YmlnaW50PiB7XG4gICAgcmV0dXJuIHRoaXMudHguY2xvbmUoKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzdGF0aWMgbmV3VHJhbnNhY3Rpb24obmV0d29yazogTmV0d29yayk6IFV0eG9UcmFuc2FjdGlvbjxiaWdpbnQ+IHtcbiAgICByZXR1cm4gbmV3IFV0eG9UcmFuc2FjdGlvbjxiaWdpbnQ+KG5ldHdvcmspO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCB0eCgpOiBUeCB7XG4gICAgcmV0dXJuICh0aGlzLmRhdGEuZ2xvYmFsTWFwLnVuc2lnbmVkVHggYXMgUHNidFRyYW5zYWN0aW9uKS50eCBhcyBUeDtcbiAgfVxuXG4gIHByb3RlY3RlZCBjaGVja0ZvclNpZ25hdHVyZXMocHJvcE5hbWU/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmRhdGEuaW5wdXRzLmZvckVhY2goKGlucHV0KSA9PiB7XG4gICAgICBpZiAoaW5wdXQudGFwU2NyaXB0U2lnPy5sZW5ndGggfHwgaW5wdXQudGFwS2V5U2lnIHx8IGlucHV0LnBhcnRpYWxTaWc/Lmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBtb2RpZnkgJHtwcm9wTmFtZSA/PyAndHJhbnNhY3Rpb24nfSAtIHNpZ25hdHVyZXMgZXhpc3QuYCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTW9zdGx5IGNvcGllZCBmcm9tIGJpdGNvaW5qcy1saWIvdHNfc3JjL3BzYnQudHNcbiAgICovXG4gIGZpbmFsaXplQWxsSW5wdXRzKCk6IHRoaXMge1xuICAgIGNoZWNrRm9ySW5wdXQodGhpcy5kYXRhLmlucHV0cywgMCk7IC8vIG1ha2luZyBzdXJlIHdlIGhhdmUgYXQgbGVhc3Qgb25lXG4gICAgdGhpcy5kYXRhLmlucHV0cy5tYXAoKGlucHV0LCBpZHgpID0+IHtcbiAgICAgIHJldHVybiBpbnB1dC50YXBTY3JpcHRTaWc/Lmxlbmd0aCA/IHRoaXMuZmluYWxpemVUYXByb290SW5wdXQoaWR4KSA6IHRoaXMuZmluYWxpemVJbnB1dChpZHgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZmluYWxpemVUYXByb290SW5wdXQoaW5wdXRJbmRleDogbnVtYmVyKTogdGhpcyB7XG4gICAgY29uc3QgaW5wdXQgPSBjaGVja0ZvcklucHV0KHRoaXMuZGF0YS5pbnB1dHMsIGlucHV0SW5kZXgpO1xuICAgIC8vIHdpdG5lc3MgPSBjb250cm9sLWJsb2NrIHNjcmlwdCBmaXJzdC1zaWcgc2Vjb25kLXNpZ1xuICAgIGlmIChpbnB1dC50YXBMZWFmU2NyaXB0Py5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvbmUgbGVhZiBzY3JpcHQgc3VwcG9ydGVkIGZvciBmaW5hbGl6aW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IHsgY29udHJvbEJsb2NrLCBzY3JpcHQgfSA9IGlucHV0LnRhcExlYWZTY3JpcHRbMF07XG4gICAgY29uc3Qgd2l0bmVzczogQnVmZmVyW10gPSBbc2NyaXB0LCBjb250cm9sQmxvY2tdO1xuICAgIGNvbnN0IFtwdWJrZXkxLCBwdWJrZXkyXSA9IHBhcnNlUHViU2NyaXB0KHNjcmlwdCwgJ3AydHInKS5wdWJsaWNLZXlzO1xuICAgIGZvciAoY29uc3QgcGsgb2YgW3B1YmtleTEsIHB1YmtleTJdKSB7XG4gICAgICBjb25zdCBzaWcgPSBpbnB1dC50YXBTY3JpcHRTaWc/LmZpbmQoKHsgcHVia2V5IH0pID0+IHB1YmtleS5lcXVhbHMocGspKTtcbiAgICAgIGlmICghc2lnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgc2lnbmF0dXJlcyBpbiBTY3JpcHQgU2lnLicpO1xuICAgICAgfVxuICAgICAgd2l0bmVzcy51bnNoaWZ0KHNpZy5zaWduYXR1cmUpO1xuICAgIH1cblxuICAgIGNvbnN0IHdpdG5lc3NMZW5ndGggPSB3aXRuZXNzLnJlZHVjZSgocywgYikgPT4gcyArIGIubGVuZ3RoICsgdmFydWludC5lbmNvZGluZ0xlbmd0aChiLmxlbmd0aCksIDEpO1xuXG4gICAgY29uc3QgYnVmZmVyV3JpdGVyID0gQnVmZmVyV3JpdGVyLndpdGhDYXBhY2l0eSh3aXRuZXNzTGVuZ3RoKTtcbiAgICBidWZmZXJXcml0ZXIud3JpdGVWZWN0b3Iod2l0bmVzcyk7XG4gICAgY29uc3QgZmluYWxTY3JpcHRXaXRuZXNzID0gYnVmZmVyV3JpdGVyLmVuZCgpO1xuXG4gICAgdGhpcy5kYXRhLnVwZGF0ZUlucHV0KGlucHV0SW5kZXgsIHsgZmluYWxTY3JpcHRXaXRuZXNzIH0pO1xuICAgIHRoaXMuZGF0YS5jbGVhckZpbmFsaXplZElucHV0KGlucHV0SW5kZXgpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBmaW5hbGl6ZVRhcElucHV0V2l0aFNpbmdsZUxlYWZTY3JpcHRBbmRTaWduYXR1cmUoaW5wdXRJbmRleDogbnVtYmVyKTogdGhpcyB7XG4gICAgY29uc3QgaW5wdXQgPSBjaGVja0ZvcklucHV0KHRoaXMuZGF0YS5pbnB1dHMsIGlucHV0SW5kZXgpO1xuICAgIGlmIChpbnB1dC50YXBMZWFmU2NyaXB0Py5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvbmUgbGVhZiBzY3JpcHQgc3VwcG9ydGVkIGZvciBmaW5hbGl6aW5nJyk7XG4gICAgfVxuICAgIGlmIChpbnB1dC50YXBTY3JpcHRTaWc/Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBzaWduYXR1cmVzIGluIFNjcmlwdCBTaWcuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBjb250cm9sQmxvY2ssIHNjcmlwdCB9ID0gaW5wdXQudGFwTGVhZlNjcmlwdFswXTtcbiAgICBjb25zdCB3aXRuZXNzOiBCdWZmZXJbXSA9IFtpbnB1dC50YXBTY3JpcHRTaWdbMF0uc2lnbmF0dXJlLCBzY3JpcHQsIGNvbnRyb2xCbG9ja107XG4gICAgY29uc3Qgd2l0bmVzc0xlbmd0aCA9IHdpdG5lc3MucmVkdWNlKChzLCBiKSA9PiBzICsgYi5sZW5ndGggKyB2YXJ1aW50LmVuY29kaW5nTGVuZ3RoKGIubGVuZ3RoKSwgMSk7XG5cbiAgICBjb25zdCBidWZmZXJXcml0ZXIgPSBCdWZmZXJXcml0ZXIud2l0aENhcGFjaXR5KHdpdG5lc3NMZW5ndGgpO1xuICAgIGJ1ZmZlcldyaXRlci53cml0ZVZlY3Rvcih3aXRuZXNzKTtcbiAgICBjb25zdCBmaW5hbFNjcmlwdFdpdG5lc3MgPSBidWZmZXJXcml0ZXIuZW5kKCk7XG5cbiAgICB0aGlzLmRhdGEudXBkYXRlSW5wdXQoaW5wdXRJbmRleCwgeyBmaW5hbFNjcmlwdFdpdG5lc3MgfSk7XG4gICAgdGhpcy5kYXRhLmNsZWFyRmluYWxpemVkSW5wdXQoaW5wdXRJbmRleCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3N0bHkgY29waWVkIGZyb20gYml0Y29pbmpzLWxpYi90c19zcmMvcHNidC50c1xuICAgKlxuICAgKiBVbmxpa2UgdGhlIGZ1bmN0aW9uIGl0IG92ZXJyaWRlcywgdGhpcyBkb2VzIG5vdCB0YWtlIGEgdmFsaWRhdG9yLiBJbiBCaXRHb1xuICAgKiBjb250ZXh0LCB3ZSBrbm93IGhvdyB3ZSB3YW50IHRvIHZhbGlkYXRlIHNvIHdlIGp1c3QgaGFyZCBjb2RlIHRoZSByaWdodFxuICAgKiB2YWxpZGF0b3IuXG4gICAqL1xuICB2YWxpZGF0ZVNpZ25hdHVyZXNPZkFsbElucHV0cygpOiBib29sZWFuIHtcbiAgICBjaGVja0ZvcklucHV0KHRoaXMuZGF0YS5pbnB1dHMsIDApOyAvLyBtYWtpbmcgc3VyZSB3ZSBoYXZlIGF0IGxlYXN0IG9uZVxuICAgIGNvbnN0IHJlc3VsdHMgPSB0aGlzLmRhdGEuaW5wdXRzLm1hcCgoaW5wdXQsIGlkeCkgPT4ge1xuICAgICAgcmV0dXJuIGlucHV0LnRhcFNjcmlwdFNpZz8ubGVuZ3RoXG4gICAgICAgID8gdGhpcy52YWxpZGF0ZVRhcHJvb3RTaWduYXR1cmVzT2ZJbnB1dChpZHgpXG4gICAgICAgIDogdGhpcy52YWxpZGF0ZVNpZ25hdHVyZXNPZklucHV0KGlkeCwgKHAsIG0sIHMpID0+IGVjY0xpYi52ZXJpZnkobSwgcCwgcykpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzLnJlZHVjZSgoZmluYWwsIHJlcykgPT4gcmVzICYmIGZpbmFsLCB0cnVlKTtcbiAgfVxuXG4gIHZhbGlkYXRlVGFwcm9vdFNpZ25hdHVyZXNPZklucHV0KGlucHV0SW5kZXg6IG51bWJlciwgcHVia2V5PzogQnVmZmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmRhdGEuaW5wdXRzW2lucHV0SW5kZXhdO1xuICAgIGNvbnN0IHRhcFNpZ3MgPSAoaW5wdXQgfHwge30pLnRhcFNjcmlwdFNpZztcbiAgICBpZiAoIWlucHV0IHx8ICF0YXBTaWdzIHx8IHRhcFNpZ3MubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBzaWduYXR1cmVzIHRvIHZhbGlkYXRlJyk7XG4gICAgfVxuICAgIGxldCBteVNpZ3M7XG4gICAgaWYgKHB1YmtleSkge1xuICAgICAgY29uc3QgeE9ubHlQdWJrZXkgPSB0b1hPbmx5UHVibGljS2V5KHB1YmtleSk7XG4gICAgICBteVNpZ3MgPSB0YXBTaWdzLmZpbHRlcigoc2lnKSA9PiBzaWcucHVia2V5LmVxdWFscyh4T25seVB1YmtleSkpO1xuICAgICAgaWYgKG15U2lncy5sZW5ndGggPCAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gc2lnbmF0dXJlcyBmb3IgdGhpcyBwdWJrZXknKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbXlTaWdzID0gdGFwU2lncztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0czogYm9vbGVhbltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHBTaWcgb2YgbXlTaWdzKSB7XG4gICAgICBjb25zdCB7IHNpZ25hdHVyZSwgbGVhZkhhc2gsIHB1YmtleSB9ID0gcFNpZztcbiAgICAgIGxldCBzaWdIYXNoVHlwZTogbnVtYmVyO1xuICAgICAgbGV0IHNpZzogQnVmZmVyO1xuICAgICAgaWYgKHNpZ25hdHVyZS5sZW5ndGggPT09IDY1KSB7XG4gICAgICAgIHNpZ0hhc2hUeXBlID0gc2lnbmF0dXJlWzY0XTtcbiAgICAgICAgc2lnID0gc2lnbmF0dXJlLnNsaWNlKDAsIDY0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpZ0hhc2hUeXBlID0gVHJhbnNhY3Rpb24uU0lHSEFTSF9ERUZBVUxUO1xuICAgICAgICBzaWcgPSBzaWduYXR1cmU7XG4gICAgICB9XG4gICAgICBjb25zdCB7IGhhc2ggfSA9IHRoaXMuZ2V0VGFwcm9vdEhhc2hGb3JTaWcoaW5wdXRJbmRleCwgW3NpZ0hhc2hUeXBlXSwgbGVhZkhhc2gpO1xuICAgICAgcmVzdWx0cy5wdXNoKGVjY0xpYi52ZXJpZnlTY2hub3JyKGhhc2gsIHB1YmtleSwgc2lnKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzLmV2ZXJ5KChyZXMpID0+IHJlcyA9PT0gdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBhcnJheSBvZiBib29sZWFuIHZhbHVlcy4gVHJ1ZSB3aGVuIGNvcnJlc3BvbmRpbmcgaW5kZXggaW4gYHB1YmxpY0tleXNgIGhhcyBzaWduZWQgdGhlIHRyYW5zYWN0aW9uLlxuICAgKiBJZiBubyBzaWduYXR1cmUgaW4gdGhlIHR4IG9yIG5vIHB1YmxpYyBrZXkgbWF0Y2hpbmcgc2lnbmF0dXJlLCB0aGUgdmFsaWRhdGlvbiBpcyBjb25zaWRlcmVkIGFzIGZhbHNlLlxuICAgKi9cbiAgZ2V0U2lnbmF0dXJlVmFsaWRhdGlvbkFycmF5KGlucHV0SW5kZXg6IG51bWJlcik6IGJvb2xlYW5bXSB7XG4gICAgY29uc3Qgbm9TaWdFcnJvck1lc3NhZ2VzID0gWydObyBzaWduYXR1cmVzIHRvIHZhbGlkYXRlJywgJ05vIHNpZ25hdHVyZXMgZm9yIHRoaXMgcHVia2V5J107XG4gICAgY29uc3QgaW5wdXQgPSBjaGVja0ZvcklucHV0KHRoaXMuZGF0YS5pbnB1dHMsIGlucHV0SW5kZXgpO1xuICAgIGNvbnN0IGlzUDJ0ciA9IGlucHV0LnRhcFNjcmlwdFNpZz8ubGVuZ3RoO1xuICAgIGlmICghdGhpcy5kYXRhLmdsb2JhbE1hcC5nbG9iYWxYcHViKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBnZXQgc2lnbmF0dXJlIHZhbGlkYXRpb24gYXJyYXkgd2l0aG91dCBnbG9iYWwgeHB1YnMnKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZGF0YS5nbG9iYWxNYXAuZ2xvYmFsWHB1Yi5sZW5ndGggIT09IDMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgbXVzdCBiZSAzIGdsb2JhbCB4cHVicyBhbmQgdGhlcmUgYXJlICR7dGhpcy5kYXRhLmdsb2JhbE1hcC5nbG9iYWxYcHViLmxlbmd0aH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5nbG9iYWxNYXAuZ2xvYmFsWHB1Yi5tYXAoKHhwdWIpID0+IHtcbiAgICAgIC8vIGNvbnN0IGJpcDMyID0gRUNQYWlyLmZyb21QdWJsaWNLZXkoeHB1Yi5leHRlbmRlZFB1YmtleSwgeyBuZXR3b3JrOiAodGhpcyBhcyBhbnkpLm9wdHMubmV0d29yayB9KTtcbiAgICAgIGNvbnN0IGJpcDMyID0gQklQMzJGYWN0b3J5KGVjY0xpYikuZnJvbUJhc2U1OChiczU4Y2hlY2suZW5jb2RlKHhwdWIuZXh0ZW5kZWRQdWJrZXkpKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBpc1AydHJcbiAgICAgICAgICA/IHRoaXMudmFsaWRhdGVUYXByb290U2lnbmF0dXJlc09mSW5wdXQoaW5wdXRJbmRleCwgYmlwMzIucHVibGljS2V5KVxuICAgICAgICAgIDogdGhpcy52YWxpZGF0ZVNpZ25hdHVyZXNPZklucHV0KGlucHV0SW5kZXgsIChwLCBtLCBzKSA9PiBlY2NMaWIudmVyaWZ5KG0sIHAsIHMpLCBiaXAzMi5wdWJsaWNLZXkpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIE5vdCBhbiBlbGVnYW50IHNvbHV0aW9uLiBNaWdodCBuZWVkIHVwc3RyZWFtIGNoYW5nZXMgbGlrZSBjdXN0b20gZXJyb3IgdHlwZXMuXG4gICAgICAgIGlmIChub1NpZ0Vycm9yTWVzc2FnZXMuaW5jbHVkZXMoZXJyLm1lc3NhZ2UpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3N0bHkgY29waWVkIGZyb20gYml0Y29pbmpzLWxpYi90c19zcmMvcHNidC50c1xuICAgKi9cbiAgc2lnbkFsbElucHV0c0hEKFxuICAgIGhkS2V5UGFpcjogSERUYXByb290U2lnbmVyLFxuICAgIHNpZ2hhc2hUeXBlczogbnVtYmVyW10gPSBbVHJhbnNhY3Rpb24uU0lHSEFTSF9ERUZBVUxULCBUcmFuc2FjdGlvbi5TSUdIQVNIX0FMTF1cbiAgKTogdGhpcyB7XG4gICAgaWYgKCFoZEtleVBhaXIgfHwgIWhkS2V5UGFpci5wdWJsaWNLZXkgfHwgIWhkS2V5UGFpci5maW5nZXJwcmludCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdOZWVkIEhEU2lnbmVyIHRvIHNpZ24gaW5wdXQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHRzOiBib29sZWFuW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5pbnB1dHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuaW5wdXRzW2ldLnRhcEJpcDMyRGVyaXZhdGlvbj8ubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5zaWduVGFwcm9vdElucHV0SEQoaSwgaGRLZXlQYWlyLCBzaWdoYXNoVHlwZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc2lnbklucHV0SEQoaSwgaGRLZXlQYWlyLCBzaWdoYXNoVHlwZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHMucHVzaCh0cnVlKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXN1bHRzLnB1c2goZmFsc2UpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVzdWx0cy5ldmVyeSgodikgPT4gdiA9PT0gZmFsc2UpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGlucHV0cyB3ZXJlIHNpZ25lZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3N0bHkgY29waWVkIGZyb20gYml0Y29pbmpzLWxpYi90c19zcmMvcHNidC50czpzaWduSW5wdXRIRFxuICAgKi9cbiAgc2lnblRhcHJvb3RJbnB1dEhEKFxuICAgIGlucHV0SW5kZXg6IG51bWJlcixcbiAgICBoZEtleVBhaXI6IEhEVGFwcm9vdFNpZ25lcixcbiAgICBzaWdoYXNoVHlwZXM6IG51bWJlcltdID0gW1RyYW5zYWN0aW9uLlNJR0hBU0hfREVGQVVMVCwgVHJhbnNhY3Rpb24uU0lHSEFTSF9BTExdXG4gICk6IHRoaXMge1xuICAgIGlmICghaGRLZXlQYWlyIHx8ICFoZEtleVBhaXIucHVibGljS2V5IHx8ICFoZEtleVBhaXIuZmluZ2VycHJpbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTmVlZCBIRFNpZ25lciB0byBzaWduIGlucHV0Jyk7XG4gICAgfVxuICAgIGNvbnN0IGlucHV0ID0gY2hlY2tGb3JJbnB1dCh0aGlzLmRhdGEuaW5wdXRzLCBpbnB1dEluZGV4KTtcbiAgICBpZiAoIWlucHV0LnRhcEJpcDMyRGVyaXZhdGlvbiB8fCBpbnB1dC50YXBCaXAzMkRlcml2YXRpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05lZWQgdGFwQmlwMzJEZXJpdmF0aW9uIHRvIHNpZ24gVGFwcm9vdCB3aXRoIEhEJyk7XG4gICAgfVxuICAgIGNvbnN0IG15RGVyaXZhdGlvbnMgPSBpbnB1dC50YXBCaXAzMkRlcml2YXRpb25cbiAgICAgIC5tYXAoKGJpcER2KSA9PiB7XG4gICAgICAgIGlmIChiaXBEdi5tYXN0ZXJGaW5nZXJwcmludC5lcXVhbHMoaGRLZXlQYWlyLmZpbmdlcnByaW50KSkge1xuICAgICAgICAgIHJldHVybiBiaXBEdjtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoKHYpID0+ICEhdikgYXMgVGFwQmlwMzJEZXJpdmF0aW9uW107XG4gICAgaWYgKG15RGVyaXZhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05lZWQgb25lIHRhcEJpcDMyRGVyaXZhdGlvbiBtYXN0ZXJGaW5nZXJwcmludCB0byBtYXRjaCB0aGUgSERTaWduZXIgZmluZ2VycHJpbnQnKTtcbiAgICB9XG4gICAgY29uc3Qgc2lnbmVyczogVGFwcm9vdFNpZ25lcltdID0gbXlEZXJpdmF0aW9ucy5tYXAoKGJpcER2KSA9PiB7XG4gICAgICBjb25zdCBub2RlID0gaGRLZXlQYWlyLmRlcml2ZVBhdGgoYmlwRHYucGF0aCk7XG4gICAgICBpZiAoIWJpcER2LnB1YmtleS5lcXVhbHMobm9kZS5wdWJsaWNLZXkuc2xpY2UoMSkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncHVia2V5IGRpZCBub3QgbWF0Y2ggdGFwQmlwMzJEZXJpdmF0aW9uJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4geyBzaWduZXI6IG5vZGUsIGxlYWZIYXNoZXM6IGJpcER2LmxlYWZIYXNoZXMgfTtcbiAgICB9KTtcbiAgICBzaWduZXJzLmZvckVhY2goKHsgc2lnbmVyLCBsZWFmSGFzaGVzIH0pID0+IHRoaXMuc2lnblRhcHJvb3RJbnB1dChpbnB1dEluZGV4LCBzaWduZXIsIGxlYWZIYXNoZXMsIHNpZ2hhc2hUeXBlcykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2lnblRhcHJvb3RJbnB1dChcbiAgICBpbnB1dEluZGV4OiBudW1iZXIsXG4gICAgc2lnbmVyOiBTY2hub3JyU2lnbmVyLFxuICAgIGxlYWZIYXNoZXM6IEJ1ZmZlcltdLFxuICAgIHNpZ2hhc2hUeXBlczogbnVtYmVyW10gPSBbVHJhbnNhY3Rpb24uU0lHSEFTSF9ERUZBVUxULCBUcmFuc2FjdGlvbi5TSUdIQVNIX0FMTF1cbiAgKTogdGhpcyB7XG4gICAgY29uc3QgcHVia2V5ID0gdG9YT25seVB1YmxpY0tleShzaWduZXIucHVibGljS2V5KTtcbiAgICBjb25zdCBpbnB1dCA9IGNoZWNrRm9ySW5wdXQodGhpcy5kYXRhLmlucHV0cywgaW5wdXRJbmRleCk7XG4gICAgLy8gRmlndXJlIG91dCBpZiB0aGlzIGlzIHNjcmlwdCBwYXRoIG9yIG5vdCwgaWYgbm90LCB0d2VhayB0aGUgcHJpdmF0ZSBrZXlcbiAgICBpZiAoIWlucHV0LnRhcExlYWZTY3JpcHQ/Lmxlbmd0aCkge1xuICAgICAgLy8gU2VlIEJpdEdvL0JpdEdvSlMvbW9kdWxlcy91dHhvX2xpYi9zcmMvdHJhbnNhY3Rpb25fYnVpbGRlci50czp0cnlTaWduIGZvciBob3cgdG8gc3VwcG9ydCBpdC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignVGFwcm9vdCBrZXkgcGF0aCBzaWduaW5nIGlzIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgfVxuICAgIGlmIChpbnB1dC50YXBMZWFmU2NyaXB0Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9uZSBsZWFmIHNjcmlwdCBzdXBwb3J0ZWQgZm9yIHNpZ25pbmcnKTtcbiAgICB9XG4gICAgY29uc3QgdGFwTGVhZlNjcmlwdCA9IGlucHV0LnRhcExlYWZTY3JpcHRbMF07XG4gICAgY29uc3QgcGFyc2VkQ29udHJvbEJsb2NrID0gdGFwcm9vdC5wYXJzZUNvbnRyb2xCbG9jayhlY2NMaWIsIHRhcExlYWZTY3JpcHQuY29udHJvbEJsb2NrKTtcbiAgICBjb25zdCB7IGxlYWZWZXJzaW9uIH0gPSBwYXJzZWRDb250cm9sQmxvY2s7XG4gICAgaWYgKGxlYWZWZXJzaW9uICE9PSB0YXBMZWFmU2NyaXB0LmxlYWZWZXJzaW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RhcCBzY3JpcHQgbGVhZiB2ZXJzaW9uIG1pc21hdGNoIHdpdGggY29udHJvbCBibG9jaycpO1xuICAgIH1cbiAgICBjb25zdCBsZWFmSGFzaCA9IHRhcHJvb3QuZ2V0VGFwbGVhZkhhc2goZWNjTGliLCBwYXJzZWRDb250cm9sQmxvY2ssIHRhcExlYWZTY3JpcHQuc2NyaXB0KTtcbiAgICBpZiAoIWxlYWZIYXNoZXMuZmluZCgobCkgPT4gbC5lcXVhbHMobGVhZkhhc2gpKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTaWduZXIgY2Fubm90IHNpZ24gZm9yIGxlYWYgaGFzaCAke2xlYWZIYXNoLnRvU3RyaW5nKCdoZXgnKX1gKTtcbiAgICB9XG4gICAgY29uc3QgeyBoYXNoLCBzaWdoYXNoVHlwZSB9ID0gdGhpcy5nZXRUYXByb290SGFzaEZvclNpZyhpbnB1dEluZGV4LCBzaWdoYXNoVHlwZXMsIGxlYWZIYXNoKTtcbiAgICBsZXQgc2lnbmF0dXJlID0gc2lnbmVyLnNpZ25TY2hub3JyKGhhc2gpO1xuICAgIGlmIChzaWdoYXNoVHlwZSAhPT0gVHJhbnNhY3Rpb24uU0lHSEFTSF9ERUZBVUxUKSB7XG4gICAgICBzaWduYXR1cmUgPSBCdWZmZXIuY29uY2F0KFtzaWduYXR1cmUsIEJ1ZmZlci5vZihzaWdoYXNoVHlwZSldKTtcbiAgICB9XG4gICAgdGhpcy5kYXRhLnVwZGF0ZUlucHV0KGlucHV0SW5kZXgsIHtcbiAgICAgIHRhcFNjcmlwdFNpZzogW1xuICAgICAgICB7XG4gICAgICAgICAgcHVia2V5LFxuICAgICAgICAgIHNpZ25hdHVyZSxcbiAgICAgICAgICBsZWFmSGFzaCxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwcml2YXRlIGdldFRhcHJvb3RIYXNoRm9yU2lnKFxuICAgIGlucHV0SW5kZXg6IG51bWJlcixcbiAgICBzaWdoYXNoVHlwZXM/OiBudW1iZXJbXSxcbiAgICBsZWFmSGFzaD86IEJ1ZmZlclxuICApOiB7XG4gICAgaGFzaDogQnVmZmVyO1xuICAgIHNpZ2hhc2hUeXBlOiBudW1iZXI7XG4gIH0ge1xuICAgIGNvbnN0IHNpZ2hhc2hUeXBlID0gdGhpcy5kYXRhLmlucHV0c1tpbnB1dEluZGV4XS5zaWdoYXNoVHlwZSB8fCBUcmFuc2FjdGlvbi5TSUdIQVNIX0RFRkFVTFQ7XG4gICAgaWYgKHNpZ2hhc2hUeXBlcyAmJiBzaWdoYXNoVHlwZXMuaW5kZXhPZihzaWdoYXNoVHlwZSkgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBTaWdoYXNoIHR5cGUgaXMgbm90IGFsbG93ZWQuIFJldHJ5IHRoZSBzaWduIG1ldGhvZCBwYXNzaW5nIHRoZSBgICtcbiAgICAgICAgICBgc2lnaGFzaFR5cGVzIGFycmF5IG9mIHdoaXRlbGlzdGVkIHR5cGVzLiBTaWdoYXNoIHR5cGU6ICR7c2lnaGFzaFR5cGV9YFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgdHhJbnB1dHMgPSB0aGlzLnR4SW5wdXRzOyAvLyBUaGVzZSBhcmUgc29tZXdoYXQgY29zdGx5IHRvIGV4dHJhY3RcbiAgICBjb25zdCBwcmV2b3V0U2NyaXB0czogQnVmZmVyW10gPSBbXTtcbiAgICBjb25zdCBwcmV2b3V0VmFsdWVzOiBiaWdpbnRbXSA9IFtdO1xuXG4gICAgdGhpcy5kYXRhLmlucHV0cy5mb3JFYWNoKChpbnB1dCwgaSkgPT4ge1xuICAgICAgbGV0IHByZXZvdXQ7XG4gICAgICBpZiAoaW5wdXQubm9uV2l0bmVzc1V0eG8pIHtcbiAgICAgICAgLy8gVE9ETzogVGhpcyBjb3VsZCBiZSBjb3N0bHksIGVpdGhlciBjYWNoZSBpdCBoZXJlLCBvciBmaW5kIGEgd2F5IHRvIHNoYXJlIHdpdGggc3VwZXJcbiAgICAgICAgY29uc3Qgbm9uV2l0bmVzc1V0eG9UeCA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVdHhvUHNidCkudHJhbnNhY3Rpb25Gcm9tQnVmZmVyKFxuICAgICAgICAgIGlucHV0Lm5vbldpdG5lc3NVdHhvLFxuICAgICAgICAgIHRoaXMudHgubmV0d29ya1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IHByZXZvdXRIYXNoID0gdHhJbnB1dHNbaV0uaGFzaDtcbiAgICAgICAgY29uc3QgdXR4b0hhc2ggPSBub25XaXRuZXNzVXR4b1R4LmdldEhhc2goKTtcblxuICAgICAgICAvLyBJZiBhIG5vbi13aXRuZXNzIFVUWE8gaXMgcHJvdmlkZWQsIGl0cyBoYXNoIG11c3QgbWF0Y2ggdGhlIGhhc2ggc3BlY2lmaWVkIGluIHRoZSBwcmV2b3V0XG4gICAgICAgIGlmICghcHJldm91dEhhc2guZXF1YWxzKHV0eG9IYXNoKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXdpdG5lc3MgVVRYTyBoYXNoIGZvciBpbnB1dCAjJHtpfSBkb2Vzbid0IG1hdGNoIHRoZSBoYXNoIHNwZWNpZmllZCBpbiB0aGUgcHJldm91dGApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldm91dEluZGV4ID0gdHhJbnB1dHNbaV0uaW5kZXg7XG4gICAgICAgIHByZXZvdXQgPSBub25XaXRuZXNzVXR4b1R4Lm91dHNbcHJldm91dEluZGV4XTtcbiAgICAgIH0gZWxzZSBpZiAoaW5wdXQud2l0bmVzc1V0eG8pIHtcbiAgICAgICAgcHJldm91dCA9IGlucHV0LndpdG5lc3NVdHhvO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOZWVkIGEgVXR4byBpbnB1dCBpdGVtIGZvciBzaWduaW5nJyk7XG4gICAgICB9XG4gICAgICBwcmV2b3V0U2NyaXB0cy5wdXNoKHByZXZvdXQuc2NyaXB0KTtcbiAgICAgIHByZXZvdXRWYWx1ZXMucHVzaChwcmV2b3V0LnZhbHVlKTtcbiAgICB9KTtcbiAgICBjb25zdCBoYXNoID0gdGhpcy50eC5oYXNoRm9yV2l0bmVzc1YxKGlucHV0SW5kZXgsIHByZXZvdXRTY3JpcHRzLCBwcmV2b3V0VmFsdWVzLCBzaWdoYXNoVHlwZSwgbGVhZkhhc2gpO1xuICAgIHJldHVybiB7IGhhc2gsIHNpZ2hhc2hUeXBlIH07XG4gIH1cblxuICAvKipcbiAgICogQHJldHVucyB0cnVlIGlmZiB0aGUgaW5wdXQgaXMgdGFwcm9vdC5cbiAgICovXG4gIGlzVGFwcm9vdElucHV0KGlucHV0SW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlucHV0ID0gY2hlY2tGb3JJbnB1dCh0aGlzLmRhdGEuaW5wdXRzLCBpbnB1dEluZGV4KTtcbiAgICBmdW5jdGlvbiBpc1AydHIob3V0cHV0OiBCdWZmZXIpOiBib29sZWFuIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHAydHJQYXltZW50cy5wMnRyKHsgb3V0cHV0IH0sIHsgZWNjTGliIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAhIShcbiAgICAgIGlucHV0LnRhcEludGVybmFsS2V5IHx8XG4gICAgICBpbnB1dC50YXBNZXJrbGVSb290IHx8XG4gICAgICAoaW5wdXQudGFwTGVhZlNjcmlwdCAmJiBpbnB1dC50YXBMZWFmU2NyaXB0Lmxlbmd0aCkgfHxcbiAgICAgIChpbnB1dC50YXBCaXAzMkRlcml2YXRpb24gJiYgaW5wdXQudGFwQmlwMzJEZXJpdmF0aW9uLmxlbmd0aCkgfHxcbiAgICAgIChpbnB1dC53aXRuZXNzVXR4byAmJiBpc1AydHIoaW5wdXQud2l0bmVzc1V0eG8uc2NyaXB0KSlcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIGhhc2ggYW5kIGhhc2hUeXBlIGZvciB0YXByb290IGlucHV0IGF0IGlucHV0SW5kZXhcbiAgICogQHRocm93cyBlcnJvciBpZiBpbnB1dCBhdCBpbnB1dEluZGV4IGlzIG5vdCBhIHRhcHJvb3QgaW5wdXRcbiAgICovXG4gIGdldFRhcHJvb3RIYXNoRm9yU2lnQ2hlY2tlZChcbiAgICBpbnB1dEluZGV4OiBudW1iZXIsXG4gICAgc2lnaGFzaFR5cGVzOiBudW1iZXJbXSA9IFtUcmFuc2FjdGlvbi5TSUdIQVNIX0RFRkFVTFQsIFRyYW5zYWN0aW9uLlNJR0hBU0hfQUxMXSxcbiAgICBsZWFmSGFzaD86IEJ1ZmZlclxuICApOiB7XG4gICAgaGFzaDogQnVmZmVyO1xuICAgIHNpZ2hhc2hUeXBlOiBudW1iZXI7XG4gIH0ge1xuICAgIGlmICghdGhpcy5pc1RhcHJvb3RJbnB1dChpbnB1dEluZGV4KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2lucHV0SW5kZXh9IGlucHV0IGlzIG5vdCBhIHRhcHJvb3QgdHlwZSB0byB0YWtlIHRhcHJvb3QgdHggaGFzaGApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRUYXByb290SGFzaEZvclNpZyhpbnB1dEluZGV4LCBzaWdoYXNoVHlwZXMsIGxlYWZIYXNoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHByb3ByaWV0YXJ5IGtleSB2YWx1ZSBwYWlyIHRvIFBTQlQgaW5wdXQuXG4gICAqIERlZmF1bHQgaWRlbnRpZmllckVuY29kaW5nIGlzIHV0Zi04IGZvciBpZGVudGlmaWVyLlxuICAgKi9cbiAgYWRkUHJvcHJpZXRhcnlLZXlWYWxUb0lucHV0KGlucHV0SW5kZXg6IG51bWJlciwga2V5VmFsdWVEYXRhOiBQcm9wcmlldGFyeUtleVZhbHVlRGF0YSk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLmFkZFVua25vd25LZXlWYWxUb0lucHV0KGlucHV0SW5kZXgsIHtcbiAgICAgIGtleTogZW5jb2RlUHJvcHJpZXRhcnlLZXkoa2V5VmFsdWVEYXRhLmtleSksXG4gICAgICB2YWx1ZToga2V5VmFsdWVEYXRhLnZhbHVlLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvIHNlYXJjaCBhbnkgZGF0YSBmcm9tIHByb3ByaWV0YXJ5IGtleSB2YWx1ZSBhZ2FpbnRzIGtleWRhdGEuXG4gICAqIERlZmF1bHQgaWRlbnRpZmllckVuY29kaW5nIGlzIHV0Zi04IGZvciBpZGVudGlmaWVyLlxuICAgKi9cbiAgZ2V0UHJvcHJpZXRhcnlLZXlWYWxzKGlucHV0SW5kZXg6IG51bWJlciwga2V5U2VhcmNoPzogUHJvcHJpZXRhcnlLZXlTZWFyY2gpOiBQcm9wcmlldGFyeUtleVZhbHVlRGF0YVtdIHtcbiAgICBjb25zdCBpbnB1dCA9IGNoZWNrRm9ySW5wdXQodGhpcy5kYXRhLmlucHV0cywgaW5wdXRJbmRleCk7XG4gICAgaWYgKCFpbnB1dC51bmtub3duS2V5VmFscyB8fCBpbnB1dC51bmtub3duS2V5VmFscy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3Qga2V5VmFscyA9IGlucHV0LnVua25vd25LZXlWYWxzLm1hcCgoeyBrZXksIHZhbHVlIH0sIGkpID0+IHtcbiAgICAgIHJldHVybiB7IGtleTogZGVjb2RlUHJvcHJpZXRhcnlLZXkoa2V5KSwgdmFsdWUgfTtcbiAgICB9KTtcbiAgICByZXR1cm4ga2V5VmFscy5maWx0ZXIoKGtleVZhbCkgPT4ge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAga2V5U2VhcmNoID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgKGtleVNlYXJjaC5pZGVudGlmaWVyID09PSBrZXlWYWwua2V5LmlkZW50aWZpZXIgJiZcbiAgICAgICAgICBrZXlTZWFyY2guc3VidHlwZSA9PT0ga2V5VmFsLmtleS5zdWJ0eXBlICYmXG4gICAgICAgICAgKCFCdWZmZXIuaXNCdWZmZXIoa2V5U2VhcmNoLmtleWRhdGEpIHx8IGtleVNlYXJjaC5rZXlkYXRhLmVxdWFscyhrZXlWYWwua2V5LmtleWRhdGEpKSlcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICBjbG9uZSgpOiB0aGlzIHtcbiAgICByZXR1cm4gc3VwZXIuY2xvbmUoKSBhcyB0aGlzO1xuICB9XG59XG4iXX0=