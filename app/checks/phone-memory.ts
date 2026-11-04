// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The phone module (modules/erevos-phone) for checks under Node: it keeps the quick replies and the
// blocking rules set, and has the phone's contact groups, in memory.
export type ContactGroup = { id: string; title: string; account: string; count: number };

/** What the module keeps; `allowed`: whether Erevos may read the contacts. */
export const phone = { replies: [] as string[], rules: '', groups: [] as ContactGroup[], allowed: true };

/** The module as the phone starts. */
export function clearPhone(): void {
  phone.replies = [];
  phone.rules = '';
  phone.groups = [];
  phone.allowed = true;
}

export const phoneReady = (): boolean => true;
export const quickReplies = (): { replies: string[]; own: boolean } => (phone.replies.length ? { replies: [...phone.replies], own: true } : { replies: ['The usual one'], own: false });
export const setQuickReplies = (replies: string[]): void => {
  phone.replies = [...replies];
};
export const blockingRules = (): string => phone.rules;
export const setBlockingRules = (json: string): void => {
  phone.rules = json;
};
export const phoneGroups = async (): Promise<{ allowed: boolean; groups: ContactGroup[] }> => (phone.allowed ? { allowed: true, groups: phone.groups } : { allowed: false, groups: [] });
