<!--
SPDX-FileCopyrightText: 2026 azzinder
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
-->

# What a stolen phone or key opens

In plain words: if someone takes your phone, a backup, a key or a server, what can they read, and what stays
closed? In Greek: [stolen-key.el.md](stolen-key.el.md). The details are in the [threat model](threat-model.md) and
the [protocol](protocol.md). **Not audited**: this page says what the code is meant to do, not what anyone has
checked.

## The short answer

| They took | They can read | They cannot read |
|---|---|---|
| Your phone, **unlocked**, with Erevos open | Everything in the space that is open | Other spaces and hidden chats, without their passwords and PINs |
| Your phone, **locked** | Nothing in Erevos, unless they guess a password | Anything sealed, as long as the password holds |
| A **backup file** | Nothing, without the backup password | Each space also needs its own password |
| **One chat's keys**, copied off the phone | Messages of that chat until both phones move on | Earlier messages they copied off the network; later ones, once the chat moves on |
| A **relay**, or its secret key | What the relay sees anyway | Any message, call or file |
| A **linked computer** | What that computer holds | Your other spaces and hidden places, unless linked there too |

## Messages are locked with keys that change

Each chat uses the **double ratchet**: every message is sealed with a key of its own, made from the one before, and
each key is thrown away once used. Each time the two of you write back and forth, new keys come from fresh random
numbers that never leave the phones.

- **The past stays closed.** Someone who recorded your sealed messages on the network, and later steals the keys a
  chat holds now, cannot open those earlier messages: their keys are gone. (A phone keeps up to 2,000 keys of
  messages that have not arrived yet, so those could open when they do.)
- **The future closes again.** After a theft of the keys alone, once both phones have written to each other again,
  the new keys come from random numbers the thief never saw, and they are shut out. This does not help if they keep
  your phone, or keep its keys coming.
- **Groups** renew their keys about every week, so a group key taken once reads the group only until then.

## Your phone

**Unlocked, with Erevos open:** whoever holds it reads what you can: the chats, contacts and Collection of the space
that is open. Also Android's own SMS, call log and contacts, which Erevos does not seal. They do not see another
space or your hidden chats without their passwords and PINs, and the app does not show that they exist. The **panic
button** wipes Erevos at once.

**Locked:** everything is sealed with a key from your password.

- Wrong passwords make the next try wait longer, up to an hour. A **panic password**, if you set one, wipes
  everything when typed.
- Someone with forensic tools and root can copy the sealed files and guess **offline**, with no waiting. Each guess
  is slowed on purpose (PBKDF2 and Argon2id), but a short password or PIN still falls: a 4-digit PIN is only 10,000
  guesses. **Use a long password.**
- A space with **no password lock** keeps its key in the phone's keystore, so whoever can read the keystore opens it.
- While a space is open, its keys are in the app's memory, and someone who can read the phone's memory reads them.

## A backup file

A backup opens only with its **backup password** (at least 12 characters, slowed on purpose like the lock). Inside,
each space is still sealed with its own password, except a space with no password lock. Your Matrix, XMPP and Nostr
accounts are in it, sealed the same way.

Whoever has the file **and** its password has what it holds, and can put your Erevos on another phone, as you can.
Keep the backup password long and apart from the file.

## A relay, or its key

A relay never holds the keys to your messages, calls or files, so taking a relay, or its secret key, opens none of
them. It shows what the relay sees anyway ([servers.md](servers.md)): addresses, times and sizes. With the relay's
secret key someone could pretend to be the relay to phones from then on; what went before stays closed.

## The far future: quantum computers

A chat starts with **PQXDH**, which adds ML-KEM-768 so that a future quantum computer cannot open a recording of it.
That holds only while the ML-KEM secret stays secret. Your contact link's secret is kept as long as your account, so
someone who takes your phone or a backup **and** one day has such a computer could open the conversations started
from your link. Erevos makes new ones every 30 days and throws away all but the last three, so most of a chat soon
moves past that. **Groups** are not protected against quantum computers at all.

## If it happens

- **Phone gone:** if Erevos was locked with a long password, what is sealed stays sealed. If someone makes you open
  it, typing a panic password set beforehand wipes it instead.
- **Backup gone:** what matters is the backup password. If it may be known, treat it as your phone gone.
- **Linked computer gone:** unlink it from the phone; your contacts stop writing to it the next time the phone
  reaches the relay.
- **Not sure:** compare safety numbers again with the people who matter, in person if you can.
