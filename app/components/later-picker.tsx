import { useState } from 'react';
import { View } from 'react-native';

import { t } from '../lib/i18n';
import { canPick, firstLater, laterClock, laterDay, laterLabel, quickTimes, stepLater } from '../lib/later';
import { Button, Chip, Row, Text } from './ui';

// Choosing when a message or an SMS sent for later goes (lib/later.ts): a time at a tap, or the
// day, the hour and the minutes, each a step at a time. Drawn without the phone's own pickers, so
// the same on every platform.

function Stepper({ label, value, onStep }: { label: string; value: string; onStep: (by: number) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Row>
        <Button title="−" kind="secondary" compact onPress={() => onStep(-1)} />
        <Text variant="bodyStrong" style={{ minWidth: 44, textAlign: 'center' }}>
          {value}
        </Text>
        <Button title="+" kind="secondary" compact onPress={() => onStep(1)} />
      </Row>
    </View>
  );
}

/** Picks a time ahead and gives it to `onPick`, with Send later; one gone by, or more than a year ahead, cannot be picked. */
export function LaterPicker({ onPick }: { onPick: (at: number) => void }) {
  const [at, setAt] = useState(() => firstLater());
  const ahead = at > Date.now();
  const fits = canPick(at);
  const clock = laterClock(at);
  return (
    <View style={{ gap: 10 }}>
      <Row wrap>
        {quickTimes().map((quick) => (
          <Chip key={quick.label} label={t(quick.label)} selected={quick.at === at} onPress={() => setAt(quick.at)} />
        ))}
      </Row>
      <Stepper label={t('Day')} value={laterDay(at)} onStep={(by) => setAt(stepLater(at, 'day', by))} />
      <Row wrap style={{ gap: 16 }}>
        <Stepper label={t('Hour')} value={clock.hour} onStep={(by) => setAt(stepLater(at, 'hour', by))} />
        <Stepper label={t('Minutes')} value={clock.minute} onStep={(by) => setAt(stepLater(at, 'minute', by))} />
      </Row>
      <Text variant="caption" tone={fits ? 'muted' : undefined}>
        {fits ? t('Goes on {when}.', { when: laterLabel(at) }) : ahead ? t('At most a year ahead.') : t('That time has gone by. Choose one ahead.')}
      </Text>
      <Button title={t('Send later')} compact disabled={!fits} onPress={() => canPick(at) && onPick(at)} />
    </View>
  );
}
