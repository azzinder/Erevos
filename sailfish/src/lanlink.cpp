#include "lanlink.h"

#include <QDateTime>
#include <QFile>
#include <QNetworkAddressEntry>
#include <QNetworkInterface>
#include <QRegularExpression>
#include <QTcpSocket>
#include <QtEndian>

namespace {

const int AnnounceEvery = 3000;
// Nothing on a link for this long, it is closed; not heard for this long, one is forgotten.
const qint64 GoneAfter = 15000;
// Heard for this long with no link, the one with the higher nonce connects too.
const qint64 DialAnywayAfter = 6000;
const qint64 HelloWithin = 5000;
const int MaxLinks = 16;
const quint32 MaxFrame = 16 * 1024 + 64;
const QByteArray StillHere("EVL1");

const QRegularExpression Announce(QStringLiteral("^EVL1 ([0-9a-f]{16}) ([0-9]{1,5})$"));
const QRegularExpression Hello(QStringLiteral("^EVL1 ([0-9a-f]{16})$"));

qint64 now()
{
    return QDateTime::currentMSecsSinceEpoch();
}

/** A new nonce for each start, from the system's randomness; empty when there is none. */
QString newNonce()
{
    QFile random(QStringLiteral("/dev/urandom"));
    if (!random.open(QIODevice::ReadOnly)) return QString();
    const QByteArray bytes = random.read(8);
    return bytes.size() == 8 ? QString::fromLatin1(bytes.toHex()) : QString();
}

} // namespace

LanLink::LanLink(QObject *parent, quint16 udpPort, quint16 tcpPort)
    : QObject(parent), m_udpPort(udpPort), m_tcpPort(tcpPort)
{
    connect(&m_server, &QTcpServer::newConnection, this, &LanLink::accept);
    connect(&m_udp, &QUdpSocket::readyRead, this, &LanLink::readDatagrams);
    connect(&m_timer, &QTimer::timeout, this, &LanLink::announce);
    connect(&m_timer, &QTimer::timeout, this, &LanLink::sweep);
    m_timer.setInterval(AnnounceEvery);
}

LanLink::~LanLink()
{
    stop();
}

void LanLink::setTargets(const QList<QPair<QHostAddress, quint16>> &targets)
{
    m_targets = targets;
}

void LanLink::start()
{
    if (m_running) return;
    m_nonce = newNonce();
    if (m_nonce.isEmpty()) {
        emit logged(QStringLiteral("Same Wi-Fi: no randomness for a nonce"));
        return;
    }
    m_running = true;
    // The usual port is taken (another Erevos on this phone): any free one will do.
    if (!m_server.listen(QHostAddress::AnyIPv4, m_tcpPort) && !m_server.listen(QHostAddress::AnyIPv4, 0))
        emit logged(QStringLiteral("Same Wi-Fi: %1").arg(m_server.errorString()));
    if (!m_udp.bind(QHostAddress::AnyIPv4, m_udpPort, QUdpSocket::ShareAddress | QUdpSocket::ReuseAddressHint))
        emit logged(QStringLiteral("Same Wi-Fi: %1").arg(m_udp.errorString()));
    m_timer.start();
    announce();
}

void LanLink::stop()
{
    if (!m_running) return;
    m_running = false;
    m_timer.stop();
    m_udp.close();
    m_server.close();
    const QList<QTcpSocket *> sockets = m_conns.keys();
    for (QTcpSocket *socket : sockets) {
        socket->disconnect(this);
        socket->abort();
        socket->deleteLater();
    }
    m_conns.clear();
    m_links.clear();
    m_heard.clear();
    m_dialing.clear();
}

bool LanLink::send(const QString &id, const QByteArray &text)
{
    QTcpSocket *socket = m_links.value(id);
    if (!socket || quint32(text.size()) > MaxFrame) return false;
    socket->write(frame(text));
    return true;
}

QStringList LanLink::links() const
{
    return m_links.keys();
}

quint16 LanLink::tcpPort() const
{
    return m_running ? m_server.serverPort() : 0;
}

QByteArray LanLink::frame(const QByteArray &payload)
{
    QByteArray out(4, '\0');
    qToBigEndian<quint32>(quint32(payload.size()), reinterpret_cast<uchar *>(out.data()));
    return out + payload;
}

