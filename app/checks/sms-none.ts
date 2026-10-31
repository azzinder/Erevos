// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The SMS module (modules/erevos-sms) for checks under Node: a phone without SMS.
export const takeSmsInvites = async (): Promise<{ from: string; data: string; at: number }[]> => [];
export const smsStatus = () => null;
export const smsThreads = async () => [];
export const smsReady = () => false;
export const sendSms = async (): Promise<number> => {
  throw new Error('This app was built without SMS.');
};
export const laterSmsHolder = () => null;
export const onSmsEvent = () => null;
export const smsSpamFilter = (_on: boolean): void => undefined;
export const smsToolsReady = () => false;
export const exportPhoneSms = async (): Promise<Uint8Array | null> => null;
export type SmsPacketPart = { n: number; from: string; data: string; at: number };
export const smsPacketsReady = () => false;
export const sendSmsPacket = async (): Promise<boolean> => {
  throw new Error('This app was built without SMS.');
};
export const smsPacketParts = async (): Promise<SmsPacketPart[]> => [];
export const forgetSmsPacketParts = async (_ns: number[]): Promise<void> => undefined;
