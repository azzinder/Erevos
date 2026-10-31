// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { requireOptionalNativeModule } from 'expo-modules-core';

// Erevos's widget on the phone's home screen, for Android (the module's manifest): Phone, SMS,
// Messages and Contacts, each with how many are new, never who or what. It counts again as calls,
// SMS and messages come, and as Erevos goes to the background (app/_layout.tsx), when what was
// read there is no longer new. On other platforms, and in an app built before this module, there
// is none, and refreshWidget does nothing.

type Native = { refresh(): void; order(): string[] | null; setOrder(order: string[]): boolean };

export type WidgetButton = 'phone' | 'sms' | 'messages' | 'contacts';
/** The buttons in the order Erevos first shows them. */
export const WIDGET_BUTTONS: WidgetButton[] = ['phone', 'sms', 'messages', 'contacts'];

const native = requireOptionalNativeModule<Native>('ErevosWidget');

/** Has the widget count again, if it is on the home screen. */
export function refreshWidget(): void {
  try {
    native?.refresh();
  } catch {
    // The widget counts again when the next call, SMS or message comes.
  }
}

/** The widget's buttons from left to right (Appearance → Widget), or null where there is no widget. */
export function widgetOrder(): WidgetButton[] | null {
  try {
    const order = native?.order?.() ?? null;
    return order && isOrder(order) ? order : null;
  } catch {
    return null;
  }
}

/** Keeps a new order and has the widget show it; false if it could not. */
export function setWidgetOrder(order: WidgetButton[]): boolean {
  try {
    return isOrder(order) ? (native?.setOrder?.(order) ?? false) : false;
  } catch {
    return false;
  }
}

/** All four buttons, once each. */
export function isOrder(order: string[]): order is WidgetButton[] {
  return order.length === WIDGET_BUTTONS.length && WIDGET_BUTTONS.every((button) => order.includes(button));
}
