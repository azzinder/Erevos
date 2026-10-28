# Erevos for Sailfish OS: see README.md.
TARGET = erevos

CONFIG += sailfishapp
QT += network dbus

SOURCES += src/main.cpp src/shellserver.cpp src/watchlink.cpp
HEADERS += src/shellserver.h src/watchlink.h

DISTFILES += qml/erevos.qml qml/cover/CoverPage.qml rpm/erevos.spec erevos.desktop data/app.erevos.service

# The web build, made by build-web.sh into web/.
web.files = web
web.path = /usr/share/$${TARGET}
INSTALLS += web

# Erevos's name on D-Bus: a tap on a notice of erevos-watch (watch/) starts it when it is not running.
dbus.files = data/app.erevos.service
dbus.path = /usr/share/dbus-1/services
INSTALLS += dbus

SAILFISHAPP_ICONS = 86x86 108x108 128x128 172x172
