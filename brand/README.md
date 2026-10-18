# Erevos brand

The Erevos mark (a white L with a red speech bubble holding a keyhole), as artwork:

- `erevos-app-icon-dark.svg`, `erevos-app-icon-light.svg`: the app icon, on its dark or light tile.
- `erevos-mark-on-dark.svg`, `erevos-mark-on-light.svg`: the mark alone, for a dark or light background.
- `erevos-lockup-dark.svg`, `erevos-lockup-light.svg`: the mark with the name.
- `png/`: the icon drawn at every size Android, iOS and the web ask for.

Where they are used:

- The phone app (`app/app.json`): `app/assets/icon/` holds `icon.png` (iOS and Android), the
  Android adaptive icon's two layers, the web favicon, and `maskable.png` (the two layers together,
  for the web app's maskable icon).
- The web app (`pwa/build.mjs`) takes its icons from `png/web/`, `png/ios/icon-180.png` and
  `app/assets/icon/maskable.png`.
- The desktop app (`desktop/icon.png`, the 1024 icon): electron-builder makes the Linux and macOS
  icons from it.

None of the files carries metadata. Keep it that way when adding new ones.
