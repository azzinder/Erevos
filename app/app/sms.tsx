import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, PermissionsAndroid, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardPaddedView } from '../components/keyboard';
import { Button, Card, Chip, Input, Page, Row, Text } from '../components/ui';
import { canRelaySeal } from '../lib/core';
import { toBase64Url } from '../lib/e2e';
import { relayKey } from '../lib/relay';
import { groupName, smsAddress, smsNumbers } from '../lib/sms-group';
import { sameNumber } from '../lib/sms-invite';
import { pickMmsPhoto, type MmsPhoto } from '../lib/pick-mms-photo';
import { chooseSim, simLabel, SmsLink } from '../lib/sms-link';
import { cleanName, loadE2EData, type Contact } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import { contactNames, markSmsRead, mmsReady, onSmsEvent, sendMms, sendSms, sendSmsData, smsMessages, smsSims, smsStatus, type Sim, type SmsMessage } from '../modules/erevos-sms';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// One SMS conversation, with a number. A number linked to an Erevos contact opens that contact's
// chat instead, unless `plain` asks for the SMS. Messages here are plain SMS: the phone company can
// read them. The first one to a number that is no contact also carries a hidden invite
// (lib/sms-invite.ts), when invites are on. A contact can be linked to the number by hand. A photo
// goes as an MMS, as plain as an SMS. With two SIMs, the one to send on is chosen here, and kept
// for the number. The number shows the name the phone's contacts give it, when that is turned on.
// With several numbers (`to` comma-separated) it is a group's conversation: every message goes to
// all of them as one MMS, text alone too, and each that comes says who wrote it.

