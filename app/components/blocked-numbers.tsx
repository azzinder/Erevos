import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { onSmsOrderChanged, smsOrderChanged } from '../lib/sms-folders';
import { smsNumbers } from '../lib/sms-group';
import { blockedNumbers, blockNumber, canBlockNumbers, unblockNumber } from '../modules/erevos-sms';
import { Button, Chip, Input, Row, Text } from './ui';

// Android's own list of blocked numbers (modules/erevos-sms): Android rejects their calls, SMS and
// MMS itself. The SMS settings and the phone settings show the same list, with a number to block
// and a tap on one to unblock it; the SMS app or the phone app may change it, for every space alike.

/** The list, or `cannot` while Erevos may not read it. */
export function BlockedNumbers({ cannot }: { cannot: string }) {
  // Android's list, or null when Erevos may not read it.
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [toBlock, setToBlock] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const look = () => void canBlockNumbers().then((can) => (can ? blockedNumbers().then(setBlocked) : setBlocked(null)));
    look();
    // Android answers in its own screens, and the other screens change the list: look again then.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && look());
    const stop = onSmsOrderChanged(look);
    return () => {
      subscription.remove();
      stop();
    };
  }, []);

  async function block() {
    setNote('');
    const numbers = smsNumbers(toBlock);
    if (numbers.length !== 1) {
      setNote(t('Type one phone number.'));
      return;
    }
    try {
      await blockNumber(numbers[0]);
      setToBlock('');
      setBlocked(await blockedNumbers());
      smsOrderChanged();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  function unblock(number: string) {
    ask(t('Unblock {number}?', { number }), t('Its SMS, MMS and calls reach the phone again.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Unblock'),
        onPress: () =>
          void unblockNumber(number)
            .then(async () => {
              setBlocked(await blockedNumbers());
              smsOrderChanged();
            })
            .catch((error) => setNote(error instanceof Error ? error.message : String(error))),
      },
    ]);
  }

  if (blocked === null) {
    return (
      <Text variant="caption" tone="faint">
        {cannot}
      </Text>
    );
  }
  return (
    <>
      {blocked.length === 0 ? (
        <Text variant="caption" tone="faint">
          {t('No number is blocked.')}
        </Text>
      ) : null}
      <Row wrap>
        {blocked.map((b) => (
          <Chip key={b} label={`${b} ×`} onPress={() => unblock(b)} />
        ))}
      </Row>
      <Row>
        <Input value={toBlock} onChangeText={setToBlock} keyboardType="phone-pad" placeholder={t('Phone number')} style={{ flex: 1 }} onSubmitEditing={() => void block()} />
        <Button title={t('Block')} compact kind="secondary" onPress={() => void block()} />
      </Row>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </>
  );
}
