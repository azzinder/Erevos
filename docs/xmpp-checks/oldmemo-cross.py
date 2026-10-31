# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Cross-checks erevos-xmpp's OMEMO 0.3 against python-oldmemo, both ways.
# Usage, from the repository: python3 -m venv /tmp/omemo && /tmp/omemo/bin/pip install oldmemo xmlschema &&
#   cargo build -p erevos-xmpp --example omemo-call && /tmp/omemo/bin/python docs/xmpp-checks/oldmemo-cross.py target/debug/examples/omemo-call
import asyncio, base64, json, subprocess, sys
import xml.etree.ElementTree as ET
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
import oldmemo, oldmemo.etree
from oldmemo.oldmemo import Oldmemo, KeyExchangeImpl, EncryptedKeyMaterialImpl, ContentImpl
from omemo.storage import Storage, Just, Nothing

CLI = sys.argv[1]
NS = "{eu.siacs.conversations.axolotl}"

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
def pub(secret): return b"\x05" + X25519PrivateKey.from_private_bytes(secret).public_key().public_bytes_raw()

async def python_to_rust():
    # Bob is Erevos, with fixed keys: identity [1]*32, signed pre-key 1 = [2]*32, pre-key 7 = [3]*32.
    ik, spk, pk = bytes([1]*32), bytes([2]*32), bytes([3]*32)
    sig = rust({"op": "sign", "identity": {"secret": b64(ik)}, "message": b64(pub(spk))})["signature"]
    xml = (f"<bundle xmlns='eu.siacs.conversations.axolotl'><signedPreKeyPublic signedPreKeyId='1'>{b64(pub(spk))}</signedPreKeyPublic>"
           f"<signedPreKeySignature>{sig}</signedPreKeySignature><identityKey>{b64(pub(ik))}</identityKey>"
           f"<prekeys><preKeyPublic preKeyId='7'>{b64(pub(pk))}</preKeyPublic></prekeys></bundle>")
    bundle = oldmemo.etree.parse_bundle(ET.fromstring(xml), "bob@erevos", 1)
    alice = Oldmemo(Mem())
    content, plain = await alice.encrypt_plaintext("Γεια από το python-oldmemo".encode())
    session, enc = await alice.build_session_active("bob@erevos", 1, bundle, plain)
    kex, _ = session.key_exchange.serialize(enc.serialize())
    vector = {"key": b64(kex), "payload": b64(content.ciphertext), "iv": b64(content.initialization_vector)}
    got = rust({"op": "decrypt", "identity": {"secret": b64(ik)}, "signed_pre_keys": [{"id": 1, "secret": b64(spk)}],
                "pre_keys": [{"id": 7, "secret": b64(pk)}], "prekey": True, **vector})
    assert got["text"] == "Γεια από το python-oldmemo", got
    bob = got["session"]
    # Bob (Erevos) answers; Alice (python) reads it.
    sent = rust({"op": "encrypt", "text": "Γεια από το Erevos", "sessions": [bob]})
    bob = sent["keys"][0]["session"]
    assert sent["keys"][0]["prekey"] is False
    km = EncryptedKeyMaterialImpl.parse(base64.b64decode(sent["keys"][0]["key"]), "bob@erevos", 1)
    plain = await alice.decrypt_key_material(session, km)
    text = await alice.decrypt_plaintext(ContentImpl(base64.b64decode(sent["payload"]), base64.b64decode(sent["iv"])), plain)
    assert text.decode() == "Γεια από το Erevos", text
    # And on: Alice again, now without the key exchange.
    content, plain = await alice.encrypt_plaintext("τρίτο".encode())
    enc = await alice.encrypt_key_material(session, plain)
    got = rust({"op": "decrypt", "session": bob, "key": b64(enc.serialize()), "prekey": False,
                "payload": b64(content.ciphertext), "iv": b64(content.initialization_vector)})
    assert got["text"] == "τρίτο", got
    print("python → erevos → python: ok")
    return vector

async def rust_to_python():
    bob = Oldmemo(Mem())
    await bob.generate_pre_keys(5)
    bundle = await bob.get_bundle("bob@python", 2)
    xml = oldmemo.etree.serialize_bundle(bundle)
    spk_elt = xml.find(f"{NS}signedPreKeyPublic")
    pk_elt = next(xml.iter(f"{NS}preKeyPublic"))
    their = {"identity": xml.find(f"{NS}identityKey").text,
             "signed_pre_key": {"id": int(spk_elt.get("signedPreKeyId")), "public": spk_elt.text, "signature": xml.find(f"{NS}signedPreKeySignature").text},
             "pre_key": {"id": int(pk_elt.get("preKeyId")), "public": pk_elt.text}}
    me = rust({"op": "identity_new"})["identity"]
    session = rust({"op": "session_start", "identity": me, "bundle": their})["session"]
    sent = rust({"op": "encrypt", "text": "Γεια από το Erevos στο python", "sessions": [session]})
    session = sent["keys"][0]["session"]
    key = sent["keys"][0]
    assert key["prekey"] is True
    # Our identity's Ed25519 sign bit is 0: XEdDSA makes it so.
    kex, auth = KeyExchangeImpl.parse(base64.b64decode(key["key"]), False)
    km = EncryptedKeyMaterialImpl.parse(auth, "bob@python", 2)
    psession, plain = await bob.build_session_passive("alice@erevos", 9, kex, km)
    text = await bob.decrypt_plaintext(ContentImpl(base64.b64decode(sent["payload"]), base64.b64decode(sent["iv"])), plain)
    assert text.decode() == "Γεια από το Erevos στο python", text
    # Python answers.
    content, plain = await bob.encrypt_plaintext("απάντηση".encode())
    enc = await bob.encrypt_key_material(psession, plain)
    got = rust({"op": "decrypt", "session": session, "key": b64(enc.serialize()), "prekey": False,
                "payload": b64(content.ciphertext), "iv": b64(content.initialization_vector)})
    assert got["text"] == "απάντηση", got
    print("erevos → python → erevos: ok")

async def main():
    vector = await python_to_rust()
    await rust_to_python()
    print(json.dumps(vector))

asyncio.run(main())
