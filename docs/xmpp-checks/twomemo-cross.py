# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Cross-checks erevos-xmpp's OMEMO 2 (urn:xmpp:omemo:2) against python-twomemo, both ways.
# Usage: python twomemo-cross.py <path to omemo-call binary>
import asyncio, base64, json, subprocess, sys
import xml.etree.ElementTree as ET
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
import twomemo, twomemo.etree
from twomemo.twomemo import Twomemo, KeyExchangeImpl, EncryptedKeyMaterialImpl, ContentImpl
from omemo.storage import Storage, Just, Nothing

CLI = sys.argv[1]
NS = "{urn:xmpp:omemo:2}"

def rust(req):
    out = subprocess.run([CLI, json.dumps(req)], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(out.stderr)
    return json.loads(out.stdout)

class Mem(Storage):
    def __init__(self):
        super().__init__(True)
        self.d = {}
    async def _load(self, key):
        return Just(self.d[key]) if key in self.d else Nothing()
    async def _store(self, key, value):
        self.d[key] = value
    async def _delete(self, key):
        self.d.pop(key, None)

def b64(b): return base64.b64encode(b).decode()
def pub(secret): return X25519PrivateKey.from_private_bytes(secret).public_key().public_bytes_raw()

async def python_to_rust():
    # Bob is Erevos, with fixed keys: identity [1]*32, signed pre-key 1 = [2]*32, pre-key 7 = [3]*32.
    ik, spk, pk = bytes([1]*32), bytes([2]*32), bytes([3]*32)
    ed = rust({"op": "two_identity", "identity": {"secret": b64(ik)}})["ik"]
    sig = rust({"op": "sign", "identity": {"secret": b64(ik)}, "message": b64(pub(spk))})["signature"]
    xml = (f"<bundle xmlns='urn:xmpp:omemo:2'><spk id='1'>{b64(pub(spk))}</spk><spks>{sig}</spks><ik>{ed}</ik>"
           f"<prekeys><pk id='7'>{b64(pub(pk))}</pk></prekeys></bundle>")
    bundle = twomemo.etree.parse_bundle(ET.fromstring(xml), "bob@erevos", 1)
    alice = Twomemo(Mem())
    content, plain = await alice.encrypt_plaintext("Γεια από το python-twomemo".encode())
    session, enc = await alice.build_session_active("bob@erevos", 1, bundle, plain)
    kex = session.key_exchange.serialize(enc.serialize())
    vector = {"key": b64(kex), "payload": b64(content.ciphertext)}
    got = rust({"op": "two_decrypt", "identity": {"secret": b64(ik)}, "signed_pre_keys": [{"id": 1, "secret": b64(spk)}],
                "pre_keys": [{"id": 7, "secret": b64(pk)}], "kex": True, **vector})
    assert got["text"] == "Γεια από το python-twomemo", got
    assert got["used_pre_key"] == 7, got
    bob = got["session"]
    # Bob (Erevos) answers; Alice (python) reads it.
    sent = rust({"op": "two_encrypt", "text": "Γεια από το Erevos", "sessions": [bob]})
    bob = sent["keys"][0]["session"]
    assert sent["keys"][0]["kex"] is False
    km = EncryptedKeyMaterialImpl.parse(base64.b64decode(sent["keys"][0]["key"]), "bob@erevos", 1)
    plain = await alice.decrypt_key_material(session, km)
    text = await alice.decrypt_plaintext(ContentImpl(base64.b64decode(sent["payload"])), plain)
    assert text.decode() == "Γεια από το Erevos", text
    # And on: Alice again, now without the key exchange, and an empty one that only moves the ratchet.
    for words in ["τρίτο", None]:
        content, plain = await (alice.encrypt_plaintext(words.encode()) if words else alice.encrypt_empty())
        enc = await alice.encrypt_key_material(session, plain)
        got = rust({"op": "two_decrypt", "session": bob, "key": b64(enc.serialize()), "kex": False,
                    "payload": None if content.empty else b64(content.ciphertext)})
        assert got["text"] == words, got
        bob = got["session"]
    print("python → erevos → python: ok")
    return vector

async def rust_to_python():
    bob = Twomemo(Mem())
    await bob.generate_pre_keys(5)
    bundle = await bob.get_bundle("bob@python", 2)
    xml = twomemo.etree.serialize_bundle(bundle)
    spk_elt = xml.find(f"{NS}spk")
    pk_elt = next(xml.iter(f"{NS}pk"))
    their = {"ik": xml.find(f"{NS}ik").text,
             "spk": {"id": int(spk_elt.get("id")), "public": spk_elt.text, "signature": xml.find(f"{NS}spks").text},
             "pk": {"id": int(pk_elt.get("id")), "public": pk_elt.text}}
    me = rust({"op": "identity_new"})["identity"]
    # Their bundle with a signature that is not theirs is refused.
    bad = dict(their, spk=dict(their["spk"], signature=b64(bytes(64))))
    try:
        rust({"op": "two_session_start", "identity": me, "bundle": bad})
        raise AssertionError("a bad signature was taken")
    except RuntimeError:
        pass
    session = rust({"op": "two_session_start", "identity": me, "bundle": their})["session"]
    sent = rust({"op": "two_encrypt", "text": "Γεια από το Erevos στο python", "sessions": [session]})
    session = sent["keys"][0]["session"]
    key = sent["keys"][0]
    assert key["kex"] is True
    kex, auth = KeyExchangeImpl.parse(base64.b64decode(key["key"]))
    km = EncryptedKeyMaterialImpl.parse(auth, "bob@python", 2)
    psession, plain = await bob.build_session_passive("alice@erevos", 9, kex, km)
    text = await bob.decrypt_plaintext(ContentImpl(base64.b64decode(sent["payload"])), plain)
    assert text.decode() == "Γεια από το Erevos στο python", text
    # The identity python saw is the one our bundle would say.
    assert b64(kex.identity_key) == rust({"op": "two_identity", "identity": me})["ik"]
    # Python answers, twice.
    for words in ["απάντηση", "και δεύτερη"]:
        content, plain = await bob.encrypt_plaintext(words.encode())
        enc = await bob.encrypt_key_material(psession, plain)
        got = rust({"op": "two_decrypt", "session": session, "key": b64(enc.serialize()), "kex": False,
                    "payload": b64(content.ciphertext)})
        assert got["text"] == words, got
        session = got["session"]
    # And Erevos again, now without the key exchange.
    sent = rust({"op": "two_encrypt", "text": "τέλος", "sessions": [session]})
    assert sent["keys"][0]["kex"] is False
    km = EncryptedKeyMaterialImpl.parse(base64.b64decode(sent["keys"][0]["key"]), "bob@python", 2)
    plain = await bob.decrypt_key_material(psession, km)
    text = await bob.decrypt_plaintext(ContentImpl(base64.b64decode(sent["payload"])), plain)
    assert text.decode() == "τέλος", text
    print("erevos → python → erevos: ok")

async def main():
    vector = await python_to_rust()
    await rust_to_python()
    print(json.dumps(vector))

asyncio.run(main())
