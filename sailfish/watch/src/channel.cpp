// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

#include "channel.h"

#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/kdf.h>
#include <openssl/rand.h>

namespace {

const int KeyLength = 32;
const int TagLength = 16;
const char Salt[] = "erevos relay channel v1";

const unsigned char *bytes(const QByteArray &data)
{
    return reinterpret_cast<const unsigned char *>(data.constData());
}

unsigned char *bytes(QByteArray &data)
{
    return reinterpret_cast<unsigned char *>(data.data());
}

void wipe(QByteArray &data)
{
    if (!data.isEmpty()) OPENSSL_cleanse(data.data(), size_t(data.size()));
    data.clear();
}

/** The X25519 public key of `secret`. */
QByteArray publicOf(const QByteArray &secret)
{
    QByteArray out;
    EVP_PKEY *key = EVP_PKEY_new_raw_private_key(EVP_PKEY_X25519, nullptr, bytes(secret), KeyLength);
    size_t length = KeyLength;
    if (key) {
        out.resize(KeyLength);
        if (EVP_PKEY_get_raw_public_key(key, bytes(out), &length) != 1 || length != KeyLength) out.clear();
        EVP_PKEY_free(key);
    }
    return out;
}

/** X25519 of `secret` with `peer`; empty when it fails, or the result is all zero (a key that contributes nothing). */
QByteArray agree(const QByteArray &secret, const QByteArray &peer)
{
    QByteArray out;
    EVP_PKEY *ours = EVP_PKEY_new_raw_private_key(EVP_PKEY_X25519, nullptr, bytes(secret), KeyLength);
    EVP_PKEY *theirs = EVP_PKEY_new_raw_public_key(EVP_PKEY_X25519, nullptr, bytes(peer), KeyLength);
    EVP_PKEY_CTX *context = ours && theirs ? EVP_PKEY_CTX_new(ours, nullptr) : nullptr;
    size_t length = KeyLength;
    if (context && EVP_PKEY_derive_init(context) == 1 && EVP_PKEY_derive_set_peer(context, theirs) == 1) {
        out.resize(KeyLength);
        if (EVP_PKEY_derive(context, bytes(out), &length) != 1 || length != KeyLength) out.clear();
    }
    EVP_PKEY_CTX_free(context);
    EVP_PKEY_free(theirs);
    EVP_PKEY_free(ours);
    unsigned char any = 0;
    for (char byte : out) any |= static_cast<unsigned char>(byte);
    if (!out.isEmpty() && any == 0) out.clear();
    return out;
}

/** HKDF-SHA256 of `input` with the channel's salt, 32 bytes for `info`. */
QByteArray derive(const QByteArray &input, const QByteArray &info)
{
    QByteArray out(KeyLength, 0);
    size_t length = KeyLength;
    EVP_PKEY_CTX *context = EVP_PKEY_CTX_new_id(EVP_PKEY_HKDF, nullptr);
    const bool done = context && EVP_PKEY_derive_init(context) == 1 && EVP_PKEY_CTX_set_hkdf_md(context, EVP_sha256()) == 1
        && EVP_PKEY_CTX_set1_hkdf_salt(context, reinterpret_cast<const unsigned char *>(Salt), int(sizeof(Salt) - 1)) == 1
        && EVP_PKEY_CTX_set1_hkdf_key(context, bytes(input), input.size()) == 1
        && EVP_PKEY_CTX_add1_hkdf_info(context, bytes(info), info.size()) == 1 && EVP_PKEY_derive(context, bytes(out), &length) == 1
        && length == KeyLength;
    EVP_PKEY_CTX_free(context);
    if (!done) wipe(out);
    return out;
}

/** A message's nonce: the count of the messages before it that way, little-endian, in 12 bytes. */
QByteArray nonceOf(quint64 count)
{
    QByteArray nonce(12, 0);
    for (int i = 0; i < 8; ++i) nonce[i] = char((count >> (8 * i)) & 0xff);
    return nonce;
}

/** ChaCha20-Poly1305 of `in` under `key` and `nonce`: sealed with its tag after it, or opened. */
bool chacha(bool sealing, const QByteArray &key, const QByteArray &nonce, const QByteArray &in, QByteArray *out)
{
    if (!sealing && in.size() < TagLength) return false;
    const int length = sealing ? in.size() : in.size() - TagLength;
    EVP_CIPHER_CTX *context = EVP_CIPHER_CTX_new();
    QByteArray result(length + (sealing ? TagLength : 0), 0);
    int written = 0;
    int last = 0;
    bool done = context && EVP_CipherInit_ex(context, EVP_chacha20_poly1305(), nullptr, nullptr, nullptr, sealing ? 1 : 0) == 1
        && EVP_CIPHER_CTX_ctrl(context, EVP_CTRL_AEAD_SET_IVLEN, 12, nullptr) == 1
        && EVP_CipherInit_ex(context, nullptr, nullptr, bytes(key), bytes(nonce), sealing ? 1 : 0) == 1;
    if (done && !sealing) {
        QByteArray tag = in.right(TagLength);
        done = EVP_CIPHER_CTX_ctrl(context, EVP_CTRL_AEAD_SET_TAG, TagLength, bytes(tag)) == 1;
    }
    done = done && (length == 0 || EVP_CipherUpdate(context, bytes(result), &written, bytes(in), length) == 1)
        && EVP_CipherFinal_ex(context, bytes(result) + written, &last) == 1;
    if (done && sealing) done = EVP_CIPHER_CTX_ctrl(context, EVP_CTRL_AEAD_GET_TAG, TagLength, bytes(result) + length) == 1;
    EVP_CIPHER_CTX_free(context);
    if (!done) {
        wipe(result);
        return false;
    }
    *out = result;
    return true;
}

} // namespace

