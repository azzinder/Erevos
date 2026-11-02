// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include "shellserver.h"

#include "lanlink.h"
#include "watchlink.h"

#include <QCoreApplication>
#include <QDateTime>
#include <QDesktopServices>
#include <QDirIterator>
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
#include <QTimer>
#include <QUrl>
#include <QUrlQuery>

namespace {

// A request larger than this is not one the app makes: backups are at most 200 MB.
const qint64 MostBody = 256LL * 1024 * 1024;

// As the desktop app's (desktop/main.js), for the page and everything it loads, without its Element
// Call frame: HTTPS too, which Matrix, the files of XMPP and Nostr chats and link previews go by.
const QByteArray Csp =
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
    "media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: https: ws: wss:; object-src 'none'; base-uri 'self'; "
    "frame-ancestors 'self'";

// The most a list of queues for erevos-watch may be: 2048 queues and the words, with room.
const int MostWatchList = 512 * 1024;

// The longest link that leaves Erevos given to the system (/__open): a sign-in page's, with room.
const int MostLink = 8192;

// The one address /__latest reads, the same as app/lib/updates.ts LATEST_URL, and how much of it.
const char LatestUrl[] = "https://github.com/azzinder/erevos-releases/releases/latest/download/version.json";
const qint64 LatestMost = 64 * 1024;

// What the same Wi-Fi said lately, kept for the page to take, and how long a page waits to hear more.
const int LanKept = 500;
const int LanWaitMs = 20000;

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

ShellServer::ShellServer(const QString &webRoot, const QString &dataRoot, WatchLink *watch, QObject *parent)
    : QObject(parent), m_watch(watch), m_web(webRoot), m_data(dataRoot), m_token(randomToken())
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
    else if (path == "/__watch") watch(socket, request);
    else if (path == "/__lan") lan(socket, request, query);
    else if (path == "/__wipe") wipe(socket, request, query);
    else if (path == "/__open") openOutside(socket, request, value("url"));
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

void ShellServer::watch(QTcpSocket *socket, const Request &request)
{
    if (request.method == "PUT") {
        if (request.body.isEmpty() || request.body.size() > MostWatchList) {
            respond(socket, 400);
            return;
        }
        m_watch->give(request.body);
    } else if (request.method == "DELETE") {
        m_watch->takeBack();
    } else {
        respond(socket, 405);
        return;
    }
    respond(socket, 204);
}

// A link that leaves Erevos (app/lib/shell.ts): Sailfish WebView opens no window of its own, so
// the system opens it, a web page in the browser (the relay's sign-in with LPHL, say), a number in
// the phone or the messages, an address in the mail. Only these kinds.
void ShellServer::openOutside(QTcpSocket *socket, const Request &request, const QString &address)
{
    if (request.method != "PUT") {
        respond(socket, 405);
        return;
    }
    static const QStringList kinds = {QStringLiteral("http"), QStringLiteral("https"), QStringLiteral("mailto"),
                                      QStringLiteral("tel"), QStringLiteral("sms"), QStringLiteral("geo")};
    // Tolerant, as a browser is: a space in a number (sms:+30 690…) or a mail's subject is escaped, not
    // refused. Only the kinds above go to the system all the same.
    const QUrl url(address, QUrl::TolerantMode);
    if (address.size() > MostLink || !url.isValid() || !kinds.contains(url.scheme().toLower())) {
        respond(socket, 400);
        return;
    }
    respond(socket, QDesktopServices::openUrl(url) ? 204 : 404);
}

void ShellServer::wipe(QTcpSocket *socket, const Request &request, const QUrlQuery &query)
{
    if (request.method != "POST") {
        respond(socket, 405);
        return;
    }
    // Nothing waits at the relay for it any more, and the same Wi-Fi stops.
    m_watch->takeBack();
    if (m_lan) {
        m_lan->stop();
        m_lan->deleteLater();
        m_lan = nullptr;
        m_lanEvents.clear();
    }
    bool left = false;
    // The automatic backups, when the owner chose it: only those Erevos named, in its own folder.
    if (query.queryItemValue(QStringLiteral("backups")) == QLatin1String("1")) {
        QDir backups(QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation) + QStringLiteral("/Erevos"));
        for (const QString &entry : backups.entryList(QDir::Files)) {
            if (BackupName.match(entry).hasMatch() && !backups.remove(entry)) left = true;
        }
    }
    // Only a folder of the app's own: never one Qt could not name, nor the home folder itself.
    const QString data = m_data.absolutePath();
    const QString home = QDir::homePath();
    if (QStandardPaths::writableLocation(QStandardPaths::AppDataLocation).isEmpty() || data == home || !data.startsWith(home + QLatin1Char('/'))) {
        respond(socket, 500, "Erevos's folder is not where it should be: nothing was deleted.");
        return;
    }
    // Everything the app keeps: its keystore (secrets/), its sealed files (files/), and Sailfish
    // WebView's own folder for it (.mozilla), which is in the same place; and the WebView's cache.
    bool gone = m_data.removeRecursively();
    const QString cache = QStandardPaths::writableLocation(QStandardPaths::CacheLocation);
    if (!cache.isEmpty() && cache.startsWith(home + QLatin1Char('/'))) QDir(cache).removeRecursively();
    // What could not be deleted at once (a file the WebView holds open) goes one by one.
    if (!gone) {
        QDirIterator left(m_data.absolutePath(), QDir::Files | QDir::Hidden | QDir::System, QDirIterator::Subdirectories);
        while (left.hasNext()) QFile::remove(left.next());
        gone = !QDirIterator(m_data.absolutePath(), QDir::Files | QDir::Hidden | QDir::System, QDirIterator::Subdirectories).hasNext();
    }
    respond(socket, gone && !left ? 204 : 500, gone && !left ? QByteArray() : QByteArray("Some of Erevos's files could not be deleted."));
    // Then Erevos closes, and opens next time as if just installed.
    QTimer::singleShot(500, qApp, &QCoreApplication::quit);
}

