import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { toBase64 } from '../lib/crypto';
import { t } from '../lib/i18n';
import { matrixPicture } from '../lib/matrix-store';
import { onXmppChange, xmppAvatar } from '../lib/xmpp-store';
import type { NetworkWhere } from '../lib/network-place';
import { space } from '../theme/colors';
import { useTheme } from '../theme/context';

import { Button, Row, Text } from './ui';

// The picture of someone on Matrix or XMPP, or of a Matrix room, as their server has it: fetched
// when shown, kept in memory only (lib/matrix-store.ts, lib/xmpp-store.ts), and drawn as a round
// face. Until it comes, or where there is none, the network's own mark stands in its place.

/** The type of a picture's bytes by how they begin, as Matrix does not say. */
function mimeOf(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

/** `of` says whose: a Matrix `mxc://` address, or an XMPP address. */
export function NetworkPicture({ network, of, size, fallback, where = 'space' }: { network: 'matrix' | 'xmpp'; of: string | undefined; size: number; fallback: string; where?: NetworkWhere }) {
  const { colors } = useTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  // An XMPP picture is told of after the chat shows: asked again then.
  useEffect(() => (network === 'xmpp' ? onXmppChange(() => setRound((n) => n + 1)) : undefined), [network]);
  useEffect(() => {
    let alive = true;
    setUri(null);
    if (of) {
      void (network === 'matrix' ? matrixPicture(of, where) : xmppAvatar(of, where)).then((bytes) => {
        if (alive && bytes) setUri(`data:${mimeOf(bytes)};base64,${toBase64(bytes)}`);
      });
    }
    return () => {
      alive = false;
    };
  }, [network, of, where, round]);
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, borderColor: colors.border }]}>
      <Text variant="label" tone="muted">
        {fallback}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});

/** Our own picture on a Matrix or XMPP account, with what changes it. `of` is ours as the account has it (an mxc:// address, or our address). */
export function OwnPicture({ network, of, busy, onPick, onRemove }: { network: 'matrix' | 'xmpp'; of: string | undefined; busy: boolean; onPick: () => void; onRemove: () => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="bodyStrong">{t('Your profile picture')}</Text>
      <Row>
        <NetworkPicture network={network} of={of} size={64} fallback={network === 'xmpp' ? 'xmpp' : '[m]'} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Button title={t('Choose a photo')} kind="secondary" compact disabled={busy} onPress={onPick} />
          {of ? <Button title={t('Remove')} kind="secondary" compact disabled={busy} onPress={onRemove} /> : null}
        </View>
      </Row>
      <Text variant="caption" tone="muted">
        {t('Your contacts see it. As in every Matrix and XMPP app, it is not encrypted: the server sees it.')}
      </Text>
    </View>
  );
}
