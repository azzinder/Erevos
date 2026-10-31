/*
 * SPDX-FileCopyrightText: 2026 azzinder
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
 */

#ifndef EREVOS_WATCH_CHANNEL_H
#define EREVOS_WATCH_CHANNEL_H

#include <QByteArray>

// The channel inside a connection to a relay, encrypted to the relay's own key, as the app opens it
// (crates/erevos-core/src/relay_channel.rs, app/lib/relay.ts): a hello with a fresh X25519 key, the
// relay's answer with its own fresh key and a proof only the holder of the relay's secret key can
// make, then each message each way in ChaCha20-Poly1305 under a key of its own for each way, its
// nonce the count of the messages before it that way. With OpenSSL (1.1.1 or later).
class Channel
{
public:
    // The first byte of a hello, and the lengths of the hello and of the relay's answer.
    static const char Hello = char(0xEC);
    static const int HelloLength = 33;
    static const int AnswerLength = 64;

    /** Starts a channel to the relay whose public key is `relayKey` (32 bytes). */
    explicit Channel(const QByteArray &relayKey);
    ~Channel();

    /** The hello to send: `Hello` and the fresh public key; empty when no fresh key could be made. */
    QByteArray hello() const;
    /** Takes the relay's answer: true once it proves the relay's key, and the channel is open. */
    bool finish(const QByteArray &answer);
    bool isOpen() const { return m_open; }

    /** The next message this side sends, sealed; empty when it cannot be. */
    QByteArray seal(const QByteArray &plain);
    /** The next message the relay sent, opened; false when it was changed, out of turn or not the relay's. */
    bool open(const QByteArray &sealed, QByteArray *plain);

private:
    Channel(const Channel &) = delete;
    Channel &operator=(const Channel &) = delete;

    QByteArray m_relay;
    QByteArray m_secret;
    QByteArray m_public;
    QByteArray m_toRelay;
    QByteArray m_toPhone;
    quint64 m_sent = 0;
    quint64 m_received = 0;
    bool m_open = false;
};

#endif
