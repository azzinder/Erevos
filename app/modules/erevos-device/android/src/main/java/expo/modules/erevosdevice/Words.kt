// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.content.Context

/** The words of the new version and reminder notices in the app's language, as the call module keeps it (erevos-call Notices.kt): English,
 *  Greek, German, Spanish, French, Italian, Portuguese or Serbo-Croatian, English for any other. */
internal object Words {
  /** The app's language code ("en", "el", "de", "es", "fr", "it", "pt", "sh"); "en" until it is set. */
  fun lang(context: Context): String =
    context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) ?: "en"

  /** The words in the app's language: `en` and `el` are given at the call; the others come from
   *  the table below, keyed by the English. `{0}`, `{1}` in a text are put in place by `args`. */
  fun say(context: Context, en: String, el: String, vararg args: String): String {
    val lang = lang(context)
    var text = when (lang) {
      "en" -> en
      "el" -> el
      else -> OTHERS[en]?.get(lang) ?: en
    }
    args.forEachIndexed { i, arg -> text = text.replace("{$i}", arg) }
    return text
  }

  private fun t(de: String, es: String, fr: String, it: String, pt: String, sh: String) =
    mapOf("de" to de, "es" to es, "fr" to fr, "it" to it, "pt" to pt, "sh" to sh)

  // German, Spanish, French, Italian, Portuguese and Serbo-Croatian (Latin script, ijekavian), by the English.
  private val OTHERS: Map<String, Map<String, String>> = mapOf(
    "New versions" to t("Neue Versionen", "Nuevas versiones", "Nouvelles versions", "Nuove versioni", "Novas versões", "Nove verzije"),
    "Erevos {0} is out" to t("Erevos {0} ist da", "Ya está Erevos {0}", "Erevos {0} est disponible", "È uscito Erevos {0}", "O Erevos {0} chegou", "Izašao je Erevos {0}"),
    "Tap to see what is new and update" to t("Tippe, um zu sehen, was neu ist, und zu aktualisieren", "Toca para ver las novedades y actualizar", "Touche pour voir les nouveautés et mettre à jour", "Tocca per vedere le novità e aggiornare", "Toque para ver as novidades e atualizar", "Dodirni da vidiš šta je novo i ažuriraš"),
    "Reminders" to t("Erinnerungen", "Recordatorios", "Rappels", "Promemoria", "Lembretes", "Podsjetnici"),
    "{0} reminders" to t("{0} Erinnerungen", "{0} recordatorios", "{0} rappels", "{0} promemoria", "{0} lembretes", "{0} podsjetnika"),
    "Reminder" to t("Erinnerung", "Recordatorio", "Rappel", "Promemoria", "Lembrete", "Podsjetnik"),
    "Open Chat with myself to read it" to t("Öffne den Chat mit mir selbst, um nachzulesen", "Abre el chat conmigo para leerlo", "Ouvre la discussion avec moi-même pour le lire", "Apri la chat con me stesso per leggerlo", "Abra a conversa comigo para ler", "Otvori razgovor sa sobom da ga pročitaš"),
  )
}
