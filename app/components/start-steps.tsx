// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, TextInput, View } from 'react-native';

import { CAN_AUTO_BACKUP } from '../lib/backup-place';
import { canTor } from '../lib/core';
import { TILES, type Tile as TileColour } from '../lib/first-start';
import { CAN_DRIVE } from '../lib/google-drive-ids';
import { t } from '../lib/i18n';
import { MODE_NAMES, MODES, type Mode } from '../lib/modes';
import type { Module } from '../lib/modules';
import { strengthOf } from '../lib/password-strength';
import type { CheckId } from '../lib/permission-checks';
import { allAllowed, askedInApp, countAllowed, nextSettingsScreen, permissionGroups, type GroupId, type PermissionGroup, type RowId } from '../lib/permission-groups';
import { askAll, fix, makerDone, readChecks } from '../lib/permissions';
import type { BackupChoice } from '../lib/setup-after';
import { biometricSealer } from '../modules/erevos-biometric';
import { phoneStatus, requestDefaultPhone } from '../modules/erevos-phone';
import { requestDefaultSms, smsMirrored, smsStatus } from '../modules/erevos-sms';
import { checkTitle } from './check-card';
import {
  Bolded,
  Dots,
  Emblem,
  FooterLink,
  GhostButton,
  Glass,
  Gradient,
  Highlighted,
  Icon,
  L,
  MainButton,
  NavRow,
  noOutline,
  Radio,
  Ring,
  StartScreen,
  StartSheet,
  StartToggle,
  StatusPill,
  Tile,
  tint,
  useStartLook,
  type IconName,
} from './first-start-look';
import { modeSays } from './mode-picker';

// The first start's third, fourth and last steps (lib/first-start.ts), in its look
// (components/first-start-look.tsx): How visible are you?, the three modes; Miss nothing, every
// permission in five groups, with Allow all; and Keep it safe, the password lock with the
// fingerprint or face, and where automatic backups go. Each only shows and asks: what is chosen
// is the caller's, kept until its Done. The whole setup shows them before the first space opens,
// and what they chose is used only once its last Done is pressed (components/setup.tsx); moving
// from another phone, they follow the backup restored, with the space open (app/first-steps.tsx).

const WEB = Platform.OS === 'web';

/** Where a step is among the setup's, for its dots: its number from 1, and how many there are. */
export type StepDots = { n: number; of: number };

type Roles = { phoneApp: boolean | null; smsApp: boolean | null };

// The checks that need the first space open: in the web app, notices while it is closed go through
// the space's server (lib/web-push.ts). Before it opens, Settings asks for them once it is.
const NEEDS_SPACE: ReadonlySet<CheckId> = new Set<CheckId>(['push']);

// The tiles of the groups of permissions.
const GROUP_TILES: Record<GroupId, { tile: TileColour; icon: IconName }> = {
  notices: { tile: 'rose', icon: 'bell' },
  calls: { tile: 'teal', icon: 'phone' },
  messages: { tile: 'blue', icon: 'sms' },
  background: { tile: 'gold', icon: 'bolt' },
  reminders: { tile: 'violet', icon: 'clock' },
};

function groupTitle(id: GroupId): string {
  switch (id) {
    case 'notices':
      return t('Notices');
    case 'calls':
      return t('Calls');
    case 'messages':
      return t('Messages');
    case 'background':
      return t('In the background');
    case 'reminders':
      return t('Reminders');
  }
}

function rowTitle(id: RowId): string {
  return id === 'phoneApp' ? t('Phone app') : id === 'smsApp' ? t('SMS app') : checkTitle(id);
}

// The tile and the colour of each mode.
const MODE_LOOKS: Record<Mode, { tile: TileColour; icon: IconName }> = {
  speed: { tile: 'gold', icon: 'bolt' },
  anonymous: { tile: 'blue', icon: 'mask' },
  invisible: { tile: 'violet', icon: 'ghost' },
};

// `a` with `share` of `b` mixed in, both as #rrggbb.
function mix(a: string, b: string, share: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((x >> shift) & 255) * share + ((y >> shift) & 255) * (1 - share));
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

