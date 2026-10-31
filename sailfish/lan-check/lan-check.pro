# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# The shell's server with its same Wi-Fi link (../src/lanlink.cpp), built for a computer with Qt 5,
# for run.sh: no Sailfish libraries, no window.
TEMPLATE = app
TARGET = lan-probe
QT = core network dbus
CONFIG += console c++11
CONFIG -= app_bundle
INCLUDEPATH += ../src
SOURCES += probe.cpp ../src/shellserver.cpp ../src/watchlink.cpp ../src/lanlink.cpp
HEADERS += ../src/shellserver.h ../src/watchlink.h ../src/lanlink.h
