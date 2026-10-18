#ifndef EREVOS_SHELLSERVER_H
#define EREVOS_SHELLSERVER_H

#include <QByteArray>
#include <QDir>
#include <QHash>
#include <QObject>
#include <QString>
#include <QTcpServer>

class QTcpSocket;
class QUrlQuery;

// Erevos on Sailfish OS is the app's web build in Sailfish WebView (qml/erevos.qml). This serves it
// on 127.0.0.1 only, and answers the same paths the desktop app's shell answers (desktop/main.js,
// app/lib/shell.ts), only with the token it put in the page's address:
//   /__secret?key=…   small values (the app's keystore), in the app's own folder, readable by the
//                     owner only
//   /__file?name=…    the app's sealed files; /__files?prefix=… lists them
//   /__folder         the folder for backups: Documents/Erevos
//   /__backup?…       writes a backup there, keeping the newest
//   /__save?name=…    saves a photo or file from a chat in Downloads
class ShellServer : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString address READ address CONSTANT)

public:
    ShellServer(const QString &webRoot, const QString &dataRoot, QObject *parent = nullptr);

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

    static void respond(QTcpSocket *socket, int status, const QByteArray &body = QByteArray(),
                        const QByteArray &type = QByteArray(), const QList<QPair<QByteArray, QByteArray>> &extra = {});

    QTcpServer m_server;
    QDir m_web;
    QDir m_data;
    QByteArray m_token;
    QHash<QTcpSocket *, QByteArray> m_buffers;
};

#endif
