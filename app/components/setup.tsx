// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backgroundState } from '../lib/background';
import { tap } from '../lib/haptics';
import { LANG_LABELS, lang, plural, t } from '../lib/i18n';
import { modulesHere, type Module } from '../lib/modules';
import { lacking, makerOf, type Check } from '../lib/permission-checks';
import { checksOffered, HAS_CHECKS, readChecks } from '../lib/permissions';
import { Logo } from '../lock/gate';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

import { CheckCard } from './check-card';
import { DefaultAppCards } from './default-apps';
import { KeyboardAwareScrollView } from './keyboard';
import { moduleAbout, moduleName } from './module-texts';
import { LanguageSheet, languageTitle } from './settings-list';
import { Button, Card, Chip, Row, SectionTitle, Text, Toggle } from './ui';

// Erevos's very first start (app/_layout.tsx), as an installer is: what Erevos is, its language;
// which of its parts to use (lib/modules.ts), any of them, Erevos's own too, at least one; then,
// on an Android phone, what Android should allow for those, Erevos as the phone app and the SMS
// app among it. Nothing is kept until it is done, and all of it can be changed later in Settings.

type Step = 'welcome' | 'modules' | 'permissions';

export function Setup({ onDone }: { onDone: (chosen: Module[]) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const here = modulesHere();
  const [step, setStep] = useState<Step>('welcome');
  const [chosen, setChosen] = useState<ReadonlySet<Module>>(() => new Set(here));
  const [languages, setLanguages] = useState(false);
  const list = here.filter((m) => chosen.has(m));
  // The Collection alone leaves no chat to open (lib/modules.ts).
  const nothing = list.every((m) => m === 'collection');
  const steps: Step[] = HAS_CHECKS ? ['welcome', 'modules', 'permissions'] : ['welcome', 'modules'];
  const at = steps.indexOf(step);

  function toggle(module: Module) {
    tap();
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  function finish() {
    if (HAS_CHECKS) void checksOffered();
    onDone(list);
  }

  const next = () => (at + 1 < steps.length ? setStep(steps[at + 1]) : finish());

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: space.xl - 4, paddingTop: insets.top + space.xl, gap: space.md }}
      >
        <Text variant="overline" tone="muted">
          {t('Setting up Erevos · step {n} of {m}', { n: at + 1, m: steps.length })}
        </Text>
        {step === 'welcome' ? (
          <>
            <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
              <Logo size={72} />
              <Text variant="title" style={{ textAlign: 'center' }}>
                {t('Welcome to Erevos')}
              </Text>
            </View>
            <Card>
              <Text style={hint}>
                {t('Erevos brings your chats and calls into one app, end-to-end encrypted wherever it can be. It is made of parts: Erevos\'s own chats, the Phone, the SMS, and chats with Nostr, Matrix and XMPP apps.')}
              </Text>
              <Text tone="muted" style={hint}>
                {t('Choose only the parts you use. The others do not start at all, so Erevos is lighter, opens faster and uses less battery. You can change them any time in Settings → General → Modules, and nothing of a part is deleted while it is off.')}
              </Text>
            </Card>
            <SectionTitle title={languageTitle()} />
            <Row wrap>
              <Chip label={LANG_LABELS[lang()]} selected onPress={() => setLanguages(true)} />
            </Row>
          </>
        ) : step === 'modules' ? (
          <>
            <Text variant="title">{t('Choose the parts you use')}</Text>
            <Text tone="muted" style={hint}>
              {t('Any of them, one or more. Contacts, the password, the spaces and the backups are always there.')}
            </Text>
            {here.map((module) => (
              <Pressable
                key={module}
                onPress={() => toggle(module)}
                accessibilityRole="switch"
                accessibilityState={{ checked: chosen.has(module) }}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Card>
                  <Row style={{ alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="bodyStrong">{moduleName(module)}</Text>
                      <Text variant="caption" tone="muted" style={hint}>
                        {moduleAbout(module)}
                      </Text>
                    </View>
                    <Toggle on={chosen.has(module)} />
                  </Row>
                </Card>
              </Pressable>
            ))}
            {nothing ? (
              <Text variant="caption" color={colors.danger}>
                {t('Choose at least one.')}
              </Text>
            ) : null}
          </>
        ) : (
          <SetupPermissions modules={list} />
        )}
        <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
          {at > 0 ? <Button title={t('Back')} kind="ghost" compact onPress={() => setStep(steps[at - 1])} /> : <View />}
          <Button
            title={at + 1 < steps.length ? t('Next') : t('Start Erevos')}
            disabled={step === 'modules' && nothing}
            onPress={next}
          />
        </Row>
        <View style={{ height: insets.bottom + space.lg }} />
      </KeyboardAwareScrollView>
      <LanguageSheet visible={languages} onClose={() => setLanguages(false)} />
    </View>
  );
}

// What Android should allow for the parts chosen, read again on coming back from its question or
// settings.
function SetupPermissions({ modules }: { modules: Module[] }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const maker = makerOf(backgroundState()?.maker);
  const key = modules.join(',');

  const read = useCallback(() => {
    void readChecks(key ? (key.split(',') as Module[]) : [])
      .then(setChecks)
      .catch(() => setChecks([]));
  }, [key]);

  useEffect(() => {
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => subscription.remove();
  }, [read]);

  const needed = checks?.filter((check) => check.needed) ?? [];
  const others = checks?.filter((check) => !check.needed) ?? [];
  const missing = needed.filter(lacking).length;
  return (
    <>
      <Text variant="title">{t('What Android should allow')}</Text>
      <Text tone="muted" style={hint}>
        {t('For the parts you chose to work while Erevos is closed, Android should allow these. Each button opens Android\'s own question or setting, and nothing is sent anywhere. You can also do it later, in Settings → General → Permissions.')}
      </Text>
      <DefaultAppCards modules={modules} />
      {checks === null ? null : (
        <>
          {needed.length ? (
            <SectionTitle
              title={missing
                  ? plural(missing, 'For calls and messages in the background · {n} is missing', 'For calls and messages in the background · {n} are missing')
                  : t('For calls and messages in the background · all allowed')}
            />
          ) : null}
          {needed.map((check) => (
            <CheckCard key={check.id} check={check} maker={maker} onChanged={read} />
          ))}
          {others.length ? <SectionTitle title={t('For other things')} /> : null}
          {others.map((check) => (
            <CheckCard key={check.id} check={check} maker={maker} onChanged={read} />
          ))}
        </>
      )}
    </>
  );
}

// Hints read better a little larger and looser than captions.
const hint = { fontSize: 14, lineHeight: 20 };
