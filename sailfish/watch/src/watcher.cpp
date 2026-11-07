// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include "watcher.h"

#include "alerts.h"
#include "awake.h"
#include "relayline.h"

#include <QCoreApplication>
#include <QDBusConnection>
#include <QDBusConnectionInterface>
#include <QDBusMessage>
#include <QDBusReply>
#include <QDateTime>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkConfigurationManager>
#include <QRegularExpression>

namespace {

// The relay's request and the bytes of its reply (crates/erevos-relay/src/server.rs).
const char NewsAny = char(30);
const char Ok = char(0);
const char Gone = char(2);
const int NewsLength = 16;
const int IdLength = 24;
// How much longer than its wait a reply may take (app/lib/relay.ts).
const int ReplyGrace = 30;
// The longest pause after a connection failed; and the pause for a relay that cannot be asked so:
// one from before NEWS_ANY, which closes the connection, or one that did not prove its key.
const int MostPause = 60 * 1000;
const int LongPause = 10 * 60 * 1000;
// How soon a connection that closes on its first request counts as one from before NEWS_ANY.
const int QuickClose = 5 * 1000;
// What the app may give: so many connections, words and characters at most.
const int MostWaits = 32;
const int MostWords = 999;
const int MostWordLength = 300;
const int MostUrlLength = 512;

qint64 wallNow()
{
    // The wall clock, not a timer's: a timer stands still while the phone sleeps.
    return QDateTime::currentMSecsSinceEpoch();
}

void putU32(QByteArray &out, quint32 value)
{
    out.append(char((value >> 24) & 0xff));
    out.append(char((value >> 16) & 0xff));
    out.append(char((value >> 8) & 0xff));
    out.append(char(value & 0xff));
}

quint32 u32At(const QByteArray &bytes, int at)
{
    return (quint32(quint8(bytes[at])) << 24) | (quint32(quint8(bytes[at + 1])) << 16) | (quint32(quint8(bytes[at + 2])) << 8)
        | quint32(quint8(bytes[at + 3]));
}

quint32 since(quint32 before, quint32 now)
{
    return now > before ? now - before : 0;
}

/** The address the app keeps a relay's key by (app/lib/relay.ts relayHome). */
QString homeOf(const QString &url)
{
    QString home = url.trimmed();
    while (home.endsWith(QLatin1Char('/'))) home.chop(1);
    home.remove(QRegularExpression(QStringLiteral("/(?:sealed|files|join|read)$"), QRegularExpression::CaseInsensitiveOption));
    return home.toLower();
}

bool isHex(const QString &text, int length)
{
    static const QRegularExpression hex(QStringLiteral("^[0-9a-fA-F]*$"));
    return text.size() == length && hex.match(text).hasMatch();
}

} // namespace

Wait::Wait(const QString &url, const QByteArray &key, const QList<QByteArray> &ids, QObject *parent)
    : QObject(parent)
    , m_url(url.trimmed())
    , m_home(homeOf(url))
    , m_key(key)
{
    for (const QByteArray &id : ids) {
        Queue queue;
        queue.id = id;
        m_queues.append(queue);
    }
    m_retry.setSingleShot(true);
    connect(&m_retry, &QTimer::timeout, this, &Wait::start);
    m_late.setSingleShot(true);
    connect(&m_late, &QTimer::timeout, this, &Wait::again);
}

void Wait::hearAs(const Wait &other)
{
    if (other.m_home != m_home) return;
    for (Queue &queue : m_queues)
        for (const Queue &was : other.m_queues)
            if (was.id == queue.id && was.known) {
                queue.heard = was.heard;
                queue.known = true;
            }
}

void Wait::forget()
{
    for (Queue &queue : m_queues) queue.known = false;
}

void Wait::start()
{
    m_on = true;
    if (m_line || m_retry.isActive() || m_queues.isEmpty()) return;
    m_live = false;
    m_line = new RelayLine(m_url, m_key, this);
    connect(m_line, &RelayLine::ready, this, &Wait::ready);
    connect(m_line, &RelayLine::answered, this, &Wait::answered);
    connect(m_line, &RelayLine::failed, this, &Wait::failed);
    m_line->open();
}

void Wait::halt()
{
    m_on = false;
    m_retry.stop();
    m_late.stop();
    m_askedAt = 0;
    if (!m_line) return;
    m_line->disconnect(this);
    m_line->close();
    m_line->deleteLater();
    m_line = nullptr;
}

void Wait::again()
{
    if (!m_on) return;
    halt();
    m_failures = 0;
    start();
}

bool Wait::overdue(qint64 now) const
{
    return m_askedAt != 0 && now - m_askedAt > qint64(m_seconds + ReplyGrace) * 1000;
}

void Wait::ready()
{
    ask();
}

