"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2tr_ns = void 0;
const networks_1 = require("../networks");
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const OPS = bitcoinjs_lib_1.script.OPS;
const typef = require('typeforce');
const BITCOIN_NETWORK = networks_1.networks.bitcoin;
function stacksEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return a.every((x, i) => {
        return x.equals(b[i]);
    });
}
// input: [signatures ...]
// output: [pubKeys[0:n-1] OP_CHECKSIGVERIFY] pubKeys[n-1] OP_CHECKSIG
function p2tr_ns(a, opts) {
    if (!a.input && !a.output && !(a.pubkeys && a.pubkeys.length) && !a.signatures) {
        throw new TypeError('Not enough data');
    }
    opts = Object.assign({ validate: true }, opts || {});
    if (!opts.eccLib)
        throw new Error('ECC Library is required for p2tr_ns.');
    const ecc = opts.eccLib;
    function isAcceptableSignature(x) {
        if (Buffer.isBuffer(x)) {
            return (
            // empty signatures may be represented as empty buffers
            (opts && opts.allowIncomplete && x.length === 0) || bitcoinjs_lib_1.script.isCanonicalSchnorrSignature(x));
        }
        return !!(opts && opts.allowIncomplete && x === OPS.OP_0);
    }
    typef({
        network: typef.maybe(typef.Object),
        output: typef.maybe(typef.Buffer),
        pubkeys: typef.maybe(typef.arrayOf(ecc.isXOnlyPoint)),
        signatures: typef.maybe(typef.arrayOf(isAcceptableSignature)),
        input: typef.maybe(typef.Buffer),
    }, a);
    const network = a.network || BITCOIN_NETWORK;
    const o = { network };
    const _chunks = bitcoinjs_lib_1.lazy.value(() => {
        if (!a.output)
            return;
        return bitcoinjs_lib_1.script.decompile(a.output);
    });
    bitcoinjs_lib_1.lazy.prop(o, 'output', () => {
        if (!a.pubkeys)
            return;
        return bitcoinjs_lib_1.script.compile([].concat(...a.pubkeys.map((pk, i, pks) => [pk, i === pks.length - 1 ? OPS.OP_CHECKSIG : OPS.OP_CHECKSIGVERIFY])));
    });
    bitcoinjs_lib_1.lazy.prop(o, 'n', () => {
        if (!o.pubkeys)
            return;
        return o.pubkeys.length;
    });
    bitcoinjs_lib_1.lazy.prop(o, 'pubkeys', () => {
        const chunks = _chunks();
        if (!chunks)
            return;
        return chunks.filter((_, index) => index % 2 === 0);
    });
    bitcoinjs_lib_1.lazy.prop(o, 'signatures', () => {
        var _a;
        if (!a.input)
            return;
        return (_a = bitcoinjs_lib_1.script.decompile(a.input)) === null || _a === void 0 ? void 0 : _a.reverse();
    });
    bitcoinjs_lib_1.lazy.prop(o, 'input', () => {
        if (!a.signatures)
            return;
        return bitcoinjs_lib_1.script.compile([...a.signatures].reverse());
    });
    bitcoinjs_lib_1.lazy.prop(o, 'witness', () => {
        if (!o.input)
            return;
        return [];
    });
    bitcoinjs_lib_1.lazy.prop(o, 'name', () => {
        if (!o.n)
            return;
        return `p2tr_ns(${o.n})`;
    });
    // extended validation
    if (opts.validate) {
        const chunks = _chunks();
        if (chunks) {
            if (chunks[chunks.length - 1] !== OPS.OP_CHECKSIG) {
                throw new TypeError('Output ends with unexpected opcode');
            }
            if (chunks
                .filter((_, index) => index % 2 === 1)
                .slice(0, -1)
                .some((op) => op !== OPS.OP_CHECKSIGVERIFY)) {
                throw new TypeError('Output contains unexpected opcode');
            }
            if (o.n > 16 || o.n !== chunks.length / 2) {
                throw new TypeError('Output contains too many pubkeys');
            }
            if (o.pubkeys.some((x) => !ecc.isXOnlyPoint(x))) {
                throw new TypeError('Output contains invalid pubkey(s)');
            }
            if (a.pubkeys && !stacksEqual(a.pubkeys, o.pubkeys)) {
                throw new TypeError('Pubkeys mismatch');
            }
        }
        if (a.pubkeys && a.pubkeys.length) {
            o.n = a.pubkeys.length;
        }
        if (a.signatures && o.n) {
            if (a.signatures.length < o.n) {
                throw new TypeError('Not enough signatures provided');
            }
            if (a.signatures.length > o.n) {
                throw new TypeError('Too many signatures provided');
            }
        }
        if (a.input) {
            if (!o.signatures.every(isAcceptableSignature)) {
                throw new TypeError('Input has invalid signature(s)');
            }
            if (a.signatures && !stacksEqual(a.signatures, o.signatures)) {
                throw new TypeError('Signature mismatch');
            }
            if (o.n !== o.signatures.length) {
                throw new TypeError(`Signature count mismatch (n: ${o.n}, signatures.length: ${o.signatures.length}`);
            }
        }
    }
    return Object.assign(o, a);
}
exports.p2tr_ns = p2tr_ns;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicDJ0cl9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wYXltZW50cy9wMnRyX25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBDQUF1QztBQUN2QyxpREFBcUY7QUFFckYsTUFBTSxHQUFHLEdBQUcsc0JBQU8sQ0FBQyxHQUFHLENBQUM7QUFDeEIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRW5DLE1BQU0sZUFBZSxHQUFHLG1CQUFRLENBQUMsT0FBTyxDQUFDO0FBRXpDLFNBQVMsV0FBVyxDQUFDLENBQVcsRUFBRSxDQUFXO0lBQzNDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRXhDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN0QixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsMEJBQTBCO0FBQzFCLHNFQUFzRTtBQUN0RSxTQUFnQixPQUFPLENBQUMsQ0FBVSxFQUFFLElBQWtCO0lBQ3BELElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRTtRQUM5RSxNQUFNLElBQUksU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7S0FDeEM7SUFDRCxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7SUFFckQsSUFBSSxDQUFD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RCxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2QixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQzthQUN2RDtZQUNELElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDN0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2FBQ3JEO1NBQ0Y7UUFFRCxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7WUFDWCxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsRUFBRTtnQkFDL0MsTUFBTSxJQUFJLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO2FBQ3ZEO1lBRUQsSUFBSSxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVcsQ0FBQyxFQUFFO2dCQUM3RCxNQUFNLElBQUksU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDM0M7WUFDRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hDLE1BQU0sSUFBSSxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsVUFBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDeEc7U0FDRjtLQUNGO0lBRUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBaElELDBCQWdJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG5ldHdvcmtzIH0gZnJvbSAnLi4vbmV0d29ya3MnO1xuaW1wb3J0IHsgc2NyaXB0IGFzIGJzY3JpcHQsIFBheW1lbnQsIFBheW1lbnRPcHRzLCBTdGFjaywgbGF6eSB9IGZyb20gJ2JpdGNvaW5qcy1saWInO1xuXG5jb25zdCBPUFMgPSBic2NyaXB0Lk9QUztcbmNvbnN0IHR5cGVmID0gcmVxdWlyZSgndHlwZWZvcmNlJyk7XG5cbmNvbnN0IEJJVENPSU5fTkVUV09SSyA9IG5ldHdvcmtzLmJpdGNvaW47XG5cbmZ1bmN0aW9uIHN0YWNrc0VxdWFsKGE6IEJ1ZmZlcltdLCBiOiBCdWZmZXJbXSk6IGJvb2xlYW4ge1xuICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGEuZXZlcnkoKHgsIGkpID0+IHtcbiAgICByZXR1cm4geC5lcXVhbHMoYltpXSk7XG4gIH0pO1xufVxuXG4vLyBpbnB1dDogW3NpZ25hdHVyZXMgLi4uXVxuLy8gb3V0cHV0OiBbcHViS2V5c1swOm4tMV0gT1BfQ0hFQ0tTSUdWRVJJRlldIHB1YktleXNbbi0xXSBPUF9DSEVDS1NJR1xuZXhwb3J0IGZ1bmN0aW9uIHAydHJfbnMoYTogUGF5bWVudCwgb3B0cz86IFBheW1lbnRPcHRzKTogUGF5bWVudCB7XG4gIGlmICghYS5pbnB1dCAmJiAhYS5vdXRwdXQgJiYgIShhLnB1YmtleXMgJiYgYS5wdWJrZXlzLmxlbmd0aCkgJiYgIWEuc2lnbmF0dXJlcykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBlbm91Z2ggZGF0YScpO1xuICB9XG4gIG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUgfSwgb3B0cyB8fCB7fSk7XG5cbiAgaWYgKCFvcHRzLmVjY0xpYikgdGhyb3cgbmV3IEVycm9yKCdFQ0MgTGlicmFyeSBpcyByZXF1aXJlZCBmb3IgcDJ0cl9ucy4nKTtcbiAgY29uc3QgZWNjID0gb3B0cy5lY2NMaWI7XG5cbiAgZnVuY3Rpb24gaXNBY2NlcHRhYmxlU2lnbmF0dXJlKHg6IEJ1ZmZlciB8IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoeCkpIHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIC8vIGVtcHR5IHNpZ25hdHVyZXMgbWF5IGJlIHJlcHJlc2VudGVkIGFzIGVtcHR5IGJ1ZmZlcnNcbiAgICAgICAgKG9wdHMgJiYgb3B0cy5hbGxvd0luY29tcGxldGUgJiYgeC5sZW5ndGggPT09IDApIHx8IGJzY3JpcHQuaXNDYW5vbmljYWxTY2hub3JyU2lnbmF0dXJlKHgpXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gISEob3B0cyAmJiBvcHRzLmFsbG93SW5jb21wbGV0ZSAmJiB4ID09PSBPUFMuT1BfMCk7XG4gIH1cblxuICB0eXBlZihcbiAgICB7XG4gICAgICBuZXR3b3JrOiB0eXBlZi5tYXliZSh0eXBlZi5PYmplY3QpLFxuICAgICAgb3V0cHV0OiB0eXBlZi5tYXliZSh0eXBlZi5CdWZmZXIpLFxuICAgICAgcHVia2V5czogdHlwZWYubWF5YmUodHlwZWYuYXJyYXlPZihlY2MuaXNYT25seVBvaW50KSksXG5cbiAgICAgIHNpZ25hdHVyZXM6IHR5cGVmLm1heWJlKHR5cGVmLmFycmF5T2YoaXNBY2NlcHRhYmxlU2lnbmF0dXJlKSksXG4gICAgICBpbnB1dDogdHlwZWYubWF5YmUodHlwZWYuQnVmZmVyKSxcbiAgICB9LFxuICAgIGFcbiAgKTtcblxuICBjb25zdCBuZXR3b3JrID0gYS5uZXR3b3JrIHx8IEJJVENPSU5fTkVUV09SSztcbiAgY29uc3QgbzogUGF5bWVudCA9IHsgbmV0d29yayB9O1xuXG4gIGNvbnN0IF9jaHVua3MgPSBsYXp5LnZhbHVlKCgpID0+IHtcbiAgICBpZiAoIWEub3V0cHV0KSByZXR1cm47XG4gICAgcmV0dXJuIGJzY3JpcHQuZGVjb21waWxlKGEub3V0cHV0KSBhcyBTdGFjaztcbiAgfSk7XG5cbiAgbGF6eS5wcm9wKG8sICdvdXRwdXQnLCAoKSA9PiB7XG4gICAgaWYgKCFhLnB1YmtleXMpIHJldHVybjtcbiAgICByZXR1cm4gYnNjcmlwdC5jb21waWxlKFxuICAgICAgKFtdIGFzIFN0YWNrKS5jb25jYXQoXG4gICAgICAgIC4uLmEucHVia2V5cy5tYXAoKHBrLCBpLCBwa3MpID0+IFtwaywgaSA9PT0gcGtzLmxlbmd0aCAtIDEgPyBPUFMuT1BfQ0hFQ0tTSUcgOiBPUFMuT1BfQ0hFQ0tTSUdWRVJJRlldKVxuICAgICAgKVxuICAgICk7XG4gIH0pO1xuICBsYXp5LnByb3AobywgJ24nLCAoKSA9PiB7XG4gICAgaWYgKCFvLnB1YmtleXMpIHJldHVybjtcbiAgICByZXR1cm4gby5wdWJrZXlzLmxlbmd0aDtcbiAgfSk7XG4gIGxhenkucHJvcChvLCAncHVia2V5cycsICgpID0+IHtcbiAgICBjb25zdCBjaHVua3MgPSBfY2h1bmtzKCk7XG4gICAgaWYgKCFjaHVua3MpIHJldHVybjtcbiAgICByZXR1cm4gY2h1bmtzLmZpbHRlcigoXywgaW5kZXgpID0+IGluZGV4ICUgMiA9PT0gMCkgYXMgQnVmZmVyW107XG4gIH0pO1xuICBsYXp5LnByb3AobywgJ3NpZ25hdHVyZXMnLCAoKSA9PiB7XG4gICAgaWYgKCFhLmlucHV0KSByZXR1cm47XG4gICAgcmV0dXJuIGJzY3JpcHQuZGVjb21waWxlKGEuaW5wdXQpPy5yZXZlcnNlKCk7XG4gIH0pO1xuICBsYXp5LnByb3AobywgJ2lucHV0JywgKCkgPT4ge1xuICAgIGlmICghYS5zaWduYXR1cmVzKSByZXR1cm47XG4gICAgcmV0dXJuIGJzY3JpcHQuY29tcGlsZShbLi4uYS5zaWduYXR1cmVzXS5yZXZlcnNlKCkpO1xuICB9KTtcbiAgbGF6eS5wcm9wKG8sICd3aXRuZXNzJywgKCkgPT4ge1xuICAgIGlmICghby5pbnB1dCkgcmV0dXJuO1xuICAgIHJldHVybiBbXTtcbiAgfSk7XG4gIGxhenkucHJvcChvLCAnbmFtZScsICgpID0+IHtcbiAgICBpZiAoIW8ubikgcmV0dXJuO1xuICAgIHJldHVybiBgcDJ0cl9ucygke28ubn0pYDtcbiAgfSk7XG5cbiAgLy8gZXh0ZW5kZWQgdmFsaWRhdGlvblxuICBpZiAob3B0cy52YWxpZGF0ZSkge1xuICAgIGNvbnN0IGNodW5rcyA9IF9jaHVua3MoKTtcbiAgICBpZiAoY2h1bmtzKSB7XG4gICAgICBpZiAoY2h1bmtzW2NodW5rcy5sZW5ndGggLSAxXSAhPT0gT1BTLk9QX0NIRUNLU0lHKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ091dHB1dCBlbmRzIHdpdGggdW5leHBlY3RlZCBvcGNvZGUnKTtcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgY2h1bmtzXG4gICAgICAgICAgLmZpbHRlcigoXywgaW5kZXgpID0+IGluZGV4ICUgMiA9PT0gMSlcbiAgICAgICAgICAuc2xpY2UoMCwgLTEpXG4gICAgICAgICAgLnNvbWUoKG9wKSA9PiBvcCAhPT0gT1BTLk9QX0NIRUNLU0lHVkVSSUZZKVxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ091dHB1dCBjb250YWlucyB1bmV4cGVjdGVkIG9wY29kZScpO1xuICAgICAgfVxuICAgICAgaWYgKG8ubiEgPiAxNiB8fCBvLm4gIT09IGNodW5rcy5sZW5ndGggLyAyKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ091dHB1dCBjb250YWlucyB0b28gbWFueSBwdWJrZXlzJyk7XG4gICAgICB9XG4gICAgICBpZiAoby5wdWJrZXlzIS5zb21lKCh4KSA9PiAhZWNjLmlzWE9ubHlQb2ludCh4KSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT3V0cHV0IGNvbnRhaW5zIGludmFsaWQgcHVia2V5KHMpJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhLnB1YmtleXMgJiYgIXN0YWNrc0VxdWFsKGEucHVia2V5cywgby5wdWJrZXlzISkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHVia2V5cyBtaXNtYXRjaCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhLnB1YmtleXMgJiYgYS5wdWJrZXlzLmxlbmd0aCkge1xuICAgICAgby5uID0gYS5wdWJrZXlzLmxlbmd0aDtcbiAgICB9XG5cbiAgICBpZiAoYS5zaWduYXR1cmVzICYmIG8ubikge1xuICAgICAgaWYgKGEuc2lnbmF0dXJlcy5sZW5ndGggPCBvLm4pIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGVub3VnaCBzaWduYXR1cmVzIHByb3ZpZGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAoYS5zaWduYXR1cmVzLmxlbmd0aCA+IG8ubikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUb28gbWFueSBzaWduYXR1cmVzIHByb3ZpZGVkJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGEuaW5wdXQpIHtcbiAgICAgIGlmICghby5zaWduYXR1cmVzIS5ldmVyeShpc0FjY2VwdGFibGVTaWduYXR1cmUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0lucHV0IGhhcyBpbnZhbGlkIHNpZ25hdHVyZShzKScpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYS5zaWduYXR1cmVzICYmICFzdGFja3NFcXVhbChhLnNpZ25hdHVyZXMsIG8uc2lnbmF0dXJlcyEpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1NpZ25hdHVyZSBtaXNtYXRjaCcpO1xuICAgICAgfVxuICAgICAgaWYgKG8ubiAhPT0gby5zaWduYXR1cmVzIS5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgU2lnbmF0dXJlIGNvdW50IG1pc21hdGNoIChuOiAke28ubn0sIHNpZ25hdHVyZXMubGVuZ3RoOiAke28uc2lnbmF0dXJlcyEubGVuZ3RofWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBPYmplY3QuYXNzaWduKG8sIGEpO1xufVxuIl19