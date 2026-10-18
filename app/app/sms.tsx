import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardPaddedView } from '../components/keyboard';
import { Button, Card, Chip, Input, Page, Row, Text } from '../components/ui';
import { canRelaySeal } from '../lib/core';
import { toBase64Url } from '../lib/e2e';
import { relayKey } from '../lib/relay';
import { plainNumber, sameNumber } from '../lib/sms-invite';
import { SmsLink } from '../lib/sms-link';
import { cleanName, loadE2EData, type Contact } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import { markSmsRead, onSmsEvent, sendSms, sendSmsData, smsMessages, smsStatus, type SmsMessage } from '../modules/erevos-sms';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// One SMS conversation, with a number. A number linked to an Erevos contact opens that contact's
// chat instead, unless `plain` asks for the SMS. Messages here are plain SMS: the phone company can
// read them. The first one to a number that is no contact also carries a hidden invite
// (lib/sms-invite.ts), when invites are on. A contact can be linked to the number by hand.

export default function Sms() {
  const params = useLocalSearchParams<{ to?: string; text?: string; plain?: string }>();
  const to = plainNumber(typeof params.to === 'string' ? params.to : '');
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [draft, setDraft] = useState(typeof params.text === 'string' ? params.text : '');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const link = useRef<SmsLink | null>(null);
  const thread = useRef<ScrollView>(null);

  const load = useCallback(() => {
    smsMessages(to)
      .then(setMessages)
      .catch(() => setNote('The SMS on this phone could not be read. Make Erevos the SMS app under SMS in the menu.'));
    markSmsRead(to).catch(() => undefined);
  }, [to]);

  useEffect(() => {
    const { space, key } = currentSpace();
    load();
    loadE2EData('space', space, key)
      .then((data) => {
        const linked = data.contacts.find((c) => c.phone && sameNumber(c.phone, to));
        if (linked && params.plain !== '1') router.replace(`/chat?contact=${linked.identity}`);
        else setContacts(data.contacts);
      })
      .catch(() => undefined);
    SmsLink.open(space, key)
      .then((opened) => (link.current = opened))
      .catch(() => undefined);
    const subscriptions = [onSmsEvent('onSms', ({ address }) => sameNumber(address, to) && load()), onSmsEvent('onSmsSent', () => load())];
    return () => subscriptions.forEach((s) => s?.remove());
  }, [to, load, params.plain]);

  if (!to) {
    return (
      <Page>
        <Text tone="muted">No phone number.</Text>
      </Page>
    );
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setNote('');
    try {
      if (!smsStatus()?.isDefault && Platform.OS === 'android') {
        const answer = await PermissionsAndroid.request('android.permission.SEND_SMS');
        if (answer !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Erevos may not send SMS. Allow it, or make Erevos the SMS app.');
      }
      await sendSms(to, text);
      setDraft('');
      load();
      await invite();
    } catch (error) {
      setNote(`Not sent. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSending(false);
    }
  }

  // With the first SMS to a number that is no contact: a hidden invite, answered through the relay
  // if that phone has Erevos. Without a relay queue there is nowhere to answer, so none is sent.
  async function invite() {
    const sms = link.current;
    if (!sms || !sms.wantsInvite(to)) return;
    const data = await loadCurrentSpaceData();
    if (!data.url || !data.ownQueue) return;
    let key = '';
    if (canRelaySeal()) {
      const bytes = await relayKey({ url: data.url, token: data.token || undefined }).catch(() => null);
      if (bytes) key = toBase64Url(bytes);
    }
    try {
      await sms.invite(to, { senderHex: data.ownQueue.senderHex, relay: data.url, relayKey: key }, sendSmsData);
    } catch {
      // The SMS went; the invite goes with a later one.
    }
  }

  return (
    <KeyboardPaddedView bottom={insets.bottom} style={styles.screen}>
      <ScrollView ref={thread} contentContainerStyle={styles.thread} onContentSizeChange={() => thread.current?.scrollToEnd({ animated: false })}>
        <Text variant="title">{to}</Text>
        <Card>
          <Text variant="caption" color={colors.warning}>
            Plain SMS: not encrypted. The phone company can read these messages.
          </Text>
          {contacts.length > 0 ? (
            choosing ? (
              <>
                <Text tone="muted">Which contact is {to}? Messages to this number will go through Erevos.</Text>
                <Row wrap>
                  {contacts.map((c) => (
                    <Chip
                      key={c.identity}
                      label={c.name ? cleanName(c.name) : `contact ${c.identity.slice(0, 8)}`}
                      onPress={() => router.replace(`/chat?contact=${c.identity}&phone=${encodeURIComponent(to)}`)}
                    />
                  ))}
                </Row>
              </>
            ) : (
              <Button title="This number has Erevos: link it to a contact" kind="ghost" compact onPress={() => setChoosing(true)} />
            )
          ) : null}
        </Card>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
            <Text selectable>{m.text}</Text>
            <Text variant="caption" tone="faint">
              {new Date(m.at).toLocaleString()}
              {m.state === 'failed' ? ' · not sent' : m.state === 'sending' ? ' · sending' : ''}
            </Text>
          </View>
        ))}
        {note ? <Text tone="muted">{note}</Text> : null}
      </ScrollView>
      <View style={styles.composer}>
        <Input value={draft} onChangeText={setDraft} placeholder="SMS (not encrypted)" multiline style={styles.input} />
        <Button title="Send" compact loading={sending} disabled={!draft.trim()} onPress={() => void send()} />
      </View>
    </KeyboardPaddedView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    thread: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: space.lg, gap: space.sm },
    bubble: { maxWidth: '85%', padding: space.md, borderRadius: radius.lg, gap: 2 },
    mine: { alignSelf: 'flex-end', backgroundColor: colors.surfaceAlt },
    theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: colors.border },
    input: { flex: 1, maxHeight: 140 },
  });
