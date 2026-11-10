// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from "react";

import { confirm } from "../lib/alert";
import { spaceText } from "../lib/app-space";
import { t } from "../lib/i18n";
import {
  deleteLeftovers,
  findLeftovers,
  type Leftovers as Found,
  type Place,
} from "../lib/leftovers";
import { searchHidden, searchOpens } from "../lock/hidden";
import {
  assertNotLockedOut,
  LockedOutError,
  lockedOutMessage,
  SEARCH_TRIES,
} from "../lock/tries";
import { currentSpace } from "../lock/keys";
import { hiddenHolder } from "../lock/sealed-file";
import { useColors } from "../theme/context";
import { Button, Field, Input, Row, Text } from "./ui";

const hint = { fontSize: 14, lineHeight: 20 };

const sameKey = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * Leftovers (lib/leftovers.ts): the open space is read, and each place the owner opens here with
 * its PIN or password; then the photos and files none of them names are shown, and deleted on the
 * owner's word. The keys stay in this screen's memory only, and go with it.
 */
export function LeftoversCard({ onDeleted }: { onDeleted?: () => void }) {
  const colors = useColors();
  const places = useRef<Place[]>([]);
  const [count, setCount] = useState(0);
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  useEffect(
    () => () => {
      for (const place of places.current) place.key.fill(0);
      places.current = [];
    },
    [],
  );

  const say = (text: string, bad = false) => {
    setNote(text);
    setFailed(bad);
  };

  function keep(place: Place): boolean {
    if (
      places.current.some(
        (p) =>
          p.holder === place.holder &&
          p.space === place.space &&
          sameKey(p.key, place.key),
      )
    )
      return false;
    places.current.push({ ...place, key: place.key.slice() });
    setCount(places.current.length);
    setFound(null);
    return true;
  }

  // What `text` opens: hidden chats of the open space, another space, or hidden chats of a space
  // opened here before. Null when nothing.
  async function openOne(text: string): Promise<Place | null> {
    const open = currentSpace();
    const opened = await searchOpens(open.space, text);
    if (opened && "place" in opened)
      return {
        holder: hiddenHolder(opened.place.pocket),
        space: open.space,
        key: opened.place.key,
      };
    if (opened)
      return {
        holder: "space",
        space: opened.space.space,
        key: opened.space.key,
      };
    for (const other of new Set(
      places.current
        .filter((p) => p.holder === "space" && p.space !== open.space)
        .map((p) => p.space),
    )) {
      const hidden = await searchHidden(other, text);
      if (hidden)
        return {
          holder: hiddenHolder(hidden.pocket),
          space: other,
          key: hidden.key,
        };
    }
    return null;
  }

  // Wrong tries here count as a search's (lock/hidden.ts): after several, nothing opens for a
  // while, a right one neither, and the search says nothing of it. Here it is said, with how long.
  async function waitNote(): Promise<string> {
    try {
      await assertNotLockedOut(Date.now(), SEARCH_TRIES);
      return "";
    } catch (error) {
      if (error instanceof LockedOutError) return lockedOutMessage(error.until);
      throw error;
    }
  }

  async function add() {
    const text = secret;
    setSecret("");
    if (!text) return;
    setBusy(true);
    try {
      const whole = await openOne(text);
      const parts = text.split(/[\s,;]+/).filter(Boolean);
      if (whole || parts.length < 2) {
        if (!whole)
          say(
            (await waitNote()) ||
              t("Nothing opens with that. Check it and type it again."),
            true,
          );
        else if (keep(whole)) say(t("Opened, and it is read with the rest."));
        else say(t("That one is read already."));
        return;
      }
      // Several at once: each in turn, and those that opened nothing again once a space opened,
      // since a hidden space's own hidden chats open only after it.
      let left = parts;
      let opened = 0;
      for (;;) {
        const still: string[] = [];
        let spaceOpened = false;
        for (const part of left) {
          const place = await openOne(part);
          if (!place) still.push(part);
          else {
            if (keep(place) && place.holder === "space") spaceOpened = true;
            opened++;
          }
        }
        left = still;
        if (!spaceOpened || left.length === 0) break;
      }
      const wait = opened < parts.length ? await waitNote() : "";
      say(
        [
          t("Opened {opened} of {count}; they are read with the rest.", {
            opened,
            count: parts.length,
          }),
          wait,
        ]
          .filter(Boolean)
          .join(" "),
        opened < parts.length,
      );
    } catch (error) {
      say(error instanceof Error ? error.message : String(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function look() {
    setBusy(true);
    say("");
    try {
      const open = currentSpace();
      keep({ holder: "space", space: open.space, key: open.key });
      setFound(await findLeftovers(places.current));
    } catch (error) {
      say(error instanceof Error ? error.message : String(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!found || found.ids.length === 0) return;
    const sure = await confirm(
      t("Delete the leftovers?"),
      t(
        "{size} of photos and files that none of the places read here names (places read: {n}). A place you did not open here loses its photos and files for good: open every one first. Backups already made keep them.",
        {
          size: spaceText(found.bytes),
          n: count,
        },
      ),
      t("Delete"),
    );
    if (!sure) return;
    setBusy(true);
    try {
      const freed = await deleteLeftovers(found);
      setFound(null);
      say(t("{size} freed.", { size: spaceText(freed) }));
      onDeleted?.();
    } catch (error) {
      say(error instanceof Error ? error.message : String(error), true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text variant="caption" tone="muted" style={hint}>
        {t(
          "Photos and files that nothing on the phone names any more, as those of an import that stopped in its middle, stay on it and in every backup. Only a place opened with its key can say which are its own: so first type here, one at a time or several at once separated by commas or spaces, the PIN of each of your hidden chats and the password of any other space you have. This space is read by itself. Nothing is deleted before you see how much and say so; a file written in the last day is never taken.",
        )}
      </Text>
      <Field label={t("PIN or password")}>
        <Row>
          <Input
            value={secret}
            onChangeText={setSecret}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void add()}
            accessibilityLabel={t("PIN or password")}
            style={{ flex: 1 }}
          />
          <Button
            title={t("Add")}
            kind="secondary"
            compact
            onPress={() => void add()}
            disabled={busy || !secret}
          />
        </Row>
      </Field>
      {count > 0 ? (
        <Text variant="caption" style={hint}>
          {t("Read with this space: {n}", { n: count })}
        </Text>
      ) : null}
      {note ? (
        <Text
          variant="caption"
          color={failed ? colors.danger : undefined}
          tone={failed ? undefined : "muted"}
          style={hint}
        >
          {note}
        </Text>
      ) : null}
      {found ? (
        <Text variant="bodyStrong" style={hint}>
          {found.ids.length
            ? t("Leftovers: {size} in {n} chunks.", {
                size: spaceText(found.bytes),
                n: found.files,
              })
            : t("No leftovers.")}
        </Text>
      ) : null}
      <Row wrap>
        <Button
          title={busy ? t("One moment…") : t("Find leftovers")}
          kind="secondary"
          compact
          onPress={() => void look()}
          disabled={busy}
        />
        {found && found.ids.length ? (
          <Button
            title={t("Delete them")}
            kind="danger"
            compact
            onPress={() => void remove()}
            disabled={busy}
          />
        ) : null}
      </Row>
    </>
  );
}
