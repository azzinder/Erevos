#include <QGuiApplication>
#include <QQmlContext>
#include <QQuickView>
#include <QScopedPointer>
#include <QStandardPaths>

#include <sailfishapp.h>

#include "shellserver.h"

// Erevos on Sailfish OS: the app's web build (installed in /usr/share/erevos/web), served to
// Sailfish WebView by ShellServer, which also keeps the app's data (src/shellserver.h).
int main(int argc, char *argv[])
{
    QScopedPointer<QGuiApplication> app(SailfishApp::application(argc, argv));
    app->setOrganizationName(QStringLiteral("erevos"));
    app->setApplicationName(QStringLiteral("erevos"));

    const QString web = SailfishApp::pathTo(QStringLiteral("web")).toLocalFile();
    const QString data = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    ShellServer server(web, data);
    if (!server.listen(47823)) qFatal("erevos: could not listen on 127.0.0.1");

    QScopedPointer<QQuickView> view(SailfishApp::createView());
    view->rootContext()->setContextProperty(QStringLiteral("shell"), &server);
    view->setSource(SailfishApp::pathToMainQml());
    view->show();
    return app->exec();
}
