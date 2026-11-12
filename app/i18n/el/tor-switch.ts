// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in Greek (i18n/el/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Αυτό πηγαίνει μόνο μέσω Tor, που αυτή η έκδοση του Erevos δεν έχει.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Μέσω Tor: ο server δεν βλέπει τη διεύθυνση internet αυτού του τηλεφώνου. Είναι πιο αργά και περιμένει όσο ξεκινά το Tor.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Αυτή η έκδοση του Erevos δεν έχει Tor, οπότε με αυτό ανοιχτό δεν πηγαίνει τίποτα στον server.",
  "Straight: the server sees this phone's internet address.": "Κατευθείαν: ο server βλέπει τη διεύθυνση internet αυτού του τηλεφώνου.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Αυτός ο χώρος στέλνει τα πάντα μέσω Tor, οπότε και αυτό πηγαίνει μέσω Tor: ο server δεν βλέπει τη διεύθυνση internet αυτού του τηλεφώνου.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Όπως λέει η ρύθμιση Tor του χώρου: μέσω Tor όσο το Tor είναι έτοιμο, κατευθείαν όσο ξεκινά ή αποτυγχάνει, και τότε ο server βλέπει τη διεύθυνση internet αυτού του τηλεφώνου.",
};
