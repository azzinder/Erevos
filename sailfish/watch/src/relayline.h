/*
 * SPDX-FileCopyrightText: 2026 azzinder
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
 */

#ifndef EREVOS_WATCH_RELAYLINE_H
#define EREVOS_WATCH_RELAYLINE_H

#include <QByteArray>
#include <QObject>
#include <QScopedPointer>
#include <QSslSocket>
#include <QUrl>

class Channel;

// One connection to a relay's `/read` path, as the app's WebSocket is (app/lib/relay.ts), asking one
// request at a time on it: a small WebSocket client of its own, as Sailfish OS's Qt WebSockets (5.5)
// cannot offer the subprotocol of a channel. With the relay's key it opens a channel to it first
// (channel.h) and asks nothing unless the relay proves that key; without one it asks as it is, as
// the app does of a relay it never saw prove a key. It asks with no token: on `/read` knowing a
// queue is what reads it.
class RelayLine : public QObject
{
    Q_OBJECT

public:
    /** A line to the relay at `relay` (ws:// or wss://, without `/read`), in a channel to `key` (32 bytes) when given. */
    RelayLine(const QString &relay, const QByteArray &key, QObject *parent = nullptr);
    ~RelayLine() override;

    /** Connects; `ready` once requests may go, `failed` otherwise. */
    void open();
    /** Sends `request`; `answered` with its reply. False when the line is not ready, or a request waits. */
    bool ask(const QByteArray &request);
    bool isReady() const { return m_state == Ready; }
    void close();

signals:
    void ready();
    void answered(const QByteArray &reply);
    void failed(const QString &why);

private slots:
    void connected();
    void readSome();
    void lost();

private:
    enum State { Closed, Connecting, Upgrading, Proving, Ready, Asking };

    void fail(const QString &why);
    void upgraded();
    void message(const QByteArray &data);
    void sendFrame(int opcode, const QByteArray &payload);

    QUrl m_url;
    QByteArray m_key;
    QSslSocket m_socket;
    QScopedPointer<Channel> m_channel;
    QByteArray m_nonce;
    QByteArray m_buffer;
    QByteArray m_message;
    State m_state = Closed;
    bool m_first = true;
};

#endif
