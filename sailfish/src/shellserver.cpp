#include "shellserver.h"

#include <QDateTime>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPointer>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <QTcpSocket>
#include <QUrl>
#include <QUrlQuery>

namespace {

// A request larger than this is not one the app makes: backups are at most 200 MB.
const qint64 MostBody = 256LL * 1024 * 1024;

// Same as the desktop app's (desktop/main.js), for the page and everything it loads.
const QByteArray Csp =
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
    "media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: ws: wss:; object-src 'none'; base-uri 'self'; "
    "frame-ancestors 'self'";

// The one address /__latest reads, the same as app/lib/updates.ts LATEST_URL, and how much of it.
const char LatestUrl[] = "https://github.com/azzinder/erevos-releases/releases/latest/download/version.json";
const qint64 LatestMost = 64 * 1024;

const QRegularExpression FileName(QStringLiteral("^erevos-[a-z0-9-]+$"));
const QRegularExpression BackupName(QStringLiteral("^erevos-backup-[0-9-]+\\.erevos$"));

QByteArray typeOf(const QString &path)
{
    const QString ext = QFileInfo(path).suffix().toLower();
    if (ext == "html") return "text/html; charset=utf-8";
    if (ext == "js" || ext == "mjs") return "text/javascript; charset=utf-8";
    if (ext == "json") return "application/json";
    if (ext == "wasm") return "application/wasm";
    if (ext == "css") return "text/css; charset=utf-8";
    if (ext == "png") return "image/png";
    if (ext == "jpg" || ext == "jpeg") return "image/jpeg";
    if (ext == "svg") return "image/svg+xml";
    if (ext == "ttf") return "font/ttf";
    if (ext == "woff2") return "font/woff2";
    return "application/octet-stream";
}

QByteArray randomToken()
{
    QFile random(QStringLiteral("/dev/urandom"));
    QByteArray bytes;
    if (random.open(QIODevice::ReadOnly)) bytes = random.read(16);
    if (bytes.size() != 16) qFatal("erevos: no randomness for the shell token");
    return bytes.toHex();
}

/** Written whole into a new file that then takes the old one's place, readable by the owner only. */
bool writeWhole(const QString &path, const QByteArray &data)
{
    QDir().mkpath(QFileInfo(path).absolutePath());
    QSaveFile file(path);
    if (!file.open(QIODevice::WriteOnly)) return false;
    file.setPermissions(QFileDevice::ReadOwner | QFileDevice::WriteOwner);
    file.write(data);
    return file.commit();
}

QByteArray statusText(int status)
{
    switch (status) {
    case 200: return "OK";
    case 204: return "No Content";
    case 400: return "Bad Request";
    case 403: return "Forbidden";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 413: return "Payload Too Large";
    case 502: return "Bad Gateway";
    default: return "Internal Server Error";
    }
}

} // namespace

ShellServer::ShellServer(const QString &webRoot, const QString &dataRoot, QObject *parent)
    : QObject(parent), m_web(webRoot), m_data(dataRoot), m_token(randomToken())
{
    QDir().mkpath(dataRoot);
    QFile::setPermissions(dataRoot, QFileDevice::ReadOwner | QFileDevice::WriteOwner | QFileDevice::ExeOwner);
    connect(&m_server, &QTcpServer::newConnection, this, &ShellServer::accept);
}

bool ShellServer::listen(quint16 port)
{
    // The same port each time, so the page keeps one origin; another one if that is taken.
    return m_server.listen(QHostAddress::LocalHost, port) || m_server.listen(QHostAddress::LocalHost, 0);
}

QString ShellServer::address() const
{
    return QStringLiteral("http://127.0.0.1:%1/#erevos-token=%2").arg(m_server.serverPort()).arg(QString::fromLatin1(m_token));
}

void ShellServer::accept()
{
    while (QTcpSocket *socket = m_server.nextPendingConnection()) {
        connect(socket, &QTcpSocket::readyRead, this, &ShellServer::read);
        connect(socket, &QTcpSocket::disconnected, this, [this, socket]() {
            m_buffers.remove(socket);
            socket->deleteLater();
        });
    }
}

void ShellServer::read()
{
    QTcpSocket *socket = qobject_cast<QTcpSocket *>(sender());
    if (!socket) return;
    QByteArray &buffer = m_buffers[socket];
    buffer += socket->readAll();
    const int end = buffer.indexOf("\r\n\r\n");
    if (end < 0) {
        if (buffer.size() > 64 * 1024) socket->abort();
        return;
    }
    Request request;
    const QList<QByteArray> lines = buffer.left(end).split('\n');
    const QList<QByteArray> first = lines.value(0).trimmed().split(' ');
    if (first.size() < 2) {
        socket->abort();
        return;
    }
    request.method = first[0];
    const QByteArray target = first[1];
    const int mark = target.indexOf('?');
    request.path = mark < 0 ? target : target.left(mark);
    request.query = mark < 0 ? QByteArray() : target.mid(mark + 1);
    for (int i = 1; i < lines.size(); ++i) {
        const int colon = lines[i].indexOf(':');
        if (colon > 0) request.headers.insert(lines[i].left(colon).trimmed().toLower(), lines[i].mid(colon + 1).trimmed());
    }
    const qint64 length = request.headers.value("content-length", "0").toLongLong();
    if (length < 0 || length > MostBody) {
        respond(socket, 413);
        return;
    }
    if (buffer.size() - (end + 4) < length) return; // the rest of the body is on its way
    request.body = buffer.mid(end + 4, int(length));
    m_buffers.remove(socket);
    disconnect(socket, &QTcpSocket::readyRead, this, &ShellServer::read);
    handle(socket, request);
}

