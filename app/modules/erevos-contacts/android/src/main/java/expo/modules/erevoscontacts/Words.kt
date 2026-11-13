// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscontacts

import android.content.Context

/** The words of the birthday notice and of the contact picker in the app's language, as the call module keeps it (erevos-call Notices.kt): English,
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
    "Birthdays" to t("Geburtstage", "Cumpleaños", "Anniversaires", "Compleanni", "Aniversários", "Rođendani"),
    "{0} birthdays today" to t("{0} Geburtstage heute", "{0} cumpleaños hoy", "{0} anniversaires aujourd’hui", "{0} compleanni oggi", "{0} aniversários hoje", "{0} rođendana danas"),
    "{0}'s birthday today" to t("{0} hat heute Geburtstag", "Hoy es el cumpleaños de {0}", "Anniversaire de {0} aujourd’hui", "Oggi è il compleanno di {0}", "Hoje é aniversário de {0}", "{0} danas ima rođendan"),
    "Turns {0}" to t("Wird {0} Jahre alt", "Cumple {0}", "Fête ses {0} ans", "Compie {0} anni", "Faz {0} anos", "Navršava godine: {0}"),
    "A birthday today" to t("Heute Geburtstag", "Cumpleaños hoy", "Anniversaire aujourd’hui", "Compleanno oggi", "Aniversário hoje", "Rođendan danas"),
    "Choose a number" to t("Nummer wählen", "Elige un número", "Choisis un numéro", "Scegli un numero", "Escolha um número", "Izaberi broj"),
    "Choose an email" to t("E-Mail-Adresse wählen", "Elige un correo electrónico", "Choisis un e-mail", "Scegli un indirizzo email", "Escolha um e-mail", "Izaberi adresu e-pošte"),
    "Choose an address" to t("Adresse wählen", "Elige una dirección", "Choisis une adresse", "Scegli un indirizzo", "Escolha um endereço", "Izaberi adresu"),
    "Choose a contact" to t("Kontakt wählen", "Elige un contacto", "Choisis un contact", "Scegli un contatto", "Escolha um contato", "Izaberi kontakt"),
    "Erevos may not read the phone's contacts yet. Open Contacts in Erevos to allow it." to t("Erevos darf die Kontakte des Telefons noch nicht lesen. Öffne die Kontakte in Erevos, um es zu erlauben.", "Erevos aún no puede leer los contactos del teléfono. Abre Contactos en Erevos para permitirlo.", "Erevos ne peut pas encore lire les contacts du téléphone. Ouvre Contacts dans Erevos pour l’autoriser.", "Erevos non può ancora leggere i contatti del telefono. Apri Contatti in Erevos per consentirlo.", "O Erevos ainda não pode ler os contatos do telefone. Abra Contatos no Erevos para permitir.", "Erevos još ne smije čitati kontakte na telefonu. Otvori Kontakte u Erevosu da to dozvoliš."),
    "Search" to t("Suchen", "Buscar", "Rechercher", "Cerca", "Buscar", "Traži"),
  )
}
