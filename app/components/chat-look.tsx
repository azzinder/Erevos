// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useLayoutEffect, type ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { AppearanceEditor } from '../app/appearance';
import { t } from '../lib/i18n';
import { ChatTheme, type ChatLook } from '../theme/chat-theme';
import { useTheme } from '../theme/context';

import { ScreenBackdrop, useBackdropSpec } from './backdrop';
import { SwipeBack } from './swipe-back';
import { Button, Row, Text, TextButton } from './ui';

// A chat on a screen of its own (a group, Chat with myself, a chat on Matrix, XMPP or Nostr) in its
// own look, as a contact's chat is (app/chat.tsx): the chat tells its look (ChatLook) to the screen,
// which draws everything in it, the backdrop and the header's back arrow too, and changing it from
// the chat (ChatLookSheet) changes it at once. Without one of its own the chat takes the space's.

/** The status bar's icons, light or dark as the chat's look is. */
export function ChatStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

// The header over the chat, as the root layout draws it (app/_layout.tsx), in the chat's look:
// over a backdrop see-through (the glass's one pane: the dense pane), else on the look's sheet.
function HeaderInLook() {
  const navigation = useNavigation();
  const spec = useBackdropSpec();
  const { colors } = useTheme();
  const kind = spec?.kind ?? null;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: !kind ? colors.sheet : kind === 'wall' ? colors.sheet : 'transparent' },
      headerTransparent: kind !== null,
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.ground },
    });
  }, [navigation, kind, colors]);
  return null;
}

/**
 * A chat's screen in `chat`'s look (none yet: the space's). `header`: the screen has the root
 * stack's header, whose back arrow takes the look too. A swipe to the right goes back, with `onBack`
 * or to the screen before.
 */
export function ChatScreen({ chat, header = false, onBack, children }: { chat: ChatLook | null; header?: boolean; onBack?: () => void; children: ReactNode }) {
  return (
    <ChatTheme look={chat?.look ?? null} onChange={(look) => chat?.save(look)}>
      <ScreenBackdrop>
        {header ? <HeaderInLook /> : null}
        <ChatStatusBar />
        <SwipeBack onBack={onBack}>{children}</SwipeBack>
      </ScreenBackdrop>
    </ChatTheme>
  );
}

/**
 * A chat's own look, chosen with the choices of Appearance (app/appearance.tsx) for that chat
 * only, over the chat. Drawn inside the chat's ChatTheme, whose look it changes; Same as the app
 * gives the chat the space's look again.
 */
export function ChatLookSheet({ visible, onClose, name, chat }: { visible: boolean; onClose: () => void; name: string; chat: ChatLook | null }) {
  const { colors } = useTheme();
  const own = !!chat?.look;
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <ScreenBackdrop>
        <View style={{ flex: 1, backgroundColor: colors.ground }}>
          <AppearanceEditor
            title={name ? t('Look of {name}', { name }) : t('Look of this chat')}
            top={
              <View style={{ gap: 8 }}>
                <Text variant="caption" tone="muted">
                  {own
                    ? t('This chat has its own look, kept only on this phone. The rest of the app keeps its own.')
                    : t("This chat follows the app's look. Change anything below to give it its own.")}
                </Text>
                <Row wrap>
                  <Button title={t('Done')} compact onPress={onClose} />
                  {own && chat ? <TextButton title={t('Same as the app')} onPress={() => void chat.save(null)} /> : null}
                </Row>
              </View>
            }
          />
        </View>
      </ScreenBackdrop>
    </Modal>
  );
}
