// The fetch whose answer comes as a stream, so a download can be stopped as soon as it is too
// large (lib/net-http.ts readCapped). In the web app, the desktop app and the checks, the page's own
// fetch streams already. On the phone, lib/net-fetch.native.ts.

export const streamingFetch: typeof fetch = (input, init) => fetch(input, init);
