// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include <QGuiApplication>
#include <QQmlContext>
#include <QQuickItem>
#include <QQuickView>
#include <QScopedPointer>
#include <QStandardPaths>

#include <sailfishapp.h>

#include "shellserver.h"
#include "watchlink.h"

// Erevos on Sailfish OS: the app's web build (installed in /usr/share/erevos/web), served to
// Sailfish WebView by ShellServer, which also keeps the app's data (src/shellserver.h). While it is
// not in front, or closed, its helper erevos-watch waits at the relay for it (src/watchlink.h).
int main(int argc, char *argv[])
{
    QScopedPointer<QGuiApplication> app(SailfishApp::application(argc, argv));
    app->setOrganizationName(QStringLiteral("erevos"));
    app->setApplicationName(QStringLiteral("erevos"));

    WatchLink watch;
    if (!watch.offer()) qWarning("erevos: could not take its name on D-Bus: a tap on a notice will not open it");

    const QString web = SailfishApp::pathTo(QStringLiteral("web")).toLocalFile();
    const QString data = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    ShellServer server(web, data, &watch);
    if (!server.listen(47823)) qFatal("erevos: could not listen on 127.0.0.1");

    QScopedPointer<QQuickView> view(SailfishApp::createView());
    view->rootContext()->setContextProperty(QStringLiteral("shell"), &server);
    view->setSource(SailfishApp::pathToMainQml());
    view->show();

    // A notice was tapped: Erevos comes to the front (Silica's ApplicationWindow.activate).
    QQuickView *window = view.data();
    QObject::connect(&watch, &WatchLink::showWanted, window, [window]() {
        if (window->rootObject()) QMetaObject::invokeMethod(window->rootObject(), "activate");
    });
    // In front, nothing is waited on for it; out of sight, the helper waits.
    QObject::connect(app.data(), &QGuiApplication::applicationStateChanged, &watch,
                     [&watch](Qt::ApplicationState state) { watch.setFront(state == Qt::ApplicationActive); });
    return app->exec();
}
