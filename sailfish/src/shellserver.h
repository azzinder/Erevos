/*
 * SPDX-FileCopyrightText: 2026 azzinder
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
 */

#ifndef EREVOS_SHELLSERVER_H
#define EREVOS_SHELLSERVER_H

#include <QByteArray>
#include <QDir>
#include <QHash>
#include <QList>
#include <QNetworkAccessManager>
#include <QPointer>
#include <QObject>
#include <QString>
#include <QTcpServer>

class LanLink;
class QTcpSocket;
class QTimer;
class QUrlQuery;
class WatchLink;

// Erevos on Sailfish OS is the app's web build in Sailfish WebView (qml/erevos.qml). This serves it
// on 127.0.0.1 only, and answers the same paths the desktop app's shell answers (desktop/main.js,
// app/lib/shell.ts), only with the token it put in the page's address:
//   /__secret?key=…   small values (the app's keystore), in the app's own folder, readable by the
//                     owner only
//   /__file?name=…    the app's sealed files; /__files?prefix=… lists them
//   /__folder         the folder for backups: Documents/Erevos
//   /__backup?…       writes a backup there, keeping the newest
//   /__save?name=…    saves a photo or file from a chat in Downloads
//   /__latest         the latest release's version.json (app/lib/updates.ts), asked for here:
//                     GitHub's downloads do not answer a page's own requests
//   /__watch          the open space's queues, for erevos-watch to wait on while Erevos is not in
//                     front, or closed (app/lib/shell-watch.ts, watchlink.h); DELETE: no more
//   /__lan            Erevos on the same Wi-Fi (lanlink.h), as on a computer: PUT ?on=1 or 0
//                     starts or stops it, POST ?link=… sends the body on a link, GET ?after=…
//                     gives what happened since, waiting a while for something (app/lib/radio.ts)
//   /__wipe           the panic button (app/lib/panic.ts): POST deletes everything the app keeps
//                     (its folder, with the WebView's own, and its cache), with ?backups=1 the
//                     backups in Documents/Erevos too, stops the helper, and closes Erevos
class ShellServer : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString address READ address CONSTANT)

public:
    ShellServer(const QString &webRoot, const QString &dataRoot, WatchLink *watch, QObject *parent = nullptr);

    bool listen(quint16 port);
    /** The address the WebView opens, with the token. */
    QString address() const;

private slots:
    void accept();
    void read();

private:
    struct Request {
        QByteArray method;
        QByteArray path;
        QByteArray query;
        QHash<QByteArray, QByteArray> headers;
        QByteArray body;
    };

    void handle(QTcpSocket *socket, const Request &request);
    void shell(QTcpSocket *socket, const Request &request, const QUrlQuery &query);
    void serveFile(QTcpSocket *socket, const QByteArray &path);
    void secret(QTcpSocket *socket, const Request &request, const QString &key);
    void file(QTcpSocket *socket, const Request &request, const QString &name);
    void files(QTcpSocket *socket, const QString &prefix);
    void backup(QTcpSocket *socket, const Request &request, const QUrlQuery &query);
    void save(QTcpSocket *socket, const Request &request, const QString &name);
    void latest(QTcpSocket *socket);
    void watch(QTcpSocket *socket, const Request &request);
    void lan(QTcpSocket *socket, const Request &request, const QUrlQuery &query);
    void wipe(QTcpSocket *socket, const Request &request, const QUrlQuery &query);
    void lanEvent(const QByteArray &kind, const QString &link, const QByteArray &text = QByteArray());
    void lanAnswer(QTcpSocket *socket, qint64 after);

    static void respond(QTcpSocket *socket, int status, const QByteArray &body = QByteArray(),
                        const QByteArray &type = QByteArray(), const QList<QPair<QByteArray, QByteArray>> &extra = {});

    WatchLink *m_watch;
    QTcpServer m_server;
    QNetworkAccessManager m_net;
    QDir m_web;
    QDir m_data;
    QByteArray m_token;
    QHash<QTcpSocket *, QByteArray> m_buffers;

    // The same Wi-Fi: the link while it is on, what happened on it lately, numbered, and the pages
    // waiting to hear of it.
    struct LanEvent {
        qint64 seq;
        QByteArray kind;
        QString link;
        QByteArray text;
    };
    struct LanWait {
        QPointer<QTcpSocket> socket;
        qint64 after;
        QTimer *timer;
    };
    LanLink *m_lan = nullptr;
    qint64 m_lanSeq = 0;
    QList<LanEvent> m_lanEvents;
    QList<LanWait> m_lanWaiting;
};

#endif
