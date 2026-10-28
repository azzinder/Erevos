#ifndef EREVOS_WATCHLINK_H
#define EREVOS_WATCHLINK_H

#include <QByteArray>
#include <QDBusServiceWatcher>
#include <QObject>

// Erevos's own name on D-Bus (app.erevos, /app/erevos), and its link to its helper erevos-watch
// (watch/), which waits at the relay while Erevos is not in front, or closed. The page gives the
// queues of its open space to wait on (app/lib/shell-watch.ts, through ShellServer's /__watch),
// and they go to the helper, starting it; then whether Erevos is in front, each time that changes.
// A tap on one of the helper's notices calls show() here, which starts Erevos when it is not
// running (app.erevos.service).
class WatchLink : public QObject
{
    Q_OBJECT
    Q_CLASSINFO("D-Bus Interface", "app.erevos")

public:
    explicit WatchLink(QObject *parent = nullptr);

    /** Takes the name app.erevos on the session bus, for show(). */
    bool offer();
    /** The queues to wait on and the words, as the helper takes them (watch/src/watcher.h). */
    void give(const QByteArray &list);
    /** Nothing to wait on: the space was locked. */
    void takeBack();
    /** Erevos is in front, or not. */
    void setFront(bool front);

public slots:
    /** Brings Erevos up: a notice was tapped. */
    Q_SCRIPTABLE void show();

signals:
    void showWanted();

private:
    void call(const QString &method, const QVariantList &arguments);

    QDBusServiceWatcher m_helper;
    QByteArray m_list;
    bool m_front = true;
    // Whether the helper has the list: not once it ended.
    bool m_given = false;
};

#endif
