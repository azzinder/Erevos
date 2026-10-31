// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { PermissionsAndroid, Platform } from 'react-native';

/** The microphone, and the camera for video, asked for before a call. False if refused. */
export async function callPermissions(video: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const wanted: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = ['android.permission.RECORD_AUDIO'];
  if (video) wanted.push('android.permission.CAMERA');
  const answers = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((permission) => answers[permission] === PermissionsAndroid.RESULTS.GRANTED);
}
