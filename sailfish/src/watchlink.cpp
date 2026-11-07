// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include "watchlink.h"

#include <QCoreApplication>
#include <QDBusConnection>
#include <QDBusConnectionInterface>
#include <QDBusMessage>
#include <QDBusPendingCall>
#include <QDBusPendingCallWatcher>
#include <QDBusReply>
#include <QFileInfo>
#include <QRegularExpression>

namespace {
const char Helper[] = "app.erevos.watch";
const char HelperPath[] = "/app/erevos/watch";
const char HelperInterface[] = "app.erevos.Watch";

/** The program process `pid` runs, as /proc says, without the " (deleted)" of one replaced since it started. */
QString programOf(uint pid)
{
    QString running = QFileInfo(QStringLiteral("/proc/%1/exe").arg(pid)).symLinkTarget();
    running.remove(QRegularExpression(QStringLiteral(" \\(deleted\\)$")));
    return running;
}

/** The unique name on the bus of the process holding `service`, if it runs `program`; empty if not. */
QString heldBy(const QString &service, const QString &program)
{
    QDBusConnectionInterface *bus = QDBusConnection::sessionBus().interface();
    if (!bus) return QString();
    const QDBusReply<QString> owner = bus->serviceOwner(service);
    if (!owner.isValid()) return QString();
    const QDBusReply<uint> pid = bus->servicePid(owner.value());
    return pid.isValid() && programOf(pid.value()) == program ? owner.value() : QString();
}
}

WatchLink::WatchLink(QObject *parent)
    : QObject(parent)
    , m_helper(QString::fromLatin1(Helper), QDBusConnection::sessionBus(), QDBusServiceWatcher::WatchForUnregistration)
{
    // The helper ended: given again the next time Erevos goes out of sight, to the one then running.
    connect(&m_helper, &QDBusServiceWatcher::serviceUnregistered, this, [this]() {
        m_given = false;
        m_owner.clear();
    });
}

bool WatchLink::offer()
{
    QDBusConnection bus = QDBusConnection::sessionBus();
    return bus.registerObject(QStringLiteral("/app/erevos"), this, QDBusConnection::ExportScriptableSlots)
        && bus.registerService(QStringLiteral("app.erevos"));
}

void WatchLink::give(const QByteArray &list)
{
    // The same again: the helper has it, and its connections stay as they are.
    if (m_given && list == m_list) return;
    m_list = list;
    // Started by D-Bus when it is not running; the calls after this one wait for it, in order.
    call(QStringLiteral("watch"), {QString::fromUtf8(list)});
    call(QStringLiteral("front"), {m_front});
    m_given = true;
}

void WatchLink::takeBack()
{
    m_list.clear();
    if (m_given) call(QStringLiteral("stop"), {});
    m_given = false;
}

void WatchLink::setFront(bool front)
{
    m_front = front;
    if (m_list.isEmpty()) return;
    if (!m_given) {
        give(m_list);
        return;
    }
    call(QStringLiteral("front"), {front});
}

void WatchLink::show()
{
    emit showWanted();
}

void WatchLink::call(const QString &method, const QVariantList &arguments)
{
    m_calls.append(qMakePair(method, arguments));
    if (!m_owner.isEmpty()) {
        send();
        return;
    }
    if (m_starting) return;
    m_starting = true;
    // D-Bus starts the helper when it is not running; then whoever holds its name must run it.
    QDBusMessage start = QDBusMessage::createMethodCall(QStringLiteral("org.freedesktop.DBus"), QStringLiteral("/org/freedesktop/DBus"),
                                                        QStringLiteral("org.freedesktop.DBus"), QStringLiteral("StartServiceByName"));
    start << QString::fromLatin1(Helper) << uint(0);
    auto *started = new QDBusPendingCallWatcher(QDBusConnection::sessionBus().asyncCall(start), this);
    connect(started, &QDBusPendingCallWatcher::finished, this, [this](QDBusPendingCallWatcher *answer) {
        answer->deleteLater();
        m_starting = false;
        m_owner = heldBy(QString::fromLatin1(Helper), QCoreApplication::applicationDirPath() + QStringLiteral("/erevos-watch"));
        if (m_owner.isEmpty()) {
            qWarning("erevos: app.erevos.watch is not erevos-watch: nothing is given to it");
            m_calls.clear();
            m_given = false;
            return;
        }
        send();
    });
}

void WatchLink::send()
{
    for (const auto &waiting : m_calls) {
        QDBusMessage message = QDBusMessage::createMethodCall(m_owner, QString::fromLatin1(HelperPath), QString::fromLatin1(HelperInterface), waiting.first);
        message.setArguments(waiting.second);
        QDBusConnection::sessionBus().asyncCall(message);
    }
    m_calls.clear();
}
