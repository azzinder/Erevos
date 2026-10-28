#include "relayline.h"

#include "channel.h"

#include <QCryptographicHash>
#include <QList>
#include <QSslConfiguration>
#include <QTimer>

#include <openssl/rand.h>

namespace {

// The most a message from the relay may be: a reply of news for 64 queues is 1089 bytes.
const int MostMessage = 64 * 1024;
// What the handshake's answer may be, at most, before its end.
const int MostHeaders = 16 * 1024;
const char Guid[] = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

enum Opcode { Continuation = 0x0, Binary = 0x2, Close = 0x8, Ping = 0x9, Pong = 0xA };

QByteArray randomBytes(int count)
{
    QByteArray bytes(count, 0);
    if (RAND_bytes(reinterpret_cast<unsigned char *>(bytes.data()), count) != 1) bytes.clear();
    return bytes;
}

/** The first message in a channel: the token's length in 2 bytes (none on `/read`), then the request. */
QByteArray withNoToken(const QByteArray &request)
{
    return QByteArray(2, 0) + request;
}

} // namespace

RelayLine::RelayLine(const QString &relay, const QByteArray &key, QObject *parent)
    : QObject(parent)
    , m_url(relay.trimmed())
    , m_key(key)
{
    QString path = m_url.path();
    while (path.endsWith(QLatin1Char('/'))) path.chop(1);
    m_url.setPath(path + QStringLiteral("/read"));
    connect(&m_socket, &QSslSocket::connected, this, &RelayLine::connected);
    connect(&m_socket, &QSslSocket::encrypted, this, &RelayLine::connected);
    connect(&m_socket, &QSslSocket::readyRead, this, &RelayLine::readSome);
    connect(&m_socket, &QSslSocket::disconnected, this, &RelayLine::lost);
    connect(&m_socket, static_cast<void (QAbstractSocket::*)(QAbstractSocket::SocketError)>(&QAbstractSocket::error), this,
            &RelayLine::lost);
#ifdef EREVOS_WATCH_TEST
    // A check's own certificate authority, beside the computer's, for a relay behind TLS there.
    const QString authority = QString::fromLocal8Bit(qgetenv("EREVOS_WATCH_TEST_CA"));
    if (!authority.isEmpty()) {
        QSslConfiguration tls = m_socket.sslConfiguration();
        tls.setCaCertificates(tls.caCertificates() + QSslCertificate::fromPath(authority));
        m_socket.setSslConfiguration(tls);
    }
#endif
    // A certificate that does not hold fails the connection, as in a browser.
    connect(&m_socket, static_cast<void (QSslSocket::*)(const QList<QSslError> &)>(&QSslSocket::sslErrors), this,
            [this](const QList<QSslError> &) { fail(QStringLiteral("certificate")); });
}

RelayLine::~RelayLine()
{
    m_socket.disconnect(this);
    m_socket.abort();
}

void RelayLine::open()
{
    if (m_state != Closed) return;
    const QString scheme = m_url.scheme().toLower();
    if ((scheme != QLatin1String("ws") && scheme != QLatin1String("wss")) || m_url.host().isEmpty()) {
        // Told once the caller is back in the event loop, as a connection that fails is.
        QTimer::singleShot(0, this, [this]() { emit failed(QStringLiteral("address")); });
        return;
    }
    m_state = Connecting;
    m_first = true;
    m_buffer.clear();
    m_message.clear();
    if (scheme == QLatin1String("wss"))
        m_socket.connectToHostEncrypted(m_url.host(), quint16(m_url.port(443)));
    else
        m_socket.connectToHost(m_url.host(), quint16(m_url.port(80)));
}

void RelayLine::connected()
{
    // Over TLS, `connected` comes before the handshake: the request goes once it is `encrypted`.
    if (m_state != Connecting || (m_url.scheme().toLower() == QLatin1String("wss") && !m_socket.isEncrypted())) return;
    m_nonce = randomBytes(16).toBase64();
    if (m_nonce.isEmpty()) {
        fail(QStringLiteral("randomness"));
        return;
    }
    QByteArray target = m_url.path(QUrl::FullyEncoded).toUtf8();
    if (m_url.hasQuery()) target += '?' + m_url.query(QUrl::FullyEncoded).toUtf8();
    const int port = m_url.port(-1);
    QByteArray host = m_url.host(QUrl::FullyEncoded).toUtf8();
    if (host.contains(':')) host = '[' + host + ']';
    if (port != -1) host += ':' + QByteArray::number(port);
    QByteArray request = "GET " + target + " HTTP/1.1\r\nHost: " + host
        + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: " + m_nonce + "\r\n";
    // A channel is offered as the app offers it (app/lib/relay.ts CHANNEL_PROTOCOLS).
    if (!m_key.isEmpty()) request += "Sec-WebSocket-Protocol: erevos, erevos-channel\r\n";
    request += "\r\n";
    m_state = Upgrading;
    m_socket.write(request);
    m_socket.flush();
}

