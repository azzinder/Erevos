# Erevos brand

The Erevos mark (a white L with a red speech bubble holding a keyhole), as artwork:

- `erevos-app-icon-dark.svg`, `erevos-app-icon-light.svg`: the app icon, on its dark or light tile.
- `erevos-mark-on-dark.svg`, `erevos-mark-on-light.svg`: the mark alone, for a dark or light background.
- `erevos-lockup-dark.svg`, `erevos-lockup-light.svg`: the mark with the name.
- `png/`: the icon drawn at every size Android, iOS, Sailfish OS and the web ask for.

Where they are used:

- The phone app (`app/app.json`): `app/assets/icon/` holds `icon.png` (iOS), `android-square.png`
  (Android: a square icon of its own, the mark at half of it, so launchers show it square, as Nekten
  chose), the web favicon, and `maskable.png` (the two adaptive layers together, for the web app's
  maskable icon).
- The web app (`pwa/build.mjs`) takes its icons from `png/web/`, `png/ios/icon-180.png` and
  `app/assets/icon/maskable.png`.
- The Sailfish OS app (`sailfish/build-web.sh`) takes `png/sailfish/`.
- The desktop app (`desktop/icon.png`, the 1024 icon): electron-builder makes the Linux and macOS
  icons from it.

None of the files carries metadata. Keep it that way when adding new ones.
