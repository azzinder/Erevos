# erevos-watch: waits at the relay while Erevos is not in front, or closed (src/main.cpp).
TEMPLATE = app
TARGET = erevos-watch

QT = core network dbus
CONFIG += console link_pkgconfig c++11
CONFIG -= app_bundle

SOURCES += src/main.cpp src/watcher.cpp src/relayline.cpp src/channel.cpp src/alerts.cpp src/awake.cpp
HEADERS += src/watcher.h src/relayline.h src/channel.h src/alerts.h src/awake.h

# With `qmake CONFIG+=watch_test` it builds on any Linux with Qt 5 and OpenSSL, writing what it
# would show and ring instead, for a check against a relay on the computer.
watch_test {
    DEFINES += EREVOS_WATCH_TEST
    PKGCONFIG += libcrypto
} else {
    PKGCONFIG += libcrypto keepalive nemonotifications-qt5 ngf-qt5
}

target.path = /usr/bin

# Started over D-Bus by Erevos (app.erevos.watch), as a user service of systemd.
dbus.files = data/app.erevos.watch.service
dbus.path = /usr/share/dbus-1/services
systemd.files = data/erevos-watch.service
systemd.path = /usr/lib/systemd/user
# How the phone shows its notices: a call as a call, messages as messages.
categories.files = data/x-erevos.message.conf data/x-erevos.call.conf
categories.path = /usr/share/lipstick/notificationcategories

INSTALLS += target dbus systemd categories
