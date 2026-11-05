// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The ways to give to Erevos for its running costs (app/donate.tsx, Settings → General → Support
// Erevos), as its maker gave them: Liberapay, PayPal, Bitcoin and Monero. Each opens outside Erevos,
// in the browser or a wallet, only when tapped: Erevos sends nothing and never knows who gave.
// checks/donate.check.ts checks them.

/** Liberapay's page for giving, once or every week or month. */
export const LIBERAPAY = 'https://liberapay.com/Nekten/donate';
/** PayPal's page for giving: it opens in the browser, with or without the PayPal app. */
export const PAYPAL = 'https://www.paypal.com/donate/?business=A9DV5LKGBGUF4&no_recurring=0&currency_code=EUR';
/** What PayPal's QR code holds: its page for giving, marked as scanned from a QR code. */
export const PAYPAL_QR = PAYPAL + '&source=qr';
/** What Liberapay's QR code holds: its page for giving. */
export const LIBERAPAY_QR = LIBERAPAY;
/** The Bitcoin address (native SegWit, bech32). */
export const BITCOIN = 'bc1qu4k2pva3n29luaawhdu2924xww8ghzgvzn2a8d';
/** The Monero address (a subaddress, which keeps receiving though the wallet shows a new one). */
export const MONERO = '8Ay5Li3S4UeajiA2phqLs4hJ4pBEvLupsbp78PRbMHP7czgfH6Z9ewNJg9tShy6HZeeoj8yXza9xXAzx2aZDAFdZ5k6wC5h';

/** An address as a link a wallet opens (BIP 21 for Bitcoin, the same form for Monero). */
export const walletLink = (coin: 'bitcoin' | 'monero', address: string) => `${coin}:${address}`;
