// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, TextInput, View } from 'react-native';

import { tap } from '../lib/haptics';
import { editionName, EDITION } from '../lib/edition';
import { findMoves, type FoundMove } from '../lib/edition-move';
import { startSteps, stepAt } from '../lib/first-start';
import { updateEditionName } from '../lib/update-channel';
import { LANG_LABELS, lang, t } from '../lib/i18n';
import { bringsServer } from '../lib/invite-server';
import { modulesHere, type Module } from '../lib/modules';
import { linkParts, peekLink } from '../lib/open-link';
import { HAS_CHECKS } from '../lib/permissions';
import type { SetupChosen } from '../lib/setup-after';
import { draftNow, forgetPassword, keepDraft, newDraft, typedPassword, typePassword, type SetupDraft } from '../lib/setup-draft';
import { welcomeOf } from '../lib/welcome';
import { MAX_NAME } from '../lock/e2e-data';
import { useStartLook, Dots, Emblem, FooterLink, Glass, Hero, Icon, L, MainButton, NavRow, noOutline, StartScreen, StartToggle, Tile, type IconName } from './first-start-look';
import { askInvisible } from './mode-picker';
import { moduleAbout, moduleName } from './module-texts';
import { MIN_PASSWORD } from './PasswordSheet';
import { LanguageSheet, languageTitle } from './settings-list';
import { KeepStep, ModeStep, PermissionsStep } from './start-steps';
import type { Tile as TileColour } from '../lib/first-start';

// Erevos's very first start (app/_layout.tsx), all of it before its first space opens, in the
// first start's look (components/first-start-look.tsx, lib/first-start.ts): the welcome, with what
// Erevos is and is not (no identity to give away), an optional name for the contacts, and its
// language; What will you use?, the modules (lib/modules.ts), any of them, Erevos's own too, at
// least one for chats; then How visible are you?, every permission, and Keep it safe, the password
// lock and the backups (components/start-steps.tsx). Each step only chooses: the choices are kept
// as they are made (lib/setup-draft.ts), Next and Back go through the steps as they were left,
// Android's back key too, and nothing is used but the permissions Android keeps once given, nor
// does anything leave the phone, until the last step's Done. Then the first space is made with
// them, opening in its mode and locked with its password, and the rest follows once it is open
// (app/first-steps.tsx): the fingerprint or face, the server, the backups. Moving from another
// phone skips the rest, which comes with the backup; on a computer or in a browser, linking it to
// the phone does too. All of it can be changed later in Settings.

/** What the first start's setup chose. */
export type SetupChoice = {
  modules: Module[];
  /** The name for the contacts, or ''. */
  name: string;
  /** Moving from another phone: a backup is restored next. */
  restore: boolean;
  /** A computer or a browser linked to the phone next. */
  linkPhone: boolean;
  /** The rest of the whole setup, chosen before the space opens, which it opens with; none moving
   *  from another phone or linking to it, whose steps come once the space is open. */
  chosen?: SetupChosen;
};

// The screens an invite opens (lib/open-link.ts): Erevos opened with one waits to show it.
const INVITES = new Set(['/welcome', '/text-invite', '/contact', '/c', '/i', '/join', '/relay-invite']);

/** Who invites, when Erevos was opened with an invite: their name, or '' when it gives none; null for no invite. */
function inviteFrom(href: string | null): string | null {
  if (!href) return null;
  const { path, params } = linkParts(href);
  if (!INVITES.has(path)) return null;
  return path === '/welcome' ? (welcomeOf(params)?.name ?? '') : '';
}

// The four main modules start on, with their tiles; any other (Erevos+'s networks) starts off.
const MAIN: readonly Module[] = ['erevos', 'phone', 'sms', 'collection'];
const MODULE_TILES: Partial<Record<Module, { tile: TileColour; icon: IconName }>> = {
  erevos: { tile: 'gold', icon: 'chat' },
  phone: { tile: 'teal', icon: 'phone' },
  sms: { tile: 'blue', icon: 'sms' },
  collection: { tile: 'violet', icon: 'col' },
};

