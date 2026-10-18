# Erevos for Sailfish OS: see README.md.
TARGET = erevos

CONFIG += sailfishapp
QT += network

SOURCES += src/main.cpp src/shellserver.cpp
HEADERS += src/shellserver.h

DISTFILES += qml/erevos.qml qml/cover/CoverPage.qml rpm/erevos.spec erevos.desktop

# The web build, made by build-web.sh into web/.
web.files = web
web.path = /usr/share/$${TARGET}
INSTALLS += web

SAILFISHAPP_ICONS = 86x86 108x108 128x128 172x172