// What the roles of Erevos as the phone app and the SMS app are now, for the modules `modules`.
function readRoles(modules: readonly Module[]): Roles {
  const android = Platform.OS === 'android';
  return {
    phoneApp: modules.includes('phone') && android && phoneStatus() !== null ? !!phoneStatus()?.isDefault : null,
    smsApp: modules.includes('sms') && android && smsStatus() !== null && !smsMirrored() ? !!smsStatus()?.isDefault : null,
  };
}

// Resolves when the app is back in the foreground after Android's screen or question that was
// opened: once it left, as it comes back; or after a moment, when nothing took it away.
function comeBack(hold: { release: (() => void) | null }): Promise<void> {
  return new Promise((resolve) => {
    let left = AppState.currentState !== 'active';
    let timer: ReturnType<typeof setTimeout> | null = null;
    const done = () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
      hold.release = null;
      resolve();
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        left = true;
        if (timer) clearTimeout(timer);
      } else if (left) done();
    });
    if (!left) timer = setTimeout(done, 2500);
    hold.release = done;
  });
}

/**
 * How visible are you?: the three modes, `choice` the one chosen, with what `status` says of the
 * server in a pill under the title, and `link` under Continue (another server, or LPHL's again).
 * INVISIBLE is not chosen where there is no Tor: `onNote` says why instead.
 */
export function ModeStep({ dots, choice, onChoose, status, link, note, onNote, busy = false, onBack, onContinue }: {
  dots: StepDots;
  choice: Mode;
  onChoose: (mode: Mode) => void;
  status: string | null;
  link?: { text: string; onPress: () => void };
  /** What went wrong, or what cannot be chosen here; '' for nothing. */
  note: string;
  onNote: (note: string) => void;
  busy?: boolean;
  onBack?: () => void;
  onContinue: () => void;
}) {
  return (
    <StartScreen
      footer={
        <>
          <NavRow onBack={onBack}>
            <MainButton title={t('Continue')} disabled={busy} onPress={onContinue} />
          </NavRow>
          {link ? <FooterLink link={link.text} onPress={link.onPress} /> : null}
        </>
      }
    >
      <Dots n={dots.n} of={dots.of} />
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 6 }}>
        <Highlighted text={t('How *visible* are you?')} />
        {status ? <StatusPill text={status} /> : null}
      </View>
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {MODES.map((each) => (
          <ModeCard
            key={each}
            mode={each}
            chosen={choice === each}
            faint={each === 'invisible' && !canTor()}
            onPress={() => {
              const torless = each === 'invisible' && !canTor();
              onNote(torless ? t('INVISIBLE needs Tor, which this device does not have.') : '');
              if (!torless) onChoose(each);
            }}
          />
        ))}
      </View>
      <L size={12.5} tone="muted" line={17} align="center">
        {t('Messages are always encrypted · change it in Settings')}
      </L>
      {note ? (
        <L size={12.5} tone="warn" line={17} align="center">
          {note}
        </L>
      ) : null}
    </StartScreen>
  );
}

/**
 * Miss nothing: every permission the modules `modules` need, in their five groups, read again as
 * Erevos comes back from Android's questions and screens, with Allow all. `before`: the first space
 * is not open yet, so what needs it is left for Settings, once it is (NEEDS_SPACE).
 */
