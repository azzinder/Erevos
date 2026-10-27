import Constants from 'expo-constants';
import { View } from 'react-native';

import { GuideText } from '../components/guide';
import { Card, Page, Text } from '../components/ui';
import { t } from '../lib/i18n';
import { whatsNewFor } from '../lib/whats-new';
import { radius, space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';

// What's new (Settings → General → What's new, and Updates): what each version changed, newest
// first, by its number alone, what changes for you first, then what changed under the hood
// (lib/whats-new.ts).

const VERSION = Constants.expoConfig?.version ?? '0.0.0';

export default function WhatsNewScreen() {
  const colors = useColors();
  return (
    <Page>
      <Text variant="title">{t("What's new")}</Text>
      <Text tone="muted">{t('What each version of Erevos changed, the newest first.')}</Text>
      {whatsNewFor(VERSION).map(({ version, forYou, underTheHood }) => (
        <Card key={version ?? 'next'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text variant="heading">{version ?? t('Not out yet')}</Text>
            {version === VERSION ? (
              <Text
                variant="label"
                color={colors.accentText}
                style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: withAlpha(colors.primary, 0.14), overflow: 'hidden' }}
              >
                {t('This version')}
              </Text>
            ) : null}
          </View>
          <Kind title={t('For you')} items={forYou} />
          <Kind title={t('Under the hood')} items={underTheHood} />
        </Card>
      ))}
    </Page>
  );
}

/** One kind of a version's changes, under its name; nothing when the version has none of it. */
function Kind({ title, items }: { title: string; items: string[] }) {
  const colors = useColors();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: space.sm }}>
          <Text color={colors.accentText} style={{ lineHeight: 24, width: 12 }}>
            •
          </Text>
          <View style={{ flex: 1 }}>
            <GuideText text={t(item)} />
          </View>
        </View>
      ))}
    </View>
  );
}
