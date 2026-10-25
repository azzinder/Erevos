import { useState } from 'react';
import { Linking } from 'react-native';

import { QrCode } from '../components/QrCode';
import { Button, Card, Page, Row, Text } from '../components/ui';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { BITCOIN, LIBERAPAY, MONERO, PAYPAL, walletLink } from '../lib/donate';
import { t } from '../lib/i18n';

// Support Erevos (Settings → General): the ways to give to it, for its running costs, as its maker
// gave them (lib/donate.ts). Nothing here is fetched: each way opens in the browser or a wallet only
// when tapped, so Erevos sends nothing and never knows who gave. Each coin's address shows whole,
// with its QR code, to copy or scan.

// One coin: its address whole, with its QR code, to copy or open in a wallet.
function Coin({ name, address, about, onCopy, onOpen }: { name: string; address: string; about: string; onCopy: () => void; onOpen: () => void }) {
  return (
    <Card>
      <Text variant="bodyStrong">{name}</Text>
      <Text tone="muted">{about}</Text>
      <QrCode text={address} size={220} />
      <Text variant="mono" selectable>
        {address}
      </Text>
      <Row wrap>
        {CAN_COPY ? <Button compact kind="secondary" title={t('Copy address')} onPress={onCopy} /> : null}
        <Button compact kind="secondary" title={t('Open in a wallet')} onPress={onOpen} />
      </Row>
    </Card>
  );
}

export default function DonateScreen() {
  const [note, setNote] = useState('');

  function open(url: string, failed: string) {
    setNote('');
    void Linking.openURL(url).catch(() => setNote(failed));
  }

  async function copy(address: string) {
    setNote((await copyText(address)) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  const wallet = (coin: 'bitcoin' | 'monero', address: string) => ({
    address,
    onCopy: () => void copy(address),
    onOpen: () => open(walletLink(coin, address), t('No app on this device opens this address: copy it into your wallet.')),
  });

  return (
    <Page>
      <Text variant="title">{t('Support Erevos')}</Text>
      <Text tone="muted">
        {t('Erevos has no ads, no investors and collects no data. If you want, you can help with its running costs, such as its server. Giving or not changes nothing in the app.')}
      </Text>
      <Card>
        <Text variant="bodyStrong">Liberapay</Text>
        <Text tone="muted">{t('Once, or every week or month. Liberapay itself keeps no share.')}</Text>
        <Button title={t('Open Liberapay')} onPress={() => open(LIBERAPAY, t('Open {url} in a browser.', { url: LIBERAPAY }))} />
      </Card>
      <Card>
        <Text variant="bodyStrong">PayPal</Text>
        <Text tone="muted">{t('Known and easy, but PayPal knows who gives.')}</Text>
        <Button title={t('Open PayPal')} kind="secondary" onPress={() => open(PAYPAL, t('Open {url} in a browser.', { url: PAYPAL }))} />
      </Card>
      <Coin name="Monero" {...wallet('monero', MONERO)} about={t('The most private: the Monero network shows neither who gave nor how much.')} />
      <Coin name="Bitcoin" {...wallet('bitcoin', BITCOIN)} about={t('No names, but anyone can see on the Bitcoin network what this address received.')} />
      {note ? <Text tone="muted">{note}</Text> : null}
      <Text variant="caption" tone="faint">
        {t('Each way opens outside Erevos, only when you tap it. Erevos sends nothing and does not know who gave.')}
      </Text>
    </Page>
  );
}