export function PermissionsStep({ dots, modules, before = false, onBack, onContinue }: {
  dots: StepDots;
  modules: readonly Module[];
  before?: boolean;
  onBack?: () => void;
  onContinue: () => void;
}) {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  // Allow all: the round it is on (a new one, or leaving the step, ends it), and what it waits on.
  const round = useRef(0);
  const hold = useRef<{ release: (() => void) | null }>({ release: null });
  const [allowing, setAllowing] = useState(false);
  const key = modules.join(',');

  // The permissions and the roles now, in their groups.
  const load = useCallback(async (): Promise<PermissionGroup[]> => {
    const list = key ? (key.split(',') as Module[]) : [];
    const checks = await readChecks(list).catch(() => []);
    const next = permissionGroups(before ? checks.filter((check) => !NEEDS_SPACE.has(check.id)) : checks, readRoles(list));
    setGroups(next);
    return next;
  }, [key, before]);

  useEffect(() => {
    void load();
    // Back from Android's question or settings, or the browser's: what it allows now.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => subscription.remove();
  }, [load]);

  // Leaving the step ends Allow all.
  useEffect(
    () => () => {
      round.current++;
      hold.current.release?.();
    },
    [],
  );

  // A row not allowed: Android's question or screen for it, or the browser's question.
  function fixRow(id: RowId) {
    if (id === 'phoneApp') return requestDefaultPhone();
    if (id === 'smsApp') return requestDefaultSms();
    void fix(id)
      .then(() => (id === 'maker' ? makerDone(true) : undefined))
      .then(() => load())
      .catch(() => undefined);
  }

  // Allow all, one thing at a time, each next one when the app is back in the foreground: what
  // Android asks in Erevos itself, Erevos as the phone app and the SMS app, then each screen of
  // Android's settings that calls and messages need. It stops when the step is left.
  async function allowAll() {
    if (allowing) return;
    const mine = ++round.current;
    const going = () => round.current === mine;
    setAllowing(true);
    try {
      let now = await load();
      const asked = askedInApp(now);
      await askAll(asked.checks);
      if (!going()) return;
      if (asked.phoneApp) {
        requestDefaultPhone();
        await comeBack(hold.current);
        if (!going()) return;
      }
      if (asked.smsApp) {
        requestDefaultSms();
        await comeBack(hold.current);
        if (!going()) return;
      }
      const opened = new Set<RowId>();
      for (;;) {
        now = await load();
        if (!going()) return;
        const id: CheckId | null = nextSettingsScreen(now, opened);
        if (id === null) break;
        opened.add(id);
        await fix(id);
        if (id === 'maker') await makerDone(true);
        await comeBack(hold.current);
        if (!going()) return;
      }
      await load();
    } finally {
      if (going()) setAllowing(false);
    }
  }

  const { ok, all: count } = countAllowed(groups);
  return (
    <StartScreen
      footer={
        <>
          <NavRow onBack={onBack}>
            <MainButton title={t('Allow all')} disabled={allowing} onPress={() => void allowAll()} />
          </NavRow>
          <FooterLink link={allAllowed(groups) ? t('Continue') : t('Continue without them')} onPress={onContinue} />
        </>
      }
    >
      <Dots n={dots.n} of={dots.of} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Highlighted text={t('Miss *nothing*')} size={24} align="left" />
          <L size={12.5} tone="muted" line={17}>
            {WEB ? t('Tap “Allow all”. The browser asks for each one.') : t('Tap “Allow all”. Android asks for each one.')}
          </L>
        </View>
        <Ring ok={ok} all={count} />
      </View>
      {groups.map((group) => (
        <PermissionCard key={group.id} group={group} onFix={fixRow} />
      ))}
      <L size={12.5} tone="muted" line={17} align="center" style={{ paddingHorizontal: 10 }}>
        {t('Without them, a call may not ring while Erevos is closed. You will find them in Settings → General → Permissions too.')}
      </L>
    </StartScreen>
  );
}

/** The password lock as Keep it safe shows it: on, the password typed and again, the fingerprint
 *  or face too; `locked` once it is on, when it is no more changed here. */
export type KeepLock = { on: boolean; password: string; again: string; fingerprint: boolean; locked: boolean };

/**
 * Keep it safe: the password lock, with the fingerprint or face, and where automatic backups go.
 * `lockedBefore`: a lock on before this step, which the card only says is on (`status`, with
 * `line` and the way to the lock's settings for the fingerprint or face). Google Drive says first
 * what signing in with Google tells Google, in INVISIBLE (`mode`) that it is outside Tor too, and
 * Back from that leaves it unchosen.
 */
