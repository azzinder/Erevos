/*
 * SPDX-FileCopyrightText: 2026 azzinder
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
 */

#ifndef EREVOS_WATCH_AWAKE_H
#define EREVOS_WATCH_AWAKE_H

#include <QObject>

#ifdef EREVOS_WATCH_TEST
#include <QTimer>
#else
class BackgroundActivity;
#endif

// Whether the phone may sleep while Erevos waits at its relays (nemo-keepalive). A reply from a
// relay wakes it, as anything that comes over the network does; besides, it wakes it every few
// minutes (`beat`), so a connection that died while it slept is found and made again. While a call
// rings it is kept awake (`hold`). Built with EREVOS_WATCH_TEST, the beat is a plain timer.
class Awake : public QObject
{
    Q_OBJECT

public:
    explicit Awake(QObject *parent = nullptr);

    /** Beats from now on, letting the phone sleep in between. */
    void start();
    /** No more beats. */
    void stop();
    /** Keeps the phone awake until letGo(). */
    void hold();
    void letGo();

signals:
    void beat();

private:
    void woke();

    bool m_on = false;
    bool m_held = false;
#ifdef EREVOS_WATCH_TEST
    QTimer m_timer;
#else
    BackgroundActivity *m_activity;
#endif
};

#endif
