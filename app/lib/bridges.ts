// Tor bridges, for where Tor is blocked (lib/tor.ts, crates/erevos-tor). Each space keeps its own
// choice, sealed with its other settings (SpaceData.bridges): none, the bridges Tor Browser comes
// with (obfs4, or Snowflake), or lines of one's own, from bridges.torproject.org or Tor's bot.
// With bridges Tor goes only through them, never straight to its relays; a choice that leaves no
// bridge to use does not start Tor at all, so nothing goes.

export type BridgeChoice = 'none' | 'obfs4' | 'snowflake' | 'own';
export type Bridges = { use: BridgeChoice; own: string };

export const NO_BRIDGES: Bridges = { use: 'none', own: '' };
export const BRIDGE_CHOICES: BridgeChoice[] = ['none', 'obfs4', 'snowflake', 'own'];

// The pluggable transports the app carries (lyrebird), as bridge lines name them.
export const TRANSPORTS = ['obfs4', 'snowflake', 'webtunnel', 'meek_lite'] as const;

// Tor Browser's own bridges (rdsys conf/builtin.json, 6 October 2026), as Tor Browser and Orbot
// use them. A censor that blocks them all is answered with one's own lines.
const STUN =
  'ice=stun:stun.epygi.com:3478,stun:stun.uls.co.za:3478,stun:stun.voipgate.com:3478,stun:stun.mixvoip.com:3478,stun:stun.telnyx.com:3478,stun:stun.hot-chilli.net:3478,stun:stun.fitauto.ru:3478,stun:stun.m-online.net:3478';
export const BUILT_IN: Record<'obfs4' | 'snowflake', readonly string[]> = {
  obfs4: [
    'obfs4 37.218.245.14:38224 D9A82D2F9C2F65A18407B1D2B764F130847F8B5D cert=bjRaMrr1BRiAW8IE9U5z27fQaYgOhX1UCmOpg2pFpoMvo6ZgQMzLsaTzzQNTlm7hNcb+Sg iat-mode=0',
    'obfs4 209.148.46.65:443 74FAD13168806246602538555B5521A0383A1875 cert=ssH+9rP8dG2NLDN2XuFw63hIO/9MNNinLmxQDpVa+7kTOa9/m+tGWT1SmSYpQ9uTBGa6Hw iat-mode=0',
    'obfs4 146.57.248.225:22 10A6CD36A537FCE513A322361547444B393989F0 cert=K1gDtDAIcUfeLqbstggjIw2rtgIKqdIhUlHp82XRqNSq/mtAjp1BIC9vHKJ2FAEpGssTPw iat-mode=0',
    'obfs4 45.145.95.6:27015 C5B7CD6946FF10C5B3E89691A7D3F2C122D2117C cert=TD7PbUO0/0k6xYHMPW3vJxICfkMZNdkRrb63Zhl5j9dW3iRGiCx0A7mPhe5T2EDzQ35+Zw iat-mode=0',
    'obfs4 51.222.13.177:80 5EDAC3B810E12B01F6FD8050D2FD3E277B289A08 cert=2uplIpLQ0q9+0qMFrK5pkaYRDOe460LL9WHBvatgkuRr/SL31wBOEupaMMJ6koRE6Ld0ew iat-mode=0',
    'obfs4 212.83.43.95:443 BFE712113A72899AD685764B211FACD30FF52C31 cert=ayq0XzCwhpdysn5o0EyDUbmSOx3X/oTEbzDMvczHOdBJKlvIdHHLJGkZARtT4dcBFArPPg iat-mode=1',
    'obfs4 212.83.43.74:443 39562501228A4D5E27FCA4C0C81A01EE23AE3EE4 cert=PBwr+S8JTVZo6MPdHnkTwXJPILWADLqfMGoVvhZClMq/Urndyd42BwX9YFJHZnBB3H0XCw iat-mode=1',
  ],
  snowflake: [
    `snowflake 192.0.2.3:80 2B280B23E1107BB62ABFC40DDCC8824814F80A72 fingerprint=2B280B23E1107BB62ABFC40DDCC8824814F80A72 url=https://1098762253.rsc.cdn77.org/ fronts=app.datapacket.com,www.datapacket.com ${STUN} utls-imitate=hellorandomizedalpn`,
    `snowflake 192.0.2.4:80 8838024498816A039FCBBAB14E6F40A0843051FA fingerprint=8838024498816A039FCBBAB14E6F40A0843051FA url=https://1098762253.rsc.cdn77.org/ fronts=app.datapacket.com,www.datapacket.com ${STUN} utls-imitate=hellorandomizedalpn`,
  ],
};

// A bridge's arguments go to the transport in the two 255-byte fields of a SOCKS5 login.
const MAX_ARGS = 510;
const FINGERPRINT = /^[0-9A-Fa-f]{40}$/;
const SETTING = /^[A-Za-z0-9_-]+=\S*$/;
// An IPv4 or [IPv6] address with its port.
const ADDRESS = /^(?:(?:\d{1,3}\.){3}\d{1,3}|\[[0-9A-Fa-f:.]+\]):(\d{1,5})$/;

/** What is wrong with a bridge line, or null when it is one the app can use. */
export function bridgeProblem(line: string): 'transport' | 'address' | 'fingerprint' | 'setting' | 'long' | null {
  const words = line.trim().split(/\s+/);
  if (!ADDRESS.test(words[0] ?? '')) {
    const transport = words.shift() ?? '';
    if (!(TRANSPORTS as readonly string[]).includes(transport)) return 'transport';
  }
  const port = ADDRESS.exec(words.shift() ?? '');
  if (!port || Number(port[1]) < 1 || Number(port[1]) > 65535) return 'address';
  if (!FINGERPRINT.test(words.shift() ?? '')) return 'fingerprint';
  if (!words.every((word) => SETTING.test(word))) return 'setting';
  if (words.join(';').length > MAX_ARGS) return 'long';
  return null;
}

/** One's own bridge lines, as pasted: each line, without Tor's "Bridge" before it, and the ones that are not bridges. */
export function readBridgeLines(text: string): { lines: string[]; wrong: string[] } {
  const lines: string[] = [];
  const wrong: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^Bridge\s+/i, '').replace(/\s+/g, ' ');
    if (!line) continue;
    if (bridgeProblem(line)) wrong.push(line);
    else if (!lines.includes(line)) lines.push(line);
  }
  return { lines, wrong };
}

/** The bridge lines Tor goes through for a choice: none for "none", and none when one's own are all wrong. */
export function bridgeLines(bridges: Bridges): string[] {
  if (bridges.use === 'obfs4' || bridges.use === 'snowflake') return [...BUILT_IN[bridges.use]];
  if (bridges.use === 'own') return readBridgeLines(bridges.own).lines;
  return [];
}

/** What was stored, with anything of the wrong shape left out. */
export function checkedBridges(value: unknown): Bridges {
  const v = (value ?? {}) as Partial<Record<keyof Bridges, unknown>>;
  const use = BRIDGE_CHOICES.find((choice) => choice === v.use) ?? 'none';
  return { use, own: typeof v.own === 'string' ? v.own : '' };
}