export default function Sms() {
  const params = useLocalSearchParams<{ to?: string; text?: string; plain?: string }>();
  const numbers = smsNumbers(typeof params.to === 'string' ? params.to : '');
  const to = smsAddress(numbers);
  const group = numbers.length > 1;
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [draft, setDraft] = useState(typeof params.text === 'string' ? params.text : '');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<MmsPhoto | null>(null);
  const [sims, setSims] = useState<Sim[]>([]);
  const [sim, setSim] = useState(-1);
  const [names, setNames] = useState<Record<string, string>>({});
  const link = useRef<SmsLink | null>(null);
  const twoSims = (smsStatus()?.slots ?? 0) >= 2;
  const thread = useRef<ScrollView>(null);

  const load = useCallback(() => {
    smsMessages(to)
      .then((loaded) => {
        setMessages(loaded);
        return loaded;
      })
      .catch(() => setNote('The SMS on this phone could not be read. Make Erevos the SMS app under SMS in the menu.'));
    markSmsRead(to).catch(() => undefined);
  }, [to]);

  useEffect(() => {
    const { space, key } = currentSpace();
    load();
    loadE2EData('space', space, key)
      .then((data) => {
        const linked = group ? undefined : data.contacts.find((c) => c.phone && sameNumber(c.phone, to));
        if (linked && params.plain !== '1') router.replace(`/chat?contact=${linked.identity}`);
        else setContacts(data.contacts);
      })
      .catch(() => undefined);
    SmsLink.open(space, key)
      .then(async (opened) => {
        link.current = opened;
        if (opened.names) setNames(await contactNames(numbers).catch(() => ({} as Record<string, string>)));
        if (!twoSims) return;
        const [found, loaded] = await Promise.all([smsSims(), smsMessages(to, 50).catch(() => [] as SmsMessage[])]);
        const lastCame = [...loaded].reverse().find((m) => !m.mine)?.sim ?? -1;
        setSims(found);
        setSim(chooseSim(found, opened.simFor(to), lastCame));
      })
      .catch(() => undefined);
    const subscriptions = [onSmsEvent('onSms', ({ address }) => numbers.some((n) => sameNumber(address, n)) && load()), onSmsEvent('onSmsSent', () => load())];
    return () => subscriptions.forEach((s) => s?.remove());
  }, [to, load, params.plain]);

  if (!to) {
    return (
      <Page>
        <Text tone="muted">No phone number.</Text>
      </Page>
    );
  }

  // The SIMs show once Erevos may read the phone's state; it asks only when the owner taps.
  async function askSims() {
    const answer = await PermissionsAndroid.request('android.permission.READ_PHONE_STATE').catch(() => null);
    if (answer !== PermissionsAndroid.RESULTS.GRANTED) {
      setNote('Without that, SMS go on the phone\'s default SIM.');
      return;
    }
    const found = await smsSims();
    setSims(found);
    const last = [...messages].reverse().find((m) => !m.mine)?.sim ?? -1;
    setSim(chooseSim(found, link.current?.simFor(to) ?? -1, last));
  }

  // Who wrote a message in a group's conversation: the group's number as the contacts name it.
  function whose(from: string): string {
    const number = numbers.find((n) => sameNumber(n, from)) ?? from;
    return names[number] || number;
  }

  function pickSim(id: number) {
    setSim(id);
    link.current?.setSim(to, id).catch(() => undefined);
  }

  async function addPhoto() {
    setNote('');
    try {
      const picked = await pickMmsPhoto();
      if (picked) setPhoto(picked);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function send() {
    const text = draft.trim();
    if ((!text && !photo) || sending) return;
    setSending(true);
    setNote('');
    try {
      if (!smsStatus()?.isDefault && Platform.OS === 'android') {
        const answer = await PermissionsAndroid.request('android.permission.SEND_SMS');
        if (answer !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Erevos may not send SMS. Allow it, or make Erevos the SMS app.');
      }
      if (group && !mmsReady()) throw new Error('This build of Erevos cannot send to several numbers yet.');
      // A group's message goes to everyone as one MMS, even without a photo.
      if (photo || group) await sendMms(to, text, photo, sim);
      else await sendSms(to, text, sim);
      setDraft('');
      setPhoto(null);
      load();
      if (!group) await invite();
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
        <Text variant="title">{group ? groupName(numbers, names) : names[to] || to}</Text>
        {group ? <Text tone="muted">Group MMS · {numbers.length} numbers</Text> : names[to] ? <Text tone="muted">{to}</Text> : null}
        <Card>
          <Text variant="caption" color={colors.warning}>
            Plain SMS: not encrypted. The phone company can read these messages.
          </Text>
          {contacts.length > 0 && !group ? (
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
          <View key={`${m.kind ?? 'sms'}${m.id}`} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
            {(m.pictures ?? []).map((p) => (
              <Image key={p.uri} source={{ uri: p.uri }} style={styles.picture} resizeMode="cover" accessibilityLabel="Picture" />
            ))}
            {group && !m.mine && m.from ? (
              <Text variant="caption" tone="muted">
                {whose(m.from)}
              </Text>
            ) : null}
            {m.text ? <Text selectable>{m.text}</Text> : null}
            <Text variant="caption" tone="faint">
              {new Date(m.at).toLocaleString()}
              {sims.length > 1 && simLabel(sims, m.sim) ? ` · ${simLabel(sims, m.sim)}` : ''}
              {m.state === 'failed' ? ' · not sent' : m.state === 'sending' ? ' · sending' : ''}
            </Text>
          </View>
        ))}
        {note ? <Text tone="muted">{note}</Text> : null}
      </ScrollView>
      {sims.length > 1 || (twoSims && sims.length === 0) || photo ? (
        <Row wrap style={styles.options}>
          {sims.length > 1 ? (
            sims.map((s) => <Chip key={s.id} label={`SIM ${s.slot + 1}${s.name ? ` · ${s.name}` : ''}`} selected={sim === s.id} onPress={() => pickSim(s.id)} />)
          ) : twoSims && sims.length === 0 ? (
            <Chip label="Choose the SIM" onPress={() => void askSims()} />
          ) : null}
          {photo ? <Chip label={`Picture · ${Math.ceil(photo.bytes.length / 1024)} KB · remove`} selected onPress={() => setPhoto(null)} /> : null}
        </Row>
      ) : null}
      <View style={styles.composer}>
        {mmsReady() ? <Button title="Photo" kind="ghost" compact onPress={() => void addPhoto()} /> : null}
        <Input value={draft} onChangeText={setDraft} placeholder={photo || group ? 'MMS (not encrypted)' : 'SMS (not encrypted)'} multiline style={styles.input} />
        <Button title="Send" compact loading={sending} disabled={!draft.trim() && !photo} onPress={() => void send()} />
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
    options: { paddingHorizontal: space.md, paddingTop: space.sm },
    picture: { width: 220, height: 220, borderRadius: radius.md, backgroundColor: colors.border },
  });
