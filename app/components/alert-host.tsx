import { useEffect, useState } from 'react';

import { setAlertHost, type Question } from '../lib/alert';

import { Button, Row, Sheet, Text } from './ui';

// Asks lib/alert.ts's questions on the web, in a sheet; on the phone Alert.alert asks them.
export function AlertHost() {
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    setAlertHost(setQuestion);
    return () => setAlertHost(null);
  }, []);

  function answer(index: number | null) {
    const buttons = question?.buttons ?? [];
    const chosen = index === null ? buttons.find((button) => button.style === 'cancel') : buttons[index];
    setQuestion(null);
    chosen?.onPress?.();
  }

  return (
    <Sheet visible={question !== null} onClose={() => answer(null)} title={question?.title}>
      <Text tone="muted">{question?.message}</Text>
      <Row wrap>
        {(question?.buttons ?? []).map((button, i) => (
          <Button
            key={`${i}-${button.text}`}
            title={button.text ?? 'OK'}
            kind={button.style === 'destructive' ? 'danger' : button.style === 'cancel' ? 'secondary' : 'primary'}
            compact
            onPress={() => answer(i)}
          />
        ))}
      </Row>
    </Sheet>
  );
}
