#include "alerts.h"

#ifdef EREVOS_WATCH_TEST
#include <QTextStream>
#else
#include <NgfClient>
#include <nemonotifications-qt5/notification.h>
#endif

namespace {

#ifndef EREVOS_WATCH_TEST
// The categories of the two notices (notificationcategories/), and where a tap goes: Erevos's own
// D-Bus name, which starts it when it is not running (app.erevos.service).
const char MessageCategory[] = "x-erevos.message";
const char CallCategory[] = "x-erevos.call";
const char Icon[] = "erevos";

QVariant openErevos()
{
    return Notification::remoteAction(QStringLiteral("default"), QString(), QStringLiteral("app.erevos"), QStringLiteral("/app/erevos"),
                                      QStringLiteral("app.erevos"), QStringLiteral("show"));
}

Notification *notice(const char *category, QObject *parent)
{
    Notification *made = new Notification(parent);
    made->setCategory(QString::fromLatin1(category));
    made->setAppName(QStringLiteral("Erevos"));
    made->setAppIcon(QString::fromLatin1(Icon));
    made->setRemoteAction(openErevos());
    return made;
}
#else
void say(const QString &what)
{
    QTextStream(stdout) << what << '\n';
}
#endif

} // namespace

Alerts::Alerts(QObject *parent)
    : QObject(parent)
{
    m_ringEnd.setSingleShot(true);
    m_ringEnd.setInterval(RingMs);
    connect(&m_ringEnd, &QTimer::timeout, this, &Alerts::stopRinging);
#ifndef EREVOS_WATCH_TEST
    m_messages = notice(MessageCategory, this);
    m_call = notice(CallCategory, this);
    m_call->setUrgency(Notification::Critical);
    m_tone = new Ngf::Client(this);
#endif
}

Alerts::~Alerts()
{
    clear();
}

void Alerts::setWords(const Words &words)
{
    const bool same = words.title == m_words.title && words.messages == m_words.messages && words.call == m_words.call;
    m_words = words;
    // What shows already says it anew, in another language.
    if (!same && m_told > 0) tell(m_told);
}

QString Alerts::messagesText(int count) const
{
    if (m_words.messages.isEmpty()) return QString::number(count);
    return m_words.messages.value(qMin(count, m_words.messages.size()) - 1);
}

void Alerts::tell(int count)
{
    m_told = qMax(0, count);
#ifdef EREVOS_WATCH_TEST
    say(m_told > 0 ? QStringLiteral("notice: %1 / %2").arg(m_words.title, messagesText(m_told)) : QStringLiteral("notice: none"));
#else
    if (m_told == 0) {
        m_messages->close();
        return;
    }
    const QString text = messagesText(m_told);
    m_messages->setSummary(m_words.title);
    m_messages->setBody(text);
    m_messages->setPreviewSummary(m_words.title);
    m_messages->setPreviewBody(text);
    m_messages->setItemCount(m_told);
    m_messages->publish();
#endif
}

void Alerts::ring()
{
    m_ringEnd.start();
    if (m_ringing) return;
    m_ringing = true;
#ifdef EREVOS_WATCH_TEST
    say(QStringLiteral("ring: %1 / %2").arg(m_words.title, m_words.call));
#else
    m_call->setSummary(m_words.title);
    m_call->setBody(m_words.call);
    m_call->setPreviewSummary(m_words.title);
    m_call->setPreviewBody(m_words.call);
    m_call->publish();
    // The phone's ringtone, as its profile sets it: silent and vibrating as it is.
    if (m_tone->isConnected() || m_tone->connect()) m_toneId = m_tone->play(QStringLiteral("ringtone"));
#endif
    emit ringingChanged(true);
}

void Alerts::stopRinging()
{
    m_ringEnd.stop();
    if (!m_ringing) return;
    m_ringing = false;
#ifdef EREVOS_WATCH_TEST
    say(QStringLiteral("ring: stopped"));
#else
    if (m_toneId != 0) m_tone->stop(m_toneId);
    m_toneId = 0;
    m_call->close();
#endif
    emit ringingChanged(false);
}

void Alerts::clear()
{
    stopRinging();
    if (m_told > 0) tell(0);
}
