import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { canRingInBackground } from '../lib/background';
import { DESKTOP } from '../lib/desktop';
import { LANG_LABELS, LANGS, lang, setLang, t } from '../lib/i18n';
import { WEB_APP } from '../lib/integrity';
import { HAS_CHECKS } from '../lib/permissions';
import type { SettingsIcon, SettingsLeaf, SettingsPlace } from '../lib/settings';
import { PUSH_AVAILABLE } from '../lib/web-push';
import { launcherColors } from '../modules/erevos-icons';
import { smsStatus } from '../modules/erevos-sms';
import { widgetOrder } from '../modules/erevos-widget';
import { space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';
import { Divider } from './guide';
import { BellIcon, ChevronIcon, ContrastIcon, GearIcon, GlobeIcon, LockIcon, PhoneIcon, SignalIcon, StackIcon, StopwatchIcon } from './icons';
import { Card, Sheet, Text } from './ui';

// The rows of the Settings screens (app/settings/), as the user guide's list of sections.

/** Where Erevos runs now, for what the Settings screens show (lib/settings.ts). */
export function settingsPlace(): SettingsPlace {
  const web = Platform.OS === 'web';
  return {
    web,
    webApp: WEB_APP,
    push: PUSH_AVAILABLE,
    background: canRingInBackground || DESKTOP,
    checks: HAS_CHECKS || !web,
    launcher: launcherColors() !== null,
    widget: widgetOrder() !== null,
    sims: (smsStatus()?.slots ?? 0) >= 2,
  };
}

const ICONS: Record<SettingsIcon, (props: { color: string; size?: number }) => ReactNode> = {
  gear: GearIcon,
  globe: GlobeIcon,
  contrast: ContrastIcon,
  bell: BellIcon,
  lock: LockIcon,
  signal: SignalIcon,
  phone: PhoneIcon,
  stack: StackIcon,
  stopwatch: StopwatchIcon,
};

/** A row that opens more: its icon in a round tint, if it has one, its title and a line under it. */
export function SettingsRow({ icon, title, detail, label, onPress }: {
  icon?: SettingsIcon;
  title: string;
  detail?: string;
  /** What a screen reader says, when not the title. */
  label?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const Icon = icon ? ICONS[icon] : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? (detail ? `${title}, ${detail}` : title)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 56,
        paddingVertical: space.md,
        paddingHorizontal: space.md,
        backgroundColor: pressed ? colors.surfacePressed : 'transparent',
      })}
    >
      {Icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.14) }}>
          <Icon color={colors.accentText} size={20} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronIcon color={colors.textFaint} size={16} />
    </Pressable>
  );
}

/** Rows in one card, a line between each two. */
export function SettingsCard({ children, inset = space.md }: { children: ReactNode[]; inset?: number }) {
  const rows = children.filter(Boolean);
  return (
    <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? <Divider inset={inset} /> : null}
          {row}
        </View>
      ))}
    </Card>
  );
}

/** The language's row, named in English too, so it is found in a language one cannot read. */
export function languageTitle(): string {
  return lang() === 'en' ? 'Language · Γλώσσα' : `${t('Language')} · Language`;
}

/** Opens a setting: its screen, or the language list (`onLanguage`). */
export function openLeaf(leaf: SettingsLeaf, onLanguage: () => void) {
  if (leaf.language) onLanguage();
  else if (leaf.href) router.push(leaf.href as Href);
}

/** Every language by its own name, for the whole app (lib/i18n.ts). The screens start again in it, on the home screen. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title={languageTitle()}>
      {LANGS.map((l) => (
        <Pressable
          key={l}
          accessibilityRole="button"
          accessibilityState={{ selected: l === lang() }}
          onPress={() => {
            onClose();
            void setLang(l);
          }}
          style={({ pressed }) => ({ paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: 12, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
        >
          <Text variant="bodyStrong">{l === lang() ? `${LANG_LABELS[l]}  ✓` : LANG_LABELS[l]}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}
