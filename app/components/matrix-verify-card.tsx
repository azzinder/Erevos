import { useState } from 'react';
import { View } from 'react-native';

import { t } from '../lib/i18n';
import { qrBytes } from '../lib/matrix-qr';
import { matrixVerifyAccept, matrixVerifyCancel, matrixVerifyEmoji, matrixVerifyMatch, matrixVerifyScan, matrixVerifyScanned } from '../lib/matrix-store';
import { readQrPhotoBytes } from '../lib/read-qr';
import type { Verification } from '../lib/matrix-verify';
import { sasEmoji } from '../lib/sas-emoji';
import { space } from '../theme/colors';

import { QrCode } from './QrCode';
import { Button, Card, Row, Text } from './ui';

/** One check (lib/matrix-verify.ts) as it stands: asked, waiting, the choice of a QR code (ours to
 *  show, theirs to photograph) or emoji, the seven pictures to compare, or how it ended. `name` is
 *  the other side's, for a person. */
export function MatrixVerifyCard({ check, name }: { check: Verification; name: string }) {
  const [note, setNote] = useState('');
  const act = (work: () => Promise<unknown>) => {
    setNote('');
    work().catch((error: unknown) => setNote(error instanceof Error ? error.message : String(error)));
  };
  const cancel = <Button title={t('Cancel')} kind="secondary" compact onPress={() => act(() => matrixVerifyCancel(check.id))} />;
  return (
    <Card>
      <Text variant="bodyStrong">{check.phase === 'choose' || check.phase === 'scanned' || check.trust ? t('Check by QR code') : t('Check by emoji')}</Text>
      {check.phase === 'asked' ? (
        <>
          <Text>{check.roomId ? t('{name} asks to check devices by emoji.', { name }) : t('Another of your devices asks to check this one by emoji.')}</Text>
          <Row>
            <Button title={t('Accept')} compact onPress={() => act(() => matrixVerifyAccept(check.id))} />
            <Button title={t('Decline')} kind="secondary" compact onPress={() => act(() => matrixVerifyCancel(check.id))} />
          </Row>
        </>
      ) : check.phase === 'waiting' || check.phase === 'confirmed' ? (
        <>
          <Text tone="muted">{t('Waiting for the other side…')}</Text>
          <Row>{cancel}</Row>
        </>
      ) : check.phase === 'choose' ? (
        <>
          {check.qr ? (
            <>
              <Text>{t('Let them photograph this code with their app (in Element: Scan).')}</Text>
              <QrCode text={qrBytes(check.qr)} size={240} />
            </>
          ) : null}
          {check.theirMethods?.includes('m.qr_code.show.v1') ? (
            <Button
              title={t('Photograph their code')}
              kind={check.qr ? 'secondary' : 'primary'}
              compact
              onPress={() =>
                act(async () => {
                  const bytes = await readQrPhotoBytes('camera');
                  if (bytes === null) return;
                  if (!bytes.length) throw new Error(t('No code was found in the photo. Take it again, closer.'));
                  await matrixVerifyScan(check.id, bytes);
                })
              }
            />
          ) : null}
          <Row wrap>
            {check.theirMethods?.includes('m.sas.v1') ? <Button title={t('Compare emoji instead')} kind="secondary" compact onPress={() => act(() => matrixVerifyEmoji(check.id))} /> : null}
            {cancel}
          </Row>
        </>
      ) : check.phase === 'scanned' ? (
        <>
          <Text>{t('They photographed your code. Does their app say the check went well?')}</Text>
          <Row wrap>
            <Button title={t('Yes, it does')} compact onPress={() => act(() => matrixVerifyScanned(check.id, true))} />
            <Button title={t('No')} kind="secondary" compact onPress={() => act(() => matrixVerifyScanned(check.id, false))} />
          </Row>
        </>
      ) : check.phase === 'compare' ? (
        <>
          <Text>{t('Check that you both see these, in the same order.')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
            {(check.emoji ?? []).map((index, i) => {
              const { emoji, name: label } = sasEmoji(index);
              return (
                <View key={i} style={{ alignItems: 'center', width: 72 }} accessible accessibilityLabel={label}>
                  <Text style={{ fontSize: 36, lineHeight: 44 }}>{emoji}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={2} style={{ textAlign: 'center' }}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Row wrap>
            <Button title={t('They match')} compact onPress={() => act(() => matrixVerifyMatch(check.id, true))} />
            <Button title={t("They don't match")} kind="secondary" compact onPress={() => act(() => matrixVerifyMatch(check.id, false))} />
          </Row>
        </>
      ) : check.phase === 'done' ? (
        <Text>{check.trust ? t('Checked by QR code: nobody sits in between.') : t('Checked by emoji: this is their real device.')}</Text>
      ) : (
        <Text tone="muted">{check.reason}</Text>
      )}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Card>
  );
}
