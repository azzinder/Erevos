// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import QtQuick 2.0
import Sailfish.Silica 1.0
import Sailfish.WebView 1.0

// One page: the app, in Sailfish WebView, from the server in src/shellserver.cpp. The app draws
// its own screens and back arrows, so Silica only gives the window and the cover.
ApplicationWindow {
    initialPage: Component {
        WebViewPage {
            allowedOrientations: Orientation.Portrait

            WebView {
                id: web
                anchors.fill: parent
                url: shell.address
            }
        }
    }
    cover: Qt.resolvedUrl("cover/CoverPage.qml")
    allowedOrientations: defaultAllowedOrientations
}
