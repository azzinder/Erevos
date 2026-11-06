// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { FlatList, Image, PixelRatio, StyleSheet, View } from 'react-native';

import { sealedRef } from '../lib/collection-play';
import { t } from '../lib/i18n';
import type { CollectionItem } from '../lock/collection-data';
import { collectionNative } from '../modules/erevos-collection';
import { space } from '../theme/colors';
import { Button, Text } from './ui';

// A PDF of the Collection read inside Erevos (components/collection-viewer.tsx): its pages one
// under the other, to scroll, each drawn by Android as a picture when it comes near and let go of
// when it is far (modules/erevos-collection, PdfPages.kt). The PDF is decrypted into memory only,
// never onto the disk; Android before 11 cannot do that, so there it is opened with another app,
// after the screen asks. The Collection's screen keeps all of it out of screenshots.

/** Whether a PDF can be shown here. */
export const CAN_SHOW_PDF = !!collectionNative?.pdfAvailable();

type Props = { item: CollectionItem; width: number; top: number; bottom: number; ink: string; muted: string; onOpenWith: () => void };

export function CollectionPdf({ item, width, top, bottom, ink, muted, onOpenWith }: Props) {
  const [doc, setDoc] = useState<{ handle: string; pages: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const native = collectionNative;
    if (!native) return;
    let active = true;
    let handle: string | null = null;
    setDoc(null);
    setFailed(false);
    native
      .pdfOpen(sealedRef(item.file))
      .then((opened) => {
        handle = opened.handle;
        if (active) setDoc(opened);
        else native.pdfClose(opened.handle);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (handle) native.pdfClose(handle);
    };
  }, [item.id]);

  if (!CAN_SHOW_PDF || failed) {
    return (
      <View style={[styles.center, { paddingTop: top, paddingBottom: bottom }]}>
        <Text color={muted} style={styles.centered}>
          {CAN_SHOW_PDF ? t('This PDF could not be shown. Open it with another app instead.') : t('PDFs can be shown here from Android 11 on. Open it with another app instead.')}
        </Text>
        <Button title={t('Open with another app')} kind="secondary" compact onPress={onOpenWith} />
      </View>
    );
  }
  if (!doc) {
    return (
      <View style={styles.center}>
        <Text color={muted}>{t('Opening the PDF…')}</Text>
      </View>
    );
  }
  const pageWidth = width - 2 * space.sm;
  return (
    <FlatList
      data={Array.from({ length: doc.pages }, (_, i) => i)}
      keyExtractor={(i) => String(i)}
      windowSize={3}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      removeClippedSubviews
      contentContainerStyle={{ paddingTop: top, paddingBottom: bottom, gap: space.sm, alignItems: 'center' }}
      renderItem={({ item: index }) => <PdfPage handle={doc.handle} index={index} pages={doc.pages} width={pageWidth} ink={ink} />}
    />
  );
}

// One page, drawn as wide as the screen in the phone's own pixels, while it is near.
function PdfPage({ handle, index, pages, width, ink }: { handle: string; index: number; pages: number; width: number; ink: string }) {
  const [page, setPage] = useState<{ uri: string; height: number } | null>(null);
  useEffect(() => {
    const native = collectionNative;
    if (!native) return;
    let active = true;
    const pixels = Math.round(PixelRatio.getPixelSizeForLayoutSize(width));
    native
      .pdfPage(handle, index, pixels, 'png')
      .then((drawn) => active && setPage({ uri: `data:image/png;base64,${drawn.data}`, height: (width * drawn.height) / drawn.width }))
      .catch(() => undefined);
    return () => {
      active = false;
      setPage(null);
    };
  }, [handle, index, width]);
  return (
    <View style={{ width }}>
      {page ? (
        <Image source={{ uri: page.uri }} style={{ width, height: page.height, backgroundColor: '#FFFFFF' }} resizeMode="contain" accessibilityLabel={t('Page {n} of {count}', { n: index + 1, count: pages })} />
      ) : (
        <View style={{ width, height: width * 1.414, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      )}
      <Text variant="caption" color={ink} style={styles.centered}>
        {t('Page {n} of {count}', { n: index + 1, count: pages })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  centered: { textAlign: 'center' },
});
