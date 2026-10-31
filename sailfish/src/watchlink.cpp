// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include "watchlink.h"

#include <QDBusConnection>
#include <QDBusMessage>
#include <QDBusPendingCall>

namespace {
const char Helper[] = "app.erevos.watch";
const char HelperPath[] = "/app/erevos/watch";
const char HelperInterface[] = "app.erevos.Watch";
}

WatchLink::WatchLink(QObject *parent)
    : QObject(parent)
    , m_helper(QString::fromLatin1(Helper), QDBusConnection::sessionBus(), QDBusServiceWatcher::WatchForUnregistration)
{
    // The helper ended: given again the next time Erevos goes out of sight.
    connect(&m_helper, &QDBusServiceWatcher::serviceUnregistered, this, [this]() { m_given = false; });
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
    QDBusMessage message = QDBusMessage::createMethodCall(QString::fromLatin1(Helper), QString::fromLatin1(HelperPath),
                                                          QString::fromLatin1(HelperInterface), method);
    message.setArguments(arguments);
    QDBusConnection::sessionBus().asyncCall(message);
}
