"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCanonicalFormat = exports.toOutputScriptTryFormats = exports.toOutputScriptAndFormat = exports.toOutputScriptWithFormat = exports.fromOutputScriptWithFormat = exports.isSupportedAddressFormat = exports.addressFormats = void 0;
/**
 * Implements methods for nonstandard (non-canonical) address formats.
 *
 * Use `toOutputScriptTryFormats()` instead of `toOutputScript()` to parse addresses in
 * non-canonical formats
 */
const networks_1 = require("./networks");
const address_1 = require("./address");
const bitgo_1 = require("./bitgo");
exports.addressFormats = ['default', 'cashaddr'];
/**
 * @param format
 * @param network
 * @return true iff format is supported for network
 */
function isSupportedAddressFormat(format, network) {
    switch (format) {
        case 'default':
            return true;
        case 'cashaddr':
            return [networks_1.networks.bitcoincash, networks_1.networks.ecash].includes(networks_1.getMainnet(network));
    }
    throw new Error(`unknown address format ${format}`);
}
exports.isSupportedAddressFormat = isSupportedAddressFormat;
/**
 * @param outputScript
 * @param format
 * @param network
 * @return address formatted using provided AddressFormat
 */
function fromOutputScriptWithFormat(outputScript, format, network) {
    if (!isSupportedAddressFormat(format, network)) {
        throw new Error(`unsupported address format ${format} for network ${networks_1.getNetworkName(network)}`);
    }
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoincash:
        case networks_1.networks.ecash:
            return bitgo_1.bcashAddress.fromOutputScriptWithFormat(outputScript, format, network);
        default:
            return address_1.fromOutputScript(outputScript, network);
    }
}
exports.fromOutputScriptWithFormat = fromOutputScriptWithFormat;
/**
 * @param address
 * @param format
 * @param network
 * @return output script parsed with provided AddressFormat
 */
function toOutputScriptWithFormat(address, format, network) {
    if (!isSupportedAddressFormat(format, network)) {
        throw new Error(`unsupported address format ${format} for network ${networks_1.getNetworkName(network)}`);
    }
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoincash:
        case networks_1.networks.ecash:
            return bitgo_1.bcashAddress.toOutputScriptWithFormat(address, format, network);
        default:
            return address_1.toOutputScript(address, network);
    }
}
exports.toOutputScriptWithFormat = toOutputScriptWithFormat;
/**
 * Attempts to parse address with different address formats, returns first hit.
 * @param address
 * @param network
 * @param formats - defaults to all supported address formats for network
 * @return tuple with [AddressFormat, Buffer] containing format and parsed output script
 */
function toOutputScriptAndFormat(address, network, formats) {
    if (!formats) {
        formats = exports.addressFormats.filter((f) => isSupportedAddressFormat(f, network));
    }
    for (const format of formats) {
        try {
            return [format, toOutputScriptWithFormat(address, format, network)];
        }
        catch (e) {
            // try next
        }
    }
    throw new Error(`could not parse outputScript [formats=${formats}]`);
}
exports.toOutputScriptAndFormat = toOutputScriptAndFormat;
/**
 * Same as `toOutputScriptAndFormat`, only returning script
 * @param address - {@see toOutputScriptAndFormat}
 * @param network - {@see toOutputScriptAndFormat}
 * @param formats - {@see toOutputScriptAndFormat}
 * @return parsed output script
 */
function toOutputScriptTryFormats(address, network, formats) {
    const [, outputScript] = toOutputScriptAndFormat(address, network, formats);
    return outputScript;
}
exports.toOutputScriptTryFormats = toOutputScriptTryFormats;
/**
 * @param address
 * @param network
 * @return address in canonical format
 */
