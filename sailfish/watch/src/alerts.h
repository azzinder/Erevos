#ifndef EREVOS_WATCH_ALERTS_H
#define EREVOS_WATCH_ALERTS_H

#include <QObject>
#include <QStringList>
#include <QTimer>

class Notification;
namespace Ngf {
class Client;
}

// What the phone shows and plays while Erevos is away: one notice saying how many messages came,
// never who or what, as the app's own notices for a closed space say it (app/lib/closed-notices.ts),
// and for a call a notice of its own and the phone's ringtone, as the profile sets it. A tap on
// either opens Erevos (its D-Bus name app.erevos, src/main.cpp). Built with EREVOS_WATCH_TEST, it
// writes what it would show instead, for a check on a computer.
class Alerts : public QObject
{
    Q_OBJECT

public:
    // How long a call rings at most, as the app rings one it heard of at the relay (RING_MS).
    static const int RingMs = 45 * 1000;

    struct Words {
        QString title;
        // The notice for 1, 2, 3… messages, in the app's language, as many as the app gave.
        QStringList messages;
        QString call;
    };

    explicit Alerts(QObject *parent = nullptr);
    ~Alerts() override;

    void setWords(const Words &words);
    /** Says that `count` messages came while Erevos was away, in place of what it said; 0 takes the notice away. */
    void tell(int count);
    /** A call: its notice, and the ringtone until stopRinging(), at most RingMs. */
    void ring();
    void stopRinging();
    bool isRinging() const { return m_ringing; }
    /** Takes away all it shows and stops ringing: Erevos is back. */
    void clear();

signals:
    void ringingChanged(bool ringing);

private:
    QString messagesText(int count) const;

    Words m_words;
    QTimer m_ringEnd;
    bool m_ringing = false;
    int m_told = 0;
#ifndef EREVOS_WATCH_TEST
    Notification *m_messages = nullptr;
    Notification *m_call = nullptr;
    Ngf::Client *m_tone = nullptr;
    quint32 m_toneId = 0;
#endif
};

#endif