void Wait::ask()
{
    // A connection looks at once first, and so does a list with a queue not heard of yet.
    bool look = !m_live;
    for (const Queue &queue : m_queues) look = look || !queue.known;
    m_seconds = look ? 0 : WaitSeconds;
    QByteArray request;
    request.append(NewsAny);
    request.append(char(m_queues.size()));
    for (const Queue &queue : m_queues) {
        request += queue.id;
        const News heard = queue.known ? queue.heard : News();
        putU32(request, heard.round);
        putU32(request, heard.messages);
        putU32(request, heard.unmarked);
        putU32(request, heard.rings);
    }
    request.append(char(m_seconds));
    m_askedAt = wallNow();
    m_late.start((m_seconds + ReplyGrace) * 1000);
    if (!m_line || !m_line->ask(request)) failed(QStringLiteral("busy"));
}

void Wait::answered(const QByteArray &reply)
{
    m_late.stop();
    m_askedAt = 0;
    // What it hears now came while it waited, unless this was the connection's first look.
    const bool live = m_live;
    m_live = true;
    if (reply.size() != 1 + m_queues.size() * (1 + NewsLength) || reply[0] != Ok) {
        failed(QStringLiteral("reply"));
        return;
    }
    m_failures = 0;
    int count = 0;
    bool ringing = false;
    QList<Queue> kept;
    for (int i = 0; i < m_queues.size(); ++i) {
        const int at = 1 + i * (1 + NewsLength);
        // A queue the relay no longer has: its contact was deleted, or took another, and the app
        // names the queues anew when it opens.
        if (reply[at] == Gone) continue;
        News now;
        now.round = u32At(reply, at + 1);
        now.messages = u32At(reply, at + 5);
        now.unmarked = u32At(reply, at + 9);
        now.rings = u32At(reply, at + 13);
        Queue queue = m_queues[i];
        if (queue.known) {
            // In the same round, what came since; in a new one, all of it (relay.ts newsSince).
            const News before = queue.heard.round == now.round ? queue.heard : News();
            count += int(qMin<quint32>(since(before.messages, now.messages) + since(before.unmarked, now.unmarked)
                                           + since(before.rings, now.rings),
                                       100000));
            ringing = ringing || (live && now.rings > before.rings);
        }
        queue.heard = now;
        queue.known = true;
        kept.append(queue);
    }
    m_queues = kept;
    if (count > 0 || ringing) emit came(count, ringing);
    if (m_queues.isEmpty()) {
        halt();
        return;
    }
    if (m_on && m_line && m_line->isReady()) ask();
}

void Wait::failed(const QString &why)
{
    // Closed as soon as it first asked: a relay from before NEWS_ANY, asked again much later.
    const bool old = m_askedAt != 0 && !m_live && wallNow() - m_askedAt < QuickClose;
    m_late.stop();
    m_askedAt = 0;
    if (m_line) {
        m_line->disconnect(this);
        m_line->close();
        m_line->deleteLater();
        m_line = nullptr;
    }
    if (!m_on) return;
    qInfo("erevos-watch: a connection to a relay failed (%s)", qPrintable(why));
    ++m_failures;
    if (old || why == QLatin1String("not proven"))
        later(LongPause);
    else
        later(qMin(MostPause, 5000 << qMin(m_failures, 4)));
}

void Wait::later(int ms)
{
    m_retry.start(ms);
}

Watcher::Watcher(Alerts *alerts, QObject *parent)
    : QObject(parent)
    , m_alerts(alerts)
    , m_awake(new Awake(this))
    , m_network(new QNetworkConfigurationManager(this))
{
    connect(m_awake, &Awake::beat, this, &Watcher::beat);
    // While a call rings, the phone stays awake for it.
    connect(m_alerts, &Alerts::ringingChanged, this, [this](bool ringing) {
        if (ringing)
            m_awake->hold();
        else
            m_awake->letGo();
    });
    connect(m_network, &QNetworkConfigurationManager::onlineStateChanged, this, &Watcher::online);
    // The network changed: once it settles, each connection is made again on it.
    m_settle.setSingleShot(true);
    m_settle.setInterval(2000);
    connect(&m_settle, &QTimer::timeout, this, [this]() {
        if (m_front) return;
        for (Wait *wait : m_waits) wait->again();
    });
}

bool Watcher::fromErevos()
{
    if (!calledFromDBus()) return true;
    const QString caller = message().service();
    if (m_callers.contains(caller)) return true;
    QString erevos = QCoreApplication::applicationDirPath() + QStringLiteral("/erevos");
#ifdef EREVOS_WATCH_TEST
    // The check on a computer calls it from its own program.
    if (qEnvironmentVariableIsSet("EREVOS_WATCH_TEST_CALLER")) erevos = QString::fromLocal8Bit(qgetenv("EREVOS_WATCH_TEST_CALLER"));
#endif
    const QDBusReply<uint> pid = connection().interface()->servicePid(caller);
    QString running = pid.isValid() ? QFileInfo(QStringLiteral("/proc/%1/exe").arg(pid.value())).symLinkTarget() : QString();
    running.remove(QRegularExpression(QStringLiteral(" \\(deleted\\)$")));
    if (!running.isEmpty() && running == erevos) {
        m_callers.insert(caller);
        return true;
    }
    sendErrorReply(QDBusError::AccessDenied, QStringLiteral("Only Erevos gives erevos-watch what to wait on."));
    return false;
}

