import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { mark, t } from '../lib/i18n';
import {
  LAUNCHER_COLORS,
  LAUNCHER_ICONS,
  launcherColors,
  setLauncherColor,
  type LauncherColor,
  type LauncherIcon,
} from '../modules/erevos-icons';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';
import { Card, SectionTitle, Text } from './ui';

// Appearance → Launcher icons: the colour of each of Erevos's icons in the phone's apps (Erevos,
// Phone, SMS, Contacts), each drawn in every colour to pick from. Android only, and the phone's
// choice, not a space's (modules/erevos-icons).

const ICON_LABELS: Record<LauncherIcon, string> = { erevos: 'Erevos', phone: mark('Phone'), sms: 'SMS', contacts: mark('Contacts') };
const COLOR_LABELS: Record<LauncherColor, string> = {
  red: mark('Red'),
  orange: mark('Orange'),
  green: mark('Green'),
  blue: mark('Blue'),
  violet: mark('Violet'),
  dark: mark('Dark'),
};

// Each icon in each colour, as the launcher draws it (modules/*/res/mipmap-*), made small.
const PICTURES: Record<LauncherIcon, Record<LauncherColor, ImageSourcePropType>> = {
  erevos: {
    red: require('../assets/icon/launcher/erevos-red.png'),
    orange: require('../assets/icon/launcher/erevos-orange.png'),
    green: require('../assets/icon/launcher/erevos-green.png'),
    blue: require('../assets/icon/launcher/erevos-blue.png'),
    violet: require('../assets/icon/launcher/erevos-violet.png'),
    dark: require('../assets/icon/launcher/erevos-dark.png'),
  },
  phone: {
    red: require('../assets/icon/launcher/phone-red.png'),
    orange: require('../assets/icon/launcher/phone-orange.png'),
    green: require('../assets/icon/launcher/phone-green.png'),
    blue: require('../assets/icon/launcher/phone-blue.png'),
    violet: require('../assets/icon/launcher/phone-violet.png'),
    dark: require('../assets/icon/launcher/phone-dark.png'),
  },
  sms: {
    red: require('../assets/icon/launcher/sms-red.png'),
    orange: require('../assets/icon/launcher/sms-orange.png'),
    green: require('../assets/icon/launcher/sms-green.png'),
    blue: require('../assets/icon/launcher/sms-blue.png'),
    violet: require('../assets/icon/launcher/sms-violet.png'),
    dark: require('../assets/icon/launcher/sms-dark.png'),
  },
  contacts: {
    red: require('../assets/icon/launcher/contacts-red.png'),
    orange: require('../assets/icon/launcher/contacts-orange.png'),
    green: require('../assets/icon/launcher/contacts-green.png'),
    blue: require('../assets/icon/launcher/contacts-blue.png'),
    violet: require('../assets/icon/launcher/contacts-violet.png'),
    dark: require('../assets/icon/launcher/contacts-dark.png'),
  },
};

/** The Launcher icons section, or nothing where the phone offers no choice. */
export function LauncherIcons() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [chosen, setChosen] = useState(launcherColors);
  if (!chosen) return null;

  function choose(icon: LauncherIcon, color: LauncherColor) {
    if (chosen?.[icon] === color) return;
    if (setLauncherColor(icon, color)) setChosen(launcherColors());
  }

  return (
    <>
      <SectionTitle title={t('Launcher icons')} />
      <Text variant="caption" tone="muted" style={styles.hint}>
        {t("The color of each icon among the phone's apps. It is the phone's, not each space's, as the icons show before Erevos is unlocked.")}
      </Text>
      {LAUNCHER_ICONS.map((icon) => (
        <Card key={icon}>
          <Text variant="bodyStrong">{t(ICON_LABELS[icon])}</Text>
          <View style={styles.row}>
            {LAUNCHER_COLORS.map((color) => {
              const selected = chosen[icon] === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => choose(icon, color)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t(ICON_LABELS[icon])}: ${t(COLOR_LABELS[color])}`}
                  style={[styles.choice, { borderColor: selected ? colors.text : 'transparent' }]}
                >
                  <Image source={PICTURES[icon][color]} style={styles.picture} />
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
      <Text variant="caption" tone="muted" style={styles.hint}>
        {t('After a change some launchers take the icon off the home screen: add it again from the list of apps. The change shows within a few seconds.')}
      </Text>
    </>
  );
}

const makeStyles = (_colors: Colors) =>
  StyleSheet.create({
    hint: {
      fontSize: 14,
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: space.sm,
    },
    choice: {
      padding: 3,
      borderWidth: 2,
      borderRadius: radius.sm,
    },
    picture: {
      width: 40,
      height: 40,
      borderRadius: 2,
    },
  });
