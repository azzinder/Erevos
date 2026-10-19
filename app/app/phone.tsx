import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, fontStyle, Page, Row, Text } from '../components/ui';
import { t } from '../lib/i18n';
import { dialNumber, KEYS, typeKey } from '../lib/phone';
import { onPhoneEvent, phoneReady, phoneStatus, placeCall, showCall, type PhoneStatus } from '../modules/erevos-phone';
import { space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The phone, with Erevos as Android's phone app (modules/erevos-phone): the keypad to call a
// number. A call itself shows on the native call screen, which works with Erevos locked and over
// the phone's lock screen; this screen is behind Erevos's password like the rest of the app. It
// opens from tel: links and the phone's call button with the number typed in (`number`).

export default function Phone() {
  const params = useLocalSearchParams<{ number?: string; tab?: string }>();
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<PhoneStatus | null>(phoneStatus());
  const [number, setNumber] = useState(dialNumber(typeof params.number === 'string' ? params.number : ''));
  const [note, setNote] = useState('');

  useEffect(() => {
    if (typeof params.number === 'string') setNumber(dialNumber(params.number));
  }, [params.number]);

  useEffect(() => {
    // Android answers in its own screens, and calls come and go: look again then.
    const look = () => setStatus(phoneStatus());
    const app = AppState.addEventListener('change', (state) => state === 'active' && look());
    const calls = onPhoneEvent('onCalls', look);
    return () => {
      app.remove();
      calls?.remove();
    };
  }, []);

  if (Platform.OS !== 'android' || !phoneReady()) {
    return (
      <Page>
        <Text variant="title">{t('Phone')}</Text>
        <Text tone="muted">
          {Platform.OS === 'android'
            ? t('This build of Erevos has no phone part yet. It comes with the next build of the app.')
            : t('Only Android lets another app be the phone app.')}
        </Text>
      </Page>
    );
  }

  async function call(to: string) {
    const plain = dialNumber(to);
    if (!plain) {
      setNote(t('Type a phone number.'));
      return;
    }
    setNote('');
    try {
      // The phone app may call; otherwise Android asks first.
      if (!phoneStatus()?.isDefault) {
        const answer = await PermissionsAndroid.request('android.permission.CALL_PHONE');
        if (answer !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(t('Erevos may not make calls. Make it the phone app under Settings.'));
      }
      await placeCall(plain);
    } catch (error) {
      setNote(t('Not called. {error}', { error: error instanceof Error ? error.message : String(error) }));
    }
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.top}>
        <Row style={styles.titleRow}>
          <Text variant="title" style={styles.title}>
            {t('Phone')}
          </Text>
          <Button title={t('Contacts')} kind="secondary" compact onPress={() => router.push('/contacts')} />
          <Button title={t('Settings')} kind="secondary" compact onPress={() => router.push('/phone-settings')} />
        </Row>
        {status && status.calls > 0 ? <Button title={t('Back to the call')} onPress={showCall} /> : null}
        {status && !status.isDefault ? (
          <Card>
            <Text variant="bodyStrong">{t('Erevos is not the phone app')}</Text>
            <Text tone="muted">{t("Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.")}</Text>
          </Card>
        ) : null}
      </View>

      <View style={styles.keypad}>
        <View style={styles.numberLine}>
          <TextInput
            value={number}
            onChangeText={(text) => setNumber(dialNumber(text))}
            // The keys below type; held down, the field still pastes a number.
            showSoftInputOnFocus={false}
            style={[styles.number, { color: colors.text }, fontStyle('400')]}
            placeholder={t('Number')}
            placeholderTextColor={colors.textFaint}
            textAlign="center"
          />
          <Pressable
            onPress={() => setNumber((n) => n.slice(0, -1))}
            onLongPress={() => setNumber('')}
            disabled={!number}
            accessibilityRole="button"
            accessibilityLabel={t('Delete')}
            hitSlop={10}
            style={({ pressed }) => [styles.erase, { opacity: !number ? 0.3 : pressed ? 0.6 : 1 }]}
          >
            <Text variant="heading" tone="muted">
              ⌫
            </Text>
          </Pressable>
        </View>
        {KEYS.map((keys) => (
          <View key={keys.join('')} style={styles.keys}>
            {keys.map((key) => (
              <Pressable
                key={key}
                onPress={() => setNumber((n) => typeKey(n, key))}
                onLongPress={key === '0' ? () => setNumber((n) => typeKey(n, '+')) : undefined}
                accessibilityRole="button"
                accessibilityLabel={key}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                <Text style={styles.keyText}>{key}</Text>
                {key === '0' ? (
                  <Text variant="caption" tone="faint" style={styles.keyPlus}>
                    +
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}
        <View style={styles.keys}>
          <Pressable
            onPress={() => void call(number)}
            accessibilityRole="button"
            accessibilityLabel={t('Call')}
            style={({ pressed }) => [styles.callButton, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text variant="label" color="#FFFFFF" style={styles.callText}>
              {t('Call')}
            </Text>
          </Pressable>
        </View>
        {note ? (
          <Text tone="muted" style={styles.note}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      backgroundColor: colors.ground,
    },
    top: {
      gap: space.md,
      paddingHorizontal: space.xl - 4,
      paddingTop: space.md,
    },
    titleRow: {
      gap: space.sm,
    },
    title: {
      flex: 1,
    },
    keypad: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: space.sm,
      paddingHorizontal: space.xl,
    },
    numberLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingLeft: 44,
    },
    number: {
      flex: 1,
      fontSize: 32,
      minHeight: 56,
    },
    erase: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keys: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
    },
    key: {
      width: 76,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    keyPressed: {
      backgroundColor: colors.surfacePressed,
    },
    keyText: {
      fontSize: 28,
      lineHeight: 34,
    },
    keyPlus: {
      position: 'absolute',
      bottom: 4,
    },
    callButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      marginTop: space.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2E7D32',
    },
    callText: {
      fontSize: 14,
    },
    note: {
      textAlign: 'center',
    },
  });
