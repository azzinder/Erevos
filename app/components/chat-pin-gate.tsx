// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { space } from '../theme/colors';
import { useTheme } from '../theme/context';

import { Backdrop, useBackdropSpec } from './backdrop';
import { BackIcon, LockIcon } from './icons';
import { PasswordSheet } from './PasswordSheet';
import { Button, Text, TextButton } from './ui';

// What a chat locked with a PIN of its own (lock/chat-pin.ts) shows until its PIN is typed: over
// the chat, which shows nothing meanwhile, its name and a lock, and the field for the PIN at once.
// Nothing under it shows through: where the look leaves the ground see-through (glass, a
// wallpaper, a style's scene), it lies on a solid one, with the look's backdrop drawn anew in it
// under a dense frost, as glass that lets no light through.
// `open` says whether the PIN opens it, and throws while wrong ones make it wait. `active`: the
// chat is on the screen, so the field may show. `forgot`, where the space has a password: whether
// that password is the space's own, which then takes the PIN off.
export function ChatPinGate({ name, active, open, forgot, onBack }: {
  name: string;
  active: boolean;
  open: (pin: string) => Promise<boolean>;
  forgot?: (password: string) => Promise<boolean>;
  onBack: () => void;
}) {
  const { colors, scheme } = useTheme();
  const spec = useBackdropSpec();
  const solid = /^#[0-9a-f]{6}$/i.test(colors.ground) ? colors.ground : scheme === 'dark' ? '#000000' : '#FFFFFF';
  const [asking, setAsking] = useState(true);
  const [forgetting, setForgetting] = useState(false);
  // Each time it shows again, the field shows again.
  useEffect(() => {
    if (active) setAsking(true);
  }, [active]);
  return (
    <View style={[StyleSheet.absoluteFill, styles.gate, { backgroundColor: solid }]}>
      <Backdrop spec={spec}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: spec ? colors.sheet : solid }]} />
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8} style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
          <BackIcon color={colors.text} size={24} />
        </Pressable>
        <View style={styles.middle}>
          <LockIcon color={colors.textMuted} size={48} />
          <Text variant="title" numberOfLines={2} style={styles.center}>
            {name}
          </Text>
          <Text tone="muted" style={styles.center}>
            {t('This chat is locked with a PIN.')}
          </Text>
          <Button title={t('Type the PIN')} onPress={() => setAsking(true)} />
          {forgot ? (
            <TextButton
              title={t('Forgot the PIN?')}
              onPress={() => {
                setAsking(false);
                setForgetting(true);
              }}
            />
          ) : null}
        </View>
        <PasswordSheet
          visible={active && asking}
          title={t('PIN of {name}', { name })}
          repeat={false}
          submitLabel={t('Open')}
          onClose={() => setAsking(false)}
          onSubmit={open}
        />
        {forgot ? (
          <PasswordSheet
            visible={active && forgetting}
            title={t('The password that opens this space takes the PIN off')}
            repeat={false}
            submitLabel={t('Take it off')}
            onClose={() => setForgetting(false)}
            onSubmit={forgot}
          />
        ) : null}
      </Backdrop>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { zIndex: 10, elevation: 10 },
  back: { position: 'absolute', top: space.md, left: space.md, padding: space.xs, zIndex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  center: { textAlign: 'center' },
});