function toCanonicalFormat(address, network) {
    return address_1.fromOutputScript(toOutputScriptTryFormats(address, network), network);
}
exports.toCanonicalFormat = toCanonicalFormat;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkcmVzc0Zvcm1hdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hZGRyZXNzRm9ybWF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7OztHQUtHO0FBQ0gseUNBQTJFO0FBQzNFLHVDQUE2RDtBQUU3RCxtQ0FBdUM7QUFFMUIsUUFBQSxjQUFjLEdBQUcsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFVLENBQUM7QUFJL0Q7Ozs7R0FJRztBQUNILFNBQWdCLHdCQUF3QixDQUFDLE1BQXFCLEVBQUUsT0FBZ0I7SUFDOUUsUUFBUSxNQUFNLEVBQUU7UUFDZCxLQUFLLFNBQVM7WUFDWixPQUFPLElBQUksQ0FBQztRQUNkLEtBQUssVUFBVTtZQUNiLE9BQU8sQ0FBQyxtQkFBUSxDQUFDLFdBQVcsRUFBRSxtQkFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDL0U7SUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFSRCw0REFRQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBZ0IsMEJBQTBCLENBQUMsWUFBb0IsRUFBRSxNQUFxQixFQUFFLE9BQWdCO0lBQ3RHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUU7UUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsTUFBTSxnQkFBZ0IseUJBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDaEc7SUFFRCxRQUFRLHFCQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDM0IsS0FBSyxtQkFBUSxDQUFDLFdBQVcsQ0FBQztRQUMxQixLQUFLLG1CQUFRLENBQUMsS0FBSztZQUNqQixPQUFPLG9CQUFZLENBQUMsMEJBQTBCLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoRjtZQUNFLE9BQU8sMEJBQWdCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2xEO0FBQ0gsQ0FBQztBQVpELGdFQVlDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQix3QkFBd0IsQ0FBQyxPQUFlLEVBQUUsTUFBcUIsRUFBRSxPQUFnQjtJQUMvRixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLE1BQU0sZ0JBQWdCLHlCQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2hHO0lBRUQsUUFBUSxxQkFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzNCLEtBQUssbUJBQVEsQ0FBQyxXQUFXLENBQUM7UUFDMUIsS0FBSyxtQkFBUSxDQUFDLEtBQUs7WUFDakIsT0FBTyxvQkFBWSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekU7WUFDRSxPQUFPLHdCQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQzNDO0FBQ0gsQ0FBQztBQVpELDREQVlDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsdUJBQXVCLENBQ3JDLE9BQWUsRUFDZixPQUFnQixFQUNoQixPQUF5QjtJQUV6QixJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1osT0FBTyxHQUFHLHNCQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUM5RTtJQUVELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1FBQzVCLElBQUk7WUFDRixPQUFPLENBQUMsTUFBTSxFQUFFLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNyRTtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsV0FBVztTQUNaO0tBQ0Y7SUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZFLENBQUM7QUFsQkQsMERBa0JDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsT0FBZSxFQUFFLE9BQWdCLEVBQUUsT0FBeUI7SUFDbkcsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM1RSxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBSEQsNERBR0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsT0FBZSxFQUFFLE9BQWdCO0lBQ2pFLE9BQU8sMEJBQWdCLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFGRCw4Q0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogSW1wbGVtZW50cyBtZXRob2RzIGZvciBub25zdGFuZGFyZCAobm9uLWNhbm9uaWNhbCkgYWRkcmVzcyBmb3JtYXRzLlxuICpcbiAqIFVzZSBgdG9PdXRwdXRTY3JpcHRUcnlGb3JtYXRzKClgIGluc3RlYWQgb2YgYHRvT3V0cHV0U2NyaXB0KClgIHRvIHBhcnNlIGFkZHJlc3NlcyBpblxuICogbm9uLWNhbm9uaWNhbCBmb3JtYXRzXG4gKi9cbmltcG9ydCB7IGdldE1haW5uZXQsIGdldE5ldHdvcmtOYW1lLCBOZXR3b3JrLCBuZXR3b3JrcyB9IGZyb20gJy4vbmV0d29ya3MnO1xuaW1wb3J0IHsgZnJvbU91dHB1dFNjcmlwdCwgdG9PdXRwdXRTY3JpcHQgfSBmcm9tICcuL2FkZHJlc3MnO1xuXG5pbXBvcnQgeyBiY2FzaEFkZHJlc3MgfSBmcm9tICcuL2JpdGdvJztcblxuZXhwb3J0IGNvbnN0IGFkZHJlc3NGb3JtYXRzID0gWydkZWZhdWx0JywgJ2Nhc2hhZGRyJ10gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIEFkZHJlc3NGb3JtYXQgPSB0eXBlb2YgYWRkcmVzc0Zvcm1hdHNbbnVtYmVyXTtcblxuLyoqXG4gKiBAcGFyYW0gZm9ybWF0XG4gKiBAcGFyYW0gbmV0d29ya1xuICogQHJldHVybiB0cnVlIGlmZiBmb3JtYXQgaXMgc3VwcG9ydGVkIGZvciBuZXR3b3JrXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N1cHBvcnRlZEFkZHJlc3NGb3JtYXQoZm9ybWF0OiBBZGRyZXNzRm9ybWF0LCBuZXR3b3JrOiBOZXR3b3JrKTogYm9vbGVhbiB7XG4gIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgY2FzZSAnZGVmYXVsdCc6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjYXNlICdjYXNoYWRkcic6XG4gICAgICByZXR1cm4gW25ldHdvcmtzLmJpdGNvaW5jYXNoLCBuZXR3b3Jrcy5lY2FzaF0uaW5jbHVkZXMoZ2V0TWFpbm5ldChuZXR3b3JrKSk7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIGFkZHJlc3MgZm9ybWF0ICR7Zm9ybWF0fWApO1xufVxuXG4vKipcbiAqIEBwYXJhbSBvdXRwdXRTY3JpcHRcbiAqIEBwYXJhbSBmb3JtYXRcbiAqIEBwYXJhbSBuZXR3b3JrXG4gKiBAcmV0dXJuIGFkZHJlc3MgZm9ybWF0dGVkIHVzaW5nIHByb3ZpZGVkIEFkZHJlc3NGb3JtYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21PdXRwdXRTY3JpcHRXaXRoRm9ybWF0KG91dHB1dFNjcmlwdDogQnVmZmVyLCBmb3JtYXQ6IEFkZHJlc3NGb3JtYXQsIG5ldHdvcms6IE5ldHdvcmspOiBzdHJpbmcge1xuICBpZiAoIWlzU3VwcG9ydGVkQWRkcmVzc0Zvcm1hdChmb3JtYXQsIG5ldHdvcmspKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCBhZGRyZXNzIGZvcm1hdCAke2Zvcm1hdH0gZm9yIG5ldHdvcmsgJHtnZXROZXR3b3JrTmFtZShuZXR3b3JrKX1gKTtcbiAgfVxuXG4gIHN3aXRjaCAoZ2V0TWFpbm5ldChuZXR3b3JrKSkge1xuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5lY2FzaDpcbiAgICAgIHJldHVybiBiY2FzaEFkZHJlc3MuZnJvbU91dHB1dFNjcmlwdFdpdGhGb3JtYXQob3V0cHV0U2NyaXB0LCBmb3JtYXQsIG5ldHdvcmspO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZnJvbU91dHB1dFNjcmlwdChvdXRwdXRTY3JpcHQsIG5ldHdvcmspO1xuICB9XG59XG5cbi8qKlxuICogQHBhcmFtIGFkZHJlc3NcbiAqIEBwYXJhbSBmb3JtYXRcbiAqIEBwYXJhbSBuZXR3b3JrXG4gKiBAcmV0dXJuIG91dHB1dCBzY3JpcHQgcGFyc2VkIHdpdGggcHJvdmlkZWQgQWRkcmVzc0Zvcm1hdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9PdXRwdXRTY3JpcHRXaXRoRm9ybWF0KGFkZHJlc3M6IHN0cmluZywgZm9ybWF0OiBBZGRyZXNzRm9ybWF0LCBuZXR3b3JrOiBOZXR3b3JrKTogQnVmZmVyIHtcbiAgaWYgKCFpc1N1cHBvcnRlZEFkZHJlc3NGb3JtYXQoZm9ybWF0LCBuZXR3b3JrKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5zdXBwb3J0ZWQgYWRkcmVzcyBmb3JtYXQgJHtmb3JtYXR9IGZvciBuZXR3b3JrICR7Z2V0TmV0d29ya05hbWUobmV0d29yayl9YCk7XG4gIH1cblxuICBzd2l0Y2ggKGdldE1haW5uZXQobmV0d29yaykpIHtcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5jYXNoOlxuICAgIGNhc2UgbmV0d29ya3MuZWNhc2g6XG4gICAgICByZXR1cm4gYmNhc2hBZGRyZXNzLnRvT3V0cHV0U2NyaXB0V2l0aEZvcm1hdChhZGRyZXNzLCBmb3JtYXQsIG5ldHdvcmspO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdG9PdXRwdXRTY3JpcHQoYWRkcmVzcywgbmV0d29yayk7XG4gIH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBwYXJzZSBhZGRyZXNzIHdpdGggZGlmZmVyZW50IGFkZHJlc3MgZm9ybWF0cywgcmV0dXJucyBmaXJzdCBoaXQuXG4gKiBAcGFyYW0gYWRkcmVzc1xuICogQHBhcmFtIG5ldHdvcmtcbiAqIEBwYXJhbSBmb3JtYXRzIC0gZGVmYXVsdHMgdG8gYWxsIHN1cHBvcnRlZCBhZGRyZXNzIGZvcm1hdHMgZm9yIG5ldHdvcmtcbiAqIEByZXR1cm4gdHVwbGUgd2l0aCBbQWRkcmVzc0Zvcm1hdCwgQnVmZmVyXSBjb250YWluaW5nIGZvcm1hdCBhbmQgcGFyc2VkIG91dHB1dCBzY3JpcHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvT3V0cHV0U2NyaXB0QW5kRm9ybWF0KFxuICBhZGRyZXNzOiBzdHJpbmcsXG4gIG5ldHdvcms6IE5ldHdvcmssXG4gIGZvcm1hdHM/OiBBZGRyZXNzRm9ybWF0W11cbik6IFtBZGRyZXNzRm9ybWF0LCBCdWZmZXJdIHtcbiAgaWYgKCFmb3JtYXRzKSB7XG4gICAgZm9ybWF0cyA9IGFkZHJlc3NGb3JtYXRzLmZpbHRlcigoZikgPT4gaXNTdXBwb3J0ZWRBZGRyZXNzRm9ybWF0KGYsIG5ldHdvcmspKTtcbiAgfVxuXG4gIGZvciAoY29uc3QgZm9ybWF0IG9mIGZvcm1hdHMpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIFtmb3JtYXQsIHRvT3V0cHV0U2NyaXB0V2l0aEZvcm1hdChhZGRyZXNzLCBmb3JtYXQsIG5ldHdvcmspXTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB0cnkgbmV4dFxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgY291bGQgbm90IHBhcnNlIG91dHB1dFNjcmlwdCBbZm9ybWF0cz0ke2Zvcm1hdHN9XWApO1xufVxuXG4vKipcbiAqIFNhbWUgYXMgYHRvT3V0cHV0U2NyaXB0QW5kRm9ybWF0YCwgb25seSByZXR1cm5pbmcgc2NyaXB0XG4gKiBAcGFyYW0gYWRkcmVzcyAtIHtAc2VlIHRvT3V0cHV0U2NyaXB0QW5kRm9ybWF0fVxuICogQHBhcmFtIG5ldHdvcmsgLSB7QHNlZSB0b091dHB1dFNjcmlwdEFuZEZvcm1hdH1cbiAqIEBwYXJhbSBmb3JtYXRzIC0ge0BzZWUgdG9PdXRwdXRTY3JpcHRBbmRGb3JtYXR9XG4gKiBAcmV0dXJuIHBhcnNlZCBvdXRwdXQgc2NyaXB0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b091dHB1dFNjcmlwdFRyeUZvcm1hdHMoYWRkcmVzczogc3RyaW5nLCBuZXR3b3JrOiBOZXR3b3JrLCBmb3JtYXRzPzogQWRkcmVzc0Zvcm1hdFtdKTogQnVmZmVyIHtcbiAgY29uc3QgWywgb3V0cHV0U2NyaXB0XSA9IHRvT3V0cHV0U2NyaXB0QW5kRm9ybWF0KGFkZHJlc3MsIG5ldHdvcmssIGZvcm1hdHMpO1xuICByZXR1cm4gb3V0cHV0U2NyaXB0O1xufVxuXG4vKipcbiAqIEBwYXJhbSBhZGRyZXNzXG4gKiBAcGFyYW0gbmV0d29ya1xuICogQHJldHVybiBhZGRyZXNzIGluIGNhbm9uaWNhbCBmb3JtYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ2Fub25pY2FsRm9ybWF0KGFkZHJlc3M6IHN0cmluZywgbmV0d29yazogTmV0d29yayk6IHN0cmluZyB7XG4gIHJldHVybiBmcm9tT3V0cHV0U2NyaXB0KHRvT3V0cHV0U2NyaXB0VHJ5Rm9ybWF0cyhhZGRyZXNzLCBuZXR3b3JrKSwgbmV0d29yayk7XG59XG4iXX0=