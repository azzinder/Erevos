import { Linking, Text as NativeText, type StyleProp, type TextStyle } from 'react-native';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { splitLinks } from '../lib/links';

/** Asks before opening a web address from a message, showing it whole, then opens it in the browser. */
export function openLink(url: string): void {
  ask(t('Open this link?'), url, [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Open'), onPress: () => void Linking.openURL(url).catch(() => undefined) },
  ]);
}

/**
 * A message's words, its web addresses underlined and tappable (lib/links.ts). Inside a Text, so
 * it takes that Text's look; nothing is fetched or opened until tapped and confirmed.
 */
export function LinkedText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = splitLinks(text);
  if (parts.every((part) => !part.url)) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.url ? (
          <NativeText key={i} style={[{ textDecorationLine: 'underline' }, style]} onPress={() => openLink(part.url!)} accessibilityRole="link">
            {part.text}
          </NativeText>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
