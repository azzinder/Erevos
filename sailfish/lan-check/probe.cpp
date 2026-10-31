// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include <QCoreApplication>
#include <QDir>
#include <QTemporaryDir>
#include <QTextStream>

#include "shellserver.h"
#include "watchlink.h"

// The shell's server on its own, for check.cjs: it says its address, with the token, and answers
// until it is stopped.
int main(int argc, char *argv[])
{
    QCoreApplication app(argc, argv);
    QTemporaryDir data;
    if (!data.isValid()) return 1;
    QDir(data.path()).mkpath(QStringLiteral("web"));
    WatchLink watch;
    ShellServer server(data.path() + QStringLiteral("/web"), data.path() + QStringLiteral("/data"), &watch);
    if (!server.listen(0)) return 1;
    QTextStream out(stdout);
    out << "address " << server.address() << "\n";
    out.flush();
    return app.exec();
}