void ShellServer::respond(QTcpSocket *socket, int status, const QByteArray &body, const QByteArray &type,
                          const QList<QPair<QByteArray, QByteArray>> &extra)
{
    QByteArray head = "HTTP/1.1 " + QByteArray::number(status) + ' ' + statusText(status) + "\r\n";
    head += "Content-Length: " + QByteArray::number(body.size()) + "\r\n";
    if (!type.isEmpty()) head += "Content-Type: " + type + "\r\n";
    head += "Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n";
    for (const auto &header : extra) head += header.first + ": " + header.second + "\r\n";
    socket->write(head + "\r\n");
    socket->write(body);
    socket->disconnectFromHost();
}

void ShellServer::handle(QTcpSocket *socket, const Request &request)
{
    // Only pages of this server: a page elsewhere that points a name at 127.0.0.1 is turned away.
    const QByteArray host = "127.0.0.1:" + QByteArray::number(m_server.serverPort());
    if (request.headers.value("host") != host) {
        respond(socket, 403);
        return;
    }
    const QByteArray path = QUrl::fromPercentEncoding(request.path).toUtf8();
    if (path.startsWith("/__")) {
        if (request.headers.value("x-erevos-token") != m_token) {
            respond(socket, 403);
            return;
        }
        shell(socket, request, QUrlQuery(QString::fromUtf8(request.query)));
        return;
    }
    if (request.method != "GET" && request.method != "HEAD") {
        respond(socket, 405);
        return;
    }
    serveFile(socket, path);
}

void ShellServer::serveFile(QTcpSocket *socket, const QByteArray &path)
{
    QString relative = QString::fromUtf8(path);
    // A screen of the app, not a file: the app itself, which shows it.
    if (relative == "/" || !QFileInfo(relative).fileName().contains('.')) relative = QStringLiteral("/index.html");
    const QString full = QDir::cleanPath(m_web.absolutePath() + relative);
    if (!full.startsWith(m_web.absolutePath() + '/')) {
        respond(socket, 404);
        return;
    }
    QFile file(full);
    if (!file.open(QIODevice::ReadOnly)) {
        respond(socket, 404);
        return;
    }
    QList<QPair<QByteArray, QByteArray>> extra;
    if (full.endsWith(QLatin1String(".html"))) extra << qMakePair(QByteArray("Content-Security-Policy"), Csp);
    respond(socket, 200, file.readAll(), typeOf(full), extra);
}

void ShellServer::shell(QTcpSocket *socket, const Request &request, const QUrlQuery &query)
{
    const QString path = QString::fromUtf8(request.path);
    const auto value = [&query](const char *name) { return query.queryItemValue(QLatin1String(name), QUrl::FullyDecoded); };
    if (path == "/__secret") secret(socket, request, value("key"));
    else if (path == "/__file") file(socket, request, value("name"));
    else if (path == "/__files") files(socket, value("prefix"));
    else if (path == "/__folder") {
        const QString folder = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation) + QStringLiteral("/Erevos");
        QDir().mkpath(folder);
        QJsonObject answer;
        answer.insert(QStringLiteral("path"), folder);
        respond(socket, 200, QJsonDocument(answer).toJson(QJsonDocument::Compact), "application/json");
    } else if (path == "/__backup") backup(socket, request, query);
    else if (path == "/__save") save(socket, request, value("name"));
    else if (path == "/__latest") latest(socket);
    else respond(socket, 404);
}

void ShellServer::secret(QTcpSocket *socket, const Request &request, const QString &key)
{
    if (key.isEmpty()) {
        respond(socket, 400, "no key");
        return;
    }
    // One file for each value, named by the key's bytes in hex, so no key is ever a path.
    const QString path = m_data.filePath(QStringLiteral("secrets/") + QString::fromLatin1(key.toUtf8().toHex()));
    const QList<QPair<QByteArray, QByteArray>> store = {qMakePair(QByteArray("X-Erevos-Secret-Store"), QByteArray("plain"))};
    if (request.method == "GET") {
        QFile file(path);
        if (!file.open(QIODevice::ReadOnly)) respond(socket, 204, QByteArray(), QByteArray(), store);
        else respond(socket, 200, file.readAll(), "text/plain; charset=utf-8", store);
    } else if (request.method == "PUT") {
        respond(socket, writeWhole(path, request.body) ? 204 : 500, QByteArray(), QByteArray(), store);
    } else if (request.method == "DELETE") {
        QFile::remove(path);
        respond(socket, 204, QByteArray(), QByteArray(), store);
    } else {
        respond(socket, 405);
    }
}

