// The Spanish of settings that stand apart: Tor bridges, unlocking with a fingerprint, colors, languages (i18n/es/index.ts).
export const more: Record<string, string> = {
  // Tor bridges (the Tor screen).
  Bridges: 'Puentes',
  'No bridges': 'Sin puentes',
  'My own': 'Los míos',
  'None of these is a bridge Erevos can use, so Tor stays off and messages wait.':
    'Ninguno de estos es un puente que Erevos pueda usar, así que Tor se queda apagado y los mensajes esperan.',
  'None of these is a bridge Erevos can use, so Tor stays off and messages go straight.':
    'Ninguno de estos es un puente que Erevos pueda usar, así que Tor se queda apagado y los mensajes van directamente.',
  'Tor goes straight to its relays. Where Tor is blocked, choose bridges: Tor then reaches its network only through them.':
    'Tor va directamente a sus repetidores. Donde Tor está bloqueado, elige puentes: entonces Tor llega a su red solo a través de ellos.',
  'The obfs4 bridges Tor Browser comes with: to whoever watches the network, Tor looks like random bytes. Where a censor blocks these too, choose Snowflake or bridges of your own.':
    'Los puentes obfs4 que trae Tor Browser: para quien vigila la red, Tor parece bytes aleatorios. Donde un censor también bloquea estos, elige Snowflake o tus propios puentes.',
  "Snowflake goes through volunteers' browsers, over WebRTC, the way a video call does. To find one, Erevos asks Snowflake's broker through a CDN, behind another site's name, and STUN servers tell the phone its own address: they see that address, never your messages. Slower, and hard to block.":
    'Snowflake pasa por los navegadores de voluntarios, con WebRTC, como una videollamada. Para encontrar uno, Erevos pregunta al broker de Snowflake a través de una CDN, tras el nombre de otro sitio, y unos servidores STUN le dicen al teléfono su propia dirección: ven esa dirección, nunca tus mensajes. Más lento, y difícil de bloquear.',
  'Bridge lines from bridges.torproject.org, from bridges@torproject.org by email, or from @GetBridgesBot on Telegram, one per line. obfs4, Snowflake, WebTunnel, meek and plain bridges work.':
    'Líneas de puentes de bridges.torproject.org, de bridges@torproject.org por correo, o de @GetBridgesBot en Telegram, una por línea. Funcionan obfs4, Snowflake, WebTunnel, meek y puentes normales.',
  'Bridge lines': 'Líneas de puentes',
  'Not a bridge line Erevos can use: {line}': 'No es una línea de puente que Erevos pueda usar: {line}',
  '{n} bridge': '{n} puente',
  '{n} bridges': '{n} puentes',
  'Use these bridges': 'Usar estos puentes',
  'Not in use until you tap Use these bridges.': 'No se usan hasta que toques «Usar estos puentes».',
  'With bridges, Tor never goes straight to its relays: when no bridge answers, messages wait. Bridges count only while Tor is on.':
    'Con puentes, Tor nunca va directamente a sus repetidores: si ningún puente responde, los mensajes esperan. Los puentes solo cuentan mientras Tor está activado.',
  'With bridges, Tor never goes straight to its relays: when no bridge answers, messages go to the relay without Tor until one does.':
    'Con puentes, Tor nunca va directamente a sus repetidores: si ningún puente responde, los mensajes van al relay sin Tor hasta que uno responda.',

  // Updates on Windows, and on every computer: the file to take.
  'The download page opens: take {file}, see User guide → Updates.': 'Se abre la página de descargas: elige {file}, consulta «Guía de uso → Actualizaciones».',

  // Material You: the phone's own colors (Appearance).
  "Material You takes no glass: its colors are the phone's own.": 'Material You no lleva cristal: sus colores son los del propio teléfono.',
  "Your phone's own colors, which Android makes from its wallpaper: a new wallpaper changes them here too.":
    'Los colores de tu propio teléfono, que Android crea a partir de su fondo de pantalla: un fondo nuevo también los cambia aquí.',
  "Material You takes the phone's own colors, on Android 12 and later. Here it shows in Classic's.":
    'Material You toma los colores del propio teléfono, en Android 12 y posteriores. Aquí se muestra con los de Classic.',

  // Unlocking with a fingerprint or face (Lock, and the password screen).
  'Fingerprint or face': 'Huella o cara',
  'On: Erevos opens with your fingerprint or face too. The password always works.':
    'Activado: Erevos también se abre con tu huella o tu cara. La contraseña siempre funciona.',
  'Open Erevos with your fingerprint or face instead of typing the password. The password always works too.':
    'Abre Erevos con tu huella o tu cara en lugar de escribir la contraseña. La contraseña también funciona siempre.',
  'It opens only what your first password opens, never the space of a second password or hidden chats. Someone who holds you can press your finger to the phone: if that may happen, keep it off.':
    'Solo abre lo que abre tu primera contraseña, nunca el espacio de una segunda contraseña ni los chats ocultos. Alguien que te retenga puede ponerte el dedo en el teléfono: si eso puede pasar, déjalo desactivado.',
  'Fingerprint or face for Erevos': 'Huella o cara para Erevos',
  'Erevos opens with your fingerprint or face too.': 'Ahora Erevos también se abre con tu huella o tu cara.',
  'Unlock Erevos': 'Desbloquear Erevos',
  'Use password': 'Usar contraseña',
  'Unlocking with a fingerprint or face stopped working, so it is off now. Type your password, and turn it on again in Lock.':
    'El desbloqueo con huella o cara ha dejado de funcionar, así que ahora está desactivado. Escribe tu contraseña y vuelve a activarlo en «Bloqueo».',
};