void ShellServer::lan(QTcpSocket *socket, const Request &request, const QUrlQuery &query)
{
    if (request.method == "PUT") {
        const bool on = query.queryItemValue(QStringLiteral("on")) == QLatin1String("1");
        if (on && !m_lan) {
            m_lan = new LanLink(this);
            connect(m_lan, &LanLink::linked, this, [this](const QString &link) { lanEvent("link", link); });
            connect(m_lan, &LanLink::gone, this, [this](const QString &link) { lanEvent("gone", link); });
            connect(m_lan, &LanLink::text, this, [this](const QString &link, const QByteArray &text) { lanEvent("text", link, text); });
            connect(m_lan, &LanLink::logged, this, [](const QString &line) { qWarning("erevos: %s", qPrintable(line)); });
            m_lan->start();
        } else if (!on && m_lan) {
            m_lan->stop();
            m_lan->deleteLater();
            m_lan = nullptr;
            m_lanEvents.clear();
        }
        QJsonArray links;
        if (m_lan) {
            for (const QString &link : m_lan->links()) links.append(link);
        }
        QJsonObject answer;
        answer.insert(QStringLiteral("after"), double(m_lanSeq));
        answer.insert(QStringLiteral("links"), links);
        respond(socket, 200, QJsonDocument(answer).toJson(QJsonDocument::Compact), "application/json");
    } else if (request.method == "POST") {
        const QString link = query.queryItemValue(QStringLiteral("link"), QUrl::FullyDecoded);
        respond(socket, m_lan && m_lan->send(link, request.body) ? 204 : 404);
    } else if (request.method == "GET") {
        const qint64 after = query.queryItemValue(QStringLiteral("after")).toLongLong();
        bool newer = false;
        for (const LanEvent &event : m_lanEvents) newer = newer || event.seq > after;
        if (newer) {
            lanAnswer(socket, after);
            return;
        }
        // Nothing yet: it waits a while for something, then answers with nothing.
        QTimer *timer = new QTimer(this);
        timer->setSingleShot(true);
        const QPointer<QTcpSocket> to(socket);
        connect(timer, &QTimer::timeout, this, [this, timer, to, after]() {
            for (int i = 0; i < m_lanWaiting.size(); ++i) {
                if (m_lanWaiting[i].timer == timer) m_lanWaiting.removeAt(i--);
            }
            timer->deleteLater();
            if (to) lanAnswer(to, after);
        });
        m_lanWaiting.append({to, after, timer});
        timer->start(LanWaitMs);
    } else {
        respond(socket, 405);
    }
}

void ShellServer::lanEvent(const QByteArray &kind, const QString &link, const QByteArray &text)
{
    m_lanEvents.append({++m_lanSeq, kind, link, text});
    while (m_lanEvents.size() > LanKept) m_lanEvents.removeFirst();
    const QList<LanWait> waiting = m_lanWaiting;
    m_lanWaiting.clear();
    for (const LanWait &wait : waiting) {
        wait.timer->stop();
        wait.timer->deleteLater();
        if (wait.socket) lanAnswer(wait.socket, wait.after);
    }
}

void ShellServer::lanAnswer(QTcpSocket *socket, qint64 after)
{
    QJsonArray events;
    for (const LanEvent &event : m_lanEvents) {
        if (event.seq <= after) continue;
        QJsonObject one;
        one.insert(QStringLiteral("seq"), double(event.seq));
        one.insert(QStringLiteral("kind"), QString::fromLatin1(event.kind));
        one.insert(QStringLiteral("link"), event.link);
        if (event.kind == "text") one.insert(QStringLiteral("text"), QString::fromUtf8(event.text));
        events.append(one);
    }
    QJsonObject answer;
    answer.insert(QStringLiteral("events"), events);
    respond(socket, 200, QJsonDocument(answer).toJson(QJsonDocument::Compact), "application/json");
}
