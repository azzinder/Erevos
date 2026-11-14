<!--
SPDX-FileCopyrightText: 2026 azzinder
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# State machines

The states of the parts reviewers most often ask about, drawn from the code. **Not audited.** The
formats and key derivations behind each step are in [protocol.md](protocol.md). The diagrams are
Mermaid, which GitHub renders.

## 1. Double ratchet session

`crates/erevos-core/src/ratchet.rs`. Every receive works on a copy of the session and keeps it only
when the AEAD tag checks. So each arrow out of a receive state is taken only on success, and every
failure returns to the state it started from, unchanged.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> InitiatorReady: Session.initiator(SK, SPK_B)<br/>new DHs, (RK, CKs) = KDF_RK(SK, DH(DHs, SPK_B))
    [*] --> ResponderWaiting: Session.responder(SK, SPK_B)<br/>DHs = SPK_B, RK = SK, no chains

    ResponderWaiting --> ResponderWaiting: encrypt → NotReady
    ResponderWaiting --> Talking: decrypt OK<br/>DH ratchet step - CKr, new DHs, CKs

    InitiatorReady --> InitiatorReady: encrypt<br/>CKs → (CKs', mk), Ns += 1
    InitiatorReady --> Talking: decrypt OK<br/>(their first reply - DH ratchet step)

    state Talking {
        [*] --> Idle
        Idle --> Idle: encrypt - CKs step, Ns += 1
        Idle --> Receiving: packet (header dh, pn, n)
        Receiving --> Idle: key in skipped(dh, n) → open, key removed
        Receiving --> Step: dh ≠ DHr
        Step --> Skip: skip CKr up to pn (≤ MAX_SKIP)<br/>PN = Ns, Ns = Nr = 0<br/>RK, CKr = KDF_RK(RK, DH(DHs, dh))<br/>new DHs, then RK, CKs = KDF_RK(RK, DH(DHs, dh))
        Receiving --> Skip: dh = DHr
        Skip --> Idle: skip CKr up to n (≤ MAX_SKIP, store ≤ 2000, oldest out)<br/>CKr step, Nr += 1, open
    }

    Talking --> Talking: any failure (bad tag, replay,<br/>TooManySkipped, ChainExhausted)<br/>session unchanged
    Talking --> Restored: put back from a backup
    Restored --> Talking: restored() - CKs moves 900 keys (RESTORE_SKIP)
```

## 2. Conversation with a contact

`crates/erevos-core/src/conversation.rs`, `app/lib/e2e.ts`. This is the app's view of one contact.
It can hold up to 3 conversations (`MAX_CONVERSATIONS`).

```mermaid
stateDiagram-v2
    [*] --> LinkOnly: contact link added<br/>(bundle checked - verify_strict)
    LinkOnly --> Pending: start() - PQXDH + first packet (no text)<br/>queued until the relay takes it
    Pending --> Pending: resend first packet until relay accepts
    Pending --> Open: first reply opens in this conversation

    [*] --> Request: first packet arrives (unknown sender)
    Request --> Request: same first_message_id seen → ignored
    Request --> Open: owner accepts → accept() - PQXDH respond + open

    Open --> Open: following packet opens here<br/>(sealed per contact once its key is known)
    Open --> Open: other side started too <br/>keep ≤ 3, send in the last one received in
    Open --> Renewed: newer prekeys received (ak, every 30 days)<br/>start a new conversation quietly
    Renewed --> Open
    Open --> Gone: contact deleted or blocked<br/>queue deleted, others told the new one
    Gone --> [*]
```

## 3. Lock screen, spaces and the panic password

`app/lock/config.ts` (`unlock`, `countedMatch`), `app/lock/tries.ts`, `app/lock/gate.tsx`,
`app/lib/panic.ts`. All slots, plus the panic slot, are checked on every try. So the time a try
takes does not depend on which slot matches, or on whether any matches.

```mermaid
stateDiagram-v2
    [*] --> Start
    Start --> SpaceOpen: lock off, or a direct space<br/>(key from the keystore)
    Start --> Locked: password lock on

    state Locked {
        [*] --> Ready
        Ready --> Waiting: fails > 5 → wait 30 s × 2ⁿ, max 1 h<br/>(uptime clock, a restart starts the wait again)
        Waiting --> Ready: wait over
        Ready --> Checking: password typed
        Checking --> Ready: no slot matches → fails += 1
    }

    Checking --> SpaceOpen: slot i matches → fails = 0<br/>space i opens with its key
    Checking --> Wiping: panic slot matches<br/>(PanicPasswordError)
    Wiping --> [*]: wipeNow() - app data, keystore, keys,<br/>optionally backups in their folder,<br/>Android clears storage and stops the app

    SpaceOpen --> Locked: app locked / closed
    SpaceOpen --> Wiping: panic button in Settings,<br/>or a trusted panic app (Android)
```

## 4. Hidden chats and the search

`app/lock/hidden.ts` (`searchHidden`, `searchOpens`), `app/lock/tries.ts`, with the counter
`SEARCH_TRIES` kept apart from the lock screen's. Every space has 4 pockets from its first start,
set or not. Every search with at least the minimum PIN length tries every pocket of the open space
and every space's password, whatever was typed.

```mermaid
stateDiagram-v2
    [*] --> Chats: space open
    Chats --> Searching: text typed in search (≥ MIN_PIN)

    state Searching {
        [*] --> TryAll
        TryAll: try all 4 pockets of this space<br/>and every space slot (spaceOf)
    }

    Searching --> Chats: search waiting (fails > 5) → plain search only
    Searching --> Chats: nothing matched → search fails += 1<br/>(forgotten after 15 min, wait ≤ 5 min)
    Searching --> HiddenOpen: pocket p matches → fails = 0
    Searching --> OtherSpace: another space's password matches → fails = 0
    Searching --> Chats: panic password → nothing here

    HiddenOpen --> Chats: closed - its queue goes unread<br/>(or read if "receive while closed" is on)
    OtherSpace --> Chats: that space opens instead

    Chats --> SetPin: set a PIN in pocket p (owner names p)<br/>old content there can no longer be opened
    SetPin --> Chats
```

## 5. Group membership (MLS)

`crates/erevos-group`, `app/lib/groups.ts`. Only the admin or keeper commits.

```mermaid
stateDiagram-v2
    [*] --> Invited: admin asks for a key package (one-to-one chat)
    Invited --> Member: key package sent → admin commits add<br/>→ Welcome in the one-to-one chat → join
    Member --> Member: group message (MLS PrivateMessage,<br/>relay-sealed per member)
    Member --> Waiting: message from a later epoch
    Waiting --> Member: commit arrives → kept messages retried
    Member --> Renewing: every 7 days - renewal key package to keeper
    Renewing --> Member: keeper commits out+in → Welcome → rejoin
    Member --> Out: asks to leave / removed by admin commit
    Out --> [*]
```