function moduleLine(module: Module): string {
  switch (module) {
    case 'erevos':
      return t('Messages, groups and calls');
    case 'phone':
      return t('Your mobile calls here too');
    case 'sms':
      return t('Your SMS with your chats');
    case 'collection':
      return t('Encrypted photos and files');
    default:
      return moduleAbout(module);
  }
}

// A small label over a group.
function GroupLabel({ children }: { children: string }) {
  return (
    <L size={12} weight="800" tone="muted" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
      {children}
    </L>
  );
}

export function Setup({ onDone }: { onDone: (choice: SetupChoice) => Promise<void> }) {
  const look = useStartLook();
  const here = modulesHere();
  // The setup as it was left, or a new one (lib/setup-draft.ts); the password typed, in memory only.
  const [draft, setDraft] = useState<SetupDraft>(() => draftNow() ?? newDraft(here.filter((m) => MAIN.includes(m))));
  const [typed, setTyped] = useState(typedPassword);
  const [languages, setLanguages] = useState(false);
  const [link] = useState(() => peekLink());
  const invite = inviteFrom(link);
  // Another edition on this phone that made a move for this one (lib/edition-move.ts).
  const [move, setMove] = useState<FoundMove | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // INVISIBLE was asked about, and chosen so, since it was chosen last.
  const invisibleAsked = useRef(false);
  useEffect(() => {
    let active = true;
    void findMoves().then((found) => active && setMove(found[0] ?? null), () => undefined);
    return () => {
      active = false;
    };
  }, []);
  // Each choice kept as it is made.
  useEffect(() => keepDraft(draft), [draft]);
  const change = (patch: Partial<SetupDraft>) => setDraft((was) => ({ ...was, ...patch }));

  // With one module only (Erevos Lite, lib/edition.ts, or a device with Erevos's own chats alone)
  // there is nothing to choose: no step for the modules.
  const single = here.length === 1;
  const steps = startSteps({ choice: !single, restored: false, checks: HAS_CHECKS });
  const step = steps.includes(draft.step) ? draft.step : 'welcome';
  const at = steps.indexOf(step);
  const dots = stepAt(steps, step);
  const go = (to: number) => {
    setNote('');
    change({ step: steps[Math.max(0, Math.min(to, steps.length - 1))] });
  };
  const next = () => go(at + 1);
  const back = at > 0 && !busy ? () => go(at - 1) : undefined;
  const list = here.filter((m) => draft.modules.includes(m));
  // The Collection alone leaves no chat to open (lib/modules.ts).
  const nothing = list.every((m) => m === 'collection');
  const mains = here.filter((m) => MAIN.includes(m));
  const others = here.filter((m) => !MAIN.includes(m));
  // LPHL's server, with Erevos's own chats, unless the invite Erevos opened with brings one
  // (lib/invite-server.ts): taken once the space is open, or another chosen instead.
  const serves = list.includes('erevos') && !bringsServer(link ?? undefined);

  // Android's back key goes back a step; on the welcome it leaves, and the setup waits as it was.
  const backKey = useRef(back);
  backKey.current = back;
  useEffect(() => {
    if (at === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      backKey.current?.();
      return true;
    });
    return () => subscription.remove();
  }, [at]);

  function toggle(module: Module) {
    tap();
    change({ modules: here.filter((m) => (m === module ? !draft.modules.includes(m) : draft.modules.includes(m))) });
  }

  // Moving from another phone, or linking to it: the rest comes with the backup, or from the phone.
  const moveHere = () => void onDone({ modules: here, name: '', restore: true, linkPhone: false });

  // How visible: INVISIBLE asks first, once for each time it is chosen.
  async function continueMode() {
    if (draft.mode === 'invisible' && !invisibleAsked.current) {
      if (!(await askInvisible())) return;
      invisibleAsked.current = true;
    }
    next();
  }

  // Done: the password checked as Settings checks it, then the first space is made with all of it.
  async function done() {
    if (busy) return;
    setNote('');
    if (draft.lock) {
      if ([...typed.password].length < MIN_PASSWORD) return setNote(t('Use at least {n} characters.', { n: MIN_PASSWORD }));
      if (typed.password !== typed.again) return setNote(t('The passwords do not match.'));
    } else forgetPassword();
    setBusy(true);
    try {
      await onDone({
        modules: list,
        name: draft.name.trim(),
        restore: false,
        linkPhone: false,
        chosen: { mode: draft.mode, server: serves ? draft.server : 'lphl', lock: draft.lock, fingerprint: draft.lock && draft.fingerprint, backup: draft.backup },
      });
    } catch (error) {
      // Nothing of the setup is lost: it says why, and Done tries again.
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'mode') {
    return (
      <ModeStep
        dots={dots}
        choice={draft.mode}
        onChoose={(mode) => {
          if (mode !== draft.mode) invisibleAsked.current = false;
          change({ mode });
        }}
        status={!serves ? null : draft.server === 'other' ? t('Another server · you set it once the setup is done') : t('LPHL’s server is waiting for you · free')}
        link={
          !serves
            ? undefined
            : draft.server === 'other'
              ? { text: t('Use LPHL’s server'), onPress: () => change({ server: 'lphl' }) }
              : { text: t('Another server (for advanced users)'), onPress: () => change({ server: 'other' }) }
        }
        note={note}
        onNote={setNote}
        onBack={back}
        onContinue={() => void continueMode()}
      />
    );
  }

  if (step === 'permissions') {
    return <PermissionsStep dots={dots} modules={list} before onBack={back} onContinue={next} />;
  }

  if (step === 'keep') {
    return (
      <KeepStep
        dots={dots}
        lock={{ on: draft.lock, password: typed.password, again: typed.again, fingerprint: draft.fingerprint, locked: false }}
        onLock={({ on, password, again, fingerprint }) => {
          if (on !== undefined) change({ lock: on });
          if (fingerprint !== undefined) change({ fingerprint });
          if (password !== undefined || again !== undefined) {
            const now = { password: password ?? typed.password, again: again ?? typed.again };
            typePassword(now);
            setTyped(now);
          }
        }}
        backup={draft.backup}
        onBackup={(backup) => change({ backup })}
        mode={draft.mode}
        error={note}
        busy={busy}
        onBack={back}
        onDone={() => void done()}
      />
    );
  }

  if (step === 'welcome') {
    return (
      <>
        <StartScreen
          footer={
            <>
              <MainButton title={t('Get started')} onPress={next} />
              {Platform.OS === 'android' ? (
                // The name and the modules come with the backup.
                <FooterLink text={t('I already have Erevos on another phone')} link={t('Move it here')} onPress={moveHere} />
              ) : (
                // A computer or a browser beside the phone: the phone's modules are the ones that count.
                <FooterLink link={t('Link to my phone')} onPress={() => void onDone({ modules: here, name: '', restore: false, linkPhone: true })} />
              )}
            </>
          }
        >
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 }}>
            <Pressable
              onPress={() => setLanguages(true)}
              accessibilityRole="button"
              accessibilityLabel={`${languageTitle()}: ${LANG_LABELS[lang()]}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 30,
                paddingHorizontal: 12,
                borderRadius: 15,
                backgroundColor: look.glass,
                borderWidth: 1,
                borderColor: look.line,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="globe" size={14} color={look.text} />
              <L size={12.5} weight="700">
                {LANG_LABELS[lang()]}
              </L>
            </Pressable>
          </View>
          {invite !== null ? (
            <Glass style={{ padding: 14, gap: 4 }}>
              <L size={15} weight="700">
                {invite ? t('{name} invites you to Erevos', { name: invite }) : t('An invite to Erevos')}
              </L>
              <L size={12.5} tone="muted" line={17}>
                {t('It opens after the setup: the invite waits for you.')}
              </L>
            </Glass>
          ) : null}
          <View style={{ alignItems: 'center', gap: 8, paddingTop: 6 }}>
            <Image
              source={require('../assets/icon/icon.png')}
              style={{ width: 112, height: 112, borderRadius: 28, marginTop: 18, boxShadow: `0px 18px 50px -8px ${look.glow}` }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View style={{ marginTop: 14, alignSelf: 'stretch' }}>
              <Hero title={t('Welcome to {app}', { app: `*${editionName()}*` })} sub={t('You talk with whoever you want. No one else listens.')} />
            </View>
          </View>
          {move ? (
            <Glass style={{ padding: 14, gap: 8 }}>
              <L size={15} weight="700">
                {t('{edition} is on this phone', { edition: updateEditionName(move.from) })}
              </L>
              <L size={12.5} tone="muted" line={17}>
                {t('It made everything ready for this app: every space, with its contacts, messages and settings. Bring it here, then open the spaces with their passwords, as before.', { edition: updateEditionName(move.from) })}
              </L>
              <MainButton title={t('Bring everything here')} onPress={moveHere} />
            </Glass>
          ) : null}
          <Glass style={{ paddingVertical: 4 }}>
            {(
              [
                ['slate', 'id', t('No number, email or account'), t('You give nothing to start.')],
                ['teal', 'shield', t('Everything encrypted'), t('Messages and calls for the two of you alone.')],
                ['blue', 'qr', t('You add people by QR code or link'), t('No one finds you unless you want.')],
              ] as const
            ).map(([tile, icon, title, line]) => (
              <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 }}>
                <Tile tile={tile} icon={icon} />
                <View style={{ flex: 1 }}>
                  <L size={15} weight="700">
                    {title}
                  </L>
                  <L size={12.5} tone="muted" line={17}>
                    {line}
                  </L>
                </View>
              </View>
            ))}
          </Glass>
          <View
            style={{ height: 50, borderRadius: 16, backgroundColor: look.glass, borderWidth: 1, borderColor: look.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}
          >
            <Icon name="user" size={18} color={look.primary} />
            <TextInput
              value={draft.name}
              onChangeText={(name) => change({ name })}
              placeholder={t('Your name (optional)')}
              placeholderTextColor={look.faint}
              maxLength={MAX_NAME}
              autoCapitalize="words"
              accessibilityLabel={t('Your name (optional)')}
              style={[{ flex: 1, height: 50, fontSize: 15, color: look.text, paddingVertical: 0 }, noOutline]}
            />
          </View>
        </StartScreen>
        <LanguageSheet visible={languages} onClose={() => setLanguages(false)} />
      </>
    );
  }

  const row = (module: Module) => {
    const on = draft.modules.includes(module);
    const look_ = MODULE_TILES[module] ?? { tile: 'slate' as const, icon: 'globe' as const };
    // Erevos+'s own chats are called by its name (lib/edition.ts).
    const title = module === 'erevos' ? t('Erevos chats') : moduleName(module);
    return (
      <Pressable
        key={module}
        onPress={() => toggle(module)}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: on }}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Tile tile={look_.tile} icon={look_.icon} />
          <View style={{ flex: 1 }}>
            <L size={15} weight="700">
              {title}
            </L>
            <L size={12.5} tone="muted" line={17}>
              {moduleLine(module)}
            </L>
          </View>
          <StartToggle on={on} />
        </Glass>
      </Pressable>
    );
  };

  return (
    <StartScreen
      footer={
        <NavRow onBack={back}>
          <MainButton title={t('Continue')} disabled={nothing} onPress={next} />
        </NavRow>
      }
    >
      <Dots n={dots.n} of={dots.of} />
      <Hero
        emblem={<Emblem tile={EDITION === 'plus' ? 'violet' : 'blue'} icon="chat" />}
        title={t('What will you use?')}
        sub={t('What you leave off does not run at all. Change them any time.')}
      />
      {mains.map(row)}
      {others.length ? (
        <>
          <GroupLabel>{t('Other networks')}</GroupLabel>
          {others.map(row)}
        </>
      ) : null}
      {nothing ? (
        <L size={12.5} tone="warn" line={17}>
          {t('Choose at least one for chats: the Collection alone has nothing to open.')}
        </L>
      ) : null}
    </StartScreen>
  );
}
