// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include "awake.h"

#ifndef EREVOS_WATCH_TEST
#include <keepalive/backgroundactivity.h>
#endif

namespace {
// How often the phone wakes to look at the connections: a relay answers each wait within a minute,
// so one that said nothing for longer than that is lost.
const int BeatSeconds = 150;
}

Awake::Awake(QObject *parent)
    : QObject(parent)
{
#ifdef EREVOS_WATCH_TEST
    m_timer.setInterval(BeatSeconds * 1000);
    connect(&m_timer, &QTimer::timeout, this, &Awake::woke);
#else
    m_activity = new BackgroundActivity(this);
    connect(m_activity, &BackgroundActivity::running, this, &Awake::woke);
#endif
}

void Awake::start()
{
    m_on = true;
    if (m_held) return;
#ifdef EREVOS_WATCH_TEST
    m_timer.start();
#else
    m_activity->wait(BackgroundActivity::TwoAndHalfMinutes);
#endif
}

void Awake::stop()
{
    m_on = false;
    m_held = false;
#ifdef EREVOS_WATCH_TEST
    m_timer.stop();
#else
    m_activity->stop();
#endif
}

void Awake::hold()
{
    m_held = true;
#ifndef EREVOS_WATCH_TEST
    m_activity->run();
#endif
}

void Awake::letGo()
{
    if (!m_held) return;
    m_held = false;
    if (m_on)
        start();
    else
        stop();
}

void Awake::woke()
{
    // Running as it was held: not a beat.
    if (m_held || !m_on) return;
    emit beat();
    // Asleep again until the next beat, unless the beat held it.
    if (!m_held && m_on) start();
}