Channel::Channel(const QByteArray &relayKey)
    : m_relay(relayKey)
{
    if (m_relay.size() != KeyLength) return;
    m_secret.resize(KeyLength);
    if (RAND_bytes(bytes(m_secret), KeyLength) != 1) {
        wipe(m_secret);
        return;
    }
    m_public = publicOf(m_secret);
}

Channel::~Channel()
{
    wipe(m_secret);
    wipe(m_toRelay);
    wipe(m_toPhone);
}

QByteArray Channel::hello() const
{
    if (m_public.size() != KeyLength) return QByteArray();
    return QByteArray(1, Hello) + m_public;
}

bool Channel::finish(const QByteArray &answer)
{
    if (m_open || answer.size() != AnswerLength || m_public.size() != KeyLength) return false;
    const QByteArray fresh = answer.left(KeyLength);
    QByteArray withRelay = agree(m_secret, m_relay);
    QByteArray withFresh = agree(m_secret, fresh);
    wipe(m_secret);
    if (withRelay.isEmpty() || withFresh.isEmpty()) return false;
    QByteArray input = withRelay + withFresh;
    wipe(withRelay);
    wipe(withFresh);
    const QByteArray info = m_public + fresh + m_relay;
    QByteArray proof = derive(input, info + "proof");
    m_toRelay = derive(input, info + "phone to relay");
    m_toPhone = derive(input, info + "relay to phone");
    wipe(input);
    const bool proven = proof.size() == KeyLength && m_toRelay.size() == KeyLength && m_toPhone.size() == KeyLength
        && CRYPTO_memcmp(proof.constData(), answer.constData() + KeyLength, KeyLength) == 0;
    wipe(proof);
    if (!proven) {
        wipe(m_toRelay);
        wipe(m_toPhone);
        return false;
    }
    m_open = true;
    return true;
}

QByteArray Channel::seal(const QByteArray &plain)
{
    QByteArray out;
    if (!m_open || !chacha(true, m_toRelay, nonceOf(m_sent), plain, &out)) return QByteArray();
    ++m_sent;
    return out;
}

bool Channel::open(const QByteArray &sealed, QByteArray *plain)
{
    if (!m_open || !chacha(false, m_toPhone, nonceOf(m_received), sealed, plain)) return false;
    ++m_received;
    return true;
}
