import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GuideBlockView } from '../../components/guide';
import { Card, Page, Row, Text } from '../../components/ui';
import { GUIDE_UI, guideFor, guideLang } from '../../guide';
import { space } from '../../theme/colors';
import { useColors } from '../../theme/context';

/** One section of the user guide, with the previous and next ones at its end. */
export default function GuideSectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = guideLang();
  const ui = GUIDE_UI[lang];
  const sections = guideFor(lang);
  const at = sections.findIndex((s) => s.id === id);
  const section = sections[at];
  const previous = at > 0 ? sections[at - 1] : null;
  const next = at >= 0 && at < sections.length - 1 ? sections[at + 1] : null;
  // Replaced rather than pushed, so Back always returns to the list of sections.
  const go = (to: string) => router.replace({ pathname: '/guide/[id]', params: { id: to } });

  if (!section) {
    return (
      <Page>
        <Text variant="title">{ui.title}</Text>
        <Text tone="muted">{ui.missing}</Text>
      </Page>
    );
  }
  return (
    <Page>
      <Text variant="title" accessibilityRole="header">
        {section.title}
      </Text>
      {section.blocks.map((block, i) => (
        <GuideBlockView key={i} block={block} />
      ))}
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {next ? <Neighbour label={ui.next} title={next.title} forward onPress={() => go(next.id)} /> : null}
        {previous ? <Neighbour label={ui.previous} title={previous.title} onPress={() => go(previous.id)} /> : null}
      </View>
    </Page>
  );
}

/** The previous or next section, as a card at the end of this one. */
function Neighbour({ label, title, forward, onPress }: { label: string; title: string; forward?: boolean; onPress: () => void }) {
  const colors = useColors();
  const arrow = (
    <Text color={colors.accentText} style={{ fontSize: 22 }}>
      {forward ? '›' : '‹'}
    </Text>
  );
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card style={{ paddingVertical: space.md }}>
        <Row style={{ gap: space.md }}>
          {forward ? null : arrow}
          <View style={{ flex: 1, gap: 2, alignItems: forward ? 'flex-end' : 'flex-start' }}>
            <Text variant="overline" tone="muted">
              {label}
            </Text>
            <Text variant="bodyStrong" style={{ textAlign: forward ? 'right' : 'left' }}>
              {title}
            </Text>
          </View>
          {forward ? arrow : null}
        </Row>
      </Card>
    </Pressable>
  );
}
