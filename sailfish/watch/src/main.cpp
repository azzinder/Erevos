#include <QCoreApplication>
#include <QDBusConnection>
#include <QDBusServiceWatcher>
#include <QTimer>

#include "alerts.h"
#include "watcher.h"

// erevos-watch: while Erevos on Sailfish OS is not in front, or closed, waits at the relay on the
// queues of the space open in it, without taking anything, and says how many messages came and
// rings for a call, as the Android app does with its space closed. Erevos (src/main.cpp) starts it
// over D-Bus and gives it the queues and the words to say; it keeps them in memory only, so after
// the phone restarts it says nothing until Erevos opens the space again. See README.md.
int main(int argc, char *argv[])
{
    QCoreApplication app(argc, argv);
    app.setOrganizationName(QStringLiteral("erevos"));
    app.setApplicationName(QStringLiteral("erevos-watch"));

    Alerts alerts;
    Watcher watcher(&alerts);

    QDBusConnection bus = QDBusConnection::sessionBus();
    if (!bus.registerObject(QStringLiteral("/app/erevos/watch"), &watcher, QDBusConnection::ExportScriptableSlots))
        qFatal("erevos-watch: could not offer its object on D-Bus");
    if (!bus.registerService(QStringLiteral("app.erevos.watch"))) {
        qWarning("erevos-watch: already running");
        return 1;
    }

    // Erevos closed, or ended any other way: it is not in front any more.
    QDBusServiceWatcher erevos(QStringLiteral("app.erevos"), bus, QDBusServiceWatcher::WatchForUnregistration);
    QObject::connect(&erevos, &QDBusServiceWatcher::serviceUnregistered, &watcher, [&watcher]() { watcher.front(false); });

    // Nothing to wait on: it ends, once the answer to the call that said so is out. Erevos starts
    // it again when it has something.
    const auto endIfIdle = [&app, &watcher]() {
        QTimer::singleShot(2000, &app, [&app, &watcher]() {
            if (!watcher.watching()) app.quit();
        });
    };
    QObject::connect(&watcher, &Watcher::idle, &app, endIfIdle);
    // Started, and never given anything.
    QTimer::singleShot(60 * 1000, &app, [&app, &watcher]() {
        if (!watcher.watching()) app.quit();
    });

    return app.exec();
}
