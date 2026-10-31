// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import QtQuick 2.0
import Sailfish.Silica 1.0

// What the app shows among the running apps: its name only, never a chat.
CoverBackground {
    Label {
        anchors.centerIn: parent
        text: "Erevos"
        font.pixelSize: Theme.fontSizeLarge
        color: Theme.highlightColor
    }
}