export function KeepStep({ dots, lock, onLock, lockedBefore, backup, onBackup, mode, error, busy = false, onBack, onDone }: {
  dots: StepDots;
  lock: KeepLock;
  onLock: (patch: Partial<Omit<KeepLock, 'locked'>>) => void;
  lockedBefore?: { status: string; line: string; onSettings: () => void } | null;
  backup: BackupChoice | null;
  onBackup: (backup: BackupChoice | null) => void;
  mode: Mode;
  /** What went wrong, or what is to be done again; '' for nothing. */
  error: string;
  busy?: boolean;
  onBack?: () => void;
  onDone: () => void;
}) {
  const look = useStartLook();
  // Google Drive's warning, over the choice of it.
  const [sheet, setSheet] = useState(false);
  const strength = lock.on ? strengthOf(lock.password) : null;
  const strengthLook = strength === 'strong' ? { share: 1, color: look.ok, text: t('Strong') } : strength === 'fair' ? { share: 0.66, color: TILES.gold[0], text: t('Fair') } : { share: 0.33, color: look.warn, text: t('Weak') };
  const field = {
    height: 44,
    borderRadius: 16,
    backgroundColor: look.glass,
    borderWidth: 1,
    borderColor: look.line,
    paddingHorizontal: 16,
    fontSize: 15,
    color: look.text,
    paddingVertical: 0,
  } as const;
  const backups: { id: BackupChoice; tile: TileColour; icon: IconName; title: string; line: string; badge?: boolean }[] = [
    { id: 'device', tile: 'teal', icon: 'phoneD', title: t('On this device'), line: t('In a folder you choose') },
    { id: 'webdav', tile: 'blue', icon: 'srv', title: 'WebDAV', line: t('Nextcloud, ownCloud and others') },
    // Only where this app has its client ID of Google's (lib/google-drive-ids.ts): on Android, once given.
    ...(CAN_DRIVE ? [{ id: 'drive' as const, tile: 'green' as const, icon: 'drive' as const, title: 'Google Drive', line: t('Handy, but tied to your account'), badge: true }] : []),
  ];
  // Back from Google Drive's warning: it is not chosen any more.
  const goBackFromSheet = () => {
    setSheet(false);
    onBackup(null);
  };
  return (
    <>
      <StartScreen
        footer={
          <NavRow onBack={onBack}>
            <MainButton title={t('Done')} disabled={busy} onPress={onDone} />
          </NavRow>
        }
      >
        <Dots n={dots.n} of={dots.of} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <Emblem tile="teal" icon="shield" size={52} />
          <View style={{ flex: 1, gap: 2, marginLeft: 6 }}>
            <Highlighted text={t('Keep it *safe*')} size={24} align="left" />
            <L size={12.5} tone="muted" line={17}>
              {t('Optional, but worth it.')}
            </L>
          </View>
        </View>
        {lockedBefore ? (
          <Glass style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Tile tile="gold" icon="key" />
              <View style={{ flex: 1 }}>
                <L size={15} weight="700">
                  {t('A password for Erevos')}
                </L>
                <L size={12.5} tone="ok" line={17}>
                  {lockedBefore.status}
                </L>
              </View>
              <StartToggle on />
            </View>
            {biometricSealer.available() ? (
              <>
                <L size={12.5} tone="muted" line={17}>
                  {lockedBefore.line}
                </L>
                <GhostButton title={t('Lock and second password')} height={44} onPress={lockedBefore.onSettings} />
              </>
            ) : null}
          </Glass>
        ) : (
          <Glass style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Tile tile="gold" icon="key" />
              <View style={{ flex: 1 }}>
                <L size={15} weight="700">
                  {t('A password for Erevos')}
                </L>
              </View>
              <StartToggle on={lock.on} label={t('A password for Erevos')} onChange={(on) => !lock.locked && onLock({ on })} />
            </View>
            {lock.on ? (
              <>
                <TextInput
                  value={lock.password}
                  onChangeText={(password) => onLock({ password })}
                  secureTextEntry
                  editable={!lock.locked}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('Password')}
                  placeholderTextColor={look.faint}
                  accessibilityLabel={t('Password')}
                  style={[field, noOutline]}
                />
                <TextInput
                  value={lock.again}
                  onChangeText={(again) => onLock({ again })}
                  secureTextEntry
                  editable={!lock.locked}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('The password again')}
                  placeholderTextColor={look.faint}
                  accessibilityLabel={t('The password again')}
                  style={[field, noOutline]}
                />
                {strength ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: look.line, overflow: 'hidden' }}>
                      <View style={{ width: `${strengthLook.share * 100}%`, height: 6, backgroundColor: strengthLook.color }} />
                    </View>
                    <L size={12} weight="800" tone={strengthLook.color}>
                      {strengthLook.text}
                    </L>
                  </View>
                ) : null}
                <View style={{ padding: 11, paddingVertical: 9, borderRadius: 14, backgroundColor: tint(look.ok, 0.08), gap: 3 }}>
                  <L size={13} weight="700">
                    {t('For a stronger password')}
                  </L>
                  <Bolded text={`✓ ${t('4 or more random words, such as {example}', { example: `**${t('moon-ladder-orange-7')}**` })}`} size={12.5} />
                  <Bolded text={`✓ ${t('Not a name, a birthday or 1234')}`} size={12.5} />
                  <Bolded text={`✓ ${t('Not the same as the phone’s PIN or another password')}`} size={12.5} />
                  <Bolded text={`✓ ${t('Write it down somewhere safe: if you forget it, it cannot be recovered')}`} size={12.5} />
                </View>
                {biometricSealer.available() ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 }}>
                    <View style={{ flex: 1 }}>
                      <L size={14} weight="600">
                        {t('With your fingerprint or face too')}
                      </L>
                    </View>
                    <StartToggle on={lock.fingerprint} label={t('With your fingerprint or face too')} onChange={(fingerprint) => onLock({ fingerprint })} />
                  </View>
                ) : null}
              </>
            ) : null}
          </Glass>
        )}
        {CAN_AUTO_BACKUP ? (
          <>
            <L size={12} weight="800" tone="muted" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
              {t('Automatic backups · encrypted')}
            </L>
            <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
              {backups.map((each) => (
                <BackupRow
                  key={each.id}
                  {...each}
                  chosen={backup === each.id}
                  onPress={() => {
                    if (backup === each.id) return onBackup(null);
                    onBackup(each.id);
                    // Google Drive says first what signing in with Google tells Google.
                    setSheet(each.id === 'drive');
                  }}
                />
              ))}
            </View>
          </>
        ) : null}
        {error ? (
          <L size={12.5} tone="warn" line={17}>
            {error}
          </L>
        ) : null}
      </StartScreen>
      <StartSheet visible={sheet && backup === 'drive'} onClose={goBackFromSheet}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tile tile="rose" icon="eye" />
          <View style={{ flex: 1 }}>
            <L size={18} weight="700" line={24}>
              {t('Before you sign in with Google')}
            </L>
          </View>
        </View>
        {(
          [
            ['teal', 'lock', t('The backups leave **encrypted**. Google cannot read them.')],
            ['rose', 'eye', t('But Google **knows who you are**. It sees that you use Erevos, when you make a backup and how big it is, and may hand that over if asked.')],
            // In INVISIBLE, that signing in is in the browser, outside Tor.
            ...(mode === 'invisible' ? [['violet', 'ghost', t('This space is INVISIBLE, but signing in happens **in your browser, outside Erevos**, not through Tor: Google sees your internet address then.')] as const] : []),
            ['blue', 'srv', t('For more privacy, choose **this device** or **WebDAV**.')],
          ] as const
        ).map(([tile, icon, text]) => (
          <View key={icon} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Tile tile={tile} icon={icon} size={30} radius={10} iconSize={15} />
            <View style={{ flex: 1 }}>
              <Bolded text={text} />
            </View>
          </View>
        ))}
        {/* Drive stays chosen: the backups screen goes on to sign in. */}
        <MainButton title={t('I understand, sign in with Google')} onPress={() => setSheet(false)} />
        <GhostButton title={t('Back')} onPress={goBackFromSheet} />
      </StartSheet>
    </>
  );
}

