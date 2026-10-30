import { useMemo } from 'react';
import { Image, PixelRatio, StyleSheet } from 'react-native';
import { toBase64 } from '../lib/crypto';
import { qrPng } from '../lib/qr';
import { t } from '../lib/i18n';

// Dark modules on white with a quiet zone of four modules, as scanners expect, even in the
// app's dark theme. One picture at the screen's own pixels (lib/qr.ts), so it shows sharp and is
// light to draw even on an older phone, made once while the screen shows it.
export function QrCode({ text, size = 260 }: { text: string | Uint8Array; size?: number }) {
  const ratio = PixelRatio.get();
  const shown = useMemo(() => {
    const { png, size: pixels } = qrPng(text, Math.floor(size * ratio));
    return { uri: `data:image/png;base64,${toBase64(png)}`, side: pixels / ratio };
  }, [text, size, ratio]);
  return (
    <Image
      source={{ uri: shown.uri }}
      style={[styles.code, { width: shown.side, height: shown.side }]}
      fadeDuration={0}
      accessible
      accessibilityLabel={t('QR code')}
    />
  );
}

const styles = StyleSheet.create({
  code: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
});