bool Watcher::watch(const QString &json)
{
    if (!fromErevos()) return false;
    QJsonParseError error;
    const QJsonDocument document = QJsonDocument::fromJson(json.toUtf8(), &error);
    if (error.error != QJsonParseError::NoError || !document.isObject()) return false;
    const QJsonObject given = document.object();

    const QJsonObject words = given.value(QStringLiteral("words")).toObject();
    Alerts::Words said;
    said.title = words.value(QStringLiteral("title")).toString().left(MostWordLength);
    said.call = words.value(QStringLiteral("call")).toString().left(MostWordLength);
    const QJsonArray messages = words.value(QStringLiteral("messages")).toArray();
    if (said.title.isEmpty() || said.call.isEmpty() || messages.isEmpty() || messages.size() > MostWords) return false;
    for (const QJsonValue &text : messages) {
        if (!text.isString() || text.toString().isEmpty()) return false;
        said.messages.append(text.toString().left(MostWordLength));
    }

    const QJsonArray waits = given.value(QStringLiteral("waits")).toArray();
    if (waits.size() > MostWaits) return false;
    QList<Wait *> made;
    bool fine = true;
    for (const QJsonValue &value : waits) {
        const QJsonObject one = value.toObject();
        const QString url = one.value(QStringLiteral("url")).toString().trimmed();
        const QString key = one.value(QStringLiteral("key")).toString();
        const QJsonArray queues = one.value(QStringLiteral("queues")).toArray();
        const QString scheme = url.section(QLatin1Char(':'), 0, 0).toLower();
        fine = url.size() <= MostUrlLength && (scheme == QLatin1String("ws") || scheme == QLatin1String("wss")) && (key.isEmpty() || isHex(key, 64))
            && !queues.isEmpty() && queues.size() <= Wait::MostQueues;
        QList<QByteArray> ids;
        for (const QJsonValue &queue : queues) {
            const QString hex = queue.toString();
            if (!isHex(hex, IdLength * 2)) fine = false;
            ids.append(QByteArray::fromHex(hex.toLatin1()));
        }
        if (!fine) break;
        made.append(new Wait(url, QByteArray::fromHex(key.toLatin1()), ids, this));
    }
    if (!fine) {
        qDeleteAll(made);
        return false;
    }

    // What was heard of a queue already stays: its messages are not told of twice.
    for (Wait *wait : made)
        for (const Wait *was : m_waits) wait->hearAs(*was);
    for (Wait *was : m_waits) {
        was->halt();
        was->deleteLater();
    }
    m_waits = made;
    for (Wait *wait : m_waits) connect(wait, &Wait::came, this, &Watcher::came);
    m_alerts->setWords(said);
    if (m_waits.isEmpty()) {
        stop();
        return true;
    }
    if (!m_front) startAll();
    return true;
}

void Watcher::front(bool inFront)
{
    if (!fromErevos()) return;
    if (inFront == m_front) return;
    m_front = inFront;
    if (!inFront) {
        startAll();
        return;
    }
    // Erevos reads it all now: what is there when it goes is heard anew, not told of.
    for (Wait *wait : m_waits) {
        wait->halt();
        wait->forget();
    }
    m_settle.stop();
    m_awake->stop();
    m_count = 0;
    m_alerts->clear();
}

void Watcher::stop()
{
    if (!fromErevos()) return;
    for (Wait *wait : m_waits) {
        wait->halt();
        wait->deleteLater();
    }
    m_waits.clear();
    m_settle.stop();
    m_awake->stop();
    m_count = 0;
    m_alerts->clear();
    emit idle();
}

bool Watcher::watching() const
{
    return !m_waits.isEmpty();
}

void Watcher::startAll()
{
    if (m_waits.isEmpty()) return;
    for (Wait *wait : m_waits) wait->start();
    m_awake->start();
}

void Watcher::came(int count, bool ringing)
{
    if (m_front) return;
    m_count = qMin(m_count + count, 1000000);
    if (count > 0) m_alerts->tell(m_count);
    if (ringing) m_alerts->ring();
}

void Watcher::beat()
{
    const qint64 now = wallNow();
    for (Wait *wait : m_waits)
        if (wait->overdue(now)) wait->again();
}

void Watcher::online(bool on)
{
    if (on && !m_front) m_settle.start();
}