// Who sees the address, in a mark: warn where they do, ok and struck through where they do not.
function Sees({ who, sees }: { who: string; sees: boolean }) {
  const look = useStartLook();
  const color = sees ? look.warn : look.ok;
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: tint(color, 0.14) }}>
      <L size={10.5} weight="700" tone={color} line={14} style={{ textDecorationLine: sees ? 'none' : 'line-through' }}>
        {who}
      </L>
    </View>
  );
}

// One mode, as a card to choose: its name, who sees the address, and how calls go; faint where it
// cannot be had here (INVISIBLE where this build has no Tor).
function ModeCard({ mode, chosen, faint, onPress }: { mode: Mode; chosen: boolean; faint: boolean; onPress: () => void }) {
  const look = useStartLook();
  const says = modeSays[mode];
  const { tile, icon } = MODE_LOOKS[mode];
  const a = TILES[tile][0];
  const name = MODE_NAMES[mode];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={`${name}. ${t(says.line)} ${t(says.calls)}`}
      style={({ pressed }) => ({ opacity: (faint ? 0.5 : 1) * (pressed ? 0.8 : 1) })}
    >
      <View
        style={{
          borderRadius: 22,
          borderWidth: chosen ? 1.5 : 1,
          borderColor: chosen ? a : look.line,
          backgroundColor: look.glass,
          overflow: 'hidden',
          boxShadow: chosen ? `0px 10px 30px -12px ${a}` : undefined,
        }}
      >
        {chosen ? <Gradient from={tint(a, 0.22)} to={look.glass} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 }}>
          <Tile tile={tile} icon={icon} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <L size={15} weight="800" style={{ letterSpacing: 1.4 }}>
                {name}
              </L>
              <Radio on={chosen} color={a} />
            </View>
            <L size={12.5} tone="muted" line={17} style={{ marginTop: 3 }}>
              {t(says.line)}
            </L>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Sees who={t('server')} sees={says.server} />
              <Sees who={t('contacts')} sees={says.contacts} />
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: tint(a, 0.18) }}
            >
              <Icon name={mode === 'invisible' ? 'x' : 'phone'} size={12} color={mix(a, look.text, 0.7)} />
              <L size={11.5} weight="700" tone={mix(a, look.text, 0.7)} line={16}>
                {t(says.calls)}
              </L>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// A group of permissions: its tile and title with how many are allowed, and its rows, each with its mark.
