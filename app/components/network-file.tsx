import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

import { fileSize } from '../lib/attachments';
import { playVoice } from '../lib/audio';
import { toBase64 } from '../lib/crypto';
import { t } from '../lib/i18n';
import { saveBytes } from '../lib/save-file';
import { radius, space } from '../theme/colors';
import { Button, Row, Text } from './ui';

// A photo, sound or file in a chat on XMPP or Nostr (app/xmpp-chat.tsx, app/nostr-chat.tsx):
// fetched from its server only when asked for, then a photo shown, a sound played, and any of them
// saved. What was fetched stays in memory while Erevos runs (lib/file-cache.ts).

/** The ending a sound's type is written with, for the phone's player. */
function endingOf(type: string): string {
  const sub = type.split('/')[1]?.split(';')[0] ?? '';
  if (sub === 'mp4' || sub === 'x-m4a' || sub === 'm4a') return 'm4a';
  if (sub === 'mpeg') return 'mp3';
  return /^[a-z0-9]{2,5}$/.test(sub) ? sub : 'm4a';
}

export function NetworkFile({ name, type, size, dim, fetch }: { name: string; type: string; size?: number; dim?: string; fetch: () => Promise<Uint8Array> }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [playing, setPlaying] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const image = type.startsWith('image/');
  const sound = type.startsWith('audio/');
  useEffect(() => () => stop.current?.(), []);

  async function get(): Promise<Uint8Array | null> {
    if (bytes) return bytes;
    setBusy(true);
    setNote('');
    try {
      const got = await fetch();
      setBytes(got);
      return got;
    } catch (error) {
      setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const got = await get();
    if (!got) return;
    try {
      if (await saveBytes(name, type, got)) setNote(t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function play() {
    if (stop.current) {
      stop.current();
      return;
    }
    const got = await get();
    if (!got) return;
    try {
      setPlaying(true);
      stop.current = playVoice(
        got,
        () => {
          stop.current = null;
          setPlaying(false);
        },
        undefined,
        endingOf(type),
      );
    } catch (error) {
      setPlaying(false);
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  const [w, h] = (dim ?? '').split('x').map(Number);
  const ratio = w && h ? w / h : 4 / 3;
  return (
    <View style={{ gap: space.xs }}>
      {image && bytes ? (
        <Image source={{ uri: `data:${type};base64,${toBase64(bytes)}` }} style={{ width: 240, height: 240 / ratio, borderRadius: radius.sm }} resizeMode="contain" accessibilityLabel={name} />
      ) : (
        <Text numberOfLines={2}>
          {name}
          {size ? ` · ${fileSize(size)}` : ''}
        </Text>
      )}
      <Row>
        {image && !bytes ? <Button title={t('Show photo')} compact disabled={busy} onPress={() => void get()} /> : null}
        {sound ? <Button title={playing ? t('Stop') : t('Play')} compact disabled={busy} onPress={() => void play()} /> : null}
        <Button title={t('Save')} kind="secondary" compact disabled={busy} onPress={() => void save()} />
      </Row>
      {busy ? (
        <Text variant="caption" tone="muted">
          {t('Fetching…')}
        </Text>
      ) : null}
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}
