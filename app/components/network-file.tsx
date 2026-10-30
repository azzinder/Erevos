import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { fileSize } from '../lib/attachments';
import { playVoice } from '../lib/audio';
import { toBase64 } from '../lib/crypto';
import { t } from '../lib/i18n';
import { saveBytes } from '../lib/save-file';
import { radius, space } from '../theme/colors';
import { OpenPhoto } from './attachment';
import { Button, Row, Text } from './ui';

// A photo, sound or file in a chat on XMPP or Nostr (app/xmpp-chat.tsx, app/nostr-chat.tsx):
// fetched from its server only when asked for, then a photo shown (a tap opens it on the whole
// screen, components/attachment.tsx OpenPhoto), a sound played, and any of them saved. What was
// fetched stays in memory while Erevos runs (lib/file-cache.ts).

/** The ending a sound's type is written with, for the phone's player. */
function endingOf(type: string): string {
  const sub = type.split('/')[1]?.split(';')[0] ?? '';
  if (sub === 'mp4' || sub === 'x-m4a' || sub === 'm4a') return 'm4a';
  if (sub === 'mpeg') return 'mp3';
  return /^[a-z0-9]{2,5}$/.test(sub) ? sub : 'm4a';
}

export function NetworkFile({ name, type, size, dim, fetch, onMenu }: { name: string; type: string; size?: number; dim?: string; fetch: () => Promise<Uint8Array>; onMenu?: () => void }) {
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

  // True once it is done, saved or not; false if the owner went back (a photo shown on the whole screen then stays).
  async function save(choose = false): Promise<boolean> {
    const got = await get();
    if (!got) return false;
    try {
      if (!(await saveBytes(name, type, got, choose))) return false;
      setNote(t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    return true;
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
  const uri = useMemo(() => (image && bytes ? `data:${type};base64,${toBase64(bytes)}` : null), [image, type, bytes]);
  return (
    <View style={{ gap: space.xs }}>
      {uri && bytes ? (
        <OpenPhoto uri={uri} name={name} size={bytes.length} w={w} h={h} style={{ width: 240, height: 240 / ratio, borderRadius: radius.sm }} onSave={save} onMenu={onMenu} />
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