void ShellServer::file(QTcpSocket *socket, const Request &request, const QString &name)
{
    if (!FileName.match(name).hasMatch()) {
        respond(socket, 400, "bad name");
        return;
    }
    const QString path = m_data.filePath(QStringLiteral("files/") + name);
    if (request.method == "GET") {
        QFile file(path);
        if (!file.open(QIODevice::ReadOnly)) respond(socket, 204);
        else respond(socket, 200, file.readAll(), "application/octet-stream");
    } else if (request.method == "PUT") {
        respond(socket, writeWhole(path, request.body) ? 204 : 500);
    } else if (request.method == "DELETE") {
        QFile::remove(path);
        respond(socket, 204);
    } else {
        respond(socket, 405);
    }
}

void ShellServer::files(QTcpSocket *socket, const QString &prefix)
{
    QJsonArray names;
    const QStringList entries = QDir(m_data.filePath(QStringLiteral("files"))).entryList(QDir::Files);
    for (const QString &name : entries) {
        if (FileName.match(name).hasMatch() && name.startsWith(prefix)) names.append(name);
    }
    respond(socket, 200, QJsonDocument(names).toJson(QJsonDocument::Compact), "application/json");
}

void ShellServer::backup(QTcpSocket *socket, const Request &request, const QUrlQuery &query)
{
    const QString folder = query.queryItemValue(QStringLiteral("folder"), QUrl::FullyDecoded);
    const QString name = query.queryItemValue(QStringLiteral("name"), QUrl::FullyDecoded);
    const int keep = query.queryItemValue(QStringLiteral("keep")).toInt();
    const QString allowed = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation) + QStringLiteral("/Erevos");
    if (request.method != "PUT") {
        respond(socket, 405);
        return;
    }
    if (folder != allowed) {
        respond(socket, 403, "That folder was not chosen for backups.");
        return;
    }
    if (!BackupName.match(name).hasMatch()) {
        respond(socket, 400, "bad name");
        return;
    }
    QDir dir(folder);
    if (!dir.exists() && !QDir().mkpath(folder)) {
        respond(socket, 404);
        return;
    }
    if (!writeWhole(dir.filePath(name), request.body)) {
        respond(socket, 500, "The backup could not be written.");
        return;
    }
    if (keep > 0) {
        QStringList backups;
        for (const QString &entry : dir.entryList(QDir::Files, QDir::Name)) {
            if (BackupName.match(entry).hasMatch()) backups << entry;
        }
        for (int i = 0; i < backups.size() - keep; ++i) dir.remove(backups[i]);
    }
    respond(socket, 204);
}

void ShellServer::save(QTcpSocket *socket, const Request &request, const QString &name)
{
    if (request.method != "POST") {
        respond(socket, 405);
        return;
    }
    QString base = QFileInfo(name).fileName();
    if (base.isEmpty() || base.startsWith('.')) base = QStringLiteral("file");
    const QDir downloads(QStandardPaths::writableLocation(QStandardPaths::DownloadLocation));
    QDir().mkpath(downloads.absolutePath());
    // A name already there gets a number: nothing is written over.
    const QFileInfo info(base);
    QString target = downloads.filePath(base);
    for (int n = 2; QFileInfo::exists(target); ++n) {
        const QString suffix = info.suffix().isEmpty() ? QString() : '.' + info.suffix();
        target = downloads.filePath(QStringLiteral("%1 (%2)%3").arg(info.completeBaseName()).arg(n).arg(suffix));
    }
    QFile file(target);
    if (!file.open(QIODevice::WriteOnly) || file.write(request.body) != request.body.size()) {
        respond(socket, 500, "The file could not be saved.");
        return;
    }
    QJsonObject answer;
    answer.insert(QStringLiteral("path"), target);
    respond(socket, 200, QJsonDocument(answer).toJson(QJsonDocument::Compact), "application/json");
}

void ShellServer::latest(QTcpSocket *socket)
{
    // Only when the owner taps Check for updates; GitHub answers with a redirect to the file.
    // FollowRedirectsAttribute: Sailfish OS has Qt 5.6, before RedirectPolicyAttribute.
    QNetworkRequest request(QUrl(QString::fromLatin1(LatestUrl)));
    request.setAttribute(QNetworkRequest::FollowRedirectsAttribute, true);
    request.setRawHeader("Cache-Control", "no-cache");
    QNetworkReply *reply = m_net.get(request);
    const QPointer<QTcpSocket> to(socket);
    connect(reply, &QNetworkReply::finished, this, [reply, to]() {
        reply->deleteLater();
        if (!to) return;
        const int status = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        const QByteArray body = reply->read(LatestMost + 1);
        if (status == 0 || body.size() > LatestMost) respond(to, 502);
        else respond(to, status, body, "application/json");
    });
}