QList<QPair<QHostAddress, quint16>> LanLink::broadcasts() const
{
    if (!m_targets.isEmpty()) return m_targets;
    QList<QPair<QHostAddress, quint16>> out;
    out << qMakePair(QHostAddress(QHostAddress::Broadcast), m_udpPort);
    for (const QNetworkInterface &iface : QNetworkInterface::allInterfaces()) {
        const auto flags = iface.flags();
        if (!(flags & QNetworkInterface::IsUp) || (flags & QNetworkInterface::IsLoopBack)) continue;
        for (const QNetworkAddressEntry &entry : iface.addressEntries()) {
            if (entry.ip().protocol() != QAbstractSocket::IPv4Protocol || entry.broadcast().isNull()) continue;
            const auto target = qMakePair(entry.broadcast(), m_udpPort);
            if (!out.contains(target)) out << target;
        }
    }
    return out;
}

void LanLink::announce()
{
    if (!m_running || !m_server.isListening()) return;
    const QByteArray message = QStringLiteral("EVL1 %1 %2").arg(m_nonce).arg(m_server.serverPort()).toLatin1();
    // A network that is gone, or refuses broadcasts: the others still go.
    for (const auto &target : broadcasts()) m_udp.writeDatagram(message, target.first, target.second);
}

void LanLink::readDatagrams()
{
    while (m_udp.hasPendingDatagrams()) {
        QByteArray datagram(int(qMax<qint64>(0, m_udp.pendingDatagramSize())), '\0');
        QHostAddress from;
        const qint64 size = m_udp.readDatagram(datagram.data(), datagram.size(), &from);
        if (size < 0) return;
        datagram.truncate(int(size));
        announced(datagram, from);
    }
}

void LanLink::announced(const QByteArray &text, const QHostAddress &from)
{
    if (!m_running || text.size() > 64) return;
    const QRegularExpressionMatch match = Announce.match(QString::fromLatin1(text));
    if (!match.hasMatch()) return;
    const QString nonce = match.captured(1);
    const int port = match.captured(2).toInt();
    if (nonce == m_nonce || port <= 0 || port > 65535) return;
    const qint64 at = now();
    QPair<qint64, qint64> heard = m_heard.value(nonce, qMakePair(at, at));
    heard.second = at;
    m_heard.insert(nonce, heard);
    if (linkTo(nonce) || m_dialing.contains(nonce) || m_links.size() >= MaxLinks) return;
    // An address said as IPv6 for IPv4 (::ffff:a.b.c.d) is dialed as IPv4.
    bool v4 = false;
    const quint32 ip = from.toIPv4Address(&v4);
    const QHostAddress address = v4 ? QHostAddress(ip) : from;
    if (m_nonce < nonce || at - heard.first > DialAnywayAfter) dial(nonce, address, quint16(port));
}

LanLink::Conn *LanLink::linkTo(const QString &nonce)
{
    for (QTcpSocket *socket : m_links) {
        Conn &conn = m_conns[socket];
        if (conn.nonce == nonce) return &conn;
    }
    return nullptr;
}

void LanLink::dial(const QString &nonce, const QHostAddress &address, quint16 port)
{
    m_dialing.insert(nonce);
    QTcpSocket *socket = new QTcpSocket(this);
    watch(socket, true, nonce);
    connect(socket, &QTcpSocket::connected, this, [this, socket]() {
        socket->write(frame(QStringLiteral("EVL1 %1").arg(m_nonce).toLatin1()));
    });
    socket->connectToHost(address, port);
}

void LanLink::accept()
{
    while (QTcpSocket *socket = m_server.nextPendingConnection()) {
        if (m_links.size() >= MaxLinks) {
            socket->abort();
            socket->deleteLater();
            continue;
        }
        watch(socket, false, QString());
    }
}

