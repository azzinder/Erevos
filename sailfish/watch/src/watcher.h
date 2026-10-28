#ifndef EREVOS_WATCH_WATCHER_H
#define EREVOS_WATCH_WATCHER_H

#include <QByteArray>
#include <QList>
#include <QObject>
#include <QString>
#include <QTimer>

class Alerts;
class Awake;
class QNetworkConfigurationManager;
class RelayLine;

// What a queue's relay says of it (app/lib/relay.ts News): the round it is in, and how many sends
// came in that round that said they were messages, that did not say, and that were calls.
struct News {
    quint32 round = 0;
    quint32 messages = 0;
    quint32 unmarked = 0;
    quint32 rings = 0;
    bool operator==(const News &other) const
    {
        return round == other.round && messages == other.messages && unmarked == other.unmarked && rings == other.rings;
    }
};

// Up to 64 queues at one relay, held there on one connection with NEWS_ANY until what came into
// one of them changes, as the app waits on a closed space's contacts' queues
// (app/lib/closed-notices.ts): it asks what came and never takes it, so the app still finds it all.
// Each connection first looks at once, telling what came while it was away but ringing for nothing
// that came then; only a call that comes while it waits rings.
class Wait : public QObject
{
    Q_OBJECT

public:
    struct Queue {
        QByteArray id;
        News heard;
        // Whether `heard` is what the relay said: until then, what is there is heard, not told of.
        bool known = false;
    };

    // The most queues one NEWS_ANY asks of (crates/erevos-relay MAX_ANY), and how long it waits.
    static const int MostQueues = 64;
    static const int WaitSeconds = 60;

    Wait(const QString &url, const QByteArray &key, const QList<QByteArray> &ids, QObject *parent = nullptr);

    /** The relay's address as the app keeps keys by it (relay.ts relayHome), for telling queues apart. */
    QString home() const { return m_home; }
    const QList<Queue> &queues() const { return m_queues; }
    /** Takes what `other` heard of the same queues. */
    void hearAs(const Wait &other);
    /** From now on, what is there is heard anew, not told of: Erevos was in front and read it. */
    void forget();

    void start();
    void halt();
    /** Makes the connection again: the network changed, or it said nothing for too long. */
    void again();
    /** Whether it asked and the relay said nothing for longer than it waits (wall clock: the phone may have slept). */
    bool overdue(qint64 now) const;

signals:
    /** `count` sends came that the app tells of; `ringing` when a call rings now. */
    void came(int count, bool ringing);

private slots:
    void ready();
    void answered(const QByteArray &reply);
    void failed(const QString &why);

private:
    void ask();
    void later(int ms);

    QString m_url;
    QString m_home;
    QByteArray m_key;
    QList<Queue> m_queues;
    RelayLine *m_line = nullptr;
    QTimer m_retry;
    QTimer m_late;
    bool m_on = false;
    // Whether this connection already had its first look: from then on what it hears came while it waited.
    bool m_live = false;
    int m_failures = 0;
    int m_seconds = 0;
    qint64 m_askedAt = 0;
};

// The helper's D-Bus object (app.erevos.watch, /app/erevos/watch): the app gives it the queues of
// its open space to wait on while it is not in front, with the words to say, and nothing else: no
// key, no token, no name. Nothing is ever given back.
class Watcher : public QObject
{
    Q_OBJECT
    Q_CLASSINFO("D-Bus Interface", "app.erevos.Watch")

public:
    explicit Watcher(Alerts *alerts, QObject *parent = nullptr);

    /** Whether it has queues to wait on. */
    bool watching() const;

public slots:
    /**
     * The queues to wait on and the words, as JSON: {"words": {"title", "messages": [for 1, 2, 3…],
     * "call"}, "waits": [{"url": "wss://…", "key": "64 hex digits, or empty", "queues": ["48 hex digits", …]}]}.
     * False when it is not that.
     */
    Q_SCRIPTABLE bool watch(const QString &json);
    /** Erevos is in front (true): nothing is waited on and nothing shows; or it is not, or it closed (false). */
    Q_SCRIPTABLE void front(bool inFront);
    /** Nothing more to wait on: the space was locked. */
    Q_SCRIPTABLE void stop();

signals:
    /** Nothing is waited on any more. */
    void idle();

private slots:
    void came(int count, bool ringing);
    void beat();
    void online(bool on);

private:
    void startAll();

    Alerts *m_alerts;
    Awake *m_awake;
    QNetworkConfigurationManager *m_network;
    QList<Wait *> m_waits;
    QTimer m_settle;
    bool m_front = true;
    int m_count = 0;
};

#endif