function PermissionCard({ group, onFix }: { group: PermissionGroup; onFix: (id: RowId) => void }) {
  const look = useStartLook();
  const { tile, icon } = GROUP_TILES[group.id];
  const ok = group.rows.filter((row) => row.state === 'ok').length;
  return (
    <Glass style={{ paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 6, paddingHorizontal: 14 }}>
        <Tile tile={tile} icon={icon} size={28} radius={9} iconSize={15} />
        <View style={{ flex: 1 }} accessibilityRole="header">
          <L size={13.5} weight="700">
            {groupTitle(group.id)}
          </L>
        </View>
        <L size={12} weight="700" tone="faint">{`${ok}/${group.rows.length}`}</L>
      </View>
      {group.rows.map((row) => {
        const title = rowTitle(row.id);
        const allowed = row.state === 'ok';
        return (
          <Pressable
            key={row.id}
            onPress={() => onFix(row.id)}
            disabled={allowed}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled: allowed, checked: allowed }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingLeft: 52, paddingRight: 14, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <L size={13.5} line={19}>
                {title}
              </L>
            </View>
            {allowed ? (
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(look.ok, 0.25) }}>
                <Icon name="check" size={12} color={look.ok} />
              </View>
            ) : row.state === 'yours' || row.state === 'note' ? (
              <View style={{ height: 22, paddingHorizontal: 7, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: look.glassStrong }}>
                <L size={10} weight="800" tone="muted" line={14}>
                  {t('Open')}
                </L>
              </View>
            ) : (
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: look.line }} />
            )}
          </Pressable>
        );
      })}
    </Glass>
  );
}

// One place for the automatic backups: its tile, name and line, the Google badge where it is tied to an account.
function BackupRow({ tile, icon, title, line, badge, chosen, onPress }: { tile: TileColour; icon: IconName; title: string; line: string; badge?: boolean; chosen: boolean; onPress: () => void }) {
  const look = useStartLook();
  const a = TILES[tile][0];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={`${title}. ${line}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ borderRadius: 20, borderWidth: chosen ? 1.5 : 1, borderColor: chosen ? a : look.line, backgroundColor: look.glass, overflow: 'hidden' }}>
        {chosen ? <Gradient from={tint(a, 0.2)} to={look.glass} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Tile tile={tile} icon={icon} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <L size={15} weight="700">
                {title}
              </L>
              {badge ? (
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: tint(look.warn, 0.15) }}>
                  <L size={11} weight="800" tone="warn" line={15}>
                    {'⚠ Google'}
                  </L>
                </View>
              ) : null}
            </View>
            <L size={12.5} tone="muted" line={17}>
              {line}
            </L>
          </View>
          <Radio on={chosen} color={a} />
        </View>
      </View>
    </Pressable>
  );
}