void LanLink::watch(QTcpSocket *socket, bool mine, const QString &expected)
{
    Conn conn;
    conn.socket = socket;
    conn.mine = mine;
    conn.expected = expected;
    conn.since = now();
    m_conns.insert(socket, conn);
    connect(socket, &QTcpSocket::readyRead, this, [this, socket]() { readSocket(socket); });
    // Queued: a socket closed while its frames are read goes once that is done.
    connect(socket, &QTcpSocket::disconnected, this, [this, socket]() { closed(socket); }, Qt::QueuedConnection);
    // error(), not errorOccurred(): Sailfish OS has Qt 5.6.
    connect(socket, static_cast<void (QAbstractSocket::*)(QAbstractSocket::SocketError)>(&QAbstractSocket::error), this,
            [this, socket](QAbstractSocket::SocketError) { closed(socket); }, Qt::QueuedConnection);
    // No hello in time: closed.
    QTimer::singleShot(int(HelloWithin), socket, [this, socket]() {
        if (m_conns.contains(socket) && m_conns.value(socket).id.isEmpty()) closed(socket);
    });
}

void LanLink::readSocket(QTcpSocket *socket)
{
    if (!m_conns.contains(socket)) return;
    m_conns[socket].held += socket->readAll();
    for (;;) {
        if (!m_conns.contains(socket)) return;
        Conn &conn = m_conns[socket];
        if (conn.held.size() < 4) return;
        const quint32 length = qFromBigEndian<quint32>(reinterpret_cast<const uchar *>(conn.held.constData()));
        if (length > MaxFrame) {
            closed(socket);
            return;
        }
        if (quint32(conn.held.size()) < 4 + length) return;
        const QByteArray payload = conn.held.mid(4, int(length));
        conn.held.remove(0, int(4 + length));
        frameIn(conn, payload);
    }
}

// The first frame is the other's hello: then the link is up. The one connecting says its nonce
// first; the one connected to answers with its own. After that, text, or that it is still there.
void LanLink::frameIn(Conn &conn, const QByteArray &payload)
{
    if (!conn.id.isEmpty()) {
        conn.at = now();
        if (payload != StillHere) emit text(conn.id, payload);
        return;
    }
    const QRegularExpressionMatch match = Hello.match(QString::fromLatin1(payload));
    const QString nonce = match.hasMatch() ? match.captured(1) : QString();
    if (nonce.isEmpty() || nonce == m_nonce || (!conn.expected.isEmpty() && nonce != conn.expected)) {
        closed(conn.socket);
        return;
    }
    if (!conn.mine) conn.socket->write(frame(QStringLiteral("EVL1 %1").arg(m_nonce).toLatin1()));
    conn.nonce = nonce;
    up(conn);
}

void LanLink::up(Conn &conn)
{
    QTcpSocket *socket = conn.socket;
    socket->setSocketOption(QAbstractSocket::LowDelayOption, 1);
    m_dialing.remove(conn.nonce);
    // Two links to one: both ends keep the one the lower nonce opened.
    if (Conn *other = linkTo(conn.nonce)) {
        const bool keepNew = conn.mine == (m_nonce < conn.nonce);
        if (!keepNew) {
            closed(socket);
            return;
        }
        closed(other->socket);
        if (!m_conns.contains(socket)) return;
    }
    Conn &kept = m_conns[socket];
    kept.id = QStringLiteral("lan-%1").arg(++m_counter);
    kept.at = now();
    m_links.insert(kept.id, socket);
    emit linked(kept.id);
}

void LanLink::closed(QTcpSocket *socket)
{
    if (!m_conns.contains(socket)) return;
    const Conn conn = m_conns.take(socket);
    if (conn.mine) m_dialing.remove(conn.expected);
    socket->disconnect(this);
    socket->abort();
    socket->deleteLater();
    if (!conn.id.isEmpty() && m_links.value(conn.id) == socket) {
        m_links.remove(conn.id);
        emit gone(conn.id);
    }
}

// Each link says it is still there; one nothing came on for a while goes, as do those not heard.
void LanLink::sweep()
{
    if (!m_running) return;
    const qint64 at = now();
    const QList<QTcpSocket *> sockets = m_conns.keys();
    for (QTcpSocket *socket : sockets) {
        if (!m_conns.contains(socket)) continue;
        const Conn &conn = m_conns[socket];
        if (conn.id.isEmpty()) {
            if (at - conn.since > HelloWithin * 2) closed(socket);
        } else if (at - conn.at > GoneAfter) {
            closed(socket);
        } else {
            socket->write(frame(StillHere));
        }
    }
    for (auto it = m_heard.begin(); it != m_heard.end();) {
        if (at - it.value().second > GoneAfter) it = m_heard.erase(it);
        else ++it;
    }
}
