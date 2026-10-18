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
