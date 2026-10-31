// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Where Erevos starts: its screens (expo-router), and, on Android, the task it runs with no screen
// when it starts by itself as the phone turns on (lib/background.ts startBootNotices,
// modules/erevos-call BootStart.kt), whose code loads only when that task runs.
import { AppRegistry, Platform } from 'react-native';
import 'expo-router/entry';

if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask('ErevosBoot', () => () => require('./lib/background').startBootNotices());
}
