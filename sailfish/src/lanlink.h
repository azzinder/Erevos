/*
 * SPDX-FileCopyrightText: 2026 azzinder
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
 */

#ifndef EREVOS_LANLINK_H
#define EREVOS_LANLINK_H

#include <QByteArray>
#include <QHash>
#include <QHostAddress>
#include <QList>
#include <QObject>
#include <QPair>
#include <QSet>
#include <QString>
#include <QStringList>
#include <QTcpServer>
#include <QTimer>
#include <QUdpSocket>

class QTcpSocket;

// Erevos phones and computers on the same Wi-Fi or a phone's hotspot, with no internet: links the
// app's nearby messages (app/lib/nearby.ts) go over. The same protocol as the desktop app's
// (desktop/lan.js) and Android's (LanLink.kt), so all three link with each other:
//
// - Each one says it is there every few seconds, by UDP broadcast on port 47905: `EVL1 <nonce>
//   <port>`, a random nonce for each start and the TCP port it listens on (47905 when free).
// - On hearing another, the one with the lower nonce connects, or either does when no link came
//   after a few seconds. A link is a TCP connection carrying frames: a 4-byte big-endian length,
//   then the payload. The first frame each way is `EVL1 <nonce>`.
// - Then each frame is UTF-8 text: what the app sends, end-to-end encrypted already, or `EVL1`
//   alone, sent every few seconds to say the link is still there. A link nothing came on for a
//   while is closed. When two links come up to one, both keep the one the lower nonce opened.
//
// Anyone on the network hears that an Erevos app is there; nothing else in the broadcast says who,
// and the nonce is new with each start. Only Qt's core and network, as on Sailfish OS (Qt 5.6).
class LanLink : public QObject
{
    Q_OBJECT

public:
    static const quint16 Port = 47905;

    /** `udpPort` and `tcpPort` other than the usual are for checks. */
    explicit LanLink(QObject *parent = nullptr, quint16 udpPort = Port, quint16 tcpPort = Port);
    ~LanLink() override;

    /** Where to say it is there, in place of every IPv4 network's broadcast address: for checks. */
    void setTargets(const QList<QPair<QHostAddress, quint16>> &targets);

    void start();
    void stop();
    bool isRunning() const { return m_running; }

    /** Sends one text frame on a link. False when there is no such link. */
    bool send(const QString &id, const QByteArray &text);
    /** The links up now. */
    QStringList links() const;
    /** The TCP port it listens on, 0 when not running. */
    quint16 tcpPort() const;

signals:
    void linked(const QString &id);
    void gone(const QString &id);
    void text(const QString &id, const QByteArray &text);
    void logged(const QString &line);

private slots:
    void accept();
    void announce();
    void sweep();
    void readDatagrams();

private:
    struct Conn {
        QTcpSocket *socket = nullptr;
        QByteArray held;
        bool mine = false;
        QString expected; // the nonce dialed, for one this end opened
        QString nonce;    // the other's, once it said it
        QString id;       // the link's, once up
        qint64 at = 0;    // when something last came
        qint64 since = 0; // when the connection began
    };

    void announced(const QByteArray &text, const QHostAddress &from);
    void dial(const QString &nonce, const QHostAddress &address, quint16 port);
    void watch(QTcpSocket *socket, bool mine, const QString &expected);
    void readSocket(QTcpSocket *socket);
    void frameIn(Conn &conn, const QByteArray &payload);
    void up(Conn &conn);
    void closed(QTcpSocket *socket);
    Conn *linkTo(const QString &nonce);
    QList<QPair<QHostAddress, quint16>> broadcasts() const;
    static QByteArray frame(const QByteArray &payload);

    quint16 m_udpPort;
    quint16 m_tcpPort;
    QList<QPair<QHostAddress, quint16>> m_targets;
    bool m_running = false;
    QString m_nonce;
    QTcpServer m_server;
    QUdpSocket m_udp;
    QTimer m_timer;
    int m_counter = 0;
    QHash<QTcpSocket *, Conn> m_conns;
    QHash<QString, QTcpSocket *> m_links;   // id → socket
    QHash<QString, QPair<qint64, qint64>> m_heard; // nonce → first, last heard
    QSet<QString> m_dialing;
};

#endif