void RelayLine::readSome()
{
    m_buffer += m_socket.readAll();
    if (m_state == Upgrading) {
        const int end = m_buffer.indexOf("\r\n\r\n");
        if (end < 0) {
            if (m_buffer.size() > MostHeaders) fail(QStringLiteral("handshake"));
            return;
        }
        const QList<QByteArray> lines = m_buffer.left(end).split('\n');
        m_buffer.remove(0, end + 4);
        const QByteArray status = lines.value(0).trimmed();
        QByteArray accept;
        for (const QByteArray &line : lines) {
            const int colon = line.indexOf(':');
            if (colon > 0 && line.left(colon).trimmed().toLower() == "sec-websocket-accept") accept = line.mid(colon + 1).trimmed();
        }
        const QByteArray expected = QCryptographicHash::hash(m_nonce + Guid, QCryptographicHash::Sha1).toBase64();
        if (!status.startsWith("HTTP/1.1 101") || accept != expected) {
            fail(QStringLiteral("refused"));
            return;
        }
        upgraded();
        if (m_state == Closed) return;
    }
    // Frames, as many as came whole.
    while (m_state != Closed && m_state != Connecting && m_state != Upgrading) {
        if (m_buffer.size() < 2) return;
        const quint8 first = quint8(m_buffer[0]);
        const quint8 second = quint8(m_buffer[1]);
        const bool fin = first & 0x80;
        const int opcode = first & 0x0F;
        const bool masked = second & 0x80;
        quint64 length = second & 0x7F;
        int at = 2;
        if (length == 126) {
            if (m_buffer.size() < 4) return;
            length = (quint64(quint8(m_buffer[2])) << 8) | quint8(m_buffer[3]);
            at = 4;
        } else if (length == 127) {
            if (m_buffer.size() < 10) return;
            length = 0;
            for (int i = 0; i < 8; ++i) length = (length << 8) | quint8(m_buffer[2 + i]);
            at = 10;
        }
        if (length > quint64(MostMessage)) {
            fail(QStringLiteral("too large"));
            return;
        }
        QByteArray mask;
        if (masked) {
            if (m_buffer.size() < at + 4) return;
            mask = m_buffer.mid(at, 4);
            at += 4;
        }
        if (quint64(m_buffer.size()) < quint64(at) + length) return;
        QByteArray payload = m_buffer.mid(at, int(length));
        m_buffer.remove(0, at + int(length));
        if (masked)
            for (int i = 0; i < payload.size(); ++i) payload[i] = char(payload[i] ^ mask[i % 4]);
        if (opcode == Ping) {
            sendFrame(Pong, payload);
        } else if (opcode == Close) {
            fail(QStringLiteral("closed"));
            return;
        } else if (opcode == Binary || opcode == Continuation) {
            if (m_message.size() + payload.size() > MostMessage) {
                fail(QStringLiteral("too large"));
                return;
            }
            m_message += payload;
            if (fin) {
                const QByteArray whole = m_message;
                m_message.clear();
                message(whole);
            }
        }
    }
}

void RelayLine::upgraded()
{
    if (m_key.isEmpty()) {
        m_state = Ready;
        emit ready();
        return;
    }
    m_channel.reset(new Channel(m_key));
    const QByteArray hello = m_channel->hello();
    if (hello.isEmpty()) {
        fail(QStringLiteral("channel"));
        return;
    }
    m_state = Proving;
    sendFrame(Binary, hello);
}

void RelayLine::message(const QByteArray &data)
{
    if (m_state == Proving) {
        // Not the relay that holds the key kept for it: someone may be in between. Nothing is asked.
        if (!m_channel->finish(data)) {
            fail(QStringLiteral("not proven"));
            return;
        }
        m_state = Ready;
        emit ready();
        return;
    }
    if (m_state != Asking) {
        fail(QStringLiteral("unasked"));
        return;
    }
    QByteArray reply = data;
    if (m_channel && !m_channel->open(data, &reply)) {
        fail(QStringLiteral("channel"));
        return;
    }
    m_state = Ready;
    emit answered(reply);
}

bool RelayLine::ask(const QByteArray &request)
{
    if (m_state != Ready) return false;
    QByteArray bytes = request;
    if (m_channel) {
        bytes = m_channel->seal(m_first ? withNoToken(request) : request);
        if (bytes.isEmpty()) {
            fail(QStringLiteral("channel"));
            return false;
        }
    }
    m_first = false;
    m_state = Asking;
    sendFrame(Binary, bytes);
    return true;
}

void RelayLine::sendFrame(int opcode, const QByteArray &payload)
{
    QByteArray frame;
    frame.append(char(0x80 | opcode));
    const int length = payload.size();
    if (length < 126) {
        frame.append(char(0x80 | length));
    } else if (length < 65536) {
        frame.append(char(0x80 | 126));
        frame.append(char((length >> 8) & 0xff));
        frame.append(char(length & 0xff));
    } else {
        frame.append(char(0x80 | 127));
        for (int i = 7; i >= 0; --i) frame.append(char((quint64(length) >> (8 * i)) & 0xff));
    }
    // A client masks what it sends.
    const QByteArray mask = randomBytes(4);
    if (mask.size() != 4) {
        fail(QStringLiteral("randomness"));
        return;
    }
    frame += mask;
    QByteArray masked = payload;
    for (int i = 0; i < masked.size(); ++i) masked[i] = char(masked[i] ^ mask[i % 4]);
    frame += masked;
    m_socket.write(frame);
    // Out now, not once the event loop comes back: the phone may sleep before it does.
    m_socket.flush();
}

void RelayLine::lost()
{
    fail(m_socket.errorString());
}

void RelayLine::fail(const QString &why)
{
    if (m_state == Closed) return;
    m_state = Closed;
    m_channel.reset();
    m_socket.abort();
    emit failed(why);
}

void RelayLine::close()
{
    m_state = Closed;
    m_channel.reset();
    m_socket.abort();
}
