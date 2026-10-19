import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Divider } from '../../components/guide';
import { Card, Chip, Input, Page, Row, SectionTitle, Text } from '../../components/ui';
import { GUIDE_LANG_LABELS, GUIDE_LANGS, GUIDE_UI, guideFor, guideLang, setGuideLang, type GuideLang } from '../../guide';
import { searchGuide, type GuideSection } from '../../lib/guide';
import { space, withAlpha } from '../../theme/colors';
import { useColors } from '../../theme/context';

/** The user guide, as in LPHL FASOULI: its sections, and a search through all of them. */
export default function GuideScreen() {
  const colors = useColors();
  const [lang, setLang] = useState<GuideLang>(guideLang);
  const ui = GUIDE_UI[lang];
  const sections = guideFor(lang);
  const [query, setQuery] = useState('');
  const hits = useMemo(() => searchGuide(sections, query), [sections, query]);
  const searching = query.trim().length > 0;
  const open = (id: string) => router.push({ pathname: '/guide/[id]', params: { id } });
  const rows = searching ? hits.map((h) => ({ section: h.section, subtitle: h.snippet })) : sections.map((s) => ({ section: s, subtitle: null }));

  return (
    <Page>
      <Text variant="title">{ui.title}</Text>
      <Row wrap>
        {GUIDE_LANGS.map((l) => (
          <Chip
            key={l}
            label={GUIDE_LANG_LABELS[l]}
            selected={l === lang}
            onPress={() => {
              setGuideLang(l);
              setLang(l);
            }}
          />
        ))}
      </Row>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={ui.search}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={ui.search}
      />
      {searching && hits.length === 0 ? (
        <Text tone="muted" style={{ textAlign: 'center', paddingVertical: space.lg }}>
          {ui.noResults(query.trim())}
        </Text>
      ) : (
        <View style={{ gap: space.sm }}>
          {searching ? null : <SectionTitle title={ui.sections} />}
          <Card style={{ padding: 0, gap: 0 }}>
            {rows.map(({ section, subtitle }, i) => (
              <View key={section.id}>
                {i > 0 ? <Divider inset={60} /> : null}
                <SectionRow number={sections.indexOf(section) + 1} section={section} subtitle={subtitle} onPress={() => open(section.id)} />
              </View>
            ))}
          </Card>
        </View>
      )}
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', paddingTop: space.md }}>
        {ui.version(Constants.expoConfig?.version ?? '')}
      </Text>
      {/* Erevos never looks for updates by itself (that would tell someone it is here): Updates checks when asked. */}
      <Pressable onPress={() => router.push('/updates')} accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'center' }}>
        <Text variant="caption" color={colors.accentText}>
          {ui.update}
        </Text>
      </Pressable>
    </Page>
  );
}

/** A section in the list: its number, its title and, in a search, where the words were found. */
function SectionRow({ number, section, subtitle, onPress }: {
  number: number;
  section: GuideSection;
  subtitle: string | null;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={section.title}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        paddingHorizontal: space.md,
        backgroundColor: pressed ? colors.surfacePressed : 'transparent',
      })}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.14) }}>
        <Text variant="label" color={colors.accentText}>
          {String(number)}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {section.title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text tone="muted" style={{ fontSize: 22 }}>
        ›
      </Text>
    </Pressable>
  );
}
