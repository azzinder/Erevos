// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Linking, Platform, Text as NativeText, type StyleProp, type TextStyle } from 'react-native';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { IP_GUIDE, ipWarningText } from '../lib/ip-warning';
import { splitLinks } from '../lib/links';
import { hasStyle, styleText, type Look, type StyledPart } from '../lib/text-style';

import { openGuideLink } from './guide';

/**
 * Asks before opening a web address from a message, showing it whole and that the site sees this
 * phone's internet address (lib/ip-warning.ts), with the guide's section on it; then opens it in the browser.
 */
export function openLink(url: string): void {
  const { message } = ipWarningText({ network: '', act: 'link', of: '' });
  ask(t('Open this link?'), `${url}\n\n${message}`, [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Guide'), onPress: () => openGuideLink(IP_GUIDE) },
    { text: t('Open'), onPress: () => void Linking.openURL(url).catch(() => undefined) },
  ]);
}

const MONO = Platform.OS === 'web' ? 'ui-monospace, Menlo, Consolas, monospace' : 'monospace';

// How a run of words looks (lib/text-style.ts). What is hidden shows as a grey bar, its words
// the same grey, until tapped.
function lookStyle(look: Look, shown: boolean): TextStyle {
  const style: TextStyle = {};
  if (look.bold) style.fontWeight = '700';
  if (look.italic) style.fontStyle = 'italic';
  if (look.strike) style.textDecorationLine = 'line-through';
  if (look.code) {
    style.fontFamily = MONO;
    style.backgroundColor = 'rgba(127,127,127,0.18)';
  }
  if (look.hidden && !shown) {
    style.color = 'rgba(127,127,127,0.85)';
    style.backgroundColor = 'rgba(127,127,127,0.85)';
  }
  return style;
}

// Words with their web addresses underlined and tappable.
function withLinks(text: string, key: string, style: StyleProp<TextStyle>, tappable: boolean) {
  return splitLinks(text).map((part, i) =>
    part.url && tappable ? (
      <NativeText key={`${key}-${i}`} style={[{ textDecorationLine: 'underline' }, style]} onPress={() => openLink(part.url!)} accessibilityRole="link">
        {part.text}
      </NativeText>
    ) : style ? (
      <NativeText key={`${key}-${i}`} style={style}>
        {part.text}
      </NativeText>
    ) : (
      part.text
    ),
  );
}

/**
 * A message's words, its web addresses underlined and tappable (lib/links.ts), and its marks shown
 * as they say (lib/text-style.ts): bold, italic, struck through, code, and words hidden till
 * tapped, each hidden part apart. Inside a Text, so it takes that Text's look; nothing is fetched
 * or opened until tapped and confirmed, and a hidden link opens only once it shows. `parts`, the
 * runs a message came with already made (a Matrix message's HTML, lib/matrix-html.ts), in place of
 * reading the marks of `text`.
 */
export function LinkedText({ text, style, parts }: { text: string; style?: StyleProp<TextStyle>; parts?: StyledPart[] }) {
  const [shown, setShown] = useState<number[]>([]);
  // Edited words hide again: their hidden parts may be others.
  useEffect(() => setShown([]), [text, parts]);
  if (!parts && !hasStyle(text)) {
    if (splitLinks(text).every((piece) => !piece.url)) return <>{text}</>;
    return <>{withLinks(text, 'w', style, true)}</>;
  }
  return (
    <>
      {(parts ?? styleText(text)).map((part, i) => {
        const open = part.spoiler === undefined || shown.includes(part.spoiler);
        const look = [lookStyle(part.look, open), style];
        if (!open) {
          const spoiler = part.spoiler!;
          return (
            <NativeText key={i} style={look} onPress={() => setShown((was) => [...was, spoiler])} accessibilityRole="button" accessibilityLabel={t('Hidden words, tap to show')}>
              {part.text}
            </NativeText>
          );
        }
        return (
          <NativeText key={i} style={look}>
            {withLinks(part.text, String(i), undefined, true)}
          </NativeText>
        );
      })}
    </>
  );
}
