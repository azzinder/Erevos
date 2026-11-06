// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { createElement, useEffect, useState } from 'react';
import { FlatList, Image, PixelRatio, Platform, StyleSheet, View } from 'react-native';

import { TooLargeToOpenError, openItemUri, releaseMemoryUri } from '../lib/collection-memory';
import { sealedRef } from '../lib/collection-play';
import { t } from '../lib/i18n';
import { SHELL } from '../lib/shell';
import { fillItemHere, type CollectionItem } from '../lock/collection-data';
import { collectionNative } from '../modules/erevos-collection';
import { space } from '../theme/colors';
import { FetchNote, useFetching, type Fetching } from './collection-fetch';
import { Button, Text } from './ui';

// A PDF of the Collection read inside Erevos (components/collection-viewer.tsx): its pages one
// under the other, to scroll, each drawn by Android as a picture when it comes near and let go of
// when it is far (modules/erevos-collection, PdfPages.kt). The PDF is decrypted into memory only,
// never onto the disk; Android before 11 cannot do that, so there it is opened with another app,
// after the screen asks. The Collection's screen keeps all of it out of screenshots.
//
// In the desktop app Chromium's own PDF viewer shows it, in a frame, from a blob: address of its
// bytes decrypted into the page's memory (lib/collection-memory.ts, MOST_IN_MEMORY at most), let go
// of when the PDF closes or the space locks; never a file on the disk. The shell lets such a frame
// be shown and keeps the viewer's own Save from writing a plain copy (desktop/main.js). A browser
// and Sailfish OS do not let the page show a blob: address in a frame (their Content Security
// Policy, pwa/sw.js and sailfish/src/shellserver.cpp): there a PDF is saved to be opened elsewhere.
//
// Chunks of the PDF not on this device are fetched first from its place's server, with how far
// that is and Cancel (components/collection-fetch.tsx).

const DESK = SHELL === 'electron';
// The web build outside the desktop app: nothing opens with another app either.
const PAGE = Platform.OS === 'web' && !DESK;

/** Whether a PDF can be shown here. */
export const CAN_SHOW_PDF = DESK || !!collectionNative?.pdfAvailable();

type Props = {
  item: CollectionItem;
  width: number;
  top: number;
  bottom: number;
  ink: string;
  muted: string;
  onOpenWith: () => void;
  /** The viewer's fetch before it opens with another app, to show how far it is. */
  fetching?: Fetching;
};

export function CollectionPdf(props: Props) {
  return DESK ? <DeskPdf {...props} /> : <PhonePdf {...props} />;
}

// The desktop app's: Chromium's viewer in a frame, from memory.
function DeskPdf({ item, top, bottom, ink, muted }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState('');
  // Its chunks fetched first when they are not here, with Cancel; Go on opens it again (`round`).
  const opening = useFetching();
  const [round, setRound] = useState(0);
  useEffect(() => {
    let active = true;
    let made: string | null = null;
    setUri(null);
    setFailed('');
    opening
      .run((options) => openItemUri(item, 'application/pdf', undefined, options), () => setRound((r) => r + 1))
      .then((result) => {
        if (result === 'stopped') return;
        const opened = result.value;
        if (!active) {
          if (opened) releaseMemoryUri(opened);
          return;
        }
        if (!opened) {
          setFailed(t('This file is not on this device. It comes from your other devices while one of them has it; a backup restored without it leaves only its name.'));
          return;
        }
        made = opened;
        setUri(made);
      })
      .catch((error: unknown) => active && setFailed(error instanceof TooLargeToOpenError ? error.message : t('This PDF could not be shown here.')));
    return () => {
      active = false;
      opening.reset();
      if (made) releaseMemoryUri(made);
      setUri(null);
    };
  }, [item.id, round]);
  if (failed || !uri) {
    return (
      <View style={[styles.center, { paddingTop: top, paddingBottom: bottom }]}>
        {!failed && (opening.progress || opening.stopped) ? (
          <FetchNote fetching={opening} ink={ink} muted={muted} />
        ) : (
          <Text color={muted} style={styles.centered}>
            {failed || t('Opening the PDF…')}
          </Text>
        )}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, paddingTop: top, paddingBottom: bottom }}>
      {createElement('iframe', { src: uri, title: item.file.name, style: { flex: 1, width: '100%', height: '100%', border: 0, background: '#FFFFFF' } })}
    </View>
  );
}

// The phone's: Android draws its pages.
function PhonePdf({ item, width, top, bottom, ink, muted, onOpenWith, fetching }: Props) {
  const [doc, setDoc] = useState<{ handle: string; pages: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false);
  // Its chunks fetched first when they are not here, with Cancel; Go on opens it again (`round`).
  const opening = useFetching();
  const [round, setRound] = useState(0);
  useEffect(() => {
    const native = collectionNative;
    if (!native || !CAN_SHOW_PDF) return;
    let active = true;
    let handle: string | null = null;
    setDoc(null);
    setFailed(false);
    setGone(false);
    opening
      .run((options) => fillItemHere(item, options), () => setRound((r) => r + 1))
      .then(async (here) => {
        if (!active || here === 'stopped') return;
        if (!here.value) return setGone(true);
        const opened = await native.pdfOpen(sealedRef(item.file));
        handle = opened.handle;
        if (active) setDoc(opened);
        else native.pdfClose(opened.handle);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      opening.reset();
      if (handle) native.pdfClose(handle);
    };
  }, [item.id, round]);

  if (PAGE) {
    return (
      <View style={[styles.center, { paddingTop: top, paddingBottom: bottom }]}>
        <Text color={muted} style={styles.centered}>
          {t('PDFs are not shown here. To open it with another app, save it first. That copy is not encrypted.')}
        </Text>
      </View>
    );
  }
  if (gone) {
    return (
      <View style={[styles.center, { paddingTop: top, paddingBottom: bottom }]}>
        <Text color={muted} style={styles.centered}>
          {t('This file is not on this device. It comes from your other devices while one of them has it; a backup restored without it leaves only its name.')}
        </Text>
      </View>
    );
  }
  if (!CAN_SHOW_PDF || failed) {
    return (
      <View style={[styles.center, { paddingTop: top, paddingBottom: bottom }]}>
        <Text color={muted} style={styles.centered}>
          {CAN_SHOW_PDF ? t('This PDF could not be shown. Open it with another app instead.') : t('PDFs can be shown here from Android 11 on. Open it with another app instead.')}
        </Text>
        {fetching ? <FetchNote fetching={fetching} ink={ink} muted={muted} /> : null}
        <Button title={t('Open with another app')} kind="secondary" compact onPress={onOpenWith} />
      </View>
    );
  }
  if (!doc) {
    return (
      <View style={[styles.center, { paddingTop: top, paddingBottom: bottom }]}>
        {opening.progress || opening.stopped ? <FetchNote fetching={opening} ink={ink} muted={muted} /> : <Text color={muted}>{t('Opening the PDF…')}</Text>}
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
