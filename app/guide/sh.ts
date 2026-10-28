/** The user guide in Serbo-Croatian. Its format: lib/guide.ts. The same sections, in the same order and shape, as the English one. */
export const guide = `
## Šta je Erevos {#about}

Erevos je aplikacija za razmjenu poruka napravljena za privatnost. Za korištenje vam ne trebaju nalog, broj telefona
ni e-mail, i zamišljen je tako da radi gdje god da ste: preko telefona u blizini bez ikakve mreže, preko Wi-Fi mreže
ili preko interneta.

- **U blizini, bez interneta:** dva Android telefona razgovaraju direktno preko Bluetootha, Wi-Fi Aware ili Wi-Fi
  Directa, šifrirano s kraja na kraj, a isto tako i telefoni i računari na istoj Wi-Fi mreži ili na hotspotu nekog
  telefona. S LoRa radiom tekstovi idu kilometrima daleko.
- **Preko relaya:** preko Wi-Fi mreže ili interneta, kroz mali server (relay) koji možete sami pokretati.
- **Prostori:** zaključavanje lozinkom, druga lozinka koja otvara zaseban, prazan Erevos, i skriveni razgovori u
  svakom prostoru.
- **Izgled:** LPHL izgledi: Classic, Modernist i Nocturne, dvanaest paleta i staklo kao na lphl.nekten.eu.

> Poruke su **šifrirane s kraja na kraj**, i preko relaya i u blizini, ali još ništa nisu provjerili nezavisni
> stručnjaci. [Šta je danas zaštićeno](#privacy) kaže tačno šta jeste, a šta nije zaštićeno.

Ovaj vodič se otvara iz stavke **Korisnički vodič** u meniju početnog ekrana (tri tačke na vrhu). Pretraga na njegovom
vrhu pronalazi bilo koju riječ u njemu. Vodič je na svim jezicima aplikacije i prikazuje se na onom koji ste
izabrali, pogledajte [Jezik](#start).

### Ko ga pravi i zašto

- **Ko:** Erevos pravi ista osoba koja je napravila FASOULI.
- **Gdje:** nije važno. Važno je to što relay i aplikacija za preglednik rade na vlastitom serveru autora
  (lphl.nekten.eu).
- **Za koga:** za svakoga ko želi razgovarati sa svojim ljudima bez davanja broja telefona, e-maila ili naloga:
  prijatelje, porodice, grupe i one koji žive tamo gdje se internet prekida ili nadzire. I za one koji, iako nemaju
  šta da kriju, žele da njihov lični prostor ostane privatan, daleko od znatiželjnih očiju.
- **Zašto:** zato što poznate aplikacije traže broj telefona, znaju ko s kim razgovara i prestaju raditi kad nestane
  interneta. Zato što nas „uslovi korištenja“ nekih od njih ne zadovoljavaju, a sumnjamo u to kako štite našu
  privatnost. Zato što drugima nedostaju funkcije koje su nam potrebne. Erevos ne traži ništa i pronalazi put kroz
  ono što postoji: internet, Wi-Fi, Bluetooth, telefon u blizini.
- **Ko plaća:** niko: nema oglasa, nema investitora, nema prikupljanja podataka. Ko želi, može pomoći oko troškova
  rada, poput servera: u **Postavke** → **Općenito** → **Podržite Erevos** su načini, Liberapay, PayPal, Monero i
  Bitcoin. Davali ili ne, u aplikaciji se ništa ne mijenja.
  **Zašto:** svaki način se otvara izvan Erevosa, u pregledniku ili novčaniku, samo kada ga dodirnete, pa Erevos sam
  ništa ne šalje i nikad ne zna ko je dao. PayPal zna ko daje; Monero ne pokazuje ni ko je dao ni koliko; Bitcoin ne
  pokazuje imena, ali je javno ono što je adresa primila.

Ovaj dio se otvara i iz **Postavke** → **Općenito** → **O Erevosu**.

## Prvi koraci {#start}

Erevos se preuzima s njegove stranice izdanja, po jedna datoteka za svaki sistem: pogledajte [Ažuriranja](#updates) za
to gdje i kako ga ažurirati. Radi na Androidu, na računaru (Linux, macOS i Windows), na Sailfish OS-u i, iz
preglednika, na iPhoneu. Ako ste novi, počnite s pozivnicom od nekoga ko ga koristi: jedan QR kod ili link, i već ste
unutra, s tom osobom kao kontaktom (pogledajte Pozivanje nekoga novog, pod [Razgovor preko relaya](#relay)).

Početni ekran je popis vaših razgovora, s onim u kojem se posljednje nešto desilo na vrhu. Svaki prikazuje sliku
kontakta, posljednju poruku s njenim oznakama, kada je stigla i koliko poruka te osobe niste pročitali. Sat pored njega
znači da njegove poruke nestaju. **Traži razgovore** pronalazi razgovor po imenu ili posljednjoj poruci, a ispod
razgovora i poruke koje sadrže ono što upišete, u svim razgovorima prostora: dodirnite jednu da se njen razgovor
otvori na njoj. U razgovoru, njegovi detalji imaju **Traži u ovom razgovoru**: ▲ i ▼ vode na ono što je pronađeno
ranije i kasnije. Obje pretrage traže samo na ovom telefonu: u onome što on čuva zapečaćeno, a **Traži u ovom
razgovoru** i u SMS porukama koje prikazuje razgovor s kontaktom; skriveni razgovori pretražuju se samo iznutra. Dug
razgovor otvara se na svojih posljednjih 100 poruka, a ranije poruke, među njima i one uvezene iz Telegrama ili
WhatsAppa, dolaze same dok listate prema gore (donosi ih i **Prikaži ranije poruke**, iznad njih); odlazak na neku
raniju poruku (iz pretrage, s poruke sa zvjezdicom ili na poruku na koju neka poruka odgovara) također je donosi.
Kad malo listate prema gore, dolje desno pojavljuju se dvije okrugle strelice, jednako u razgovoru, grupi i SMS
razgovoru: gornja vodi na početak razgovora, a donja nazad na njegov kraj. Od početka, **Prikaži kasnije poruke**,
ispod onoga što je prikazano, donosi još; pisanje poruke ili donja strelica vraćaju na kraj.

**Zašto:** dug razgovor se otvara na posljednjim porukama da bi se otvorio odmah: iscrtavanje cijelog razgovora
odjednom bilo bi sporo, naročito na starijim telefonima. Skriveni razgovori izostavljeni su iz pretrage početnog
ekrana kako bi početni ekran izgledao isto, imao prostor skrivene razgovore ili ne: njihove poruke mogu se čitati samo
dok ih njihov PIN drži otvorenima.

- **Slika** se iscrtava iz ključa kontakta: isti ključ uvijek daje iste boje i isti mjesec (u zelenim tonovima pod
  Matrixom), pa razgovor prepoznajete na prvi pogled, bez ikakve fotografije. To nije provjera ključa; to je
  [sigurnosni broj](#relay).
- **Linija ispod pretrage** kaže je li postavljen relay i je li vaš red spreman. Dodirnite je da ga postavite.
- **Razgovor sa sobom**, uvijek prvi među razgovorima, prikvačen, čuva vaše bilješke za sebe: pogledajte Razgovor sa
  sobom i podsjetnici ispod.
- **Matrix razgovori**, kad se prijavite na Matrix, nalaze se na listi s ostalima, najnoviji prvi, svaki označen
  **Matrix**, a pozivnica stoji na vrhu. Dugme **Matrix** pokazuje samo njih, i tamo **Novi razgovor** počinje
  Matrix razgovor: pogledajte [Matrix](#matrix).
- **Novi razgovor**, na dnu, otvara postavke relaya i dodavanje kontakta. **Podsjeti me**, narandžasto zvono pored
  njega, piše podsjetnik za vas.
- **Zelena slušalica i ljubičasta osoba** na vrhu, na Androidu, odmah otvaraju ekrane **Telefon** i **Kontakti**, u
  bojama njihovih ikona na početnom ekranu telefona. Nema ih i u meniju pod tri tačke.
- **Sve poruke**, **SMS** i **Erevos**, iznad razgovora kad postoje i SMS razgovori, prikazuju sve, samo SMS (s
  razgovorima čija je posljednja poruka bila SMS) ili samo Erevos razgovore, od svakog kontakta ono što je posljednje
  stiglo.
- **Widget**, na Androidu: dodajte Erevos iz widgeta svog početnog ekrana. Njegova četiri dugmeta otvaraju ekrane
  **Telefon**, **SMS**, Erevos **Poruke** i **Kontakti**, nakon lozinke kao i svaki link (Telefon i bez nje, ako to
  dozvolite). Iznad prva tri prikazuje koliko ima propuštenih poziva, nepročitanih SMS poruka i novih poruka, nikad od
  koga ni šta; s propuštenim pozivima **Telefon** se otvara na kartici **Nedavni**. Ponovo dodirnuto dugme ponovo
  prikazuje svoj ekran, i nakon što ste tamo izabrali drugu karticu. Njegove riječi prate jezik Erevosa. **Postavke**
  → **Izgled** → **Widget** određuje redoslijed njegovih dugmadi.
- **Narandžasti lokot** na vrhu odmah zaključava Erevos kad je postavljena lozinka, a kad nije, otvara postavke
  zaključavanja.
- **Tri tačke** otvaraju ostalo:

| U meniju | Šta otvara |
| --- | --- |
| **Nova grupa** | Grupni razgovor s vašim kontaktima. Pogledajte [Grupni razgovori](#groups). |
| **Javne grupe** | Grupu u koju svako ko ima njen link može zatražiti ulazak, s vlasnikom i adminima. Pogledajte [Javne grupe](#public-groups). |
| **Poruke sa zvjezdicom** | Poruke koje ste označili zvjezdicom, u svim vašim razgovorima. Pogledajte Meni poruke, pod Razgovor preko relaya. |
| **Telefoni u blizini** | Vaše kontakte preko Bluetootha i Wi-Fi Aware ili na istoj Wi-Fi mreži, bez interneta. Pogledajte [Razgovor s telefonom u blizini](#nearby). |
| **Korisnički vodič** | Ovaj vodič. |
| **Postavke · Settings** | Posljednji red, sa zupčanikom: sve što možete podesiti, u grupama, s pretragom. Pogledajte Postavke ispod. |

Unutar razgovora, njegovo ime i slika su na vrhu, s tim kako poruke putuju: **Šifrirano** (s kraja na kraj), **Na
mreži**, **U blizini** dok je telefon te osobe povezan s vašim preko radija, ili **piše…**, sa štopericom kad poruke
razgovora nestaju. Pored njih, plava pločica s kamerom pokreće videopoziv, a zelena sa slušalicom glasovni poziv.
Dodirnite ime ili **⋯** iza njih (**⋮** na Androidu) za **Detalji** razgovora: njegova slika (dodirnite je da je
promijenite), **Pozovi**, **Video**, **Preimenuj** i **Slika**, zatim **Poruke koje nestaju**, **Prikazuj me kao da
nisam na mreži**, **Izgled razgovora**, **Sigurnosni broj**, **Premjesti u skrivene razgovore** i **Obriši poruke**.
**Gotovo** ih zatvara.

**Mediji, linkovi i fajlovi**, u detaljima ispod **Traži u ovom razgovoru**, prikazuje sve što razgovor sadrži, svaku
vrstu na svojoj kartici s brojem stavki: **Fotografije** (u mreži), **Video snimci**, **Glasovne poruke**, **Muzika**,
**Fajlovi** i **Linkovi**, najnovije prve, ispod svojih mjeseci, zajedno s onima uvezenim iz Telegrama ili WhatsAppa.
Dodir otvara fotografiju ili datoteku da je pogledate ili sačuvate, pušta zvuk na licu mjesta ili otvara link nakon
pitanja; kad zadržite prst na stavci, svaka nudi **Prikaži u četu**, što vodi na njenu poruku. Na stavku koja još
nije preuzeta s relaya ide se u razgovoru, gdje je dodir preuzima. Kalendar na vrhu vodi na dan: označeni su dani koji
imaju nešto te vrste. **Idi na dan**, ispod njega u detaljima, isto radi za sam razgovor: vodi na prvu poruku tog dana.

**Zašto:** popisi se prave na ovom telefonu od onoga što on već čuva, pa nijedan server ne saznaje šta razgovor
sadrži; i čitaju se samo fotografije koje su na ekranu, kao u razgovoru, pa se razgovor s hiljadama fotografija
otvara jednako brzo kao razgovor bez ijedne.

Dobar prvi sat:

1. Otvorite **Postavke** → **Privatnost i sigurnost** → **Zaključavanje i druga lozinka** i postavite lozinku, kako
   niko ko uzme telefon ne bi mogao otvoriti Erevos.
2. Otvorite **Telefoni u blizini** iz menija na dva telefona koji su blizu jedan drugog i dozvolite ono što Android
   traži.
3. Dodajte jedno drugo pomoću **Prikaži moj QR kod**, kao u [Razgovor s telefonom u blizini](#nearby), i pošaljite
   poruku: ide u blizini, šifrirana s kraja na kraj, bez relaya i bez interneta.
4. Da biste razgovarali s veće udaljenosti, postavite relay kao u [Razgovor preko relaya](#relay).

### Razgovor sa sobom i podsjetnici

**Razgovor sa sobom** je uvijek na vrhu razgovora, prikvačen, u svakom prostoru. To je razgovor u kojem nema nikog
drugog: pišite sebi bilješke, linkove, fotografije, datoteke i glasovne poruke, kao u svakom razgovoru. Ništa iz njega
nikud ne ide: ostaje na ovom telefonu, šifrirano u prostoru, i ne prenosi se na vaše povezane uređaje. Rezervna kopija
uzima njegove bilješke i glasovne poruke, ali ne i fotografije i datoteke, kao i kod razgovora.

- **Podsjetnik:** dodirnite **Podsjeti me** (narandžasto zvono pored **Novi razgovor**), napišite na šta da vas
  podsjeti, izaberite vrijeme (**Za 1 sat**, **Večeras u 20:00**, **Sutra u 09:00** ili bilo koji dan, sat i minut) i
  dodirnite **Podsjeti me**. Ide u Razgovor sa sobom, sa zvonom i svojim vremenom. U razgovoru, **+** → **Podsjeti me**,
  ili zadržavanje prsta na strelici za slanje, i bilješci koju pišete daje vrijeme.
- **U zadano vrijeme**, na Androidu, telefon prikazuje obavijest, **Reminder** (ili **3 reminders**) – „Open Chat with
  myself to read it“, nikad ono što podsjetnik kaže, i kad je Erevos zatvoren i zaključan; kad je dodirnete, otvara
  Razgovor sa sobom, nakon lozinke. Dok ne otvorite razgovor, podsjetnik se prikazuje u njegovom redu na vrhu
  razgovora, s brojem, a u razgovoru s obojenim rubom; kad ga tamo vidite, nestaje i iz obavijesti. Na računaru, u
  web-aplikaciji ili s isključenim obavijestima, tamo ga vidite. Ako **Precizno vrijeme** nije dozvoljeno
  (**Postavke** → **Općenito** → **Dozvole**), Android ga može prikazati nekoliko minuta kasnije.
- **Zadržavanje prsta na bilješci** nudi **Kopiraj**, **Otvori** (fotografiju ili datoteku), **Podsjeti me**, ili
  **Promijeni podsjetnik** i **Bez podsjetnika**, te **Obriši**.
- Svaki prostor ima vlastiti Razgovor sa sobom, kao i svako mjesto skrivenih razgovora, na vrhu njihovog popisa
  (pogledajte [Skriveni razgovori](#hidden)). Podsjetnici skrivenog mjesta prikazuju se tamo kad ga njegov PIN otvori;
  telefon ih javlja u njihovo vrijeme samo dok je za to mjesto uključeno **Primanje dok su zatvoreni**, u istoj
  obavijesti. Novi PIN za mjesto, s kojim ono počinje prazno, ili uklonjeno mjesto, skida njegove podsjetnike s
  telefona.

**Zašto:** obavijest se na zaključanom ekranu prikazuje svakome ko drži telefon, zato ono što podsjetnik kaže ostaje
šifrirano u njegovom prostoru, a Androidu se kaže samo njegovo vrijeme: obavijest nikome ne može reći šta ste htjeli
zapamtiti, niti u kojem je prostoru. A bilješke ne idu nikome, čak ni vašim drugim uređajima, pa ih nijedan relay
nikad ne prenosi.

### Kretanje prevlačenjem

- **Nazad:** prevucite udesno bilo gdje na ekranu da se vratite nazad, kao što to radi strelica nazad. Okrugla strelica
  izlazi slijeva; pustite kad bude cijela, ili brzo povucite, i vraćeni ste. Ako pustite ranije, ostajete. U razgovoru
  radi ono što radi njegova strelica nazad: nazad na popis razgovora, ili izlaz iz skrivenih razgovora, koji se
  zatvaraju. U **Detalji** razgovora ih zatvara.
- **Kartice:** prevucite ulijevo ili udesno da pređete na susjednu karticu, kao kad dodirnete njeno dugme: **Sve
  poruke**, **SMS** i **Erevos** na početnom ekranu, **Tastatura**, **Nedavni** i **Favoriti** u ekranu **Telefon**,
  filteri u ekranu **Kontakti** i kompleti naljepnica.
- Na ekranu s karticama prevlačenje samo mijenja karticu, i na redovima njenog popisa, a iza prve ili posljednje
  kartice ne radi ništa: tamo se vratite strelicom nazad. SMS razgovor se arhivira ili briše zadržavanjem prsta na
  njemu.

### Postavke

**Postavke · Settings**, posljednji red menija (tri tačke), sadrži sve što u Erevosu možete podesiti, u grupama, kao
što to rade vlastite postavke telefona. Na drugim jezicima naziv je na tom jeziku i na engleskom, kao
**Einstellungen · Settings**, kako bi se pronašao i na jeziku koji ne znate čitati.

- **Pretraži postavke,** na vrhu, pronalazi postavku po početku njenih riječi, sa ili bez dijakritičkih znakova, i
  pokazuje gdje se nalazi, kao **Telefon i SMS › SMS**. Dodirnite je da je otvorite.
- **Jezik · Language,** red ispod pretrage, otvara popis jezika, pogledajte Jezik ispod.
- **Grupa** otvara popis svojih postavki, a postavka otvara svoj ekran. Postavka s dijelovima, kao **SMS**, navodi ih,
  i svaki dio se otvara zasebno.
- **Prikazuje se samo ono što ovdje radi:** na računaru, na Sailfish OS-u i u web-aplikaciji nema **Telefon i SMS**,
  Tora, Nostra ni LoRa, a grupa u kojoj ovdje nema šta da se podesi ne prikazuje se.

| Grupa | Šta sadrži |
| --- | --- |
| **Općenito** | **Jezik**, **Ažuriranja** i **Dozvole** (Android i web-aplikacija). Pogledajte Jezik ispod, i [Ažuriranja](#updates). |
| **Izgled** | **Stil i boje** (površina, staklo, stil, tema, boje i tekst na obojenim površinama, s pregledom), **Pozadina**, **Poruke** (oblik oblačića), **Ikone u pokretaču** (Android) i **Widget** (Android). Pogledajte [Izgled](#appearance). |
| **Obavijesti** | **U pozadini** (Android): primanje i zvonjenje dok je Erevos zatvoren, i obavijest o porukama. **Obavijesti dok je Erevos zatvoren** (web-aplikacija): Web Push. **Broj na ikoni**: koliko poruka nije pročitano, na ikoni Erevosa. Pogledajte [Na iPhoneu](#iphone). |
| **Privatnost i sigurnost** | **Zaključavanje i druga lozinka** (zaključavanje pri otvaranju Erevosa, lozinka, privatnost ekrana, otisak prsta ili lice, druga lozinka), **Skriveni razgovori** (PIN-ovi 4 mjesta) i **Ova web-aplikacija** (samo web-aplikacija). Pogledajte [Zaključavanje lozinkom](#lock), [Druga lozinka](#second) i [Skriveni razgovori](#hidden). |
| **Relay i mreže** | **Relay** (otvara **Novi razgovor** s otvorenim **Za napredne korisnike**), **Kućni relay**, **Tor** (Android), **Nostr** (Android), **LoRa radio** (Android) i **Matrix**. Pogledajte [Razgovor preko relaya](#relay), [Kućni relay](#home-relay), [Preko Tora](#tor), [Preko Nostra](#nostr), [Preko LoRa radija](#lora) i [Matrix](#matrix). |
| **Telefon i SMS** (Android) | **Telefon**, postavke aplikacije za telefon, iste kao **Telefon** → **Postavke**. **SMS**, u dijelovima: **Erevos kao SMS aplikacija**, **Pronađi Erevos na broju**, **Imena iz vaših kontakata**, **Arhiva, spam i otpad**, **Filter spama**, **Blokirani brojevi**, **Povlačenje SMS-a**, **Dvije SIM kartice** (samo s dvije SIM kartice) i **Novi SMS**. Pogledajte [Telefon](#phone) i [SMS](#sms). |
| **Podaci i uređaji** | **Rezervne kopije**, **Povezani uređaji** i **Uvezeni razgovori**. Pogledajte [Rezervne kopije](#backup), [Povezani uređaji](#devices) i [Uvezeni razgovori](#import). |
| **Za testiranje** | **Test relaya** i **Test radija** (Android). Pogledajte [Ekrani za testiranje](#tests). |

### Jezik

Erevos je na engleskom, grčkom, njemačkom, francuskom, španskom, italijanskom, portugalskom i srpskohrvatskom. Kad se
prvi put pokrene, prati jezik telefona ako je to jedan od ovih (telefon na srpskom, hrvatskom, bosanskom ili
crnogorskom pokreće se na srpskohrvatskom), a inače je na engleskom. Da ga promijenite, otvorite meni (tri tačke),
dodirnite **Postavke · Settings**, njegov posljednji red, a zatim prvi red tamo, **Jezik · Language**. Na drugim
jezicima oba su navedena na tom jeziku i na engleskom, kao **Einstellungen · Settings** i **Sprache · Language**.
Zatim dodirnite jezik, svaki naveden svojim riječima: **Ελληνικά**, **English**,
**Deutsch**, **Español**, **Français**, **Italiano**, **Português** ili **Srpskohrvatski**. Cijela aplikacija se
mijenja odmah.

- **Ovaj vodič** je takođe na svakom od ovih jezika i naziva dugmad onako kako ih aplikacija prikazuje na vašem. Na
  jezicima osim engleskog i grčkog, neka riječ nova u aplikaciji može se neko vrijeme prikazivati na engleskom, dok
  se ne prevede.
- **Čuva se na telefonu:** izbor se čuva na ovom telefonu, izvan svakog prostora, pa se i ekran za lozinku prikazuje
  na tom jeziku, i svaki prostor se otvara na njemu. Nije zapečaćen: ko god drži telefon može vidjeti koji ste jezik
  izabrali.
- **Androidove obavijesti** (dolazni poziv, nove poruke, Erevos koji prima u pozadini) su na grčkom kad je Erevos na
  grčkom, a na engleskom na svim ostalim jezicima.

## Razgovor s telefonom u blizini {#nearby}

Dok je prostor otvoren, na bilo kojem ekranu, Erevos traži druge Erevos telefone oko sebe, preko Bluetootha i, gdje
ga telefon ima, Wi-Fi Aware, te na Wi-Fi mreži na kojoj se nalazi, i telefone i računare. Nisu potrebni ni internet,
ni SIM kartica, ni Wi-Fi mreža. Prenosi poruke vašim kontaktima, šifrirane s kraja na kraj kao i one preko relaya.

1. Otvorite **Telefoni u blizini** iz menija na oba telefona. Prvi put Android traži dozvolu za pronalaženje uređaja u
   blizini (na Androidu 12 i starijem i za lokaciju); dozvolite to, inače se telefoni ne mogu pronaći.
2. Ako još niste kontakti, dodajte jedno drugo: na jednom telefonu dodirnite **Novi razgovor**, zatim **Prikaži moj QR
   kod** (pod **Počnite bez relaya** dok telefon nema relay), i skenirajte ga drugim, kao u [Razgovor preko
   relaya](#relay). Bez relaya kod sadrži samo vaše ključeve, i možete se povezati samo u blizini, dok ga ne budete
   imali.
3. Izaberite kontakt, pišite u traci za poruku na dnu i dodirnite strelicu za slanje. Kad telefon te osobe odgovori,
   na vrhu razgovora piše **U blizini**.

- **Dok je prostor otvoren:** veze se pokreću kad se prostor otvori, bez obzira na to koji je ekran prikazan, a
  prestaju kad se otvori drugi prostor: kad se zaključa, prostor nastavlja raditi iza ekrana za lozinku. Poruka iz
  blizine prikazuje se na početnom ekranu kao i poruka preko relaya, a i poziv tamo zvoni. Na Androidu veze ostaju
  aktivne i s Erevosom u pozadini, dok je **U pozadini** postavljeno na **Primaj i zvoni**. Da bi se tada štedjela
  baterija, telefone traži rjeđe: Wi-Fi Direct svakih deset minuta, Wi-Fi Aware jedan minut od svakih pet, a na istoj
  Wi-Fi mreži druge čuje dvadeset sekundi od svake dvije minute. Telefon u blizini tako može biti pronađen nekoliko
  minuta kasnije; aktivne veze ostaju aktivne, a čim je Erevos na ekranu, traži jednako često kao i prije.
- **Domet:** nekoliko desetina metara na otvorenom, manje kroz zidove.
- **Wi-Fi Aware:** brži, ali ga nemaju svi telefoni. Bluetooth radi na svima. Da ga zaustavite, isključite **Traži
  preko Wi-Fi Aware**, iznad **Pronađi Erevos na istoj Wi-Fi mreži**.
- **Ista Wi-Fi mreža ili hotspot:** telefoni na jednoj Wi-Fi mreži, ili na hotspotu jednog telefona, pronalaze jedni
  druge i komuniciraju direktno, čak i kad ta Wi-Fi mreža nema interneta; isto važi i za desktop aplikaciju. Ako
  Android pita da li da ostane na Wi-Fi mreži bez interneta, ostanite. Svi na toj Wi-Fi mreži mogu vidjeti da je tu
  neka Erevos aplikacija, ali ne i čija. Zaštitni zid (firewall) računara mora propuštati port 47905 (UDP i TCP). Da
  to zaustavite, isključite **Pronađi Erevos na istoj Wi-Fi mreži** pod **U blizini, bez interneta**, u ekranu **Novi
  razgovor**.
- **Vlastita Wi-Fi mreža (Android 10 i noviji):** bez zajedničke Wi-Fi mreže, dva Erevos telefona jedan blizu drugog
  prave vlastitu malu Wi-Fi mrežu (Wi-Fi Direct) i komuniciraju preko nje kao na istoj Wi-Fi mreži: brže nego preko
  Bluetootha, a poziv ide preko nje bez interneta. Ništa ne pita; svaki telefon, gdje može, ostaje i na svojoj Wi-Fi
  mreži. Svi u blizini mogu vidjeti da je tu Erevos telefon i mogli bi se pridružiti toj maloj Wi-Fi mreži, ali bi
  dobili samo zapečaćene bajtove. Potrebno je da je **Pronađi Erevos na istoj Wi-Fi mreži** uključeno; da zaustavite
  samo ovo, isključite **Napravi Wi-Fi mrežu s telefonima u blizini** ispod toga.
- **Na Samsung telefonu** **Traži preko Wi-Fi Aware** i **Napravi Wi-Fi mrežu s telefonima u blizini** su isključeni
  dok ih ne uključite: dok ih neka aplikacija koristi, Samsung traži da se isključi njegovo vlastito dijeljenje.
  Bluetooth i ista Wi-Fi mreža rade i bez njih.
- **Drugi telefoni u blizini** dobijaju samo zapečaćene bajtove koje ne mogu otvoriti, i to samo dok telefon vašeg
  kontakta nije poznat: od tada ono što šaljete ide samo njemu. Glasovne poruke idu samo kontaktu za kojeg se zna da je
  u blizini. Za fotografije i datoteke potreban je relay.
- **Uz relay,** svaka poruka ide i preko njega, pa se ništa ne gubi ako veza pukne; kopija koja stigne druga ne
  prikazuje se ponovo. Ako relay nije dostupan, važi kopija iz blizine.
- **Prenose ih drugi telefoni:** kad relay nije dostupan, a vaš kontakt nije u blizini, Erevos telefoni u blizini
  preuzimaju i vašu poruku, zapečaćenu za relay vašeg kontakta. Svaki je čuva najviše tri dana, predaje je najviše
  dvama drugim telefonima koje sretne i predaje je tom relayu preko vlastitog relaya čim može; isto radi i vaš. Ne mogu
  je čitati niti saznati od koga je i za koga: vide samo adresu relaya. Ostaje i kad se Erevos zatvori, zapečaćena na
  telefonu. Vaše ostaju u vašem prostoru i idu samo dok je on otvoren. Prenošenje za druge je isključeno dok ne
  uključite **Prenosi poruke za druge** pod **U blizini, bez interneta**, u ekranu **Novi razgovor**, i tada samo za
  relaye na internetu preko TLS-a (wss://): nepoznata osoba u blizini nikad ne može natjerati vaš telefon ili vaš
  relay da se obrate relayu na lokalnoj mreži ili na samom telefonu. Vaše vlastite poruke prenose telefoni u blizini
  koji to imaju uključeno.

**Zašto:** paket ne kaže za koga je, pa niko u blizini iz njega ne može saznati čiji je. Dok telefon vašeg kontakta ne
odgovori na nekoj vezi, ni vaš telefon ne može znati koji je od telefona u blizini njegov: zato kratki paketi idu
svima, svaki ih isproba, a od prvog koji ga otvori ta veza je veza vašeg kontakta. Glasovna poruka, u većim
dijelovima, čeka na to.

> Poruka iz blizine otvara se samo u prostoru koji ima taj kontakt. Poruka za neki drugi prostor ovog telefona čeka u
> memoriji, najviše šest sati, dok se taj prostor ne otvori. Skriveni razgovori nikad ne koriste vezu u blizini.

**Zašto:** veze u blizini pripadaju telefonu, a ne prostoru, i ništa na njima ne imenuje prostor: ono što stigne
isprobava se u razgovorima prostora koji je otvoren, a za ostale se neko vrijeme čuva u memoriji, nikad se ne
upisuje na telefon. Skriveni razgovori ih još ne koriste: to tek dolazi (pogledajte [Šta je danas
zaštićeno](#privacy)).

## Preko LoRa radija {#lora}

S Meshtastic LoRa radiom povezanim s telefonom preko Bluetootha, Erevos dopire do Erevosa s radiom na istoj mesh
mreži, kilometrima daleko, bez interneta: direktno ili preko Meshtastic radija između njih. Isključeno je dok ne
postavite radio, i samo na Androidu.

1. Prvo podesite radio u aplikaciji Meshtastic, prije svega njegovu **regiju**: bez nje ništa ne šalje. Zatim
   zatvorite aplikaciju Meshtastic ili u njoj prekinite vezu: radio se povezuje s jednom po jednom aplikacijom.
2. Otvorite **Postavke** → **Relay i mreže** → **LoRa radio**, dodirnite **Pronađi moj radio**, pročitajte šta piše i
   dodirnite svoj radio kad se pojavi. Radio koji još nije uparen traži svoj PIN: prikazuje se na ekranu radija, ili
   je 123456.
3. Vaš kontakt radi isto sa svojim, na istoj mesh mreži: ista regija i isti prvi kanal.
4. Pišite kao i uvijek. Kad relay nije dostupan i nijedan telefon nije u blizini, tekst ide preko LoRa veze, a linija
   ispod razgovora to i kaže.

- **Samo tekst, i to sporo:** poruka ide u dijelovima od oko 220 bajtova, svaki po sekundu-dvije u eteru, a zakon
  radiju dozvoljava samo ograničeno vrijeme emitiranja (u EU desetinu svakog sata). Zato LoRa prenosi samo tekstove i
  brisanja, i to samo kad to ništa drugo ne može. Glasovne poruke, fotografije i datoteke čekaju u razgovoru, označene
  s **Na čekanju**, i odlaze same čim ih relay ili telefon u blizini mogu preuzeti; i za pozive je potrebno jedno od
  toga. Prva poruka kontaktu traje duže, jer sadrži ključeve.
- **Oznake:** **✓✓** dolazi s njegovom sljedećom porukom, jer same oznake ne idu preko LoRa veze.
- **Svakom radiju u dometu:** svaku poruku čuje svaki radio u okolini, a Meshtastic radiji je prosljeđuju dalje, kao
  što to Meshtastic radi. Svaki Erevos je isproba; otvara je samo radio vašeg kontakta. Preko LoRa veze ništa se ne
  prenosi za druge.
- **Njegovo ime i lokacija:** Meshtastic radiji povremeno javljaju svoje ime svakom radiju u dometu, a i gdje se
  nalaze ako imaju GPS ili fiksnu poziciju, nešifrirano. Erevos to sprječava kod vašeg (**Skriveno**): postavlja mu
  ulogu Client hidden, isključuje GPS i uklanja fiksnu poziciju. I dalje odgovara radiju koji pita za njegovo ime, pa
  mu u aplikaciji Meshtastic dajte ime koje ništa ne govori o vama. **Javlja se svima u dometu** vraća ulogu i GPS,
  nakon upozorenja; fiksna pozicija ponovo se postavlja u aplikaciji Meshtastic. Ako radio ne zadrži postavke, LoRa
  ekran to kaže.
- **Ostaje povezan** dok Erevos radi, i sam se ponovo povezuje kad se radio vrati u domet. **Isključi LoRa** vraća
  radiju ulogu i GPS, ako je povezan, a zatim prekida vezu s njim i zaboravlja ga. Skriveni razgovori nikad ne idu
  preko LoRa veze.

**Zašto:** ono što Meshtastic radio kaže o sebi ide nešifrirano, svakome ko sluša kilometrima daleko: njegovo ime i
lokacija mogli bi otkriti gdje ste i povezati radio s vama, pa ga Erevos drži skrivenim osim ako ne izaberete drukčije.
A kako zakon radiju dozvoljava samo ograničeno vrijeme emitiranja, LoRa se čuva za vaše vlastite tekstove, kad ih
ništa drugo ne može prenijeti, nikad za ono što bi drugi telefoni htjeli da prenosi.

> LoRa radio se čuje kilometrima daleko, a njegov signal može se pratiti do mjesta gdje se nalazi, skriven ili ne. Ono
> što Erevos šalje ostaje šifrirano s kraja na kraj, ali svako s radiom može saznati da vaš radio šalje, kada i koliko.
> S postavkom **Javlja se svima u dometu**, svako s radiom može pročitati i njegovo ime i lokaciju.

## Razgovor preko relaya {#relay}

Relay je mali server koji čuva jednosmjerne redove: svaki telefon ima vlastiti red, a ko god ima njegov **link za
kontakt** može ubacivati poruke u njega. Relay ne čuva naloge, imena ni brojeve telefona i ne može čitati poruke: one
su šifrirane s kraja na kraj, a ključeve imaju samo dva telefona. Svaki telefon može koristiti vlastiti relay: poruka
kontaktu na drugom relayu zapečaćena je za njegov relay i predaje se vašem, koji je prosljeđuje dalje, pa relay te
osobe nikad ne vidi adresu vašeg telefona. Telefon bez relaya dobija mjesto na relayu svog kontakta, pogledajte **Bez
vlastitog relaya** ispod.

**Zašto:** s redovima i bez naloga nijedan server ne čuva popis ko koga poznaje i nikome ne treba vaš broj telefona ni
e-mail da bi vas dosegao: ko god ima vaš link za kontakt može pisati u vaš red, a čitate ga samo vi.

1. Na početnom ekranu dodirnite **Novi razgovor**. Na vrhu, **Kako ste sada povezani** jednostavnim riječima kaže kako
   vas kontakti dosežu: preko vašeg relaya, preko Nostra bez relaya ili samo u blizini. Ispod su načini ulaska za
   telefon koji još nema relay, ili, s relayem, **Dodaj kontakt** i **Vaš link za kontakt**. Vlastite postavke relaya
   su pod **Za napredne korisnike**, na dnu; **Postavke** → **Relay i mreže** → **Relay** otvara Novi razgovor s tim
   postavkama otvorenim.
2. Pod **Za napredne korisnike** upišite adresu u polje **Adresa relaya**: \`ws://<adresa računara>:7879\` za relay na
   vlastitoj mreži ili \`wss://relay.example.org\` za relay na internetu. Dodajte **Token** ako ga relay traži.
3. Dodirnite **Napravi moj red na relayu**. Erevos kaže **Red na relayu je napravljen**, a **Kako ste sada povezani**
   kaže **Preko vašeg relaya**: sve radi, tekstovi, fotografije, glasovne poruke, pozivi i grupe.
4. Pod **Vaš link za kontakt** dodirnite **Prikaži moj QR kod**: otvara se preko ekrana. Neka ga drugi telefon skenira
   kamerom, a zatim otvori link u Erevosu. Ekran **Dodaj kontakt** pokazuje šta sadrži: dodirnite **Dodaj u
   razgovore** samo ako ste ga sami skenirali. **Dodaj i poveži s jednim od mojih kontakata** također dodaje osobu,
   povezanu s kontaktom koji izaberete, čije ime razgovor preuzima.
5. Ako kamera te osobe prikazuje samo tekst, ili je daleko, dodirnite **Podijeli moj link za kontakt** i pošaljite
   joj ga. Ona ga zalijepi u polje pod **Dodaj kontakt** i dodirne **Dodaj**.
6. Ili obrnuto: pod **Dodaj kontakt** dodirnite **Snimi QR kod** na njenom ekranu, ili **Izaberi fotografiju QR
   koda** za snimak ekrana ili fotografiju koda koju vam je poslala. Erevos ga čita i odmah je dodaje. Na računaru,
   na Sailfish OS-u i u web-aplikaciji postoji samo **Izaberi fotografiju QR koda**; na iPhoneu nudi i kameru.
   Skriveni razgovori nemaju ni jedno ni drugo, jer fotografija napušta Erevos, što ih zatvara: tamo zalijepite
   njen link.

Novi razgovor pojavljuje se na početnom ekranu pod imenom **kontakt** i prvim znakovima ključa te osobe, dok ne dobije
ime: **Preimenuj** u njegovim detaljima daje mu ga. Odmah nakon što je ovdje dodate, **Poveži s jednim od mojih
kontakata** ispod obavijesti da je dodana omogućava vam da umjesto toga izaberete jedan od svojih kontakata (**Ne
sada** to preskače): razgovor preuzima ime tog kontakta, ako nema vlastito, a kartica kontakta prikazuje razgovor.
Skriveni razgovori nude samo vlastite kontakte, nikad kontakte telefona. Dovoljno je da jedan telefon doda drugi:
dodavanje linka pokreće šifrirani razgovor i drugom telefonu kaže kako da odgovori, pa on prikaže razgovor sljedeći
put kad pogleda svoj red, što radi svakih nekoliko sekundi.

**Šta relay vidi od razgovora:** svi vaši kontakti pišu u vaš jedan red. Kad svaki telefon dobije poruku od drugog,
svaka poruka između njih još jednom se zapečaćuje za telefon kojem ide, ključem koji je taj telefon dao unutar
razgovora, pa je za relay svaka od njih niz nasumičnih bajtova jedne od nekoliko veličina i iz njih ne može saznati
kojem razgovoru pripadaju. Prva poruka razgovora, i sve poslane prije nego što stigne odgovor, to i dalje otkrivaju.
Relay i dalje vidi s koje adrese stiže svaka poruka, i kada. A svaka relayu, u jednom bajtu koji on čita, kaže šta
nosi: poruku koju neko čita, riječ između telefona (da je poruka stigla ili pročitana, kucanje, prisutnost na mreži,
reakcije, novi ključevi) ili poziv koji zvoni. Tako relay vidi koje su poruke, i kada počinje poziv, bez obzira na to
jesu li obavijesti uključene ili ne: tako obavijest zatvorene web-aplikacije može da ih broji, kao i obavijest
zatvorenih skrivenih razgovora.

### Načini ulaska na relay

Relay koji traži token pušta telefon na tri načina. Svaki način završava se vlastitim tokenom telefona na relayu, pa
onaj ko vodi relay može ukloniti bilo koji pojedinačni telefon.

- **Pozivnica:** QR kod ili link s telefona koji je već na relayu (pogledajte Pozivanje nekoga novog ispod). Ništa se
  ne upisuje, a odmah ste kontakti.
- **Nalog:** **Prijava preko LPHL**, kad je relay nudi (pogledajte Prijava na relay ispod). Može svaki LPHL nalog, na
  najviše 10 telefona.
- **Token relaya:** jedan zajednički token za sve, od onoga ko vodi relay, upisan pod **Token**. Erevos ga odmah, sam,
  mijenja za vlastiti token telefona, nazvan tamo onako kako sebe nazivate u pozivnicama (\`phone\` ako niste dali
  ime), to kaže i od tada koristi samo njega. Tako i ovaj telefon može pozivati. Potreban je relay koji prima
  pozivnice, noviji od Erevosa 3.1.0; sa starijim, ili s relayem koji ne prima pozivnice, telefon zadržava token
  relaya i ne može pozivati.
- **Ograničenja:** telefon može imati 5 pozivnica na čekanju istovremeno i napraviti 10 dnevno (dan po UTC-u); svaka
  je za jedan telefon i traje 7 dana. Relay putem pozivnica pušta ukupno 100 telefona, računajući i pozivnice koje još
  čekaju, osim ako je njegov operater izabrao drukčije. Telefoni koji su došli s nalogom ili s tokenom relaya ne
  računaju se u tih 100: relay daje vlastiti token za 50 telefona dnevno koji su došli s njegovim tokenom, a nalog ima
  10 telefona. Relay istovremeno opslužuje 512 veza, ma čije bile, osim ako je njegov operater izabrao drukčije.
- **Uklanjanje telefona:** onaj ko vodi relay briše njegov red u datoteci tokena relaya: telefon više ne može koristiti
  relay, kao ni telefoni koje je pozvao. Ako je ikad imao token relaya, mijenja se i taj token, pa se telefon s njim ne
  može vratiti. Telefoni s vlastitim tokenima nastavljaju kao i dosad: novi token treba samo telefonu na kojem je još
  upisan stari (koji od tada nije otvaran, ili sa starijim Erevosom).
- **Skriveni razgovori** zadržavaju token relaya koji je za njih upisan: kad bi se zamijenio u istom trenutku kao i
  token prostora, relay bi vidio da pripadaju ovom telefonu. Kad se token relaya promijeni, upišite novi pod njihovim
  **Za napredne korisnike**.

**Zašto:** relay svakoj vezi daje vlastitu nit, pa istovremeno opslužuje samo ograničen broj veza; i dnevno dodaje
samo ograničen broj redova za telefone koji su došli s njegovim jednim tokenom, pa token koji je otišao gdje ne treba
ne može napuniti njegovu datoteku tokena.

### Pozivanje nekoga novog

Jedan QR kod ili link dovodi nekoga novog: njegov telefon ulazi u Erevos na vašem relayu, s vlastitim pristupom, bez
ikakvog upisivanja, a vi ste odmah kontakti jedno drugom, bez zahtjeva za razgovor.

- **Da pozovete:** u razgovorima, bez izabranog kontakta, dodirnite **Pozovite nekoga**. Upišite za koga je (ime te
  osobe u vašim razgovorima) i, ako želite, **Vaše ime, za tu osobu**, pa dodirnite **Napravi pozivnicu**. Otvara se
  QR kod: kad Erevos bude na njenom telefonu, ona ga skenira kamerom i otvori link u Erevosu, ili dodirnite **Podijeli
  pozivnicu** i pošaljite joj link. Pozivnica je za jednu osobu, na 7 dana, ili kraće ako pozivnica za relay ističe
  ranije. Ko je prvi iskoristi, njegova je, pa je dajte samo toj osobi.
- **Da se pridružite:** na telefonu koji još nema relay, **Novi razgovor** prikazuje **Odaberite kako ćete početi**:
  dodirnite **Imam pozivnicu**. Skenirajte pozivnicu kamerom i otvorite link u Erevosu, ili dodirnite **Fotografišite
  pozivnicu** ili **Izaberite fotografiju pozivnice**, ili zalijepite link i dodirnite **Pridruži se**. Link otvara
  **… vas poziva u Erevos**: dodirnite **Pridruži se** samo ako je stigao od te osobe. Erevos uzima vlastiti pristup
  njenom relayu i red na njemu, dodaje je i kaže **Dobro došli u Erevos**. Njegova prva poruka javlja to njenom
  telefonu, koji odmah dodaje ovaj kao kontakt, pod imenom koje je ta osoba upisala.
- **Umjesto toga, s nalogom:** **Prijava preko LPHL**, drugi način ulaska, prijavljuje ovaj telefon na LPHL-ov relay s
  LPHL nalogom, u pregledniku (pogledajte Prijava na relay ispod); zatim dodajte svoje kontakte putem njihovih
  pozivnica ili linkova. Treći, **Počnite bez relaya**, nalazi se u Bez ikakvog relaya, pod Preko Nostra. **Za
  napredne korisnike** sadrži postavke relaya, kao u koracima od 1 do 6 iznad.
- **Šta vaš relay mora dozvoliti:** vlastiti pristup je pozivnica na vaš relay (pogledajte Pozivnice na relay ispod),
  pa dolazi samo s telefona koji ima vlastiti token na relayu koji prima pozivnice. Računa se među vaše pozivnice, pod
  imenom koje ste upisali za tu osobu, i nestaje s vašim. Telefon s jednim zajedničkim tokenom relaya prvo ga mijenja
  za vlastiti (pogledajte Načini ulaska na relay iznad); tamo gdje relay to ne radi, ne pravi pozivnicu: prvo se
  prijavite na relay (ispod polja **Token**, pod **Za napredne korisnike**) ili uzmite pozivnicu za njega. Kad vaš
  relay ne prima pozivnice, pozivnica vas ipak čini kontaktima, a telefon te osobe koristi vaš relay samo onako kako
  to dozvoljava vaš link za kontakt, kao u Bez vlastitog relaya ispod.
- **Telefon koji već ima relay** zadržava svoj: pozivnica vas samo dodaje, a odmah ste kontakti svejedno.
- **Šta se čuva:** vaš telefon čuva tajnu svake pozivnice i ime za tu osobu, zapečaćene u prostoru, dok se ne
  iskoristi ili ne isteknu njenih 7 dana, najviše 20 istovremeno. Od toga na relayu nema ništa osim pozivnice za
  relay.
- **Putem SMS-a, nekome ko još nema Erevos:** na Androidu, kartica kontakta koji nije u Erevosu ima **Pozovi putem
  SMS-a**. Piše SMS na njegov prvi broj s kratkim linkom, u SMS aplikaciji (Erevosovoj kad je on SMS aplikacija
  telefona), a vi odlučujete hoćete li ga poslati. Stranica linka na LPHL-ovom web serveru nudi toj osobi Erevos
  (Android aplikaciju ili web-aplikaciju na iPhoneu), a zatim u njemu otvara pozivnicu; u web-aplikaciji na iPhoneu
  ona zalijepi link pod **Imam pozivnicu**. Dodirne **Pridruži se**: njen telefon ulazi na vaš relay kao iznad i
  preko njega odgovara vašem, koji je dodaje, povezanu s tim brojem i pod imenom s kartice. Njegova prva poruka, koja
  ide sama, čini vas njenim kontaktom, pod imenom kojim ste sebe nazvali u svojoj posljednjoj pozivnici. Pozivnica
  slijedi iza znaka **#** u linku, koji se ne šalje nijednom web serveru, ali telefonska kompanija vidi SMS, kao i
  svaki SMS: zato je pozivnica za jednu osobu, na dva dana, a kad ta dva dana isteknu, a nijedan telefon je nije
  iskoristio, vaš telefon povlači svoju pozivnicu za relay. Potreban je relay koji vašem telefonu dozvoljava da
  poziva, kao iznad.

### Bez vlastitog relaya

Telefon bez relaya svejedno razgovara preko interneta: kad doda link kontakta čiji relay posuđuje mjesta, uzima mjesto
na njemu, bez tokena.

- **Kako:** dodajte njegov link kao u koracima 4 i 5, bez ičega pod **Relay**. Erevos kaže da sada imate mjesto na
  relayu te osobe, posuđeno putem njenog linka, i od tada ga koristi kao vlastiti: vaš vlastiti link ga navodi, pa i
  drugi tamo dopiru do vas.
- **Ko posuđuje:** vaš link nosi kartu za mjesto na vašem relayu samo kad uključite **Podijeli mjesto na mom relayu s
  ovim linkom**, pod **Vaš link za kontakt** u ekranu **Novi razgovor**, i to samo za link koji je tada prikazan:
  sljedeći put kad se razgovor otvori, ponovo je isključeno. Relayu je potreban ključ za slanje u dva skoka, a
  posuđuje tek kad onaj ko ga vodi uključi posuđivanje; on može i povući mjesta neke karte. Karta traje 30 dana i daje
  najviše četiri mjesta. Svako ko vidi link s kartom može s njom uzeti mjesto, pa takav link dajte samo onome kome ste
  ga namijenili.
- **Šta posuđeno mjesto ne radi:** poruke kontaktima na drugim relayima idu direktno na njihov relay, koji tada vidi
  adresu vašeg telefona. Ne čuva ništa za kasnije (poruka poslana kasnije čeka na telefonu), ne daje relay za pozive
  (pozivi idu direktno između telefona) i pravi najviše još 4 reda i šalje najviše 50 MB datoteka dnevno. Vaš link ne
  posuđuje ništa dalje.
- **Umjesto toga, vlastiti relay:** upišite njegovu adresu pod **Relay**: posuđeno mjesto se oslobađa, a kontakti
  saznaju novu adresu iz vaše sljedeće poruke.
- **Link bez karte** (sa starijeg relaya ili Erevosa): relay kojem ne treba token koristi se onakav kakav je; inače
  se možete povezati samo u blizini, dok ne budete imali relay.

**Zašto:** link s kartom je ključ za vaš relay za svakoga ko ga vidi, pa vaš link nosi kartu samo kad vi to izaberete,
za link koji je tada prikazan, a relay posuđuje tek kad to dozvoli onaj ko ga vodi. Datoteke posuđenog mjesta
ograničene su na nekoliko fotografija i glasovnih poruka dnevno, pa nikad ne zauzimaju cijelu memoriju relaya.

### Pozivnice na relay

Telefon s vlastitim tokenom na relayu koji prima pozivnice može dozvoliti još jednom telefonu da koristi taj relay,
s vlastitim tokenom tog telefona, pa se nijedan token ne upisuje niti prosljeđuje.

- **Da pozovete:** pod **Za napredne korisnike** u ekranu **Novi razgovor**, ispod polja **Token**, dodirnite **Pozovi
  na relay**, upišite za koga je i dodirnite **Napravi pozivnicu**. Otvara se QR kod: neka ga telefon te osobe
  skenira kamerom i otvori link u Erevosu, ili dodirnite **Podijeli pozivnicu** i pošaljite joj je. Vrijedi za jedan
  telefon 7 dana, a ko je prvi iskoristi, njegova je, pa je pokažite samo toj osobi.
- **Da je prihvatite:** link otvara **Pozivnica za relay**, s adresom relaya: dodirnite **Koristi ovaj relay** samo
  ako je stigla od nekoga koga poznajete. U Erevosu, **Snimi QR kod** i **Izaberi fotografiju QR koda** pod **Dodaj
  kontakt** čitaju i pozivnicu, a njen link može se zalijepiti u tamošnje polje. Erevos pravi token za ovaj telefon,
  čuva ga s adresom relaya samo u ovom prostoru, pravi vaš red na relayu i kaže ime koje je relay dao telefonu. Ako
  telefon koristi drugi relay, prvo pita, a kontakti saznaju vaš novi red iz vaše sljedeće poruke. Erevos prima
  pozivnicu za wss:// relay, ili za ws:// relay samo na kućnoj mreži (kao \`ws://192.168.1.10:7879\`). Skriveni
  razgovori ne primaju pozivnice.
- **Vaše pozivnice:** navedene ispod dugmeta, na čekanju ili u upotrebi. **Povuci** povlači pozivnicu koja još čeka,
  ili odmah isključuje telefon koji ju je uzeo, kao i telefone koje je on zatim pozvao.
- **Dok god i vaš:** telefon koji ste pozvali koristi relay samo dok to smije i vaš. Kad vaš red nestane, jer ga je
  povukao telefon koji vas je pozvao, nalog s kojim ste se prijavili više ne smije koristiti relay, ili vas je
  operater uklonio, nestaju i redovi telefona koje ste pozvali, kao i telefona koje su oni pozvali. Ponovna prijava na
  vašem telefonu ih zadržava.
- **Šta relay čuva:** ime koje ste upisali, latiničnim slovima (Μαρία postaje \`maria\`), da ste vi pozvali taj
  telefon, i otisak njegovog tokena, a ne token. Onaj ko vodi relay to vidi i može ukloniti bilo koji telefon s njega.
  Telefon može imati 5 pozivnica na čekanju istovremeno i napraviti 10 dnevno, a relay putem pozivnica pušta samo
  ograničen broj telefona (100, osim ako je njegov operater izabrao drukčije).
- **Ko može pozivati:** telefon s vlastitim tokenom, na relayu čiji je operater uključio pozivnice (pogledajte
  [Vlastiti relay](#own-relay)). Telefon s jednim zajedničkim tokenom relaya prvo ga mijenja za vlastiti (pogledajte
  Načini ulaska na relay iznad). S posuđenim mjestom nema **Pozovi na relay**.

**Zašto:** relay čuva samo otisak svakog tokena, nikad sam token, pa njegova datoteka nikome ne govori kako da se
poveže. A pozivnica navodi wss:// relay, ili ws:// relay kod kuće, pa nikad ne može poslati zahtjeve vašeg telefona
preko interneta nešifrirano.

### Prijava na relay

Relay može dozvoliti telefonima da se prijave nalogom kojem njegov operater vjeruje, kao što je LPHL, za vlastiti
token, bez ikakvog upisivanja u Erevosu.

- **Da se prijavite:** upišite adresu relaya pod **Relay**. Kad relay to nudi, ispod polja **Token** prikazuje se
  **Prijava preko LPHL**. Dodirnite to: preglednik otvara stranicu za prijavu, gdje upisujete svoje ime i lozinku,
  koje Erevos nikad ne vidi. Stranica relaya zatim prikazuje šest cifara. Natrag u Erevosu, koji vas odmah stavlja u
  **Kôd sa stranice**, upišite ih tamo i dodirnite **Završi prijavu**: telefon čuva svoj token s adresom relaya samo u
  ovom prostoru i pravi vaš red na relayu. Kôd upisujte samo u Erevos na vlastitom telefonu i nikome ga ne dajte, čak
  ni ako vas pitaju: ko god ga upiše, koristi relay kao vi. Nakon 5 pogrešnih kodova prijava je gotova: prijavite se
  ponovo. Erevos otvara samo stranicu za prijavu na vlastitoj adresi relaya, preko https-a.
- **Ponovna prijava** na istom telefonu zamjenjuje njegov red na relayu, ako je njegov token onaj koji je dobio od tog
  relaya. Svaki telefon dobija vlastiti red, najviše 10 za jedan nalog.
- **Šta vide relay i LPHL:** relay red telefona imenuje po vašem korisničkom imenu (\`lphl:nekten\`), a svakog sata
  pita LPHL smije li ga nalog još koristiti: kad se nalog zatvori ili onemogući, ili se LPHL ne može pitati 3 dana, red
  nestaje i telefon više ne može koristiti relay, kao ni telefoni koje je pozvao. LPHL vidi svaku prijavu i ove
  provjere, ali ništa od vaših prostora, razgovora ili kontakata. Prijava iz drugog prostora istim nalogom pokazuje
  relayu da su oba vaša.
- **Skriveni razgovori** se ne prijavljuju.

**Zašto:** stranica prikazuje kôd, a vi ga upisujete u Erevos, a ne obrnuto, pa link za prijavu koji vam neko drugi
pošalje toj osobi ne donosi ništa: kôd vidi samo onaj ko se prijavio, a pet pogrešnih završava prijavu. Erevos otvara
stranicu za prijavu samo na vlastitoj adresi relaya, preko https-a, pa ništa što odgovara umjesto relaya ne može vas
poslati na stranicu negdje drugdje. A pružalac usluge koji se neko vrijeme ne može pitati ne isključuje odmah nijedan
telefon: to čine tek 3 dana bez valjanog odgovora.

### Vlastiti ključ relaya

Kad Erevos zna ključ vašeg relaya (pita relay prvi put, ili ga daje link za kontakt), svaka veza s tim relayem počinje
provjerom: relay mora dokazati da ima taj ključ, a token i sve nakon njega idu šifrirani za taj ključ, unutar
vlastitog šifriranja veze (TLS). Pod **Kako ste sada povezani** Erevos tada kaže da je vaš relay dokazao svoj ključ.
Od tada ovaj prostor nikad ne pristupa tom relayu bez provjere.

- Relay stariji od ove aplikacije ništa ne dokazuje: radi kao i prije, a **Kako ste sada povezani** kaže da je
  stariji. Erevos pokušava ponovo svakog sata.
- Relay koji ne može dokazati ključ koji Erevos čuva za njega ne dobija ništa, a vaše poruke čekaju; **Kako ste sada
  povezani** to kaže crvenim slovima. Samo ako vam je njegov operater rekao da ima novi ključ, dodirnite **Ima novi
  ključ**: Erevos tada uzima ključ koji relay sljedeći put da.

**Zašto:** certifikat veze kaže samo da onaj ko odgovara ima certifikat za ime relaya, a kompanija koja izdaje
certifikate može ga dati i nekom drugom, greškom ili pod prisilom. Vlastiti ključ relaya nalazi se samo na njegovom
serveru, pa niko između ne može da se predstavi kao relay, a obnovljeni certifikat ništa ne mijenja.

### Sigurnosni broj

Otvorite razgovor, dodirnite njegovo ime, a zatim **Sigurnosni broj**. Oba telefona prikazuju istih 60 cifara za vas
dvoje. Uporedite ih uživo ili u pozivu: ako se podudaraju, niko nije između. Ako se razlikuju, ne vjerujte tom
razgovoru i ponovo dodajte link, skeniran s telefona te osobe. Kad ta osoba poveže uređaj, broj kaže i kada se popis
njenih uređaja posljednji put promijenio: vaše poruke idu i na svako mjesto s tog popisa, pa ako ona tada nije
povezala ili odvojila uređaj, pitajte je.

### Poslano, stiglo i pročitano

Ispod svake vaše poruke kontaktu, **✓** kaže da ju je preuzeo relay ili telefon u blizini, **✓✓** da je stigla na
telefon te osobe, a **✓✓✓** da ju je pročitala. Njen telefon to javlja vašem, unutar šifriranja, sljedeći put kad
svaki od njih pogleda relay, ili odmah kad su u blizini. Poruka se računa kao pročitana čim se njen razgovor prikaže
na ekranu.

- **Šalje se…:** u trenutku kad pritisnete Pošalji, telefon kratko zavibrira, polje se isprazni i poruka se prikaže,
  označena sa **Šalje se…** dok je ne preuzme relay ili telefon te osobe. Ako ne može otići i ne može čekati, njene
  riječi se vraćaju u polje.
- **Na čekanju:** poruka koju ništa nije moglo preuzeti, jer relay nije dostupan, a telefon te osobe nije u blizini,
  ostaje u razgovoru označena s **Na čekanju** i odlazi sama, redom, čim je relay ili telefon te osobe u blizini može
  preuzeti, dok je neki prostor otvoren; tada prikazuje **✓**. Tekst odmah čeka. Glasovna poruka, fotografija ili
  datoteka prvo pita: **Neka čeka** ili **Obriši je**. Poruka na čekanju briše se samo na ovom telefonu. U skrivenim
  razgovorima i ona čeka, ali ide samo preko njihovog relaya, nikad na telefon u blizini ili preko LoRa veze: dok su
  otvoreni, ili, s uključenim **Primanje dok su zatvoreni**, dok je prostor otvoren. Kad je red kontakta na relayu
  pun, tekst, glasovna poruka, fotografija ili datoteka ipak ide na njegove povezane uređaje, ako ih ima, prikazuje se
  kao poslana i ponovo se pokušava poslati na njegov telefon dok su skriveni razgovori otvoreni: ako se zatvore prije
  nego što je otišla, njegov telefon je nikad ne dobija.
- **Pošalji kasnije:** zadržite prst na strelici za slanje i izaberite **Kasnije…**, ili dodirnite **+**, a zatim
  **Pošalji kasnije**. Izaberite vrijeme jednim dodirom (**Za 1 sat**, **Večeras u 20:00**, **Sutra u 09:00**) ili
  dan, sat i minute, do godinu dana unaprijed, pa **Pošalji kasnije**. Poruka ostaje u razgovoru označena sa
  **Zakazano** i svojim vremenom. Ide šifrirana na relay, koji je čuva i šalje u to vrijeme, čak i ako je ovaj telefon
  tada isključen ili zaključan, a telefon te osobe je prikazuje od tog vremena, ne ranije. Ako sada nijedan relay nije
  dostupan, čeka na ovom telefonu i ide na relay čim neki bude dostupan. Ako ništa niste upisali, vrijeme koje
  izaberete važi za sljedeću fotografiju, datoteku ili glasovnu poruku: fotografija ili datoteka odmah ide na vaš relay
  i ostaje tamo dok je ta osoba ne preuzme, najviše 14 dana nakon svog vremena. I skriveni razgovori to imaju, na isti
  način, preko svog relaya. Do njenog vremena obrišite je da biste je povukli s relaya, i nikad neće otići. Ako se red
  te osobe na relayu prije toga promijeni, Erevos je ponovo zadržava za novi red sljedeći put kad dođe do relaya. S
  vlastitim tokenom ovog telefona ide samo ako telefon tada još ima svoj red na tom relayu. Poruka bez zvuka ostaje bez
  zvuka. Relay od prije ovoga ne čuva ništa za kasnije: tada poruka čeka na ovom telefonu i ide u svoje vrijeme dok
  Erevos radi, i u pozadini dok je **U pozadini** postavljeno na **Primaj i zvoni** (ispod), ili kad se Erevos sljedeći
  put otvori.
- **Slanje bez zvuka:** zadržite prst na strelici za slanje i izaberite **Bez zvuka**: telefon te osobe prikazuje
  obavijest bez zvuka i vibracije. Erevos od prije ovoga to ne zna i oglašava se kao i obično, kao i Erevos kao
  web-aplikacija, čija obavijest dolazi iz preglednika. Isto tako i obavijest zatvorenog mjesta skrivenih razgovora s
  uključenim **Javi kad stigne poruka**, i zatvorenog prostora s **I dok je otvoren drugi prostor**: oni relay pitaju
  samo koliko ih je stiglo, a on ne može razlikovati poruku bez zvuka od druge, jer to kaže samo šifrirana poruka.
- **Linkovi:** web adresa u poruci je podvučena. Dodirnite je i Erevos je prikazuje cijelu, da je otvorite u
  pregledniku samo ako je to mjesto na koje želite ići. Prije toga se ništa ne preuzima.
- **Dijeljenje iz druge aplikacije** (Android): u opciji **Dijeli** druge aplikacije, kao u pregledniku za stranicu,
  izaberite **Erevos**. Kad je prostor otvoren, **Pošalji u** navodi razgovore, grupe i SMS razgovore koje je početni
  ekran posljednje prikazao, zatim sve ostale razgovore i grupe, s pretragom; nikad skrivene razgovore. Riječi i
  linkovi otvaraju se u polju za poruku onog koji izaberete, da ih tamo pročitate i pošaljete; fotografija ili
  datoteka (najviše 100 MB) ide čim se taj razgovor ili grupa otvori, fotografija u kvalitetu koji ste izabrali za
  fotografije, i nikad kao SMS. Do tada njena kopija čeka u Erevosovom vlastitom prostoru za pohranu na telefonu i
  nestaje kad se pošalje, ili kad napustite **Pošalji u**.
- **Vide kada čitate:** vaš telefon to javlja telefonu te osobe, kao što njen javlja vašem, osim ako se u tom
  razgovoru prikazujete kao da niste na mreži (ispod).
- **Kad poruke stižu:** Erevos gleda relay svakih nekoliko sekundi dok je otvoren i otključan, na bilo kojem ekranu, a
  početni ekran sam pomjera razgovor na vrh. Na Androidu se svaka nova poruka oglašava zvukom, s obaviješću koja kaže
  samo koliko ih je stiglo, i dok je Erevos na ekranu; u razgovoru ili grupi otvorenoj na ekranu svira samo zvuk, a
  otvaranje razgovora skida s broja ono što je tamo stiglo. Kucanje, kao ni to da je poruka stigla ili pročitana, ne
  daju nijednu. Na Androidu se to nastavlja i u pozadini, dok je **U pozadini** postavljeno na **Primaj i zvoni**
  (ispod): tamo čeka na relayu dok nešto ne stigne, po minut, umjesto da pita svakih nekoliko sekundi, i ne pita više
  ništa kad ništa nije stiglo, pa baterija traje, a obavijest kaže samo koliko je poruka stiglo. Zatvoren, zaključan
  ili inače dugo u pozadini, to ne radi: poruke čekaju na relayu, do 14 dana, i stižu kad se Erevos ponovo otvori.
  Pitanje relayu bez odgovora na vrijeme (čekanje tamo svoj minut i još pola minute, sve ostalo 45 sekundi, dio
  datoteke 2 minute) računa se kao neuspjelo i postavlja ponovo, pa veza koja je usput prekinuta, kao kad mreža
  telefona zaspi ili se promijeni, ništa ne zadržava.

### Na mreži, i prikazivanje kao da niste na mreži

Dok je razgovor s kontaktom otvoren na vašem ekranu, Erevos s vremena na vrijeme pita telefon te osobe je li razgovor
otvoren i javlja da je vaš otvoren. Ako je njen otvoren, razgovor ispod njenog imena kaže **Na mreži** sa zelenom
tačkom, a početni ekran prikazuje tačku na njenoj slici. Pisanje nekome također vas njemu prikazuje kao da ste na
mreži dvije minute. Sve to ide unutar šifriranja, samo između vas i tog kontakta: relay s vremena na vrijeme vidi
poruku, kao i kod svakog razgovora. Nema „posljednji put viđen“.

Dok pišete kontaktu koji je prikazan na mreži, njegov razgovor prikazuje **piše…** ispod vašeg imena nekoliko sekundi,
a vaš ispod njegovog kad on piše. To se javlja najviše svakih nekoliko sekundi, samo dok je prikazan na mreži, nikad
zahtjevu za razgovor, i ne u grupama.

**Zašto:** prisutnost na mreži javlja se samo između vas i kontakta čiji je razgovor otvoren, unutar šifriranja, pa
relay ne vidi ništa više od poruke s vremena na vrijeme između dvoje ljudi koji razgovaraju, i ništa od toga se ne
čuva: zato nema „posljednji put viđen“ za prikaz. Neko ko ima samo vaš link i piše kao zahtjev za razgovor ne dobija
nikakav odgovor dok ga ne prihvatite: ni da ste pročitali, ni da ste na mreži ili da pišete.

Da to sakrijete od jednog kontakta, otvorite njegov razgovor, dodirnite njegovo ime, a zatim **Prikazuj me kao da
nisam na mreži**. Kad je to uključeno:

- **Ne vidi vas na mreži**, ni da pišete, a vaš telefon mu ništa ne šalje dok čitate.
- **Njegove poruke ostaju ✓** na njegovom telefonu, a ne ✓✓ ili ✓✓✓, dok ih čitate.
- **Kad mu pišete**, prikazujete se na mreži dvije minute, a svaka njegova poruka koju ste pročitali odmah postaje
  ✓✓✓.
- **Ni vi ne vidite njega na mreži**, jer vaš telefon ne pita.

Postavlja se za svaki razgovor posebno, samo na ovom telefonu. Isključite to ponovo i on vidi šta ste pročitali kad
sljedeći put pogledate relay.

### Imena i brisanje

Otvorite razgovor, dodirnite njegovo ime, a zatim **Preimenuj** da mu date ime. Ime ostaje na ovom telefonu,
zapečaćeno s razgovorom: drugi telefon ga ne vidi. Prazno ime vraća početak ključa te osobe, osim ako je s njom
povezan neki od vaših kontakata: tada ona ponovo preuzima njegovo ime sljedeći put kad se njegova kartica otvori, dok
veza ostaje (pogledajte [Kontakti](#contacts)).

Dodirnite njegovo ime, a zatim **Slika** da toj osobi date sliku po vlastitom izboru, znak na boji, umjesto one
iscrtane iz njenog ključa. Ili dodirnite **Fotografija** (ili **Snimi fotografiju**) za fotografiju: izrezanu u
kvadrat, smanjenu i ponovo iscrtanu, pa se ne čuva ništa što je govorila osim same slike (mjesto, telefon), a zatim
zapečaćenu u vlastitoj datoteci. I ona ostaje na ovom telefonu i ulazi u rezervne kopije; **Slika iz ključa** vraća
iscrtanu.

Svaki razgovor može imati i vlastiti izgled: dodirnite njegovo ime, a zatim **Izgled razgovora** za iste izbore kao u
**Izgled** (stil, tema, boje, pozadina, poruke), samo za taj razgovor. Kao i ime, ostaje na ovom telefonu, zapečaćen s
razgovorom. **Kao u aplikaciji** mu ponovo daje izgled aplikacije.

Da biste razgovor sačuvali izvan Erevosa, dodirnite njegovo ime, a zatim **Izvezi razgovor**: njegove poruke idu u
tekstualnu datoteku, svaki dan pod svojim datumom i svaka poruka sa svojim vremenom i autorom, sačuvanu u folderu
koji izaberete (na računaru, gdje izaberete). Datoteka nije šifrirana: svako ko je ima, ili svaka aplikacija koja čita
taj folder, može je pročitati. Fotografije, datoteke i glasovne poruke samo se navode po imenu, poruke koje nestaju
se izostavljaju, a skriveni razgovori se ne izvoze, kako nijedna datoteka izvan Erevosa ne bi pokazala da postoje.

**Zašto:** poruka koja nestaje se izostavlja, kao i citat takve poruke, jer je onaj ko ju je poslao htio da nestane,
a ne da ostane u datoteci.

Da obrišete jednu poruku, zadržite prst na njoj i dodirnite **Obriši**. Da obrišete sve poruke razgovora, dodirnite
njegovo ime, a zatim **Obriši poruke**. U oba slučaja Erevos pita gdje:

- **Ovaj telefon:** samo ovdje. Drugi telefon zadržava svoje.
- **Oba telefona:** i telefon te osobe ih briše, sljedeći put kad pogleda relay. Njen Erevos to radi, ali izmijenjena
  aplikacija, snimak ekrana ili kopija ih ipak mogu zadržati.

### Brisanje i blokiranje kontakta

Dodirnite ime razgovora, a zatim **Obriši kontakt** da zaboravite tu osobu: njen razgovor nestaje s ovog telefona, a
Erevos vam odmah daje novi red na relayu. Vašim ostalim kontaktima to se tiho javlja, u poruci bez ikakvog sadržaja, i
ponovo 7, 14 i 21 dan kasnije dok ne pišu u novi red; ono što su u međuvremenu pisali u stari i dalje se prikazuje 14
dana. Obrisanoj osobi se ništa ne javlja, i ništa što tamo pošalje ne prikazuje se. Vaš link za kontakt ostaje kakav
je bio, pa vas ona i dalje može njime zamoliti da ponovo razgovarate, kao zahtjev za razgovor, kao i svako ko ga ima.

**Zašto:** svi vaši kontakti pišu u vaš jedan red, pa onaj koga obrišete i dalje zna gdje se nalazi; kad se red
premjesti, više vam tamo ne može pisati, kao ni onaj ko je slao smeće opisano ispod. Vaš link za kontakt navodi
vlastiti red, koji brisanje ne dira, pa svaki link i QR kod koji ste dali nastavlja raditi.

**Red za svaki kontakt:** na relayu ažuriranom za to, svaki kontakt piše u vlastiti red, za koji zna samo on, javljen
unutar vaših šifriranih poruka; red vašeg linka za kontakt tada služi samo za prve poruke. Tako relay iz toga kamo
poruke idu ne može saznati da dva kontakta pišu na isti telefon, a brisanje ili blokiranje nekoga briše samo njegov
red: vaš vlastiti se premješta samo ako ga je i ta osoba znala, kao što ga znaju kontakti od prije ovoga, i neko ko je
došao preko vašeg linka za kontakt prije njegovog prvog premještanja. Kontakti od ranije redom dobijaju vlastiti red,
nekoliko njih odjednom, tiho, a njihov Erevos od ranije ga također prihvata. Ovi redovi čitaju se bez tokena, pa ih
token, koji imenuje vaš telefon, ne povezuje; preko Tora, po osam odjednom, svakih osam na vlastitim krugovima. I
dalje se prave i brišu s tokenom, pa ih relay koji vodi zapisnike tada može povezati. Skriveni razgovori i povezani
računari za sada zadržavaju jedan red za sve. Web-aplikacija nema Tor, pa dok je otvorena čeka na redovima svih vaših
kontakata zajedno, s jedne adrese; s uključenim obavijestima dok je zatvorena, vaš relay ima i jednu push adresu za
redove svih vaših kontakata (pogledajte [Na iPhoneu](#iphone)).

- **Blokiraj kontakt**, ispod toga, radi isto, a uz to odbacuje i ono što ta osoba pošalje kasnije, pa i zahtjev.
  **Blokiraj**, pored **Odbij**, blokira zahtjev za razgovor: zahtjev zna samo vaš link za kontakt, pa premješta vaš
  red samo dok link još navodi upravo taj red, što je tako do vašeg prvog premještanja. Oni koje ste blokirali nalaze
  se pod **Blokirani kontakti** u ekranu **Novi razgovor**, s dugmetom **Odblokiraj**. Ponovno dodavanje iz njihovog
  linka prvo traži da ih odblokirate; do tada ih ništa ne dodaje, ni njihov odgovor na pozivnicu putem SMS-a ni
  njihov link za kontakt u grupi. Svako ko piše preko vašeg linka za kontakt može natjerati telefon da se oglasi, kao
  i svaka poruka: **Odbij** ili **Blokiraj** zaustavlja tu osobu, **Obavijesti** → **Utišano** u njenom razgovoru
  utišava je bez odbijanja, a **Novi link za kontakt** zaustavlja svakoga ko ima stari link kad prođe njegovih 14 dana.
- **Grupe:** neko iz jedne od vaših grupa i dalje vam tamo može pisati. Erevos kaže u koliko ste grupa zajedno:
  napustite ih ili zamolite njihovog admina da tu osobu ukloni.
- **Kad relay nije dostupan**, red se mijenja čim relay odgovori, a do tada se ništa što ta osoba pošalje ne
  prikazuje.
- **Zakazane poruke** koje ste imali za tu osobu povlače se s relaya, odmah ili čim on odgovori, pa nikad ne odlaze.
- **Smeće:** kad se vaš red napuni onim što nije ni za koga ovdje, Erevos vam na isti način daje novi red i to kaže,
  najviše jednom dnevno. Kad smeće napuni red koji navodi vaš link za kontakt, umjesto toga dobijate novi link.
  Poplava izmišljenih zahtjeva za razgovor također se računa kao smeće, dok skup pravih ipak stiže.
- **Novi link za kontakt**, pored **Podijeli moj link za kontakt**, daje vam novi link: linkovi i QR kodovi koje ste
  ranije dali rade još 14 dana, a zatim više ne. Vaših kontakata se to ne tiče. Ako relay izgubi red koji navodi vaš
  link, na isti način dobijate novi link, ali oni koje ste ranije dali odmah prestaju raditi.
- **Na povezanom računaru** to ide na telefon, koji i sam briše ili blokira tu osobu i premješta svoje redove, a i
  redove računara. Telefon čuva ko je blokiran i to javlja računaru: dodavanje osobe tamo iz njenog linka i tamo traži
  da je odblokirate, a **Odblokiraj** je odblokira i na telefonu.
- **U skrivenim razgovorima** premještaju se samo redovi tog mjesta, njegov red za zvonjenje odmah, pa obrisana osoba
  više ne može natjerati telefon da zvoni. Ništa od prostora ni ostalih mjesta se ne premješta.

**Obriši** na kartici kontakta (pogledajte [Kontakti](#contacts)) uklanja samo karticu, a ne i razgovor. Rezervna
kopija napravljena prije brisanja ili blokiranja vraća taj kontakt: nakon vraćanja kopije ponovo ga obrišite ili
blokirajte. Nakon vraćanja, vaš red kaže da je noviji od svih koje vaši kontakti znaju, i svakom se ponovo javlja, pa
svi pišu tamo gdje vi čitate.

### Meni poruke

Zadržite prst na poruci za njen meni: reakcije na vrhu, a zatim ono što s njom možete uraditi.

- **Reakcije:** dodirnite jednu, ili **+** za više. Prikazuje se ispod poruke na oba telefona, vaša istaknuta;
  dodirnite je ponovo da je povučete. Svako od vas ima jednu reakciju na poruci. Ide odmah ili nikako: kad je ne mogu
  preuzeti ni relay ni telefon te osobe u blizini, ništa se ne mijenja.
- **Odgovori:** vaša sljedeća poruka odgovara na nju i prikazuje je citiranu iznad vaših riječi, na oba telefona.
  Dodirnite citat da odete na poruku na koju odgovara; **✕** ga uklanja. Erevos od prije ovoga prikazuje odgovor bez
  citata.
- **Proslijedi:** šalje njenu kopiju u drugi razgovor: izaberite kontakt ili grupu. Njene riječi, naljepnica ili
  lokacija idu iznova, anketa kao nova, još bez odgovora, a zvuk glasovne poruke ili bajtovi fotografije ili datoteke
  šalju se ponovo, šifrirani novim ključem, pa ništa ne povezuje kopiju s porukom od koje potiče. Kopija ispod sebe
  kaže **Proslijeđeno**, ali ne i odakle; Erevos od prije ovoga je prikazuje bez toga. Poruka koja nestaje ne
  prosljeđuje se, a iz skrivenih razgovora poruka ide samo u iste skrivene razgovore.
- **Označi zvjezdicom:** označava je zvjezdicom, samo na ovom telefonu, da je ponovo pronađete: **Poruke sa
  zvjezdicom** u meniju početnog ekrana navodi ih iz svih vaših razgovora, a detalji razgovora navode njegove. Dodir
  vodi na poruku. Poruke sa zvjezdicom iz skrivenih razgovora prikazuju se samo u detaljima njihovih razgovora.
- **Prikvači:** prikvačuje je na vrh razgovora, na oba telefona; svako od vas može je otkvačiti dugmetom **Otkvači**.
  Kad ih je prikvačeno više, prikazuje se posljednja; dodirnite je da odete na nju, i prikaže se sljedeća.
- **Kopiraj:** stavlja njene riječi u međuspremnik, da ih zalijepite u drugu aplikaciju. Na Androidu je kopija
  označena kao privatna, pa obavijest telefona o njoj ne prikazuje riječi, ali svaka aplikacija koja čita
  međuspremnik može ih pročitati.
- **Uredi:** za vašu poruku, do jednog dana nakon što ste je poslali. Njene riječi idu u polje pod **Uređivanje
  poruke**: promijenite ih i pošaljite, ili **✕** da ostane kakva je bila. Oba telefona prikazuju nove riječi, s
  **Uređeno** pored vremena. Uređuju se samo riječi, ne naljepnica, lokacija, anketa, glasovna poruka, fotografija ili
  datoteka, ni riječi koje ste proslijedili. Poruka koja još čeka da ode odlazi s novim riječima, bez oznake; poruka
  poslana za kasnije ne uređuje se. Izmjena ide odmah ili nikako, kao i reakcija, a prikazuju je i vaši povezani
  uređaji. Erevos od prije ovoga zadržava stare riječi.
  **Zašto:** dan je dovoljno vremena da se ispravi greška, a niko ne može mijenjati ono što je rekao prije više dana.
  Oznaka pokazuje da riječi nisu prve.
- **Obriši:** na ovom telefonu ili na oba, kao iznad.

Reakcije, odgovori, prikvačene poruke i izmjene putuju unutar šifriranja, kao i poruke.

### Poruke koje nestaju

Otvorite razgovor, dodirnite njegovo ime, a zatim **Poruke koje nestaju** da izaberete koliko dugo njegove nove poruke
traju nakon čitanja: 5 minuta, 1 sat, 1 dan ili 1 sedmicu. Da nestane samo sljedeća poruka, dodirnite štopericu pored
polja za poruku (ili **Poruka koja nestaje** pod **+**, ili **Nestajanje** u meniju strelice za slanje): iznad polja se
prikazuje **Nestaje nakon čitanja: 1 sat**. Dodirnite vrijeme da izaberete drugo, ili **✕** da to isključite. Važi za
sljedeću poruku koju pošaljete: riječi, glasovnu poruku, fotografiju ili datoteku, naljepnicu, lokaciju ili anketu,
sada ili kasnije. SMS ne može nestati: poslan kao SMS, ostaje na oba telefona (Erevos to prvo kaže), a štoperica se
ponovo isključuje. Njeno vrijeme počinje kad je drugi telefon prikaže na ekranu, a vrijeme vaše kopije kad to telefon
te osobe javi (**✓✓✓**). Svaka poruka kaže kada nestaje. Drugi telefon saznaje postavku razgovora sljedeći put kad
pogleda relay, a oba telefona je mogu promijeniti: važi kasnija promjena. Poruke koje su već u razgovoru ostaju.

- **Dok se ne pročita**, poruka koja nestaje ostaje na oba telefona, zapečaćena kao i ostale. Ako Erevos te osobe
  nikad ne javi da ju je pročitao, vaša kopija ostaje.
- **Dok je Erevos zatvoren:** poruka čije je vrijeme došlo briše se kad se razgovor sljedeći put otvori. Do tada
  ostaje na telefonu, zapečaćena kao i ostale.
- **Nije garancija:** Erevos te osobe ih briše, ali izmijenjena aplikacija, snimak ekrana ili kopija ih ipak mogu
  zadržati.

### Obavijesti za ovaj razgovor

Na Androidu otvorite razgovor, dodirnite njegovo ime, pa **Obavijesti**; u grupi dodirnite njeno ime (u javnoj grupi
**⋯**), pa **Obavijesti**. **Utišano** na 8 sati, 1 sedmicu ili **Uvijek**: njegove poruke ne puštaju zvuk i ne
prikazuju obavijest, pa ih ni ikona Erevosa ne broji; lista ih i dalje prikazuje, s precrtanim zvoncem, a njegovi
pozivi i dalje zvone. **Zvuk poruke** i **Melodija zvona** daju mu vlastiti zvuk za poruke i za pozive, s Androidove
vlastite liste zvukova, ili **Bez zvuka**. U detaljima razgovora red tada kaže **Utišano do** i vrijeme, ili
**Vlastiti zvukovi**.

**Zašto:** utišan razgovor se i dalje broji u listi, da se ništa od onoga što je stiglo ne izgubi: samo vas telefon
više ne zove k njemu. Njegovi zvukovi se čuvaju samo na ovom telefonu, s razgovorom u šifriranim podacima prostora,
jer svaki telefon ima svoje zvukove: povezani uređaj čuva svoje, a drugi telefon ne saznaje ništa o njima.

- **U skrivenim razgovorima** postoji samo **Utišano**: vlastiti zvuk bi svakome u blizini otkrio o kojem je razgovoru
  riječ.
- **Zatvoren prostor, i skriveni razgovori dok su zatvoreni,** ne znaju u kojem je razgovoru stigla poruka, pa o njoj
  javljaju kako kažu postavke aplikacije.
- **Samo na Androidu** zasad: web-aplikacija javlja o svakom razgovoru kako kažu njene postavke.

### Glasovne poruke

U razgovoru s kontaktom, kad ništa nije upisano, zadržite prst na mikrofonu na kraju trake za poruku dok govorite, i
pustite da pošaljete; prevucite ulijevo prije nego što pustite da je umjesto toga odbacite. Pritisak kraći od sekunde
smatra se greškom i ništa ne šalje. Nakon jednog minuta šalje se sama. Prvi put Android pita smije li Erevos koristiti
mikrofon: snima samo dok ga držite. S TalkBackom ga dodirnite jednom da počnete, a ponovo da pošaljete. Dodirnite
glasovnu poruku da je pustite, i ponovo da je zaustavite. Glasovne poruke imaju iste oznake kao i ostale i prate
postavku nestajanja razgovora.

**Zašto:** na telefonu je glasovna poruka AAC sa 64 kbit/s, oko 480 KB po minutu: govor jasniji od toga ne može biti.
Više se u glasu ne bi čulo, ali bi se sporije slalo, naročito preko Bluetootha.

- **Preko relaya ili u blizini,** šifrirane s kraja na kraj kao i riječi, u nekoliko dijelova. Niko između ih ne može
  čuti, ali iz dijelova relay, ili onaj ko prisluškuje u blizini, može saznati da je poslano nešto dugo, i otprilike
  koliko dugo. U blizini idu samo na telefon kontakta za koji se zna da je u blizini.
- **Na telefonu** se svaki zvuk čuva u vlastitoj datoteci, zapečaćenoj vlastitim ključem, koji ima samo zapečaćena
  historija razgovora. Kad poruka nestane, bilo da je obrisana, da je nestala ili da je najstarija, nestaje i njena
  datoteka. Broj tih datoteka i njihove veličine otprilike pokazuju koliko glasovnih poruka telefon čuva, u svim svojim
  prostorima zajedno, ali ne i u kojem.
- **Dok se pušta**, zvuk je otpečaćen u Erevosovom kešu i briše se čim se zaustavi. Ako se Erevos zatvori dok snima ili
  pušta, ono što je ostalo briše se sljedeći put kad se otvori neki razgovor.

### Fotografije i datoteke

U razgovoru s kontaktom dodirnite **+** pored polja za poruku, koje se otvara tamo gdje je bila tastatura, a zatim
**Fotografija** da izaberete jednu od fotografija telefona, **Kamera** da je snimite, ili **Datoteka** za bilo šta
drugo, do 100 MB. Ispod njih, **Kvalitet fotografije** određuje kako fotografije idu, a
Erevos to pamti:

- **Original** (zadano): fotografija tačno onakva kakva je bila, u punoj veličini, bez gubitka kvaliteta. Uklanja se
  samo ono što govori osim same slike: gdje je snimljena, telefon, vrijeme, sličice. Njeno ime je samo „photo“.
- **90%** i **75%:** nova, manja fotografija, brža za slanje, koja ne govori ništa osim same slike.

Fotografije i datoteke te osobe do 16 MB stižu same; dodirnite veću da je preuzmete. Dodirnite fotografiju da je
vidite preko cijelog ekrana, s njenom veličinom: dva prsta ili dvostruki dodir je uvećavaju, jedan prst je pomjera dok
je uvećana, a jedan dodir skriva ili prikazuje ono što je oko nje. Dodirnite datoteku da je sačuvate. Erevos se okreće
s telefonom dok je na telefonu uključeno **Automatsko okretanje**, a fotografija prikazana sama okreće se i kad je
isključeno. **Sačuvaj** stavlja kopiju u folder koji izaberete prvi put, a **Sačuvaj u drugi folder** ga mijenja.
Fotografije i datoteke imaju iste oznake kao i ostale i prate postavku nestajanja razgovora.

- **Kako putuju:** svaka datoteka šifrira se na telefonu vlastitim ključem, u dijelovima iste veličine, i stavlja na
  vaš relay. Kontaktu idu samo lokacija dijelova i ključ, šifrirani s kraja na kraj. Njegov telefon preuzima dijelove
  preko vlastitog relaya, pa vaš relay nikad ne vidi adresu njegovog telefona, provjerava svaki dio, a zatim ih briše
  s relaya. Dijelovi koje niko ne preuzme brišu se nakon 14 dana.
- **Šta relay vidi:** koliko ima dijelova i njihovu veličinu, dakle otprilike koliko je datoteka velika, i kada. Ne i
  šta je ni za koga je.
- **Datoteka ide onakva kakva je,** sa svime što govori u sebi: autora dokumenta, ili lokaciju i telefon fotografije
  ako je pošaljete preko **Datoteka**. Fotografije šaljite preko **Fotografija**.
- **Na telefonu** se svaka datoteka čuva u svojim dijelovima, onako kako su putovali, zapečaćena vlastitim ključem,
  koji ima samo zapečaćena historija razgovora. Kad poruka nestane, nestaju i njeni dijelovi. Broj dijelova otprilike
  pokazuje koliko telefon čuva, u svim svojim prostorima zajedno, ali ne i u kojem. Fotografija se prikazuje iz
  memorije, nikad se ne upisuje otpečaćena. Birač fotografija telefona predaje kopiju u Erevosovom kešu, koja se briše
  čim se pročita, a fotografija snimljena ovdje ne čuva se među fotografijama telefona.
- **Sačuvane** fotografije i datoteke su izvan Erevosa, nezapečaćene: svako ko ima telefon može ih otvoriti.
- **Samo preko relaya:** za datoteke je potrebna njegova pohrana datoteka, čak i kad je kontakt u blizini. Relay
  stariji od ove verzije ne može primati datoteke: ažurirajte ga.

### Još pod +

Pod **+** ima više za slanje od fotografija i datoteka (smajli na kraju polja za poruku također otvara naljepnice):

- **Naljepnica:** jedna od 528 naljepnica ugrađenih u Erevos, u 22 kompleta po 24 (među njima **Mjeseci**, **Psi**,
  **Grčka**, **Riječi** i **Poslastice**), koje svaki telefon sam iscrtava: putuje samo njeno ime, pa se nikad ništa
  ne preuzima. Erevos od prije ovoga umjesto nje prikazuje njen emoji. Sve osim riječi i poslastica malo se pomjeraju
  nekoliko sekundi kad stignu i kad ih dodirnete, a zatim miruju; s uključenom postavkom telefona za smanjenje pokreta
  ostaju mirne. Riječi se prikazuju na jeziku aplikacije.
- **Moje**, među naljepnicama, sadrži one koje napravite od fotografija. **Nova naljepnica od fotografije** izrezuje
  kvadrat, smanjuje ga (512 sa 512, najviše oko 100 KB) i zadržava samo sliku, ništa o tome gdje je ili čime je
  snimljena. Čuva se zapečaćena u prostoru, ili u skrivenim razgovorima u kojima je napravljena, i prikazuje se samo
  tamo, najviše 100 njih; zadržite prst na jednoj da je obrišete. Kao i ostalo, ulazi u rezervnu kopiju, zapečaćena,
  i nikad ne ide na druge uređaje naloga. Ide kao što ide fotografija, šifrirana s kraja na kraj preko relaya,
  označena kao naljepnica, pa se prikazuje sama, bez oblačića; Erevos od prije ovoga prikazuje je kao fotografiju.
  Zadržite prst na naljepnici koju vam je neko poslao i dodirnite **Dodaj u moje naljepnice** da je zadržite.
- **Lokacija** (na Androidu): šalje gdje se nalazite, jednom, kao mjesto. Prvi put Android pita smije li Erevos
  koristiti lokaciju. Telefon traži na sve načine koje ima odjednom: preko satelita, kad ste dozvolili preciznu lokaciju,
  i preko svoje mrežne lokacije, što na mnogim telefonima znači pitati Google ili proizvođača telefona. Odmah se otvara
  list koji kaže da traži; u zatvorenom, gdje se sateliti teško vide, to može potrajati do jedne minute. Kad ništa ne
  stigne na vrijeme, nudi mjesto koje je telefon pronašao u posljednjih deset minuta i kaže prije koliko, ili kaže zašto
  nijedno nije pronađeno, s **Pokušajte ponovo** i ekranom telefona koji to mijenja. Erevos gleda samo kad dodirnete,
  prikazuje vam mjesto prije nego što ode i ne prati vas nakon toga. Poruka sadrži samo koordinate, šifrirane s kraja na
  kraj; u Erevosu se ne učitava nikakva karta. **Otvori u kartama** predaje mjesto vašoj aplikaciji za karte, koja svoju
  kartu može učitati s interneta. Erevos od prije ovoga prikazuje koordinate kao riječi.
- **Anketa:** pitanje s dvije ili više opcija, najviše 12, i, s **Više od jednog odgovora**, mogućnošću izbora više
  njih. Dodirnite opciju da je izaberete, a ponovo da povučete izbor; svaka opcija pokazuje koliko ju je izabralo, i
  ko. Glasovi putuju unutar šifriranja, kao i reakcije. Erevos od prije ovoga prikazuje pitanje i njegove opcije kao
  riječi, na koje se odgovara riječima.

**Zašto:** paket naljepnica preuzet s interneta otkrio bi serveru da ovaj telefon ima Erevos, pa su naljepnice
ugrađene i putuju samo njihova imena. Vaše vlastite navedene su u jednoj zapečaćenoj vrijednosti iste veličine za
svaki prostor i skriveno mjesto, korišteno ili ne, pa popis koji se koristi izgleda kao onaj koji se ne koristi: 100 je
koliko sadrži. Lokacija se šalje samo s Androida: na računaru ili u web-aplikaciji preglednik bi pitao vanjsku uslugu
gdje se nalazi.

### Pregledi linkova

Link u poruci je podvučen i otvara se tek kad ga dodirnete i to potvrdite. S uključenim **Pregledi linkova**, u
detaljima razgovora, link koji pošaljete ide sa svojim pregledom: dok ga šaljete, ovaj telefon preuzima stranicu i
uzima njen naslov, jedan red o njoj i malu sliku, i to ide unutar poruke, šifrirano s kraja na kraj. Telefon koji ga
primi ništa ne preuzima: prikazuje ono što je stiglo. Isključeno je dok to ne uključite, a tada je uključeno za sve
razgovore prostora; svako mjesto skrivenih razgovora ima vlastiti prekidač, u detaljima razgovora tamo.

**Zašto:** stranicu preuzima samo telefon pošiljaoca, pa telefon koji primi link ne pristupa nijednoj stranici koju je
izabrao neko drugi i toj stranici ne pokazuje ništa o sebi, čak ni svoju adresu.

- **Stranica vidi internet adresu ovog telefona**, i kada, kao što bi je vidjela iz preglednika, ali ne i za koga je
  poruka. Preko Tora Erevos šalje samo svoje zahtjeve relayu, ne i stranice, pa dok sve u prostoru ide preko Tora
  (**Sve** pod Torom) pregledi se uopće ne prave.
- Erevos na računaru ih ne pravi, ali svejedno prikazuje one koji stignu.
- **Preko LoRa veze**, koja prenosi samo malo, poruka ide bez pregleda radije nego da čeka, a ovdje ga ne zadržava.
- Pregled je ono što stranica kaže o sebi, istinito ili ne. Erevos od prije ovoga prikazuje link bez njega.

### Glasovni i video pozivi

U razgovoru s kontaktom dodirnite zelenu slušalicu na vrhu za glasovni poziv, ili plavu kameru pored nje za videopoziv.
Prvi put Android pita smije li Erevos koristiti mikrofon, a za video i kameru. Telefon te osobe zvoni dok je Erevos
tamo otvoren, na bilo kojem ekranu prostora: ona dodirne **Javi se** ili **Odbij**. Tokom poziva možete isključiti
mikrofon, uključiti ili isključiti zvučnik, isključiti kameru, prebacivati se između prednje i zadnje kamere, i
**Prekini**. Svaki poziv ostavlja red u razgovoru, na primjer koliko je trajao, ili propušteni poziv.

**Običan poziv preko mobilne mreže:** kad kontakt ima povezan svoj broj telefona, ili je povezan s nekim od vaših
kontakata koji ima broj (**Poveži s jednim od mojih kontakata** u njegovom razgovoru, prvo broj mobilnog), narandžasta
tastatura na vrhu njegovog razgovora, ispred kamere, otvara tastaturu s već upisanim tim brojem, kao i ona na vrhu SMS
razgovora. To je Erevosov **Telefon** kad je Erevos aplikacija za telefon, a inače vlastita aplikacija telefona: tamo
dodirnite dugme za poziv. Takav poziv ide preko mreže telefonske kompanije i nije šifriran, kao što ni običan SMS nije.
Skriveni razgovori i računari to nemaju.

- **Šifrirano s kraja na kraj:** poziv se uspostavlja porukama preko relaya, šifriranim kao i ostale. One nose ključ
  koji šifrira sam poziv, pa niko između ne može prisluškivati, čak ni relay za pozive opisan ispod.
- **Preko relaya za pozive:** relay postavljen kompletom iz \`deploy/relay\` ima uz sebe relay za pozive. Poziv ide
  preko njega, pa nijedan telefon ne saznaje IP adresu drugog. Preko Wi-Fi mreže ili mobilnih podataka, bilo gdje.
- **Bez relaya za pozive** (relay na vašem vlastitom računaru, na primjer), Erevos prvo pita: poziv tada ide direktno
  između telefona, radi samo na istoj Wi-Fi mreži, a svaki telefon vidi adresu drugog na njoj.
- **Bez interneta:** na istoj Wi-Fi mreži, na hotspotu telefona ili na Wi-Fi mreži koju prave dva telefona (Wi-Fi
  Direct), s prostorom otvorenim na oba, pozivu uopće nije potreban relay: uspostavlja se preko veze u blizini i ide
  direktno između telefona (ili računara). Isto važi i za grupne poruke i grupne pozive.
- **U pozadini (Android):** dok je prostor otvoren, Erevos nastavlja raditi kad ga napustite, dugmetom za početni
  ekran ili prevlačenjem iz nedavnih aplikacija, s tihom obaviješću, „Erevos – Ready for calls and messages“, koja se
  ne prikazuje na zaključanom ekranu. Čeka na relayu i na vezama s telefonima u blizini, pa poruke stižu: obavijest
  kaže samo „New message“ ili koliko ih je stiglo, a na zaključanom telefonu samo „Erevos“. Zahtjev za razgovor, od
  nekoga ko ima samo vaš link za kontakt, daje istu obavijest i zvuk, i broji se na ikoni, kao i svaka poruka. Poziv
  zvoni melodijom telefona i obaviješću, „Incoming call“ (ili „Incoming video call“) – „Open Erevos to answer“, bez
  imena, i preko zaključanog ekrana i čuvara ekrana, a ekran se budi. Dodirnite je da se javite. S uključenim
  zaključavanjem lozinkom, poziv koji zvoni prikazuje se prije lozinke, a Erevos se zaključava čim se poziv završi.
  Kad je zaključan, prostor nastavlja raditi iza ekrana za lozinku, pa poruke i pozivi i dalje stižu, a poziv se
  prikazuje preko ekrana za lozinku. Tako stižu samo razgovori i grupe tog prostora, i skriveni razgovori s uključenim
  **Primanje dok su zatvoreni**; ostali skriveni razgovori samo javljaju da je stigla poruka, ili zvone bez imena, ako
  im to dozvolite (pogledajte Skriveni razgovori). To se podešava u **Postavke** → **Obavijesti** →
  **U pozadini**: **Primaj i zvoni** (zadano) ili **Samo dok je Erevos na ekranu**, te **Javi da je stigla poruka**
  (zadano) ili **Bez obavijesti**, što važi i dok je Erevos na ekranu. Tamo su i, ako ih Android traži, **Izuzmi iz
  uštede baterije** i **Prikazuj pozive preko zaključanog ekrana**.
- **Broj na ikoni:** uz uključeno **Javi da je stigla poruka**, kad napustite Erevos s nepročitanim porukama u
  razgovorima i grupama otvorenog prostora, obavijest ostaje, bez zvuka, i kaže koliko ih je, s onima koje javi
  poslije; nestaje dok je Erevos na ekranu, i vraća se kad ga napustite, dok ih ne pročitate. Ne broji poruke utišanog
  razgovora (pogledajte Obavijesti za ovaj razgovor), ni skrivenog u trenutku kad izlazite. Pokretač (launcher)
  Androida je prikazuje na ikoni Erevosa, kao broj ili, na nekim telefonima, poput Pixela, kao tačku. **Postavke** →
  **Obavijesti** → **Broj na ikoni** to isključuje: obavijest tada javlja samo ono što je stiglo otkako ste zadnji put
  imali Erevos otvoren, i broj pokretača nestaje s njom. Poruka obrisana za sve prije nego što ste je pročitali, ili
  pročitana na povezanom računaru, više se ne broji.

  **Zašto:** na Androidu samo obavijest može staviti broj na ikonu aplikacije, pa obavijest ostaje dok poruke čekaju;
  ne kaže ništa više od toga koliko ih je, kao i uvijek.
- **Zatvoren prostor:** ne prima ništa, jer je njegov ključ u memoriji samo dok je otvoren: njegove poruke čekaju na
  njegovom relayu i stižu kad ga otvorite. Osim ako u tom prostoru ne izaberete **I dok je otvoren drugi prostor** pod
  **Postavke** → **Obavijesti** → **U pozadini** (zadano je **Ovaj prostor samo dok je otvoren**): tada, dok je otvoren
  i prima drugi prostor, kaže samo „New message“ ili koliko ih je stiglo, istom obaviješću kao i taj prostor, nikad koji
  prostor, a njegovi skriveni razgovori ne kažu ništa. Ono što su drugi telefoni prenijeli do njegovog relaya računa se
  kao poruka, i brisanja, a poruka poslana njemu bez zvuka oglašava se kao i obično (pogledajte **Slanje bez zvuka**).
  Za to telefon čuva adrese njegovih redova na njegovom relayu izvan njegove lozinke, među njima i red u koji piše
  svaki njegov kontakt, do 64 kontakta, nikad njegove ključeve, ni ko su mu kontakti, ni njegove poruke, i pita relay
  samo koliko ih je stiglo, nikad ne traži same poruke: one ostaju tamo dok se prostor ne otvori. Za prostor koji ide
  preko Tora (**Poruke**, zadano, ili **Sve**, pod **Što ide preko Tora**) pita se samo preko Tora: dok otvoreni prostor ima
  isključen Tor, ili se njegov Tor pokreće ili je upravo zakazao, zatvoreni prostor ne kaže ništa, a ono što je
  stiglo javlja se kad Tor tamo bude spreman.

  **Zašto:** prostor iza druge lozinke ne smije pokazati da postoji, pa je to isključeno dok to ne uključite, a tada ne
  kaže ništa više od onoga što bi rekao otvoreni prostor. Kad bi se pitalo direktno s telefona dok je otvoren drugi
  prostor, njegov relay ili neko ko prati mrežu mogao bi povezati ta dva prostora po IP adresi telefona. Pošto svaki
  kontakt piše u svoj red, prostor mora pitati i za svaki od njih, inače njihove poruke ne bi ništa javile. Cijena je
  to što njegov relay može saznati da su ta dva prostora na jednom telefonu, a neko ko alatima pregleda telefon može
  otkriti da drugi prostor tamo čuva adrese, i koliko kontakata ima.
- **Gdje ne može zvoniti:** kad ga zaustavi Android (ili ušteda baterije telefona, ili vlastita postavka proizvođača
  telefona), nakon ponovnog pokretanja telefona dok jednom ne otvorite Erevos i prostor, u drugom prostoru (samo
  javlja da je stigla poruka, ako to dozvolite, kao iznad), ili na računaru ili u web-aplikaciji dok je zatvorena.
  Poziv se tamo prikazuje kao propušteni poziv kad se Erevos otvori. Kad Android zatvori Erevos dok prima i ponovo ga
  pokrene, kao što obično radi, tiha obavijest to kaže: otvorite Erevos i prostor da biste ponovo primali. Nakon
  **Prisilno zaustavi**, s potrošnjom baterije postavljenom na Ograničeno, ili kad ga zatvori vlastita postavka
  proizvođača telefona, Android ništa ponovo ne pokreće, pa to ne kaže nijedna obavijest: obavijest „Erevos“ samo
  nestane, i ništa ne zvoni dok ne otvorite Erevos. **Dozvole** (ispod) unaprijed kaže ako je nešto od toga
  postavljeno. Isto radi i jedna, „Locked“, kad se prostor koji je primao zatvori (na primjer nakon vraćanja
  rezervne kopije) i Erevos napusti ekran tražeći lozinku. Zahtjev za razgovor ne može vas pozvati dok ga ne
  prihvatite.
- **Dozvole (Android):** **Postavke** → **Općenito** → **Dozvole** prikazuje šta Android dozvoljava Erevosu za pozive
  i poruke u pozadini (obavijesti, obavijest o pozivu i to da iskače, obavijest o porukama, s njenim obavijestima
  „Messages without sound“ i „Messages with a chat's own sound“, koje također čuvaju broj na ikoni, pozive preko
  zaključanog ekrana, rad na bateriji, rad u pozadini s potrošnjom baterije koja nije postavljena na Ograničeno, bez
  pauziranja kad se ne koristi, mobilne podatke u pozadini, mikrofon) i za druge stvari (zvuk za nove poruke,
  obavijesti na zaključanom ekranu, pozive kroz Ne ometaj, kameru, telefone u blizini, kontakte, tačna vremena za SMS
  zakazane za kasnije i podsjetnike, obavijest o podsjetniku kad podsjetnik stigne), svaku s objašnjenjem zašto i
  dugmetom koje otvara Androidovo vlastito pitanje ili postavku. Kaže i kad je telefon bez zvuka
  ili na vibraciji, kad je uključena ušteda baterije i kad je uključeno Ne ometaj, a Erevos pozivi nisu propušteni
  kroz njega. Na Huawei, Honor, Xiaomi, OPPO, realme, OnePlus, vivo, Samsung i ASUS telefonima kaže i gdje je vlastita
  postavka proizvođača, koju Erevos ne može pročitati: dodirnite **Gotovo** kad je postavljena. Nakon svake nove
  verzije, i prvi put, otvara se sama kad pozivima ili porukama nešto treba. U web-aplikaciji prikazuje ono što
  preglednik dozvoljava, pogledajte [Na iPhoneu](#iphone).
- **Jedan poziv istovremeno.** Poziv traje dok se krećete između ekrana prostora. Završava se kad se prostor zatvori,
  a poziv u skrivenim razgovorima kad se oni zatvore, što se tokom poziva ne dešava. Prevlačenje Erevosa iz nedavnih
  aplikacija također završava poziv.
- Pozivi ne idu preko telefona u blizini ni preko Bluetootha. Tamo **Walkie-talkie** pod **+** pretvara razgovor u
  walkie-talkie, a iznad polja se prikazuje **Walkie-talkie je uključen**: držite walkie-talkie na kraju trake dok
  govorite, pustite, i pušta se na telefonu te osobe čim stigne, ako je tamo otvoren razgovor s vama; ako nije, čeka
  kao glasovna poruka. To je manja glasovna poruka (oko 3 KB u sekundi), pa ide svuda kuda ide i poruka, uključujući i
  Bluetooth.

**Zašto:** ključevi koji otvaraju poruke prostora nalaze se u memoriji samo dok je on otvoren, a inače su zapečaćeni
iza njegove lozinke. Zato se nakon ponovnog pokretanja telefona ništa ne može pročitati i ništa ne zvoni dok jednom ne
otvorite Erevos i prostor; a skriveni razgovori, čiji je ključ u memoriji samo dok su otvoreni, osim ako ga
**Primanje dok su zatvoreni** ne čuva uz prostor, inače samo javljaju da je stigla poruka, ili zvone bez imena, ako im
to dozvolite.

> Postavke relaya, vaš red, vaši kontakti i njihova imena, ključevi vaših razgovora i poruke čuvaju se u ovom
> prostoru, zapečaćeni. Historija nema ograničenja: čuva se u zapečaćenim stranicama iste veličine, pomiješanim sa
> stranicama ostalih prostora i skrivenih razgovora, pa se vidi samo koliko sve one zajedno zauzimaju, a ne čije su.
> Ostalo se čuva u istoj veličini za svaki prostor i skrivene razgovore, korištene ili ne; ono što je veće ide u
> stranice poput stranica historije, među njih. Obrisane poruke mogu neko vrijeme ostati u memoriji telefona,
> zapečaćene kao i ostalo, dok se preko njih nešto ne upiše. Poruke poslane ili primljene u blizini čuvaju se na isti
> način.

## Grupni razgovori {#groups}

Iz menija početnog ekrana, **Nova grupa**: dajte joj ime, označite kontakte koje želite pozvati i dodirnite **Napravi
grupu**. Vi ste njen admin. Telefon svakog kontakta sam odgovara sljedeći put kad se na njemu otvori Erevos i ulazi u
grupu: grupa se tada prikazuje na njegovom početnom ekranu, s napomenom ko ga je dodao. Telefon ulazi samo u grupu
čiji je admin kontakt koji ga je pozvao, a admin pušta kontakt samo kao njega samog, nikad kao nekog drugog. Grupe
idu preko relaya, pa on mora biti postavljen.

**Zašto:** samo telefon admina mijenja grupu (ko je u njoj, njeno ime), pa nijedan server ne mora slagati promjene po
redu: svaki telefon ih preuzima od tog jednog. Zato član izlazi tako što zamoli admina, a samo admin dodaje i uklanja
članove.

- **Ko može biti pozvan:** kontakti koje ste prihvatili, u ovom prostoru. Članovi koji nisu kontakti jedni drugima
  ipak razgovaraju u grupi i prikazuju se po početku svog ključa.
- **Dodaj u kontakte:** na popisu članova (**⋯**), **Dodaj u kontakte** ispod člana koji nije vaš kontakt traži od
  njega, porukom koju dobija samo on, njegov link za kontakt i daje mu vaš. Na njegovom telefonu zahtjev se prikazuje
  jednom, na vrhu grupe, a on dodirne **Pošalji** ili **Ne šalji**; ako dodirne **Ne šalji**, vama se to ne javlja.
  Kad ga pošalje, jedno drugom ste kontakti, s vlastitim razgovorom, a **Ime** mu daje ime, kao i ispod svakog
  kontakta koji ga još nema. Izostanak odgovora može značiti da još nije otvorio grupu, da je rekao ne, da ima stariji
  Erevos ili da vas već ima kao kontakt, što mu ništa ne prikazuje; nakon sedmice možete pitati ponovo. Kad postanete
  kontakti jedno drugom, u bilo kojoj grupi ili putem linka za kontakt, ono što je traženo u vašim drugim grupama
  nestaje, a njegov zahtjev se više ne prikazuje. Član uklonjen iz grupe više ništa ne traži. Ako dva člana pokazuju
  isti ključ, jedan od njih nije onaj za koga se predstavlja, i nijednom od njih ne ide link za kontakt niti se od
  ijednog uzima. Ne u javnim grupama. Traženje je za telefon na kojem je nalog; **Ime** radi i na povezanom uređaju.
- **Šifrirano s kraja na kraj za grupu:** MLS (RFC 9420). Svaka poruka šifrira se jednom za grupu, a zatim ponovo
  zapečaćuje za svakog člana, pa ono što stiže u red svakog člana ne liči ni na šta što dobijaju ostali, i nijedan
  relay ne može saznati ko je u grupi. Ide direktno u red svakog člana, preko vašeg relaya. Svake sedmice ključevi
  svakog telefona u grupi prave se iznova, adminovi sami, a svakog člana preko admina, pa ključevi jednom uzeti s
  telefona prestaju čitati grupu.
- **Članovi:** dodirnite ime grupe na vrhu, ili **⋯** pored njega. Admin dodaje kontakte, uklanja članove i
  preimenuje grupu. Uklonjeni član od tada ne čita ništa što se u grupi kaže, a grupa ostaje na njegovom telefonu,
  samo za čitanje, dok je ne obriše.
- **Napuštanje grupe:** **Napusti grupu** to traži od admina, čiji vas telefon uklanja sljedeći put kad se na njemu
  otvori Erevos. Adminovo vlastito dugme je **Zatvori grupu**: uklanja sve članove.
- **Grupni pozivi:** zelena slušalica na vrhu grupe pokreće glasovni poziv u njoj, a plava kamera pored nje
  videopoziv (i **Videopoziv** pod **⋯**). Dok jedan traje, prikazuje se samo njegovo dugme, da mu se pridružite.
  Zvoni na telefonima članova na kojima je Erevos otvoren, a ko se javi, u pozivu je. Poziv koji traje prikazuje se na
  vrhu grupe, da mu se pridružite kasnije. Do osam osoba: svaki telefon se povezuje sa svakim drugim, preko relaya za
  pozive, pa nijedan telefon ne vidi IP adresu drugog; bez relaya za pozive, samo na istoj Wi-Fi mreži. Šifrirano s
  kraja na kraj između svaka dva telefona, a njihovi ključevi šalju se u šifriranju grupe. U videopozivu svaki telefon
  šalje svoju sliku svakom drugom, pa se slike prikazuju za najviše četiri osobe; s više njih se pauziraju, a zvuk
  ide dalje, dok se ne postavi server za veće videopozive.
- **Fotografije, datoteke i glasovne poruke:** **+** pored polja šalje fotografiju ili datoteku, kao u razgovoru s
  kontaktom, s istim **Kvalitet fotografije**; držite mikrofon dok govorite, i pustite da pošaljete. Svaka se
  šifrira vlastitim ključem i jednom stavlja na vaš relay, a u grupu, u njenom šifriranju, idu samo njena lokacija i
  ključ. Telefon svakog člana preuzima je odatle preko vlastitog relaya: do 16 MB sam dok je grupa otvorena, veću kad
  se dodirne. Dodirnite fotografiju da je vidite cijelu, datoteku da je sačuvate, glasovnu poruku da je pustite.
  - **Relay je čuva 14 dana,** šifriranu, jer ne može znati kada su je preuzeli svi članovi.
  - **Samo preko relaya,** čak i kad su članovi u blizini.
  - **Član koji uđe kasnije** ne dobija ono što je stiglo prije, kao ni kod riječi. Član čiji je Erevos od prije ove
    verzije od toga ne vidi ništa.
  - **Na telefonu** se svaka čuva u svojim dijelovima, zapečaćena, kao u razgovoru s kontaktom. Brisanje grupe ovdje
    ih briše.
- **Meni poruke,** kad zadržite prst, kao u razgovoru s kontaktom: reakcije, **Odgovori**, **Proslijedi**, **Označi
  zvjezdicom**, **Prikvači**, **Kopiraj**, **Uredi** i **Obriši**. Svaki član ima jednu reakciju na poruci, a anketa
  pokazuje ko je šta izabrao. Prikvačena poruka je za sve, i svaki član je može otkvačiti dugmetom **Otkvači**.
  **Uredi** vašim riječima daje nove za svakog člana, do jednog dana nakon što su otišle, označene s **Uređeno**.
  **Obriši** pita **Ovaj telefon** ili, za vašu vlastitu poruku, **Za sve**: Erevos članova je također briše, a vaša
  fotografija, datoteka ili glasovna poruka napušta vaš relay odmah umjesto za 14 dana. **+** i ovdje ima
  **Naljepnica**, **Lokacija** i **Anketa**. Linkovi su podvučeni i pitaju prije otvaranja, a **Pregledi linkova**, kad
  su uključeni, idu s vašim linkovima. Na popisu članova, ili na vlastitom ekranu javne grupe, **Traži u ovom
  razgovoru** pretražuje poruke grupe, a **Izvezi razgovor** ih ispisuje; **Poruke sa zvjezdicom** i pretraga
  početnog ekrana obuhvataju i grupe. Član čiji je Erevos od prije ove verzije vidi riječi, emoji naljepnice,
  koordinate lokacije i pitanje ankete, a ništa od reakcija, prikvačenih poruka, izmjena i brisanja.
- **Još ne:** oznake, kucanje i poruke koje nestaju u grupama, te grupe preko telefona u blizini.

## Javne grupe {#public-groups}

Javna grupa je grupa u koju svako ko ima njen link, ili njen QR kod, može zatražiti ulazak: za klub, ulicu ili
razred, gdje vam nisu svi kontakti. Iz menija početnog ekrana, **Javne grupe**: dajte joj ime i ime pod kojim ste u
njoj, izaberite ko ulazi i dodirnite **Napravi javnu grupu**. Vi ste njen vlasnik. Njene poruke šifrirane su s kraja
na kraj pomoću MLS-a i idu svakom članu kao u svakoj grupi, a nijedan relay ne saznaje ko je u njoj.

- **Link:** dodirnite ime grupe na vrhu za njen link i QR kod, i **Podijeli link**. Ko ga otvori, ili skenira kod
  kamerom telefona, bira ime koje grupa vidi i dodirne **Zatraži pridruživanje**. Link se može i zalijepiti pod
  **Pridruži se putem linka**. Svaki član ima link i može ga proslijediti dalje.
- **Ulazak dok niste tu:** zahtjev čeka na vašem relayu, zapečaćen tako da ga otvara samo vaš telefon, dok se Erevos
  ne otvori na vašem telefonu: gleda svakih nekoliko sekundi dok je Erevos na ekranu, a otprilike svakog minuta u
  pozadini. Tada ih pušta, i grupa se prikazuje na njihovom telefonu.
- **Ulazak u grupu:** **Svi koji imaju link** ili **Admin odobrava ulazak**: tada onaj ko traži čeka pod **Zahtjevi
  za pridruživanje** da vi ili neki admin dodirnete **Primi** ili **Odbij**. Vaš telefon ga ipak pušta, kad to čuje.
- **Admini:** pod **Članovi** dodirnite **Moderiraj** pored člana, a zatim **Postavi za admina**. Admini isključuju
  pisanje, uklanjaju i zabranjuju pristup članovima, puštaju one koji traže i brišu poruku za sve; samo vi moderirate
  admine, a vas ne moderira niko.
  - **Isključi mikrofon:** njegov telefon ništa ne šalje u grupu, a nijedan telefon ionako ne prikazuje ono što
    njegov pošalje. **Dozvoli pisanje** to poništava.
  - **Ukloni:** od tada ne čita ništa što se u grupi kaže i može ponovo zatražiti ulazak putem linka.
  - **Zabrani pristup:** uklonjen je, a ono što njegov telefon kasnije traži odbija se. **Ukloni zabranu**, pod **Pod
    zabranom**, to poništava. Zabrana zaustavlja isti telefon, a ne nekoga ko se vrati s novim redom na relayu: protiv
    toga izaberite **Admin odobrava ulazak** ili promijenite link.
  - **Obriši za sve:** posljednje poruke navedene su na dnu; **Obriši** uklanja jednu s telefona svakog člana. Ko ju
    je već pročitao, možda je sačuvao kopiju.
- **Promijeni link:** link i QR kod koji su dosad podijeljeni odmah prestaju raditi, a svaki član dobija novi.
  Zahtjevi koji još čekaju na starom gube se.
- **Predaj grupu:** pod **Moderiraj** nekog člana. Njegov telefon je od tada vlasnik i pušta ljude, pa se link mijenja
  u link na njegovom relayu; vi ostajete admin. Ako se vaš telefon izgubi prije nego što je predate, niko više ne može
  nikoga pustiti, iako grupa ide dalje za one koji su u njoj.
- **Zatvori grupu** uklanja sve članove. **Napusti grupu** nekog člana traži od vašeg telefona da ga ukloni.
- **Najviše 100 članova,** jer cijela grupa mora stati u jednu poruku koja nekoga pušta unutra.
- **Svaki telefon u javnoj grupi treba ovu verziju Erevosa.** Grupe napravljene od kontakata rade kao i prije.

**Zašto:** samo telefon vlasnika mijenja grupu i pušta ljude, pa se promjene nikad ne sudaraju i nijedan server ne
mora slagati ih po redu. Zato grupa ide dalje i bez njega, ali niko novi ne ulazi: predajte je prije nego što
promijenite telefon.

### Šta javna grupa otkriva

> Svako ko ima link može čitati grupu od trenutka kad ga puste, nikad ono što je rečeno prije, a link se može
> proslijediti dalje: promijenite ga da to zaustavite.

- **Link** svakome ko ga vidi pokazuje ime grupe i adresu vašeg relaya.
- **Svaki član vidi svakog člana:** izabrano ime, ključ napravljen samo za ovu grupu, adresu njegovog relaya i
  identifikator pošiljaoca njegovog reda. Ključ ne govori ništa o tome ko je u svojim razgovorima, niti u kojim je
  drugim grupama. Red je onaj na kojem čitaju samo njegove javne grupe, a ne onaj iz njegovog linka za kontakt, isti u
  svakoj njegovoj javnoj grupi (Erevos prije verzije 2.0.0 navodi onaj iz svog linka za kontakt).
- **Imena su izabrana, a ne dokazana:** svako se može nazvati kako god hoće. Početak ključa svakog člana prikazuje se
  pored imena, a vlasnik i admini su označeni.
- **Sve što se kaže može kopirati** svako u grupi: šifriranje s kraja na kraj drži vani relaye, a ne članove.
- **Relayi** ništa ne čitaju i ne saznaju nikoga u grupi. Vaš vidi zahtjeve kako stižu na vrata grupe, koliko ih je i
  kada, ali ne i od koga. Članovi mogu puniti redove jedni drugima onim što se ne može pročitati, do onoliko koliko
  relay prima.

## Kako Erevos bira put {#paths}

Kad pošaljete poruku, Erevos sam bira put:

1. **Telefon te osobe je u blizini** (na vrhu razgovora piše **U blizini**): poruka ide preko veze u blizini, a i
   preko relaya kad on postoji.
2. **Inače, s relayem:** ide preko relaya, a kratka poruka ide i Erevos telefonima povezanim u blizini, pa telefon te
   osobe može odgovoriti u blizini ako je jedan od njih. Ako relay nije dostupan, važi ta kopija, a ti telefoni je
   prenose i do relaya vašeg kontakta, kao u [Razgovor s telefonom u blizini](#nearby).
3. **Inače, bez relaya,** ide Erevos telefonima povezanim u blizini, kao u koraku 2.
4. **I preko LoRa veze,** kad je postavljen radio, a relay nije mogao preuzeti tekst, kao u [Preko LoRa
   radija](#lora). Ako nema nikakvog puta, poruka čeka, označena s **Na čekanju**, i odlazi sama čim se put pojavi,
   kao u [Poslano, stiglo i pročitano](#relay); linija ispod razgovora kaže zašto.

Svaki put je šifriran s kraja na kraj: nijedan relay ni telefon između ne može pročitati ono što šaljete.

| Linija ispod razgovora | Šta uraditi |
| --- | --- |
| **Poslano u blizini, šifrirano s kraja na kraj.** | Ništa: telefon te osobe je u blizini i ima poruku. |
| **Poslano preko relaya, šifrirano s kraja na kraj.** | Ništa: poruka je na putu. |
| **Poslano Erevos telefonima u blizini, šifrirano s kraja na kraj, jer relay nije dostupan.** | Stiže samo ako je jedan od njih telefon te osobe: sačekajte **✓✓** ili provjerite relay. |
| **… Ako njegov telefon nije među njima, oni poruku predaju njegovom relayu kad dođu do interneta, a isto radi i ovaj telefon.** | Ništa: stiže kad jedan od njih, ili ovaj telefon, dođe do interneta. Sačekajte **✓✓**. |
| **Poslano preko LoRa veze, šifrirano s kraja na kraj, jer relay nije dostupan.** | Stiže ako Erevos te osobe ima radio na istoj mesh mreži, u dometu: sačekajte **✓✓** ili provjerite relay. |
| **Na čekanju. Relay nije dostupan (ili Nema relaya), a telefon te osobe nije u blizini.** | Ništa: odlazi sama čim je relay ili telefon te osobe u blizini može preuzeti, a tada prikazuje **✓**. Bez relaya upišite njegovu adresu, kao u [Razgovor preko relaya](#relay), ili priđite telefonu te osobe. |
| **Na čekanju. Preduga je za LoRa vezu.** | Ništa: odlazi čim je relay ili telefon te osobe u blizini može preuzeti. Ili je pošaljite u kraćim dijelovima. |
| **Nije poslano. Relay više nema red ovog kontakta.** | Zamolite tu osobu da vam piše ili da vam da svoj novi link za kontakt. |
| **Ova verzija ne može šifrirati, pa su razgovori preko relaya isključeni.** | Ponovo izgradite aplikaciju: ova verzija je starija od svog šifriranja. |

## Vlastiti relay {#own-relay}

Relay koji sami pokrećete je najsigurniji, jer onaj ko vodi relay vidi ko se na njega povezuje. Izvorni kôd sadrži
sve u \`deploy/relay\`.

- **Na vlastitoj mreži:** pokrenite relay na računaru, otvorite port 7879 u njegovom zaštitnom zidu (firewall) i na
  svakom telefonu upišite \`ws://<njegova adresa>:7879\`. Kad završite, ponovo zatvorite port.
- **Na internetu:** server (VPS) s Debianom 12 ili Ubuntuom 22.04 ili novijim, ime domene (ili besplatno
  \`sslip.io\` ime) i otvoreni portovi 80 i 443. Jedna naredba instalira relay iza Caddyja, s certifikatom od Let's
  Encrypta i nasumičnim tokenom. Svaki telefon tada koristi \`wss://<vaša domena>\` i taj token. Ista naredba postavlja
  i relay za pozive, kojem trebaju otvoreni i port 3478 i UDP portovi od 50000 do 50999.

Redovi i poruke na čekanju čuvaju se na disku servera, kao i šifrirani dijelovi fotografija i datoteka dok se ne
preuzmu (ukupno najviše 1024 MB), pa ponovno pokretanje ništa ne gubi, a nijedan zahtjev se ne zapisuje.
Poruke poslane za kasnije također se tamo čuvaju do svog vremena, najviše 10.000 ili 256 MB: relay vidi kada svaka
treba otići, ali ne i šta kaže.

**Zašto:** ono što relay čuva ima ograničenja, pa telefoni koji ga koriste ne mogu napuniti njegov disk ni memoriju.

**Njegov vlastiti ključ:** datoteka s ključem relaya (\`EREVOS_RELAY_KEY\`, koju postavlja ta jedna naredba) je ono što
on dokazuje pri svakoj vezi, pa ga telefoni prepoznaju po tom ključu, a ne po certifikatu (pogledajte [Vlastiti ključ
relaya](#relay)). Čuvajte tu datoteku, i u njegovim rezervnim kopijama: s novom datotekom, svaki telefon koji je znao
stari ključ odbija relay dok neko na njemu ne dodirne **Ima novi ključ**.

**Pozivnice:** relay može svakom telefonu dati vlastiti token, u datoteci tokena, a zatim tim telefonima dozvoliti da
pozivaju druge, svaka pozivnica za jedan telefon (pogledajte [Pozivnice na relay](#relay)). Uključite to s
\`EREVOS_RELAY_INVITES=on\` pored \`EREVOS_RELAY_TOKENS\`; relay tada sam upisuje redove pozvanih telefona u tu
datoteku, s tim ko ih je pozvao i kada, a uklanjanje reda isključuje taj telefon, kao i telefone koje je on pozvao.
Putem pozivnica pušta najviše 100 telefona (\`EREVOS_RELAY_MAX_INVITED\`). Ko je koga pozvao određuje token, a ne ime:
red stavljen umjesto drugog s novim tokenom isključuje telefone koje je pozvao stari, osim ako ih prvo ne oslobodi
\`erevos-relay free-line NAME\`, pokrenuto dok je relay zaustavljen. Telefon koji dođe s tokenom relaya
(\`EREVOS_RELAY_TOKEN\`) jednom traži vlastiti red, koji relay dodaje kao jedan od vaših, uz napomenu da je došao s
tokenom relaya i kada, najviše 50 dnevno: tako možete dijeliti taj token, obrisati red bilo kojeg pojedinačnog
telefona, a zatim promijeniti token bez isključivanja ostalih. \`deploy/relay/README.md\` kaže kako.

**Prijava:** s datotekom tokena relay može dozvoliti telefonima i da se prijave preko OpenID Connect pružaoca usluge,
kao što je Authentik, za vlastiti token, a svaki nalog provjerava svakog sata, uklanjajući njegove telefone nakon 3
dana bez odgovora i još dvije neuspjele provjere svakog telefona u razmaku od sat vremena (pogledajte [Prijava na
relay](#relay)). Jedan preglednik može pokrenuti 10 prijava u minuti. S \`EREVOS_RELAY_OIDC_GROUP\` mogu samo nalozi
iz te grupe.
Potrebni su klijent kod pružaoca usluge, nekoliko postavki i \`/signin/\` proslijeđen relayu kao običan HTTP:
\`deploy/relay/README.md\` kaže kako.

> Nikad ne objavljujte token tamo gdje ga drugi mogu pročitati. Onaj ko vodi server vidi IP adrese koje se povezuju,
> identifikatore redova, te kada i koliko stiže. Ne može čitati poruke, koje su šifrirane s kraja na kraj.

## Kućni relay {#home-relay}

Pod **Postavke** → **Relay i mreže** → **Kućni relay** prostor može imati drugi relay s vlastitim redom: relay kod
kuće, na Raspberry Piju ili starom računaru, ili bilo koji drugi relay kojem vjerujete. Nije obavezan.

- **Šta radi:** vaš link za kontakt i svaka poruka navode taj red pored vašeg relaya. Dok vaš relay nije dostupan,
  kontakti pišu tamo, a Erevos pri svakom pogledu preuzima ono što tamo stigne. Ono što šaljete ide preko njega kad
  vaš vlastiti relay ne radi.
- **Kako ga postaviti:** pokrenite relay kao u [Vlastiti relay](#own-relay), upišite njegovu adresu (i token, ako ga
  ima) i izaberite **Sačuvaj**. Kontakti ga saznaju iz vaše sljedeće poruke ili iz vašeg novog linka za kontakt.
- **Šta vidi:** ono što vidi vaš relay, adresu ovog telefona kad preuzima poruke, te kada i koliko stiže. Skriveni
  razgovori ga ne koriste.
- **Za skrivene razgovore:** svako skriveno mjesto može imati vlastiti kućni relay, pod **Za napredne korisnike** na
  svom ekranu kad nije izabran nijedan razgovor, dok je otvoreno. Čuva se samo s tim mjestom, zapečaćen njegovim
  PIN-om, pa prostor ne zna ništa o njemu, a gleda se dok je mjesto otvoreno. Koristite drugi relay, a ne relay
  prostora: jedan relay koji vidi oba reda povezao bi ih.

## Preko Tora {#tor}

Pod **Postavke** → **Relay i mreže** → **Tor**, **Što ide preko Tora** određuje koji zahtjevi ovog prostora prema
njegovim relayima idu preko mreže Tor. Svaki prostor ima vlastiti izbor:

| Izbor | Šta ide preko Tora |
| --- | --- |
| **Poruke** | Ako to ne promijenite. Ono što pišete i ono što vašim kontaktima nešto javlja, na primjer da je poruka pročitana. Slike, datoteke i glasovne poruke idu direktno, što je brže: za njih relay vidi IP adresu vašeg telefona. |
| **Sve** | I datoteke. Ništa ne ide na relay bez Tora. |
| **Ništa** | Relay vidi IP adresu vašeg telefona za sve. |

**Zašto:** s **Poruke**, ono što pišete skriva Tor i nikad ne čeka na njega, dok slike, datoteke i glasovne poruke,
koje su velike, idu direktno, pa time i brže.

- **Šta skriva:** relay više ne vidi IP adresu vašeg telefona, samo izlaz iz Tora (ili ništa, za relay s
  \`.onion\` adresom). Vaša telefonska kompanija ili Wi-Fi mreža vide samo da koristite Tor, ali ne i koji relay.
- **Šta košta:** ono što ide preko Tora sporije stiže i odlazi, a prvo pokretanje Tora traje neko vrijeme. Ekran
  pokazuje dokle je Tor stigao. Da bi štedio bateriju, Erevos šalje smanjeno popunjavanje koje je Tor napravio za
  telefone: popuna koju Tor šalje da sakrije kada razgovarate ide svakih 9 do 14 sekundi, a ne svakih nekoliko, i
  nikakva ne stiže na telefon.
- **Šta ne pokriva:** pozive, čiji zvuk i slika idu direktno između telefona ili preko relaya za pozive; telefone u
  blizini i SMS, koji ne koriste internet.
- **Samo na Androidu:** Erevos na računaru i web-aplikacija još nemaju Tor, pa tamo sve ide direktno.

> S **Poruke**, poruka nikad ne čeka na Tor: poruka koju Tor nije mogao odnijeti do relaya odmah ide direktno, kao i
> poruke dok se Tor pokreće, ili minut nakon što nije mogao doći do relaya; zatim se Tor ponovo pokušava. S **Sve**,
> ništa ne ide na relay bez Tora:
> kad Tor ne može doći do relaya, poruka čeka i ponovo se pokušava; Erevos se nikad sam ne vraća na vašu vlastitu
> vezu.

### Mostovi

Tamo gdje je sam Tor blokiran, **Mostovi** na istom ekranu omogućavaju Toru da umjesto toga do svoje mreže dođe preko
mostova. Postavljeno je na **Bez mostova** dok ne izaberete drukčije, svaki prostor ima vlastiti izbor, a važi samo
dok nešto ide preko Tora.

| Izbor | Šta je to |
| --- | --- |
| **obfs4** | Obfs4 mostovi s kojima dolazi Tor Browser. Onome ko prati mrežu Tor izgleda kao nasumični bajtovi. Cenzor koji ih zna može ih blokirati. |
| **Pahulja** (Snowflake) | Preko preglednika volontera, preko WebRTC-a, onako kako ide videopoziv. Da ga pronađe, Erevos pita Snowflakeov posrednik (broker) preko CDN-a, iza imena druge stranice, a STUN serveri kažu telefonu njegovu vlastitu adresu: vide tu adresu, nikad vaše poruke. Sporije, i teško ga je blokirati. |
| **Vlastiti** | Redovi mostova s bridges.torproject.org, s bridges@torproject.org putem e-maila ili od @GetBridgesBot na Telegramu, zalijepljeni jedan po redu; zatim dodirnite **Koristi ove mostove**. Rade obfs4, Snowflake, WebTunnel, meek i obični mostovi. |

- **Samo preko njih:** s mostovima Tor nikad ne ide direktno do svojih relaya. Kad nijedan most ne odgovara, s **Sve**
  poruke čekaju, kao kad Tor ne može doći do relaya; s **Poruke** idu na relay bez Tora dok neki most ne odgovori.
  Redovi koji nisu mostovi ne prihvataju se, i Tor ostaje isključen.
- **Njihova promjena** dok Tor radi zatvara njegove veze i ponovo ih pravi na novi način.
- **Samo na Androidu:** aplikacija sadrži lyrebird, Torov vlastiti program za obfs4, Snowflake, WebTunnel i meek.
  Računar i web-aplikacija još nemaju Tor, pa nemaju ni mostove.

## Preko Nostra {#nostr}

Pod **Postavke** → **Relay i mreže** → **Nostr**, **Tekstovi preko Nostra** je **Uključeno** dok to ne promijenite.
Tada ono što pišete kontaktu čiji Erevos također čita na Nostru ide preko javnih Nostr relaya, preko Tora, umjesto
preko vašeg relaya. Svaki prostor ima vlastiti izbor i vlastite Nostr relaye.

- **Kako je zapečaćeno:** šifrirano s kraja na kraj kao i uvijek, zatim zapečaćeno još jednom za ključ koji je vaš
  kontakt dao samo ovom razgovoru, i potpisano ključem napravljenim samo za taj jedan tekst (NIP-59 gift wrap). Nostr
  relayi vide da je neko pisao ključu koji ne imenuje nikoga, kada i koliko veliko; ne vide ko je pisao, ni kome. Vaš
  relay to uopće ne vidi.
- **Šta Nostr relayi mogu saznati:** vaš telefon traži od svakog od njih sve svoje ključeve odjednom, preko Tora:
  relay može saznati da se ti ključevi čitaju zajedno, ali nikad odakle. Do svakog relaya dolazi se vlastitim Tor
  krugovima, pa nijedan izlaz iz Tora ne prenosi ono što ide do dva relaya, i nijedan ne može saznati da je to od
  jednog telefona. Neki relayi odbijaju neke izlaze iz Tora, a neki izlazi ne mogu doći do nekog relaya: nakon takvog
  neuspjeha sljedeći pokušaj ide preko drugog izlaza.
- **Samo preko Tora:** kad je Tor postavljen na **Ništa**, ili dok se Tor pokreće, tekstovi idu preko vašeg relaya.
- **Relayi:** relay.damus.io, nos.lol i relay.primal.net, ako ih ne promijenite; možete dodati vlastite, najviše pet.
  Vašim kontaktima se javljaju relayi na kojima čitate, i oni vam tamo pišu; dovoljan je jedan koji preuzme tekst.
- **Šta ostaje na vašem relayu:** slike, datoteke, glasovne poruke, pozivi, reakcije i oznake da je poruka stigla ili
  pročitana; i ono što pišete kontaktima na iPhoneu ili računaru, koji ne čitaju na Nostru.
- **Kojim je putem išla:** zadržite prst na poruci: njen meni kaže **Poslano preko Nostra** ili **Stiglo preko
  Nostra** kad ju je preuzeo neki Nostr relay. Poruka koja ništa ne kaže išla je preko vašeg relaya, ili u blizini.
  I napomena ispod poruka kaže **Poslano preko Nostra**. Dva telefona jedan pored drugog prvo predaju jedan drugom
  tekstove u blizini: da isprobate Nostr, isključite Bluetooth i **Pronađi Erevos na istoj Wi-Fi mreži** na oba.
- **Što su relayi zadnje učinili:** ekran **Nostr** za svaki relay pokazuje je li preuzeo posljednji tekst koji je
  dobio i koliko sekundi nakon toga, ili zašto nije, te čita li vaš telefon na njemu. Čuva se samo na ovom telefonu,
  dok se Erevos ne zatvori. Relay koji je preuzeo tekst, ali to nije rekao u roku od 20 sekundi, računa se kao da ga
  nije preuzeo: tekst tada ide i preko vašeg relaya, a vaš kontakt ga vidi jednom.
- **Samo na Androidu,** kao i Tor.

**Zašto:** Nostr relayi su javni, pa Erevos do njih dolazi samo preko Tora, i oni nikad ne saznaju gdje je vaš
telefon. Tamo idu samo tekstovi: tekst ima vaš relay kao rezervu, ako ne stigne, dok oznake da je poruka stigla ili
pročitana ne bi imale nikakvu, a poruci poslanoj za kasnije potreban je vaš relay da je čuva do njenog vremena. Slike i
glasovne poruke preko Nostra tek dolaze.

> Ako telefon vašeg kontakta u roku od pet minuta ne javi da je tekst stigao, on ide i preko vašeg relaya, a kontakt
> ga vidi jednom. Kad ga nijedan Nostr relay ne preuzme, odmah ide preko vašeg relaya.

- **Skriveni razgovori:** i oni čitaju na Nostru, dok su otvoreni, a i zatvoreni dok je za njih uključeno **Primanje
  dok su zatvoreni** i dok je prostor otvoren (pogledajte [Skriveni razgovori](#hidden)). Zatvoreni i dalje
  prikazuju „New message“: sa svakim tekstom preko Nostra vaš kontakt vašem relayu šalje i zvono, poruku koja ništa
  ne kaže, koju vaš relay broji kao jednu, kao i prije. Bez relaya, njihov link za kontakt i QR kod kažu gdje čitaju
  na Nostru, s ključem samo tog mjesta, a tekstovi, reakcije i oznake da je poruka stigla idu tamo, kao s telefona
  bez relaya.

### Bez ikakvog relaya {#nostr-only}

Telefon bez relaya, bez pozivnice i bez LPHL naloga ipak može početi: njegov link za kontakt i QR kod kažu gdje čita na
Nostru, i to je dovoljno za razgovor.

- **Da počnete:** u ekranu **Novi razgovor** dodirnite **Počnite bez relaya**, zatim **Prikaži moj QR kod** ili
  **Podijeli moj link za kontakt**, i dajte ga nekome ko koristi Erevos. Onaj ko ga doda piše vam preko Nostra, preko
  Tora, i prikazuje se kao zahtjev za razgovor, koji prihvatate. I vi možete dodati njegov link ili QR kod, na isti
  način.
- **Šta ide:** tekstovi, naljepnice, reakcije, izmjene i oznake da je poruka stigla ili pročitana, sve preko Nostra.
  Za fotografije, glasovne poruke, datoteke, pozive i grupe potreban je relay, ili drugi telefon u blizini. Skriveni
  razgovori i tako rade, samo preko Nostra (pogledajte [Skriveni razgovori](#hidden)).
- **Kad ne stigne:** Nostr relayi čuvaju tekst dva dana. Dok telefon vašeg kontakta ne javi da je stigao, Erevos mu ga
  ponovo daje jednom dnevno, dvije sedmice.
- **Relay sam od sebe:** kad vaš kontakt ima relay koji mu dozvoljava da poziva, njegov Erevos sam šalje vašem
  pozivnicu za njega, jednom, u razgovoru, bilo da ste se prvi put sreli preko Nostra ili u blizini, preko Bluetootha,
  Wi-Fi mreže ili QR koda. Vaš telefon je sam prihvata, i od tada rade i fotografije, glasovne poruke i pozivi, sa
  svima. Računa se kao jedna od njegovih pozivnica. Neko čiji zahtjev za razgovor niste prihvatili ne bira relay za
  vas: njegova pozivnica čeka dok ga ne prihvatite, najviše sedmicu.
- **Stariji Erevos** ne čita Nostr dio linka: dopire do vas samo u blizini, dok ne budete imali relay.

**Zašto:** Nostr je samo način ulaska. Nikome ne treba pozivnica da počne, a kad jedno od vas ima relay, on prenosi
ono što je preveliko za Nostr.

## Matrix {#matrix}

U **Postavke** → **Relay i mreže** → **Matrix**, prostor se može prijaviti na Matrix račun, za razgovor s ljudima koji
koriste Element ili drugu Matrix aplikaciju. Erevos sam razgovara s Matrix serverom, kao Element: nikakav most nije
između.

- **Prijava:** vaš Matrix ID, kao @ime:matrix.org, i njegova lozinka. Erevos postaje novi uređaj računa, nazvan
  Erevos. Prijava i ključevi uređaja čuvaju se šifrovani samo u ovom prostoru, nikad u njegovim skrivenim razgovorima,
  i još ne u rezervnim kopijama.
- **Razgovori:** **Novi razgovor** počinje šifrovani razgovor s Matrix ID-om. Pozivi se prikazuju prvi, s
  **Pridruži se** i **Odbij**.
- **Šifrovanje:** poruke su šifrovane s kraja na kraj Matrixovim vlastitim šifrovanjem (Olm i Megolm, kroz
  vodozemac). Razgovor koji nije šifrovan to kaže.
- **Nije anonimno:** Matrix server vidi vaš račun, ko s kim razgovara, kada, i odakle. U razgovoru s ljudima na
  drugim serverima, vide to i ti serveri.
- **Poruke od prije:** poruka poslana prije nego što se Erevos prijavio, ili ona čiji ključ još nije stigao, prikazuje
  se zaključana.
- **Fotografije i datoteke:** **Fotografija** i **Datoteka** ih šalju, do 50 MB, šifrovane na telefonu prije nego što
  odu na Matrix server, koji tako čuva samo ono što ne može pročitati. Primljena fotografija preuzima se tek kad
  dodirnete **Prikaži fotografiju**; **Sačuvaj** čuva bilo koju datoteku na telefonu.
- **Još ne:** glasovne poruke, pozivi, i provjera nečijih uređaja emojijima.

**Zašto:** Erevosovi vlastiti razgovori skrivaju ko s kim razgovara; Matrix server to ne može. Zato su Matrix
razgovori odvojeni i označeni, za ljude do kojih biste inače došli samo preko Matrixa.

## SMS {#sms}

Na Androidu Erevos može biti SMS aplikacija telefona: pod **Postavke** → **Telefon i SMS** → **SMS** → **Erevos kao
SMS aplikacija** dodirnite **Postavi Erevos kao SMS aplikaciju**. Početni ekran tada prikazuje SMS i Erevos razgovore
na jednom popisu.

> **Erevos ne šifrira SMS i MMS poruke.** One putuju kao i svaki SMS i ostaju u Androidovoj vlastitoj pohrani SMS
> poruka, gdje ih vidi svaka aplikacija kojoj je dozvoljeno čitanje SMS poruka i gdje ih sadrže Androidove rezervne
> kopije. Samo su Erevos razgovori šifrirani s kraja na kraj.

- **SMS poruke od ranije:** nema ničeg za uvoz. Erevos prikazuje SMS i MMS poruke koje su već na telefonu, iz
  Androidove vlastite pohrane, gdje ostaju za svaku drugu SMS aplikaciju. Android ih čuva, a Erevos ih ne zapečaćuje,
  kao i kod svake SMS aplikacije.
- **Ako Erevos ne postane SMS aplikacija:** Android 15 i noviji to može uskratiti aplikaciji instaliranoj iz
  preglednika. Pod **Postavke** → **Telefon i SMS** → **SMS** → **Erevos kao SMS aplikacija** dodirnite **Otvori
  zadane aplikacije** → **SMS aplikacija** → Erevos. Ako Android kaže da je to ograničena postavka, otvorite
  **informacije o aplikaciji Erevos**, dodirnite **⋮** gore desno → **Dozvoli ograničene postavke** i ponovo izaberite
  Erevos.
- **Kad stigne SMS:** obavijest kaže „New message“, bez toga ko ga je poslao ili šta kaže. Ako nikakva ne stiže,
  **Erevos kao SMS aplikacija** prikazuje **Dozvoli obavijesti** dok ih Android uskraćuje.
- **Jednokratni kodovi:** SMS koji kaže da sadrži kôd (banke, prijave), na bilo kojem od jezika aplikacije, dobija
  **Kopiraj kod** ispod sebe u razgovoru, a i na svojoj obavijesti, a da se kôd tamo ne prikazuje; na Androidu 12 i
  novijem dugme na obavijesti prvo traži da otključate telefon. Kopira se samo njegovih 4 do 8 cifara, nikad broj
  telefona, iznos, datum ili vrijeme, a Android ih ne prikazuje u pregledu. Svaka aplikacija koja čita međuspremnik
  može ih pročitati, pa kôd zalijepite što prije.
- **Ako se ne prikazuju SMS poruke:** Android 15 i noviji uskraćuje dozvolu za SMS aplikaciji instaliranoj iz
  preglednika. Pod **Postavke** → **Telefon i SMS** → **SMS** → **Erevos kao SMS aplikacija** dodirnite **Dozvoli
  SMS**. Ako Android kaže da je to ograničena postavka, otvorite **informacije o aplikaciji Erevos**, dodirnite **⋮**
  gore desno → **Dozvoli ograničene postavke** i dozvolite SMS pod **Dozvole**. Razgovori poslani kao RCS („chat“ u
  Google Messages) ostaju u toj aplikaciji i ne prikazuju se. **Erevos kao SMS aplikacija** kaže koliko SMS razgovora
  Erevos čita, ili zašto ih nije mogao pročitati.
- **Pisanje nekome ko ima Erevos:** ide preko Erevosa, šifrirano s kraja na kraj, čim je njegov broj povezan s
  njegovim kontaktom. Povežite ga ručno u SMS razgovoru, ili neka ga pronađe skrivena pozivnica. Od tada njegov SMS
  razgovor otvara njegov razgovor.
- **Njegove SMS poruke u razgovoru:** SMS i MMS poruke s njegovim brojem, one od ranije i one koje stižu, prikazuju se
  među porukama razgovora po vremenu, svaka uokvirena i označena sa **SMS (nije šifriran)**, sa svojim ✓ i svojim
  fotografijama. Zadržite prst na jednoj da je kopirate, proslijedite ili obrišete, kao u SMS razgovoru. Ostaju u SMS
  porukama telefona, nikad u zapečaćenoj historiji razgovora; prikazuje se samo razgovor s tim jednim brojem, ne i
  grupni MMS, i samo dok je Erevos SMS aplikacija ili smije čitati SMS poruke, nikad u skrivenim razgovorima.
  Najnovije se prikazuju prve: **Prikaži ranije SMS poruke**, iznad njih, donosi još, a i pretraga razgovora ih
  pronalazi. Otvaranje razgovora čita sve njegove, i ranije, pa nijedna ne ostaje u broju na početnom ekranu. Broj na
  kartici njegovog kontakta radi isto, a da ga ne povezuje.
- **Običan SMS toj osobi:** na primjer kad nema interneta. **Običan SMS** u **Detalji** razgovora otvara njen SMS
  razgovor da ga tamo napišete, a **+** → **Pošalji kao SMS**, ili **Kao SMS** kad zadržite prst na strelici za
  slanje, šalje ono što ste upisali kao SMS, nakon pitanja. U razgovoru se prikazuje kao SMS. Telefonska kompanija ga
  može pročitati. SMS ne može nestati niti odgovoriti na poruku: s uključenom štopericom, ili kad se odgovara na
  poruku, Erevos to kaže kad pita.
- **Skrivene pozivnice:** s prvim SMS-om na broj koji nije kontakt, Erevos šalje i kratku skrivenu pozivnicu. Nijedna
  ne ide na broj Erevos kontakta, povezan ili na kartici njegovog kontakta. Telefon bez Erevosa ne prikazuje ništa;
  telefon s Erevosom odgovara preko relaya i njih dvoje postaju kontakti. Svaki broj se pita najviše jednom mjesečno,
  a **Isključi pozivnice**, pod **Postavke** → **Telefon i SMS** → **SMS** → **Pronađi Erevos na broju**, ih
  zaustavlja.

**Zašto:** kako bi se dva Erevos telefona pronašla samo na osnovu broja telefona, bez servera koji zna brojeve.
Pozivnica je podatkovni SMS, koji aplikacije za poruke ne prikazuju, pa telefon bez Erevosa ne prikazuje ništa.

- **Svi ostali:** običan SMS, označen kao SMS. Telefonska kompanija ga može pročitati, kao što čita svaki SMS.
- **✓ i ✓✓✓:** vaš SMS prikazuje ✓ kad ode, a ✓✓✓ kad izvještaj mreže o isporuci kaže da je stigao na telefon te
  osobe, ili „nije isporučeno“. Neke telefonske kompanije ne šalju izvještaje o isporuci; tada ostaje ✓. SMS ne može
  reći je li pročitan.
- **Fotografije (MMS):** slika ispred polja za poruku (**Fotografija**) dodaje fotografiju, smanjenu da stane u jedan
  MMS (oko 280 KB), bez ičega u njoj osim same slike. Fotografije koje stignu MMS-om prikazuju se u razgovoru. MMS je
  jednako običan kao i SMS: telefonska kompanija ga može vidjeti.
- **Grupni MMS:** pod **Postavke** → **Telefon i SMS** → **SMS** → **Novi SMS** upišite nekoliko brojeva odvojenih
  zarezima i dodirnite **Napiši**. Svaka poruka ide svima njima kao jedan MMS, pa i sam tekst, a njihovi odgovori
  stižu u isti razgovor, svaki s autorom. Svi u njemu vide svačiji broj, a telefonska kompanija vidi sve.
- **Dvije SIM kartice:** SIM kartica za slanje prikazuje se iznad polja za poruku; jednom dodirnite **Izaberi SIM
  karticu** da Erevosu dozvolite da ih vidi. Vaš izbor se čuva za taj broj; do tada Erevos odgovara preko SIM kartice
  na koju je stigla posljednja poruka. Svaka poruka prikazuje svoju SIM karticu.
- **SMS kasnije:** zadržite prst na okruglom dugmetu **Pošalji** iza polja i izaberite vrijeme, kao u razgovoru. SMS
  se prikazuje na kraju razgovora označen sa **Zakazano**; dodirnite ga da ga otkažete. Odlazi u to vrijeme, i kad je
  Erevos zatvoren i zaključan; ako je telefon tada isključen, čim se ponovo uključi i otključa. Do tada nije u SMS
  porukama telefona, gdje bi ga druge aplikacije vidjele, a telefonska kompanija ga nema. Čeka zaključan ključem samog
  telefona (Android Keystore), a ne lozinkom vašeg prostora, jer ga Android mora poslati dok je Erevos zaključan: to
  je zaštita koju svaki SMS ima kad se pošalje, jer poslani SMS ostaju u SMS porukama telefona. Samo tekst, na jedan
  broj.
- **Linkovi:** web adresa u SMS-u je podvučena i otvara se kao u razgovoru, kad je vidite cijelu.
- **Imena iz vaših kontakata:** na početku isključeno, pa se SMS brojevi prikazuju kao brojevi. **Imena**, iznad
  popisa, ih otključava (kao i **Prikazuj imena iz mojih kontakata** pod **Postavke** → **Telefon i SMS** → **SMS** →
  **Imena iz vaših kontakata**): imena koja kontakti vašeg telefona daju SMS brojevima i slike koje za njih imaju, ili
  inače one vaših kontakata koji se čuvaju samo u Erevosu, na popisu i u razgovoru. Ponovo dodirnite **Imena** za samo
  brojeve. Erevos ih samo čita da bi ih prikazao i ne čuva nikakvu kopiju.
- **Pošiljaoci s imenom:** SMS od imena umjesto broja, kao od banke, otvara se za čitanje, ali se na njega ne može
  odgovoriti.

### Održavanje reda u SMS porukama

- **Zadržavanje prsta:** na popisu zadržite prst na SMS razgovoru za ono što s njim možete: **Prikvači na vrh**,
  **Arhiviraj**, **Označi kao spam**, **Blokiraj** i **Obriši**, te **Dodaj u kontakte** za broj koji nije nijedan od
  vaših kontakata. U razgovoru **⋮** na vrhu prikazuje isto, a takav broj ima **Dodaj u kontakte** i ispod svog imena:
  novi kontakt s tim brojem.
- **Prikvačeno:** do 10 SMS razgovora ostaje na vrhu popisa, prikvačeno. **Otkvači** vraća jedan na njegovo mjesto.
- **Arhivirani razgovori:** izvan popisa, pod **Arhivirano** na vrhu početnog ekrana. Razgovor se sam vraća na popis
  kad od te osobe stigne novi SMS, ili s **Vrati iz arhive**.
- **Otpad:** obrisani razgovor čeka u **Otpad** 30 dana, a zatim ga Erevos briše iz SMS poruka telefona. Do tada ga
  **Vrati** vraća na popis; **Obriši sada** i **Isprazni otpad** brišu odmah, zauvijek. SMS koji stigne nakon što je
  razgovor otišao u otpad ponovo se prikazuje na popisu. Samo SMS aplikacija smije brisati SMS poruke.
- **Spam:** filter koji radi samo na telefonu, po pravilima, i ništa nikud ne šalje. SMS s broja koji nije kontakt i
  kojem nikad niste odgovorili ide u **Spam** kad ima link s riječima koje pokušavaju prevariti, kao zadržani paket
  ili nagrada, ili jednu od riječi koje dodate pod **Postavke** → **Telefon i SMS** → **SMS** → **Filter spama**.
  **Označi kao spam** i **Nije spam** zauvijek odlučuju za neki broj. Obavijest i dalje kaže „New message“ kad stigne
  spam, jer se prikazuje prije nego što se Erevos otvori. Svaki razgovor u **Spam**, u folderu i na vrhu razgovora,
  kaže zašto je tamo: broj je blokiran, vi ste ga označili, vaše pravilo navodi pošiljaoca, broj iz inostranstva, vaša
  riječ, ili link i koje riječi.
- **Pravila o pošiljaocima:** pod **Filter spama**, **Pošiljaoci** prima ime pošiljaoca, kakva šalju trgovine i banke
  (slova, bez dijakritičkih znakova i bez razlike velikih i malih), ili broj, gdje \`*\` znači bilo šta:
  \`+4470*\` je svaki broj koji tako počinje, \`1234*\` svaki kratki broj koji tako počinje, a s poznatim pozivnim
  brojem vaše zemlje, \`69*\` je i svaki broj \`+3069...\`. **U spam** šalje njihove poruke tamo; **Propusti** na njih
  ne primjenjuje pravila filtera, kao za vašu banku ili porodicu, iako broj koji ste označili kao spam, ili blokirali,
  i dalje ide tamo. **Šalji brojeve iz inostranstva u spam** šalje tamo svaki broj napisan s drugim pozivnim brojem
  zemlje od **Pozivni broj vaše zemlje**, koji Erevos uzima iz brojeva kojima odgovarate, a vi ga možete promijeniti.
  Broj napisan bez pozivnog broja je odavde. Dodirnite pravilo da ga uklonite.
- **Blokiranje:** **Blokiraj** u meniju razgovora, ili **Postavke** → **Telefon i SMS** → **SMS** → **Blokirani
  brojevi**, stavlja broj na Androidov vlastiti popis blokiranih brojeva: Android odbija njegove SMS i MMS poruke i
  pozive, a svaki prostor i aplikacija za telefon vide isti popis. Samo SMS aplikacija ili aplikacija za telefon smiju
  ga vidjeti i mijenjati.
- **Nacrti:** ono što upišete, a ne pošaljete, ostaje uz taj razgovor, a popis to prikazuje kao **Nacrt**. SMS koji
  nije mogao otići također tamo ostaje kao nacrt.
- **Povlačenje SMS-a:** SMS koji pošaljete prvo čeka 5 sekundi na kraju razgovora: tada ga dodirnite da ga vratite u
  polje za poruku. **Postavke** → **Telefon i SMS** → **SMS** → **Povlačenje SMS-a** postavlja **Isključeno**, 5 ili
  10 sekundi. Kad napustite Erevos, odlazi odmah.
- **Pošalji ponovo:** vaša poruka koja nije otišla, ili nije isporučena, to kaže: dodirnite je da je ponovo pošaljete.
  Zadržite prst na bilo kojoj poruci za **Proslijedi**, **Pošalji ponovo** i **Obriši**, s njenim riječima za
  označavanje i kopiranje; obrisana poruka ima i **Poništi**.
- **Proslijedi:** zadržite prst na poruci → **Proslijedi**, zatim upišite broj i dodirnite **Napiši**, ili izaberite
  kontakt pod **U Erevos razgovor**. Otvara se u tom razgovoru, da je tamo pročitate i pošaljete. Na broj ide i njena
  slika, kao MMS; u razgovor samo njene riječi.
- **Svaki prostor svoje:** prikvačeni i arhivirani razgovori, otpad, oznake spama i nacrti pripadaju prostoru,
  zapečaćeni njegovom lozinkom. Same SMS poruke ostaju u SMS porukama telefona: drugi prostor ih vidi onakve kakve
  jesu, a razgovor koji je ovdje u otpadu tamo se prikazuje dok se ne obriše s telefona.

## Telefon {#phone}

Na Androidu Erevos može biti aplikacija za telefon: pod **Telefon** u meniju dodirnite **Postavke** → **Postavi Erevos
kao aplikaciju za telefon**. Svaki poziv se tada prikazuje na Erevosovom vlastitom ekranu za pozive, a tel: linkovi i
dugme za poziv na telefonu otvaraju Erevosovu tastaturu. **Telefon** se otvara i sa slušalice na vrhu početnog
ekrana, i ima vlastitu ikonu među aplikacijama telefona, **Telefon**, zelenu sa slušalicom na Erevosovom znaku, koja
otvara tastaturu. Svaka od njih, kao i tel: link, otvara ga kad je Erevos otključan: s lozinkom, nakon što je
upišete, osim ako se Telefon otvara bez nje (pogledajte Lozinka Erevosa, ispod). Do tada kartica na vrhu kaže
**Erevos nije aplikacija za telefon**; na malom telefonu prikazuje samo taj naslov, a dodir na njega otvara
**Postavke** Telefona.

- **Traži kontakte:** na vrhu Telefona upišite ime, broj ili dio jednog od njih: kontakti s brojem prikazuju se
  umjesto kartica, svaki broj u svom redu. Dodirnite jedan da ga pozovete, ili zadržite prst na njemu da ga stavite
  na tastaturu. Traži u kontaktima telefona i, kad je Erevos otključan, u onima koji se čuvaju samo u Erevosu i u
  vašim Erevos kontaktima s brojem; nikad u skrivenim razgovorima.
- **Ekran za pozive:** ko zove, ili koga vi zovete, s imenom i fotografijom koje mu daju kontakti vašeg telefona; dok
  je Erevos otključan, broj povezan s jednim od vaših Erevos kontakata prikazuje ime koje ste mu dali, kao i broj
  kontakta koji se čuva samo u Erevosu; broj kontakta otvorenih skrivenih razgovora, samo dok su otvoreni. Prikazuje
  se preko zaključanog ekrana i ne treba mu lozinka, jer se na poziv mora moći odgovoriti dok je Erevos zaključan.
  Dolazni poziv prikazuje **Answer**, **Decline** i **Message**, a Android zvoni
  vlastitom melodijom kontakta; tipke za jačinu zvuka ga utišavaju. U pozivu: **Mute**, **Keypad** za tonove koje
  traži neki meni, **Speaker**, **Hold**, **Add call** i **End**. Kad je telefon na uhu, ekran se gasi.
- **Kuda ide zvuk:** s Bluetooth uređajem ili slušalicama, dugme pored **Keypad** kaže kuda ide zvuk, a dodir vam
  omogućava da izaberete: telefon, zvučnik, slušalice ili Bluetooth uređaj.
- **Drugi poziv:** poziv koji stigne tokom poziva prikazuje **Hold and answer**, **End and answer** i **Decline**. Kad
  je poziv na čekanju, red ispod imena to kaže: dodirnite ga, ili **Swap**, da razgovarate s drugim. **Merge** spaja
  ta dva u jedan poziv, kad to vaša telefonska kompanija dozvoljava.
- **Odbijanje porukom:** **Message**, na pozivu koji zvoni, odbija ga brzim odgovorom, ili onim koji napišete, a vaš
  telefon ga šalje pozivaocu kao SMS; prikazuje se među vašim SMS porukama. Pod **Telefon** → **Postavke**, **Brzi
  odgovori** ih mijenja: **Dodaj odgovor**, **Ukloni**, **Sačuvaj** i **Koristi uobičajene odgovore**. Čuvaju se na
  telefonu, nezapečaćeni, jer ih ekran za pozive prikazuje dok je Erevos zaključan.
- **Tastatura:** pod **Telefon** upišite broj i dodirnite **Pozovi**; zadržite **0** za +. Kad zadržite prst na
  polju za broj, ono lijepi broj. **Add call**, tokom poziva, otvara tastaturu kad je Erevos otključan.
- **Dvije SIM kartice:** iznad **Pozovi** dodirnite SIM karticu preko koje zovete; prvi put **Izaberi SIM karticu**
  traži od Androida da Erevosu dozvoli da ih vidi. Broj koji pozovete bez izbora pita **Pozovi preko** koje. Erevos
  za svaki broj čuva SIM karticu koju ste koristili, zapečaćenu u prostoru, i sljedeći put zove preko iste. Ekran za
  pozive navodi SIM karticu svakog poziva.
- **Pozivi:** pod **Telefon**, **Nedavni** navodi Androidovu historiju poziva, najnovije prve, pod svakim danom: ko,
  kakav je bio poziv, preko koje SIM kartice i kako. **Svi**, **Propušteni**, **Dolazni**, **Odlazni** i, kad je neki
  poziv blokiran, **Blokirani** ih filtriraju; s dvije SIM kartice, **SIM 1** ili **SIM 2** zadržava pozive te SIM
  kartice. Uzastopni pozivi s istim brojem prikazuju se jednom, s brojem poziva. **☏** uzvraća poziv; dodir na red
  prikazuje njegove pozive, koliko je koji trajao, te **Pozovi** (s dvije SIM kartice, po jedno za svaku), **Pošalji
  SMS**, **Dodaj u kontakte** za broj koji nije nijedan od vaših kontakata, i **Izmijeni broj prije poziva**. Kad se
  tamo vide, propušteni pozivi nestaju iz Androidove obavijesti, a ta obavijest otvara **Nedavni**.
- **Brisanje poziva:** u pozivima reda, **Obriši ovaj poziv** (ili **Obriši ova 3 poziva**, za red od više njih)
  briše ih iz Androidove historije poziva, **Obriši** pored jednog od više njih briše samo taj, a **Obriši sve pozive
  s ovim brojem**, kad ih ima više, briše sve, i starije. Prvo se na nekoliko sekundi prikazuje **Poništi**; do tada
  su samo sakriveni.
- **Favoriti:** kontakti označeni zvjezdicom u kontaktima vašeg telefona, s njihovim fotografijama. Dodir poziva
  zadani broj kontakta, ili pita koji, kad ih ima više, a nijedan nije zadani; kad zadržite prst, prikazuje sve.
- **Wi-Fi pozivanje i HD glas:** ekran za pozive to kaže ispod imena kad poziv ide preko Wi-Fi mreže ili s HD glasom,
  a **Nedavni** to kaže za svaki poziv.
- **Blokiranje:** pod **Telefon** → **Postavke**, **Blokiraj telemarketing** blokira pozive s brojeva koje neke zemlje
  drže za telemarketing: Francuska (01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24, 04 25, 05 68, 05 69, 09 48,
  09 49 i od 09 475 do 09 479, po odluci ARCEP-a 2022-1583), Španija (400, od 17. oktobra 2026), Čile (809), Indija
  (140) i Brazil (0303, koji pozivaoci tamo smiju izostaviti od avgusta 2025). Druge zemlje nemaju takve brojeve, ili
  Erevos nije siguran da ih imaju, pa se za njih ništa ne blokira. Pod **Brojevi koji počinju s** upišite početak
  dodatnih brojeva za blokiranje, s pozivnim brojem zemlje (+33 162) ili onako kako ga ovdje birate (0162), i
  dodirnite **Blokiraj**; **Ukloni** uklanja jedan. Ovo nikad ne blokira broj iz kontakata vašeg telefona. Blokirani
  poziv ne zvoni i ne ostavlja obavijest; prikazuje se u **Nedavni**, pod **Blokirani**. Android jednom pita smije li
  Erevos filtrirati pozive (**Dozvoli Erevosu da filtrira pozive**): bez toga blokirani poziv zazvoni na trenutak
  prije nego što ga Erevos prekine. Ono što je blokirano isto je u svakom prostoru, pa ništa ne govori o drugom, i
  čuva se na telefonu bez imena.
- **Blokirani brojevi:** pod **Telefon** → **Postavke**, **Blokirani brojevi** je Androidov vlastiti popis, isti kao
  **Postavke** → **Telefon i SMS** → **SMS** → **Blokirani brojevi**: upišite broj i dodirnite **Blokiraj**, ili
  dodirnite jedan da ga odblokirate. U **Nedavni** pozivi reda prikazuju **Blokiraj ovaj broj** ili **Odblokiraj ovaj
  broj**, s **Poništi**. Android odbija njihove pozive prije nego što zazvone, kao i njihove SMS i MMS poruke. Svaki
  prostor vidi isti popis.
- **Grupa kontakata na neko vrijeme:** pod **Telefon** → **Postavke**, **Blokiraj grupu kontakata** navodi grupe
  (oznake) kontakata vašeg telefona. **Blokiraj** pored jedne blokira pozive njenih kontakata **Na sat vremena**,
  **Do sutra ujutro** (7:00) ili **Dok ne ukinem blokadu**; red ispod grupe kaže do kada, a **Ukini** to završava
  ranije. Takav poziv blokira se kao i ostali: ne zvoni, a prikazuje se u **Nedavni**, pod **Blokirani**. Erevos samo
  čita grupe i čuva identifikator grupe i vrijeme, ne i njeno ime. Dok je grupa blokirana, ekran **Telefon** to kaže
  na vrhu, do kada, s **Ukini**.

**Zašto:** poziv se filtrira i dok je Erevos zaključan, pa ono što je blokirano ne može biti zapečaćeno unutar
prostora; a kad je isto za svaki prostor, ne pokazuje ništa ni o jednom od njih.

- **Lozinka Erevosa:** ekran **Telefon**, s tastaturom, pozivima i favoritima, iza nje je kao i ostatak Erevosa. Samo
  ekran za pozive nije, osim ako ne dozvolite da se Telefon otvara bez nje: pod **Telefon** → **Postavke**, **Otvaraj
  Telefon bez lozinke** (na početku isključeno, a prikazuje se samo dok Erevos ima lozinku). Dok je Erevos
  zaključan, ikona Telefona, tel: link i obavijest o propuštenom pozivu tada otvaraju tastaturu, **Nedavni** i
  **Favoriti**, koje Android čuva za svaku aplikaciju za telefon, samo s imenima iz kontakata telefona: nikad onih
  koji se čuvaju samo u Erevosu ili onih iz skrivenih razgovora, i bez SIM kartice sačuvane za neki broj. Tamo možete
  zvati, ništa više: bez brisanja, blokiranja, SMS-a ili dodavanja u kontakte. **Otvori Erevos** na vrhu prikazuje
  ekran za lozinku, kao i Erevosova vlastita ikona nakon što je Erevos bio u pozadini više od 30 sekundi, osim ako ga
  je u pozadinu poslao poziv upućen odatle. **Drži Telefon iza lozinke** to isključuje.
- **Ako Erevos ne postane aplikacija za telefon:** kao i kod SMS-a, Android 15 i noviji to može uskratiti aplikaciji
  instaliranoj iz preglednika. Pod **Postavke** dodirnite **Otvori zadane aplikacije** → **Aplikacija za telefon** →
  Erevos. Ako Android kaže da je to ograničena postavka, otvorite **informacije o aplikaciji Erevos**, dodirnite
  **⋮** gore desno → **Dozvoli ograničene postavke** i ponovo izaberite Erevos. **Dozvoli pozive i kontakte** se
  prikazuje dok Android još uskraćuje pozive, historiju poziva ili kontakte.
- **Nakon ponovnog pokretanja telefona:** dok prvi put ne otključate telefon, odgovara Androidov vlastiti ekran za
  pozive.
- **Šta je telefonski poziv:** običan telefonski poziv, kao i kod svake aplikacije za telefon: prenosi ga telefonska
  kompanija i može ga prisluškivati. Pozivi vašim Erevos kontaktima iz razgovora su nešto drugo: šifrirani s kraja na
  kraj, preko interneta.

## Kontakti {#contacts}

Na Androidu, **Kontakti** u meniju prikazuje kontakte telefona: one u Androidovim vlastitim kontaktima, koje koriste i
vaše druge aplikacije, pa nema ničeg za uvoz. Android jednom pita smije li ih Erevos čitati i mijenjati (**Dozvoli
kontakte**). Otvaraju se i s osobe na vrhu početnog ekrana, i imaju vlastitu ikonu među aplikacijama telefona,
**Kontakti**, ljubičastu s osobom na Erevosovom znaku, koja ih otvara iza Erevosove brave: s lozinkom, nakon što je
upišete.

- **Pronalaženje nekoga:** **Traži kontakte** traži u svakom polju: imenima, brojevima (kako god da su napisani, sa ili
  bez pozivnog broja zemlje), e-mail adresama, adresama, firmi, rođendanu i bilješci. **Favoriti** prikazuje samo
  kontakte sa zvjezdicom.
- **Kontakt:** dodirnite jedan da vidite sve o njemu. Dodirnite broj da ga pozovete, ili **SMS** pored njega da mu
  pišete u Erevosu; dodirnite e-mail ili adresu da je otvorite. **Dodaj u favorite** na vrhu daje mu zvjezdicu, u
  Androidovim kontaktima, pa ga i aplikacija za telefon navodi među favoritima.
- **Novi kontakt** i **Uredi:** ime i prezime, firma i radno mjesto, onoliko brojeva, e-mail adresa i adresa koliko
  vam treba, svaki sa svojom vrstom (**Mobilni**, **Kuća**, **Posao**, **Ostalo**), rođendan (dan/mjesec/godina, ili
  dan/mjesec) i bilješka. Novi kontakt čuva se **Samo na ovom telefonu** ili na nalogu s kojim telefon sinhronizuje
  kontakte (Google), kako izaberete. Ono što Erevos ne prikazuje od kontakta, kao što su posebni podaci druge
  aplikacije, ostaje kakvo je bilo.
- **Fotografija:** dodirnite sliku na vrhu kontakta za **Izaberi fotografiju** iz fotografija telefona, **Snimi
  fotografiju** kamerom ili **Ukloni fotografiju**. Izrežete je u kvadrat, a Erevos je ponovo iscrtava, pa se ne
  čuva ništa što je fotografija govorila osim same slike (mjesto, telefon). Čuva se s kontaktom u Androidovim
  kontaktima, gdje je telefon prikazuje kad ta osoba zove.
- **Melodija zvona:** na kontaktu, **Izaberi melodiju** otvara Androidov vlastiti birač, sa zvukovima telefona i
  onima koje ste dodali; telefon zvoni njome kad taj kontakt zove. **Zadana melodija zvona** tamo vraća vlastitu
  melodiju telefona.
- **.vcf datoteke:** **Uvezi iz .vcf datoteke** u meniju ekrana Kontakti čita vCard datoteku koju je sačuvao neki
  drugi telefon ili aplikacija (bilo koju njenu verziju, i one sa starih grčkih telefona) i čuva one kojih još nema na
  telefonu, s njihovim fotografijama i grupama, samo na ovom telefonu ili na nalogu. **Sačuvaj kao .vcf datoteku**
  tamo čuva prikazane kontakte (sve, favorite, grupu ili ono što je pretraga pronašla) kao jednu datoteku, u folderu
  koji izaberete; na kontaktu čuva samo taj jedan. Datoteka je izvan Erevosa i nije zapečaćena: svako ko je ima može
  pročitati kontakte.
- **QR kodovi:** **QR kod** na kontaktu prikazuje njegov vCard kao QR kod, koji kamera drugog telefona čita kao
  kontakt za dodavanje: njegovo ime, brojeve, e-mail adrese, adrese i bilješku, bez fotografije (duga bilješka ili
  mnogo adresa izostavljaju se da stane). Svako ko ga vidi može ga pročitati. **Pročitaj QR kod kontakta** u meniju
  čita kod s fotografije koju snimite ili izaberete, ovdje na telefonu, i s njim započinje novi kontakt, koji se čuva
  tek kad ga sačuvate. Nečiji Erevos QR kod započinje kontakt s njegovim Erevos ID-om.
- **Duplikati:** **Pronađi duplikate** u meniju navodi kontakte koji izgledaju kao ista osoba sačuvana dvaput: isto
  ime (njegove riječi bilo kojim redom), broj ili e-mail. **Spoji** zadržava najpotpuniji od njih, sa svim brojevima,
  e-mail adresama i adresama ostalih, njihovim bilješkama, i njihovom fotografijom, melodijom, zvjezdicom i grupama
  kad on to nema, a ostale briše; **Spoji sve** to radi za svaki skup. **Nisu isti** skriva skup dok ponovo ne
  otvorite popis.
- **Rođendani:** dugme **Rođendani** ispod pretrage navodi kontakte s rođendanom, prvo sljedeći, s brojem preostalih
  dana i godinama koje osoba puni. **Podsjetnici za rođendane** u meniju (na početku isključeni) postavljaju obavijest
  ujutro na svaki od njih, od 9:00, čak i kad je Erevos zatvoren; na zaključanom ekranu kaže samo da je nečiji
  rođendan. To su samo rođendani kontakata telefona, nikad kontakata koji se čuvaju samo u Erevosu.
- **Kontakti sa SIM kartice** u meniju čita kontakte sa SIM kartica telefona i kopira one kojih još nema na telefonu
  (na početku su svi izabrani) u Androidove kontakte, samo na ovom telefonu ili na nalog. SIM kartica zadržava svoje.
- **Samo u Erevosu:** pod **Sačuvano u** novi kontakt može se umjesto toga čuvati **Samo u Erevosu**: zapečaćen u
  ovom prostoru kao i njegovi razgovori, nikad u Androidovim kontaktima, pa ga nijedna druga aplikacija ni nalog ne
  vide, a druge aplikacije prikazuju samo njegov broj; Erevosov ekran za pozive prikazuje njegovo ime dok je Erevos
  otključan. Na popisu ima lokot, a dugme **Samo u Erevosu** prikazuje samo njih.
  **Čuvaj samo u Erevosu** na kontaktu telefona premješta ga unutra, s fotografijom i zvjezdicom, i briše ga iz
  kontakata telefona; **Premjesti u kontakte telefona** ga vraća van. Njegova fotografija zapečaćena je s njim.
  Grupe, melodije zvona i podsjetnici za rođendane pripadaju Androidu, pa on ništa od toga nema. Poziv ili SMS prema
  njemu i dalje ide preko telefona i prikazuje se u zapisniku poziva i SMS porukama telefona kao i svaki drugi.
  Erevosova rezervna kopija sadrži te kontakte, zapečaćene.
- **U skrivenim razgovorima:** **Kontakti** na vrhu otvorenih skrivenih razgovora navodi njihove vlastite kontakte,
  koji se čuvaju samo tamo i zapečaćeni su s njima: ne prikazuju se nigdje drugdje, čak ni u kontaktima prostora, a
  ekran ne prikazuje ništa kad se skriveni razgovori zatvore. Novi kontakt tamo je uvijek njihov. Kontaktu se može dati
  fotografija, jer skriveni razgovori ostaju otvoreni dok je birate ili snimate. Njihov meni ima samo ono što je
  njihovo: **Uvezi iz .vcf datoteke** zadržava kontakte iz datoteke s njima, zapečaćene, nikad u kontaktima telefona;
  **Sačuvaj kao .vcf datoteku** čuva prikazane, ili jedan na njegovoj kartici, u folderu koji izaberete (izvan
  Erevosa i nešifrirano); **Pročitaj QR kod kontakta** započinje jedan od njihovih kontakata. Erevos ID upisan ili
  pročitan tamo dodaje osobu u skrivene razgovore, nikad u razgovore prostora. Poziv nekom od njih preko aplikacije
  za telefon zatvara skrivene razgovore kad je Erevos van ekrana više od 30 sekundi, i prikazuje se u njenom zapisniku
  poziva.
- **Erevos ID:** Erevos ID kontakta je link za kontakt koji prikazuje njegov Erevos, pod **Kopiraj moj link za
  kontakt** ili kao njegov QR kod. Na kartici kontakta, ili pod **Erevos ID** kad ga pišete, zalijepite ga ili ga
  pročitajte sa **Snimi QR kod** ili **Izaberi fotografiju QR koda**: **Dodaj u Erevos** (ili **Sačuvaj**) dodaje
  osobu u vaše Erevos razgovore, koji se otvaraju s njom, i povezuje kontakt s njom, a razgovor preuzima ime kontakta
  ako nema vlastito. Kontakt koji je Erevos kontakt prikazuje početak njegovog ključa kao **Erevos ID**.
- **Erevos kontakti:** kontakt koji je ista osoba kao jedan od Erevos kontakata vaših razgovora prikazuje se s njim
  kao jedna kartica: preko broja povezanog s njim u Erevosu, preko njegovog Erevos ID-a, ili sa **Izaberi iz mojih
  Erevos razgovora** na njegovoj kartici, veza zapečaćena u prostoru, nikad u Androidovim kontaktima (**Nije ovaj
  Erevos kontakt** to poništava). Kartica tada ima **Poruka**, **Pozovi** i **Video**, šifrirano s kraja na kraj
  preko Erevosa umjesto preko telefonske kompanije. Kontakt iz razgovora koji nije nijedan kontakt ima vlastitu
  karticu, sa štitom, gdje **Dodaj u kontakte** pravi kontakt, a **Poveži s jednim od mojih kontakata** ga povezuje s
  onim koji imate, čija ga kartica tada prikazuje; dugme **Erevos kontakti** navodi ih sve. Erevos kontakt bez
  vlastitog imena preuzima ime kontakta povezanog s njim, kad se povežu ili kad se otvori kartica tog kontakta; ime
  koje ste mu dali u Erevosu ostaje, a ono koje ste ispraznili tada se vraća iz kontakta. U skrivenim razgovorima to
  su vlastiti kontakti skrivenih razgovora, a njihov razgovor se otvara tamo.
- **Pozivi i poruke:** kartica kontakta navodi njegove posljednje pozive iz zapisnika poziva telefona, njegove SMS
  poruke i njegove poruke u Erevosu, najnovije prve; dodirnite jedno da uzvratite poziv, napišete SMS ili otvorite
  razgovor. Pozivi se prikazuju kad dozvolite Erevosu da čita zapisnik poziva (**Prikaži pozive**). Erevos ih samo
  čita da bi ih prikazao i ne čuva nikakvu kopiju.
- **Druge aplikacije:** **Dodaj u kontakte** druge aplikacije (broj u aplikaciji za telefon, e-mail u pošti) može se
  otvoriti u Erevosu: novi kontakt s onim što je ta aplikacija dala, ili popis na kojem dodirnete kontakt kojem to
  dodajete. Aplikacija koja prikazuje ili mijenja kontakt može ga i otvoriti u Erevosu, iza Erevosove brave. Android
  pita koju aplikaciju da koristi; izaberite Erevos. Aplikacija koja traži da izaberete kontakt, ili broj, e-mail ili
  adresu, dobija samo onaj koji dodirnete, iz kontakata telefona: oni koji se čuvaju samo u Erevosu tamo se nikad ne
  prikazuju.
- **Obriši** uklanja kontakt s telefona, sa svakog naloga na kojem se čuva; kontakt koji se čuva samo u Erevosu, iz
  Erevosa.
- **Grupe:** **Grupe** u meniju ekrana Kontakti (tri tačke) navodi Androidove vlastite grupe, kao što su Porodica ili
  Posao, s brojem članova u svakoj, i pravi nove. Otvorite jednu za **Dodaj kontakte**, uklonite kontakt sa **×**,
  **Preimenuj** je ili **Obriši grupu** (njeni kontakti ostaju). Na kontaktu, **Izaberi grupe** ga stavlja u grupe ili
  vadi iz njih. Dugmad ispod pretrage prikazuju kontakte jedne grupe. Grupa se čuva na nalogu, kao i njeni kontakti:
  kontakt ulazi u nju samo ako se čuva i na tom nalogu.

## Zaključavanje lozinkom {#lock}

Pod **Postavke** → **Privatnost i sigurnost** → **Zaključavanje i druga lozinka**, **Zaključavanje pri otvaranju
Erevosa** ima dva izbora: **Bez zaključavanja** i **Lozinka**.

1. Dodirnite **Lozinka**, upišite je dvaput (najmanje 4 znaka) i dodirnite **Sačuvaj**.
2. Od tada Erevos traži lozinku svaki put kad se otvori, i ponovo nakon 30 sekundi u pozadini.
3. **Promijeni lozinku** je mijenja, a **Zaključaj sada** odmah zaključava Erevos.

- **Zaključan, a i dalje prima:** kad se Erevos zaključa, ekran za lozinku dolazi ispred otvorenog prostora, koji
  nastavlja raditi iza njega: poruke i pozivi i dalje stižu, sa svojim obavijestima, a poziv se prikazuje preko
  ekrana za lozinku. Njegovi ekrani se zatvaraju, i skriveni razgovori, a ekran za pozive više ne prikazuje imena
  njegovih kontakata. Njegova lozinka ga ponovo otvara; lozinka drugog prostora ga prvo zatvara, ne zadržavajući ništa
  od njega u memoriji.

- **Pogrešne lozinke:** nakon 5 pogrešnih pokušaja, svaki sljedeći vas tjera da čekate, prvo 30 sekundi, a svaki put
  dvaput duže, do jednog sata. Broj pokušaja ostaje i nakon ponovnog pokretanja.
- **Šta je zapečaćeno:** kontakti svakog prostora, ključevi njegovih razgovora, njegove poruke, postavke relaya i
  izgled čuvaju se na telefonu zapečaćeni ključem koji otvara samo njegova lozinka.
- **Popis odmah:** početni ekran čuva zapečaćenu kopiju svojih prvih redova, pa se popis prikaže čim se prostor
  otvori, a zatim se ažurira. Uvijek je iste veličine, pa nikome ne govori koliko ima razgovora ni koji se prostori
  koriste, i nikad ne sadrži ono što je rekla poruka koja nestaje.

**Zašto:** svaka isprobana lozinka namjerno košta vremena i mnogo memorije (PBKDF2, zatim Argon2id), kako onaj ko
kopira ono što telefon čuva ne bi mogao brzo isprobavati lozinke; a neko ko drži telefon čeka duže nakon svakog
pogrešnog pokušaja. Brojač je jedan za cijeli telefon, čuva se i nakon ponovnog pokretanja, jer ekran za lozinku
dolazi prije nego što se otvori bilo koji prostor.

> Ne postoji način da se vrati zaboravljena lozinka: ne čuva se ništa što bi moglo otvoriti podatke bez nje. Samo
> otisak prsta ili lice, dok je uključeno, i dalje otvara prvi prostor (pogledajte ispod).

### Snimci ekrana

S uključenim zaključavanjem lozinkom, Android drži Erevos izvan snimaka ekrana, snimanja ekrana i nedavnih aplikacija:
tamo je posljednji ekran Erevosa prazan, pa onaj ko na trenutak drži otključan telefon u njemu ne vidi vaše razgovore.
Pod **Postavke** → **Privatnost i sigurnost** → **Snimci ekrana**, **Isključi** ponovo omogućava snimke ekrana (da
pošaljete neki, na primjer), a **Uključi** vraća zaštitu. Skriveni
razgovori uvijek ostaju izvan njih dok su otvoreni, bez obzira na postavku. Postavka pripada telefonu i ista je u
svakom prostoru. Na računaru i u web-aplikaciji ne postoji.

**Zašto:** bez nje, posljednji ekran Erevosa ostaje kao slika među nedavnim aplikacijama dok se Erevos ponovo ne
otvori, pa skriveni razgovori uvijek ostaju izvan, da se nikad tamo ne prikažu bez svog PIN-a. Postavka je ista u
svakom prostoru kako ne bi ništa govorila o tome koji se prostor otvorio.

### Otisak prsta ili lice

Na Androidu 11 i novijem, s otiskom prsta ili licem podešenim u postavkama telefona, Erevos se može otvarati i njime.
Isključeno je dok to ne uključite.

1. S uključenim zaključavanjem lozinkom, pod **Otisak prsta ili lice** dodirnite **Uključi**.
2. Upišite lozinku prostora u kojem ste, dodirnite **Uključi** i dodirnite senzor (ili pogledajte telefon).
3. Od tada ekran za lozinku ima dugme **Otisak prsta ili lice**. Lozinka uvijek radi, a
   **Isključi** to isključuje.

- **Samo prostor prve lozinke:** otisak prsta nikad ne otvara prostor druge lozinke, ni skrivene razgovore. Uključen
  u prostoru koji otvara druga lozinka, ne otvara ništa: prvi put kad se isproba, sam se isključuje, a lozinka otvara
  Erevos. Postavka izgleda isto u svakom prostoru.
- **Pod prisilom:** neko ko vas drži može vam pritisnuti prst na telefon, ili ga prinijeti vašem licu. Ako se to može
  desiti, držite ovo isključenim: tada mu treba lozinka, a vi mu možete dati drugu.
- **Kako se čuva:** ključ prvog prostora zapečaćen je ključem u sigurnom hardveru telefona (Android Keystore) koji
  radi samo odmah nakon jake provjere otiska prsta ili lica, jednom za svaku upotrebu. Dodavanje ili uklanjanje otiska
  prsta ili lica tjera Android da odbaci taj ključ: tada se ovo isključuje, i ponovo ga uključujete. Ništa ne napušta
  telefon.
- **Koje lice:** lice se računa samo tamo gdje Android ocjenjuje svoje otključavanje licem kao jako, kao na Pixelu 8 i
  novijim; drugdje je to otisak prsta.
- **Pogrešne lozinke** se broje kao i prije: otisak prsta ne mijenja broj.
- **Ne na računaru ni na webu:** nudi se samo na Androidu. Isključivanje zaključavanja isključuje i ovo.

**Zašto:** prst je lakše iznuditi nego lozinku, a svako čiji prst ili lice telefon poznaje mogao bi ga koristiti, pa
nikad ne otvara prostor druge lozinke ni skrivene razgovore. Uključen u drugom prostoru, čuva ključ koji ne otvara
ništa, istog oblika, pa ono što je sačuvano ne pokazuje u kojem je prostoru uključen.

## Druga lozinka {#second}

Ako vas neko prisili da otvorite Erevos, upišite drugu lozinku umjesto svoje. Ona otvara zaseban, prazan Erevos s
vlastitim kontaktima, relayem i izgledom. Vaši pravi razgovori ostaju skriveni, i ništa u aplikaciji ne pokazuje da
postoje.

1. S uključenim zaključavanjem lozinkom dodirnite **Postavi drugu lozinku**.
2. Upišite je dvaput i dodirnite **Sačuvaj**. Mora se razlikovati od vaše vlastite lozinke.

- **Izgled:** drugi prostor počinje s izgledom prostora u kojem je postavljen, kako se ne bi isticao.
- **Jedna po jedna:** ponovno postavljanje druge lozinke zamjenjuje prethodnu. **Ukloni drugu lozinku** je uklanja.
- **Diskrecija:** radi privatnosti, aplikacija nikad ne pokazuje je li postavljena druga lozinka. U web-aplikaciji s
  uključenim obavijestima dok je Erevos zatvoren, broj na ikoni Erevosa ostaje dok je Erevos zatvoren: ako se ne slaže
  s prostorom koji otvarate, može nagovijestiti drugi (**Broj na ikoni** to isključuje).

## Skriveni razgovori {#hidden}

Svaki prostor ima 4 mjesta za skrivene razgovore, od kojih se svako otvara samo vlastitim PIN-om, i nikad se ne
prikazuju među vašim ostalim razgovorima. Nigdje za njih nema dugmeta. Svako mjesto može sadržavati jedan razgovor ili
više njih, pa 2 prostora imaju 8 mjesta.

**Zašto:** svako mjesto već ima vlastiti PIN, pa razgovor sam na jednom mjestu ima vlastiti ključ, a mjesto može
sadržavati i više razgovora pod jednim PIN-om. Broj mjesta je fiksan iz dva razloga:

- **Da se ništa ne vidi.** Sva 4 mjesta postoje od prvog pokretanja, popunjena nasumičnim podacima dok se ne koriste.
  Onaj ko vas natjera da otvorite telefon, ili kopira ono što on čuva, ne može saznati imate li skrivene razgovore, ni
  koliko. S ključem za svaki razgovor, zapečaćene datoteke rasle bi sa svakim novim skrivenim razgovorom i odale bi
  koliko ih ima.
- **Da ostane brzo.** PIN upisan u pretragu isprobava se na svakom mjestu, a svaki pokušaj je namjerno spor
  (Argon2id, koji uzima mnogo memorije i vremena, kako se PIN-ovi ne bi mogli brzo pogađati). S 4 mjesta otvaranje
  ostaje kratko i uvijek traje jednako, pa ni vrijeme ne govori koliko se mjesta koristi.

Broj se kasnije može povećati bez ikakvog gubitka, uz cijenu malo sporijeg otvaranja; smanjenje bi obrisalo ono što
sadrže uklonjena mjesta.

1. Pokrenite mjesto na jedan od dva načina: pod **Postavke** → **Privatnost i sigurnost** → **Skriveni razgovori**
   izaberite od **Mjesto 1** do **Mjesto 4**, dodirnite **Postavi PIN skrivenih razgovora**, upišite ga dvaput i
   dodirnite **Sačuvaj**; ili otvorite **Detalji** razgovora, dodirnite **Premjesti u skrivene razgovore**, upišite
   PIN od 4 ili više znakova, dodirnite **Novi skriveni razgovori**, izaberite mjesto, a zatim **Pokreni i
   premjesti**. Zapamtite koja mjesta koristite: radi privatnosti, Erevos ne može reći koja su slobodna.
2. Da ih otvorite, upišite PIN u **Traži razgovore** na početnom ekranu i pritisnite Enter (tipku za pretragu na
   tastaturi). Ili zadržite prst na **Novi razgovor** jednu sekundu: otvara se polje za PIN, isto u svakom prostoru;
   upišite ga i dodirnite **Otvori**. Otvara se samo mjesto s tim PIN-om. Pogrešan PIN je samo pretraga, ili samo
   zatvara polje: ništa se ne dešava.
3. Otvaraju se s naslovom **Skriveni razgovori**, s **Kontakti** i **Promijeni PIN** na vrhu, i navode svoje razgovore
   i grupe kao što početni ekran navodi vaše: najnovije prve, svaki s onim što je posljednje rečeno, kada i koliko ih
   nije pročitano. Dodirnite jedan da ga otvorite. Strelica nazad ih zatvara.
4. Da premjestite drugi razgovor na neko mjesto, otvorite njegove **Detalji**, dodirnite **Premjesti u skrivene
   razgovore**, upišite PIN tog mjesta i dodirnite **Premjesti**. Razgovor napušta vaš popis sa svojim porukama,
   imenom, slikom i izgledom, te razgovorima uvezenim u njega, a njegov sigurnosni broj ostaje isti. Telefonu te
   osobe odmah se javlja da od sada piše u skrivene razgovore; poruka koju pošalje upravo u tom trenutku možda neće
   stići.
5. Da vratite razgovor među razgovore prostora, otvorite ga u skrivenim razgovorima, zatim njegove **Detalji**,
   dodirnite **Vrati u moje razgovore** i **Premjesti**. Ide sa svojim porukama, imenom, slikom, izgledom i uvezenim
   razgovorima, a njegovom telefonu se javlja kamo da piše.

- **Samo relay ili Nostr:** skriveni razgovori imaju vlastiti red na relayu i vlastite ključeve, i nikad ne koriste
  vezu u blizini. Bez relaya, njihov link za kontakt kaže gdje čitaju na Nostru, s ključem samo tog mjesta, a
  tekstovi idu tamo, kao s telefona bez relaya; za fotografije, glasovne poruke, pozive i grupe potreban je relay. Dok
  su zatvoreni, njihove poruke čekaju na relayu, ili na Nostru dva dana, osim ako je uključeno **Primanje dok su
  zatvoreni**.
- **Primanje dok su zatvoreni:** prekidač na vrhu svakog mjesta. Kad je uključen, njegovi skriveni razgovori primaju
  kao i vaši ostali razgovori dok je prostor otvoren, bez obzira na to koji je ekran prikazan i s Erevosom u
  pozadini: njihovi kontakti odmah vide da je poruka stigla, obavijest kaže samo „New message“, na Androidu poziv zvoni
  s „Incoming call“ i bez imena (na ekranu koji zvoni dodirnite mali znak, upišite PIN i dodirnite **Poveži** da se
  javite), a podsjetnik iz njihovog Razgovora sa sobom prikazuje obavijest koja kaže samo **Reminder**. Ono što im
  stigne preko Nostra tada se također čita. Poziv koji se završio prije nego što ste ih otvorili, ili je predugo
  zvonio, prikazuje se kao propušten. Ništa od njih se nigdje ne prikazuje dok ih PIN ne otvori. Novo mjesto počinje s
  ovim uključenim; mjesta postavljena ranije ostaju kakva su bila dok to ne uključite. Za to se ključ mjesta čuva
  šifriran s prostorom, među nasumičnim ključem za svako drugo mjesto, pa otvaranje prostora ne pokazuje koja mjesta
  primaju, ni koja su postavljena. Ali onaj ko otvori prostor i kopira ono što telefon čuva mogao bi otvoriti i to
  mjesto, bez PIN-a: PIN ih tada skriva od pogleda onoga ko drži telefon, ali ne i od forenzičkog alata. Kad je
  isključen, njihov ključ je samo iza PIN-a, a njihove poruke čekaju na relayu dok ih ne otvorite. Rezervne kopije
  zadržavaju prekidač.
- **Zatvaraju se sami** kad je Erevos bio u pozadini više od 30 sekundi, kao što se vlastiti PIN razgovora ponovo
  zaključava, ali ne tokom poziva, ni dok za njih birate fotografiju ili datoteku ili snimate fotografiju.
- **Dok su otvoreni,** poruka koja stigne pušta zvuk za nove poruke, kao u vašim ostalim razgovorima. S Erevosom u
  pozadini prije nego što se zatvore, obavijest kaže „New message“ samo ako je za to mjesto uključeno **Primanje dok
  su zatvoreni** ili **Javi kad stigne poruka**.
- **Kao vaši ostali razgovori:** ono što sada ne može otići čeka, označeno s **Na čekanju**, samo preko njihovog
  relaya, ili preko Nostra bez relaya (pogledajte **Na čekanju** pod [Razgovor preko relaya](#relay)), **Pošalji
  kasnije** radi kao tamo, a razgovor izvezen iz druge aplikacije može se uvesti u detalje skrivenog razgovora
  (pogledajte [Uvezeni razgovori](#import)). I tamo se kontakt može dodati s fotografije njegovog QR koda, snimljene
  ili izabrane dok oni ostaju otvoreni. Svako mjesto ima vlastiti **Razgovor sa sobom**, prvi na svom popisu
  (pogledajte **Razgovor sa sobom i podsjetnici** pod [Prvi koraci](#start)).
- **Grupe:** **Nova grupa**, ispod njihovog popisa, pravi grupu s njihovim kontaktima, kao na početnom ekranu
  (pogledajte [Grupni razgovori](#groups)), a ona se prikazuje na njihovom popisu među njihovim razgovorima. Njeni
  članovi su samo kontakti tog mjesta, a onaj koga iz nje dodate kao kontakt postaje kontakt tog mjesta. Ono što se u
  njoj piše ide samo preko relaya tog mjesta, u vlastiti red tamo, nikad na telefon u blizini; dok je mjesto
  zatvoreno, čita se samo s uključenim **Primanje dok su zatvoreni**, a **Javi kad stigne poruka** ga ne broji. Njeni
  pozivi zvone samo dok su skriveni razgovori otvoreni: poziv započet dok su zatvoreni prikazuje se kao propušten.
  Grupa tamo nema vlastiti PIN, i nijedna nije javna.
- **Pregledi linkova** imaju vlastiti prekidač u detaljima skrivenog razgovora, za sve razgovore tog mjesta,
  isključen dok ga ne uključite (pogledajte **Pregledi linkova** pod [Razgovor preko relaya](#relay)).
- **Javi kad stigne poruka** (Android): na vrhu mjesta dok je **Primanje dok su zatvoreni** isključeno. Kad je
  uključeno, dok je mjesto zatvoreno obavijest kaže samo „New message“, ili koliko ih je stiglo, kao za ostale
  razgovore, s Erevosom u pozadini ili na ekranu, za svaku poruku jednom, i kad je Erevos bio zatvoren i ponovo
  pokrenut; ono što je stiglo dok je mjesto bilo otvoreno ne daje nijednu kad se zatvori. To što je vaša poruka
  stigla ili pročitana, kucanje i novi ključevi ne daju nijednu, kao ni poziv koji je zvonio (pogledajte **Zvonjava
  poziva kad su zatvoreni**); poziv koji nije zvonio računa se kao poruka. Poruka ili brisanje koje su drugi Erevos
  telefoni prenijeli do relaya (pogledajte **Prenose ih drugi telefoni** u [Razgovor s telefonom u blizini](#nearby))
  ne može reći šta nosi, jer telefoni koji ga prenose to ne smiju znati: računa se kao poruka, pa i brisanje
  prikazuje „New message“, a prva poruka razgovora može se računati kao dvije; a poruka poslana bez zvuka oglašava se
  kao i obično (pogledajte **Slanje bez zvuka**). Potrebni su **Primaj i zvoni** i **Javi da je stigla poruka** pod
  **U pozadini**, što prekidač kaže kad nisu uključeni, i relay koji čeka (od 18. oktobra 2026); relay od prije
  23. oktobra 2026 može samo reći da nešto čeka, pa se tada i za to prikazuje „New message“, jednom dok ne otvorite
  to mjesto. Za to prostor drži red na relayu za svako od svoja 4 mjesta, a oni koji se ne koriste prave se uzalud na
  istom relayu, pa otvaranje prostora ne pokazuje ni jesu li postavljeni skriveni razgovori ni koji, dok god koriste
  relay prostora; relay se pita samo koliko je poruka stiglo, jer ih broji po bajtu koji svaka nosi (pogledajte šta
  relay vidi, iznad), nikad se ne traže same poruke. Onaj ko vidi obavijest i ne nađe ništa novo u vašim razgovorima
  mogao bi pretpostaviti da ih ima još. Nakon što obrišete ili blokirate nekoga u mjestu, prva poruka nekoga novog,
  preko linka za kontakt ili QR koda mjesta, ne pravi nijednu: vidi se kad otvorite mjesto. Rezervne kopije ovo ne
  zadržavaju: ponovo ga uključite nakon vraćanja kopije.
- **Zvonjava poziva kad su zatvoreni** (Android): ispod **Javi kad stigne poruka**, dok je **Primanje dok su
  zatvoreni** isključeno. Kad je uključeno, dok je mjesto zatvoreno, a Erevos u pozadini ili na bilo kojem ekranu,
  poziv od jednog od njegovih kontakata tjera telefon da zvoni i prikaže „Incoming call“ bez imena, kao što to radi
  poziv iz vaših ostalih razgovora. Na ekranu koji zvoni dodirnite mali znak, upišite PIN i dodirnite **Poveži** da se
  javite; obično **Javi se** ga ne može povezati, a **Odbij** zaustavlja zvonjenje. Zvonjenje traje oko 45 sekundi.
  Potrebni su **Primaj i zvoni** pod **U pozadini**, što prekidač kaže kad nije uključeno, i relay koji čeka, a
  koristi vlastiti red na relayu za svako od 4 mjesta, pri čemu se oni koji ne zvone prave uzalud na istom relayu,
  isto kao i obavijest o porukama iznad, pa otvaranje prostora ništa ne
  odaje. Pozivalac samo zvoni na red tamo; sam poziv čeka u vlastitom redu razgovora dok ga PIN ne otvori. Kontakt
  kojeg ste obrisali i dalje može natjerati telefon da zvoni, ali poziv se nikad ne može povezati. Poziv upućen s
  povezanog računara zvoni samo dok su skriveni razgovori otvoreni. Rezervne kopije ovo ne zadržavaju: ponovo ga
  uključite nakon vraćanja kopije.
- **Novi PIN za mjesto** (iz **Skriveni razgovori** u **Postavke**, ili **Novi skriveni razgovori**) pokreće ga
  prazno i zamjenjuje ono što je bilo u njemu. Da ih zadržite i promijenite samo PIN, otvorite ih i tamo koristite
  **Promijeni PIN**. Svaki PIN mora se razlikovati od ostalih i od lozinke koja otvara Erevos.
- **Pogrešni PIN-ovi u pretrazi** broje se odvojeno od onih na ekranu za zaključavanje: nakon pet, pretrage neko
  vrijeme prestaju pokušavati, tiho, a ekran za zaključavanje nikad ne čeka zbog njih.
- **PIN drži vani onoga ko uzme telefon,** a ne onoga ko kopira ono što on čuva: s forenzičkim alatom na otključanom
  ili rootanom telefonu PIN-ovi se mogu isprobavati bez čekanja. Svaki pokušaj košta Argon2id (mnogo memorije i
  vremena), ali PIN od 4 cifre je samo 10.000 pokušaja. Ako se toga bojite, koristite duži PIN ili nekoliko riječi.
- **Diskrecija:** svaki prostor ima sva 4 mjesta od početka, a ona koja se ne koriste popunjena su nasumičnim
  podacima koji izgledaju kao korišteni, a pretraga svaki put isprobava svako mjesto. Tako se ništa ne vidi o tome
  jesu li postavljeni ikakvi skriveni razgovori, ni koliko.

### Razgovor zaključan PIN-om {#chat-pin}

Razgovor ili grupa može imati vlastiti PIN, odvojeno od skrivenih razgovora: ostaje među vašim razgovorima, ali se
otvara samo svojim PIN-om.

1. Otvorite razgovor, dodirnite **⋮** na vrhu za njegove **Detalji**, a zatim **Zaključaj PIN-om** (u grupi: ime
   grupe na vrhu, a zatim **Zaključaj PIN-om**).
2. Upišite PIN od najmanje 4 znaka dvaput, a zatim **Zaključavanje**.

- **Otvaranje:** traži PIN. Ponovo se zaključava kad ga napustite, otvorite drugi razgovor ili je Erevos van ekrana
  više od pola minute (kao i zaključavanje lozinkom).
- **Iza PIN-a** se ništa od razgovora ne vidi: nijedna njegova poruka ne iscrtava se dok se ne upiše PIN, a sa
  staklom, pozadinom ili vlastitom scenom stila ekran za PIN leži na gustom mrazu koji ništa ne propušta.
- **Na popisu** prikazuje svoje ime s lokotom i **Zaključano PIN-om**, ništa od svojih poruka, ni u pretrazi, u
  **Poruke sa zvjezdicom** ni u **Uvezeni razgovori**. Obavijest kaže samo **New message**, kao za svaki razgovor.
- **Pogrešni PIN-ovi** broje se na telefonu, za sve razgovore odjednom i odvojeno od onih na ekranu za zaključavanje:
  nakon pet, sljedeći pokušaj čeka, svaki put duže.
- **Zaboravili ste PIN?** Ispod PIN-a, gdje prostor ima lozinku, **Zaboravili ste PIN?** ga uklanja lozinkom koja
  otvara prostor. Bez lozinke ništa ga više ne može otvoriti: brisanje kontakta je tada jedini način.
- **U skrivene razgovore:** razgovor koji premjestite u skrivene razgovore nosi svoj PIN sa sobom, koji tamo ništa ne
  traži, jer ih čuva vlastiti PIN skrivenih razgovora. Kad se vrati među razgovore, isti PIN ponovo se traži.
- **Da ga uklonite:** **Detalji** → ponovo **Zaključaj PIN-om**, i upišite njegov PIN.
- **Zna ga samo ovaj telefon,** a svaki povezani uređaj ima vlastiti. Rezervne kopije ga zadržavaju.

**Zašto:** neki razgovori trebaju ostati tamo gdje jesu, ali ne i biti otvoreni za onoga ko na trenutak drži
telefon. PIN se čuva samo kao njegov Argon2id, pa se ne može pročitati s telefona, a pogađanje je sporo. To je brava
na ekranu, a ne vlastiti ključ: poruke razgovora ostaju šifrirane s ostatkom prostora, a onaj ko kopira ono što
telefon čuva dok je prostor otvoren i dalje bi ih mogao pročitati. Za razgovor koji se ne smije ni vidjeti, koristite
skrivene razgovore.

## Rezervne kopije {#backup}

Rezervna kopija je jedna datoteka koja sadrži sve što Erevos čuva na ovom telefonu: svaki prostor, s njegovim
kontaktima, ključevima njegovih razgovora, porukama, glasovnim porukama, uvezenim i skrivenim razgovorima, njegovim
Razgovorom sa sobom, i zaključavanje. Unutar nje svaki prostor ostaje
zapečaćen vlastitom lozinkom, a datoteka je ponovo zapečaćena vlastitom lozinkom. Nalazi se pod **Postavke** →
**Podaci i uređaji** → **Rezervne kopije**.

1. **Napravi rezervnu kopiju:** dodirnite **Napravi rezervnu kopiju**, izaberite folder (na telefonu, memorijskoj
   kartici ili u aplikaciji za oblak koja tamo prikazuje svoje foldere; na računaru, bilo koji folder), upišite
   lozinku za rezervnu kopiju dvaput (najmanje 12 znakova, ili četiri riječi) i dodirnite **Sačuvaj**.
2. **Automatske rezervne kopije:** izaberite **Svaki dan** ili **Svake sedmice**, zatim folder i lozinku. Erevos pravi
   kopiju kad se otvori, a posljednja je starija od toga, a folder čuva 3 najnovije. Ispod njih su **Napravi kopiju
   sada**, **Promijeni folder** i **Promijeni lozinku**; **Isključeno** ih zaustavlja, a napravljene ostaju u folderu.
3. **Vrati:** dodirnite **Vrati rezervnu kopiju**, izaberite datoteku i upišite njenu lozinku. Erevos pita još jednom,
   a zatim stavlja rezervnu kopiju umjesto svega što je na telefonu i otvara se onakav kakav je bio kad je kopija
   napravljena, s lozinkama koje su se tada koristile.

- **Čuvajte lozinku rezervne kopije:** bez nje ništa ne otvara rezervnu kopiju, i niko je ne može vratiti. Bez
  zaključavanja lozinkom, lozinka rezervne kopije je sve što je štiti. Ko ima datoteku može na njoj isprobavati lozinke
  onoliko brzo koliko mu računar ide, bez telefona koji bi ga usporavao, pa kratka lozinka ne izdržava: Erevos ne
  prihvata nijednu kraću od 12 znakova.
- **Automatske rezervne kopije čuvaju svoju lozinku na telefonu,** pa im lozinka ne treba svaki put. Onome ko otvori
  njihov folder i dalje trebaju lozinke prostora da bi čitao razgovore.
- **Razgovori koji su se nastavili nakon kopije:** vraćanje vraća ključeve svakog razgovora kakvi su tada bili. Poruke
  koje su stigle nakon kopije i već su pročitane nisu u njoj, a razgovor koji se nastavio može prestati otvarati nove
  poruke. Tada zamolite kontakt ponovo za njegov link za kontakt. Prije nego što vraćeni razgovor ponovo piše, njegovi
  razgovori preskaču ključeve koje su možda koristili od kopije, pa nijedan ključ nikad ne zapečaćuje dvije poruke:
  poruka zapečaćena dvaput omogućila bi onome ko je sačuvao oba paketa da ih pročita zajedno.
- **Jedan po jedan telefon:** rezervna kopija vraćena na drugom telefonu čita iste redove na relayu kao i prvi, i
  svaki preuzima poruke koje drugi tada nikad ne dobije. Koristite je za prelazak na novi telefon, a ne za držanje
  dva.
- **Diskrecija:** svaki prostor prikazuje isti ekran Rezervne kopije, a rezervna kopija sadrži svaki prostor, pa ni
  jedno ni drugo ne govori koliko ima prostora ni jesu li postavljeni skriveni razgovori. Ime datoteke kaže da je to
  Erevos rezervna kopija, a njena veličina otprilike pokazuje koliko se čuva.
- **SMS poruke telefona:** na Androidu, **Stavljaj SMS poruke u rezervne kopije** od tada dodaje SMS i MMS poruke
  telefona svakoj rezervnoj kopiji, s najviše 32 MB njihovih slika, dok je Erevos SMS aplikacija. Zapečaćene su
  lozinkom rezervne kopije kao i ostalo. Vraćanje rezervne kopije vraća u SMS poruke telefona svaku poruku koju još
  nema, i ne briše nijednu; Erevos tada također mora biti SMS aplikacija, inače se ostalo vraća bez njih. SMS poruke
  pripadaju telefonu, iste su u svakom prostoru. Stariji Erevos ne otvara rezervnu kopiju koja sadrži SMS poruke.
- **Red u SMS porukama:** prikvačeni i arhivirani razgovori svakog prostora, otpad, nacrti, filter spama i oznake, te
  koliko SMS čeka da bi se mogao povući, nalaze se u svakoj rezervnoj kopiji, zapečaćeni lozinkom prostora kao i
  ostalo. SMS poruke poslane kasnije (**SMS kasnije**) nisu, pa rezervna kopija vraćena na drugom telefonu nikad
  ponovo ne šalje nijednu; nisu ni pozivnice, imena iz vaših kontakata i SIM kartica izabrana za svaki broj. Stariji
  Erevos ne otvara rezervnu kopiju koja ih sadrži; ona koju je napravio stariji Erevos vraća se kao i uvijek, bez njih.
- **Nije u rezervnoj kopiji:** fotografije i datoteke, još ne: rezervna kopija pravi se u memoriji telefona, a one ne
  bi stale. Rezervna kopija vraćena na istom telefonu ponovo ih prikazuje; na drugom telefonu prikazuju se kao da
  nisu na njemu. Izostavljeni su i broj pogrešnih lozinki i postavke automatskih rezervnih kopija.
- **Povezani uređaji** nisu u rezervnoj kopiji: veza ostaje s telefonom i računarom na kojima je napravljena. Nakon
  vraćanja rezervne kopije na drugom telefonu ponovo povežite računar: na računaru dodirnite **Odvoji ovaj uređaj**, a
  zatim ga povežite kao prvi put, pogledajte [Povezani uređaji](#devices). Kontakti s ovom verzijom tada prestaju pisati
  vašim računarima dok to ne uradite: telefon im daje novi popis svojih uređaja koji ne navodi nijedan. Ako sat ovog
  telefona kasni za satom izgubljenog, taj popis nestaje čim mu oni pišu, a detalji njihovog razgovora mogu reći da se
  promijenio dan nakon što ste vratili kopiju. Vlastita rezervna kopija povezanog računara sadrži razgovore telefona
  kakvi su bili, ali
  ne i vezu za pisanje u njima: kad se vrate, mogu se tamo čitati, ali ne i pisati u njima, a Erevos to jednom kaže. Da
  biste pisali u njima, ponovo povežite taj računar s telefonom: razgovori koje telefon još ima ostaju, s onim što je
  stiglo u međuvremenu, a ostali nestaju. Na telefonu odvojite uređaj koji je to bio prije. Rezervne kopije pravite na
  telefonu.
- **Rezervna kopija iz novijeg Erevosa:** Erevos 0.1.8 i noviji je također otvaraju i vraćaju sve što od nje poznaju;
  prije toga kažu da dio ostaje izvan. Prvo ažurirajte Erevos da biste vratili sve.

## Uvezeni razgovori {#import}

Vaši stari razgovori iz Telegrama i WhatsAppa mogu doći u Erevos, za čitanje, sa svojim fotografijama, videozapisima,
glasovnim porukama i datotekama, a oni iz Vibera sa svojim riječima. Ostaju na ovom telefonu, zapečaćeni u prostoru u
koji ih unesete, i nikad se nigdje ne šalju.

Prvo izvezite razgovor iz druge aplikacije:

- **WhatsApp:** otvorite razgovor, zatim **Više**, **Izvezi chat**, **Uključi medije**, i sačuvajte .zip na telefon.
  **Bez medija** donosi samo riječi.
- **Telegram Desktop:** **Izvezi historiju razgovora**, format **JSON**, s fotografijama, videozapisima, glasovnim
  porukama i datotekama koje želite. Zatim napravite .zip od foldera koji je napravio (na Windowsu: desni klik na
  njega, **Pošalji na**, **Komprimovana (zipovana) fascikla**) i kopirajte .zip na telefon. Samo **result.json**
  donosi samo riječi.
- **Viber:** sam Viber ne izvozi razgovore. Na Androidu, aplikacija **Backup Text for Viber** čuva razgovor kao
  .html datoteku: kopirajte je na telefon. Dolaze samo riječi, s Viberovim emotikonima kao emoji. Vaše vlastite
  poruke tamo nemaju ime, pa dolaze kao **Ja**, već izabrano kao vi. Poruke s datumom prije nego što je Viber
  postojao, kao 1970, potiču s telefona s pogrešnim satom: dolaze bez vremena.

Zatim:

1. U Erevosu otvorite **Postavke** → **Podaci i uređaji** → **Uvezeni razgovori** i dodirnite **Uvezi datoteku**, a
   zatim izaberite datoteku.
2. Erevos kaže šta je pronašao, s brojem fotografija i datoteka i koliko su ukupno velike. Dodirnite svoje ime, kako
   bi se vaše poruke prikazivale desno, i dodirnite **Zadrži**. Datoteke dolaze jedna za drugom, a Erevos kaže koliko
   ih je i koji je njihov dio unesen. **Otkaži** tada to zaustavlja i ne zadržava nijednu.
3. Sami obrišite izvezenu datoteku s telefona: Erevos čuva vlastitu zapečaćenu kopiju, ali datoteka koju ste
   sačuvali nije zapečaćena.

Da biste nastavili razgovor u Erevosu, i drugoj osobi treba Erevos:

1. S **Novi razgovor** dodajte je kao kontakt preko relaya, kao u [Razgovor preko relaya](#relay).
2. Otvorite uvezeni razgovor, dodirnite **Nastavi u Erevosu** i izaberite tu osobu.
3. Njen razgovor sada prikazuje stare poruke ispred novih, kao da su oduvijek bile u Erevosu: u oblačićima, po
   danima, s vremenima, i **Nastavljeno u Erevosu** između njih i novih. **Otvori razgovor** vodi vas tamo, a kontakt
   kojem niste dali ime preuzima ime uvezenog razgovora.

**Iznutra iz razgovora:** razgovor s kontaktom ima **Uvezeni razgovori** u svojim **Detalji**, iznad **Privatnost**.
**Uvezi razgovor ovdje** unosi datoteku direktno u taj razgovor, bez prolaska kroz **Postavke**: kad datoteka sadrži
nekoliko razgovora, kao što to radi Telegramov izvoz svih razgovora, pita koji se nastavlja ovdje i nudi najduži. Svaki
uvezeni razgovor koji se tamo nastavlja naveden je s tri dugmeta:

- **Samo u razgovoru** ga vadi iz **Postavke** → **Podaci i uređaji** → **Uvezeni razgovori**: prikazuje se samo u
  tom razgovoru, kao da je oduvijek bio tamo. Razgovor unesen iz detalja razgovora čuva se tako od početka.
  **Prikaži i u „Uvezeni razgovori“** ga vraća na popis, a to radi i sam popis, kad tog kontakta više nema.
- **Odvoji** prestaje ga prikazivati u razgovoru; ostaje u **Uvezeni razgovori**, za čitanje ili nastavljanje s
  nekim drugim.
- **Obriši** ga briše s telefona, s njegovim fotografijama i datotekama, nakon pitanja.

**Zašto:** stari razgovor pripada osobi s kojom je vođen, pa se unosi, čuva i briše tamo gdje s njom razgovarate, a
popis u **Postavke** čuva samo ono što nema kamo drugo. Ništa od toga ionako ne napušta telefon.

- **Fotografije, videozapisi, glasovne poruke i datoteke** dolaze iz .zip datoteke, svaka zapečaćena u ovom prostoru
  kao datoteka u razgovoru. Fotografije se prikazuju u razgovoru kad dođete do njih, a naljepnice kao naljepnice;
  dodirnite fotografiju ili datoteku da je vidite samu i **Sačuvaj** je. Glasovne poruke i pjesme puštaju se direktno
  u razgovoru dodirom; videozapis se pušta u vlastitoj aplikaciji telefona kad se sačuva. Zadržite prst na uvezenoj
  poruci da je **Kopiraj** ili **Otvori** njenu datoteku. **Traži u ovom razgovoru** pronalazi i uvezene poruke.
  Datoteke veće od 1 GB, i one koje izvoz ne sadrži, ostaju izvan, a razgovor kaže gdje je neka bila.
- **Prostor na telefonu:** dok .zip dolazi, telefonu treba otprilike dvostruko više slobodnog prostora od njegove
  veličine, jer Erevos čita njegovu kopiju i čuva datoteke zapečaćene. Uvezene datoteke još nisu u rezervnim kopijama,
  kao ni ostale datoteke.
- **Samo na ovom telefonu, samo za čitanje:** uvezene poruke nikad se ne šalju, pa ih drugi telefon ne dobija. Erevos
  ne može pokazati ko ih je zaista napisao.
- **Obavještenja i pozivi** iz druge aplikacije izostavljaju se, a razgovor kaže koliko ih je.
- **I u skrivenim razgovorima:** u **Detalji** skrivenog razgovora, **Uvezi razgovor ovdje** zadržava razgovor s tim
  mjestom, šifriran njegovim ključem, i prikazuje ga samo u tom razgovoru, nikad u **Postavke** → **Podaci i uređaji**
  → **Uvezeni razgovori**; tamo se može samo obrisati. Razgovor premješten u skrivene razgovore nosi sa sobom
  razgovore uvezene u njega, koji se tamo čuvaju samo u njemu, i vraća ih ako se vrati.
- **Obriši poruke** u razgovoru ostavlja uvezene: njih obrišite u **Detalji** razgovora, pod **Uvezeni razgovori**,
  ili u **Postavke** → **Podaci i uređaji** → **Uvezeni razgovori**.

> Datoteka uvezenih razgovora raste s onim što unesete, pa njena veličina otprilike govori koliko je uvezeno, ali ne
> i u koji prostor.

## Izgled {#appearance}

**Izgled** prati LPHL FASOULI i LPHL stranicu. Nalazi se pod **Postavke** → **Izgled**, u dijelovima od kojih se svaki
otvara zasebno: **Stil i boje** (površina, staklo, stil, tema, boje i tekst na obojenim površinama opisani ispod, s
**Pregled**), **Pozadina**, **Poruke**, a na Androidu i **Ikone u pokretaču** i **Widget**.

| Postavka | Izbori |
| --- | --- |
| **Površina** | **Ravno**, ili **Glass** kao na lphl.nekten.eu. Staklo dolazi u dvije vrste: **Ploče** (svaka kartica je staklena ploča iznad pozadine) i **Jedna ploča** (svaki ekran na jednoj mat staklenoj ploči). |
| **Stil** | **Classic** (Erevosova tamna i zlatna), **Modernist** (Inter Tight), **Nocturne** (uvijek tamni, s vlastitim bojama), **Neon** (cijan i magenta LED svjetla koja sijaju, iznad mreže koja se pruža do sunca na zalasku), **Matrix** (zeleno na crnom u monospace pismu, s kodom koji pada u pozadini), **Paper** (plavo nalivpera na krem podlozi, u serifnom pismu, preko linija s crvenom marginom), **Aurora** (ljubičasto na skoro bijelom, mekano i zaobljeno, iznad mrlja svjetla boje mente, jorgovana i breskve), **Material You** (vlastite boje telefona, na Androidu 12 i novijem) i **Prilagođeno** (vaša vlastita pozadina i naglasak). |
| **Tema** | **Prema uređaju**, **Svijetla** ili **Tamna**. Nocturne, Neon i Matrix su uvijek tamni, Paper i Aurora uvijek svijetli, a Prilagođeno je svijetlo ili tamno, kakva je njegova pozadina. Material You je prati. |
| **Boje** | Vlastite boje stila, jedna od dvanaest LPHL paleta, ili **Moja boja**. Izbor palete pod stilom s vlastitim bojama vraća stil izabran prije. |
| **Prilagođeno** | Kad je izabrano **Prilagođeno**: njegova **pozadina** (osam svijetlih, osam tamnih) i njegov **naglasak**. Tekst i površine prave se iz pozadine, a svaka boja se provjerava da je čitljiva na njoj. |
| **Tekst na obojenim površinama** | **Bijela**, **Kao u paleti** ili **Moja boja**. |
| **Pozadina** | Ono što je iza svakog ekrana: **Zadano za stil** (vlastita scena ili sjaj stila), **Jednobojno**, ili uzorak blago iscrtan u boji naglaska: **Kružići**, **Mreža**, **Pruge**, **Zvijezde**, **Svjetla** (meki krugovi svjetla) ili **Gradijent**; ili **Fotografija**, vaša vlastita fotografija, smanjena, ponovo iscrtana i zapečaćena, ispod vela kako bi tekst bio čitljiv (**Promijeni fotografiju** bira drugu). Ekran za lozinku umjesto toga prikazuje vlastitu pozadinu stila. |
| **Poruke** | Kako razgovor iscrtava poruke: oblačići **Zaobljeno** ili **Uglato**, ili **Linija**, bez oblačića, s linijom pored teksta, kao u zapisniku. |

Neon, Matrix, Paper i Aurora iscrtavaju vlastitu scenu iza svakog ekrana, Prilagođeno zadržava pozadinu koju ste
izabrali, a Material You boje telefona, pa **Glass** čeka dok su oni izabrani. Kiša stoji
mirno kad je telefon podešen na smanjenje pokreta.

**Pregled** prikazuje nekoliko poruka i dugmadi u izgledu koji ste izabrali. Svaka kombinacija se provjerava kako bi
tekst uvijek bio dobro čitljiv, i na staklu.

- **Svaki prostor zadržava vlastiti izgled.**
- **Ekran za lozinku** prikazuje posljednji korišteni izgled. Zato se čuva izvan zapečaćenih podataka: ne govori ništa
  o vašim razgovorima, ali onaj ko otvori telefon vidi koji izgled koristite.
- **Material You** uzima boje koje Android pravi iz vaše pozadine (Android 12 i noviji), svijetle ili tamne kako kaže
  **Tema**, sa zaobljenim dugmadima i blago zaobljenim karticama, u vlastitom fontu telefona. Nova pozadina mijenja ih
  i u Erevosu, kad se ponovo prikaže. Čitaju se na telefonu i ne idu nikud. Na starijem Androidu i na računaru se ne
  nudi.
- **Ikone u pokretaču** (Android): boja svake Erevosove ikone među aplikacijama telefona, **Erevos** (crvena, otvara
  Erevos razgovore, ili razgovor koji ste ostavili otvoren), **Telefon** (zelena, otvara tastaturu), **SMS** (plava,
  otvara SMS popis) i **Kontakti** (ljubičasta): crvena, narandžasta, zelena, plava, ljubičasta ili tamna. Svaki dodir
  otvara ono što njegova ikona navodi, i kad je Erevos prikazivao neku drugu od njih. Boja pripada telefonu, a ne
  svakom prostoru, jer se ikone prikazuju prije nego što se Erevos otključa. Nakon promjene neki pokretači uklanjaju
  ikonu s početnog ekrana: ponovo je dodajte s popisa aplikacija.
- **Widget** (Android): redoslijed četiri dugmeta widgeta, slijeva nadesno, s widgetom iscrtanim onako kako će
  izgledati. Dodirnite ↑ ili ↓ da pomjerite dugme; **Početni redoslijed** ih vraća.

## Na računaru {#desktop}

Erevos radi i na računaru, s Linuxom, macOS-om ili Windowsom, kao zasebna aplikacija. Razgovara preko relaya,
šifrirano s kraja na kraj kao na telefonu, i čuva svoje kontakte, poruke i postavke zapečaćene na isti način.

1. Instalirajte ga. Na Linuxu: paket za sisteme zasnovane na Archu (\`erevos-linux-x86_64.pacman\`, sa
   \`sudo pacman -U\`) ili AppImage. Na Macu: otvorite sliku diska i prevucite Erevos u Applications. Nema plaćeni
   Appleov potpis, pa ga prvi put dozvolite pod **Postavke sistema → Privatnost i sigurnost → Ipak otvori**. Na
   Windowsu 10 ili 11: pokrenite \`erevos-windows-x64-setup.exe\`, koji instalira Erevos samo za vas, bez
   administratora, i stavlja ga u meni Start; ili držite \`erevos-windows-x64-portable.exe\` gdje želite i pokrenite
   ga, bez ikakve instalacije. Nijedan nema plaćeni potpis, pa prvi put Windows kaže da je zaštitio vaš računar:
   dodirnite **Više informacija**, a zatim **Ipak pokreni**.
2. Postavite relay i dodajte kontakte kao na telefonu, pogledajte [Razgovor preko relaya](#relay). **Kopiraj moj
   link za kontakt** kopira vaš link, da ga zalijepite tamo gdje treba.

- **Šta radi samo telefon:** Bluetooth, Wi-Fi Aware i LoRa, i njihovi testovi. Kontakte na istoj Wi-Fi mreži dosiže
  kao i telefon, pogledajte [Razgovor s telefonom u blizini](#nearby). Ostalo je isto: prostori i druga lozinka,
  skriveni razgovori, glasovne poruke, uvezeni razgovori i rezervne kopije.
- **Gdje čuva stvari:** u vlastitom folderu (na Linuxu \`~/.config/Erevos\`, na Macu
  \`~/Library/Application Support/Erevos\`, na Windowsu \`%APPDATA%\\Erevos\`), zapečaćene kao na telefonu.
  Njegovo spremište ključeva zapečaćeno je privjeskom za ključeve sistema (na Macu Keychain, na Windowsu ključ vašeg
  Windows naloga). Na Linux sistemu bez privjeska za ključeve (KWallet ili GNOME Keyring), ili s onim koji Erevos ne
  pronalazi, Erevos se otvara s napomenom i ne čuva ništa: pokrenite privjesak za ključeve ili Erevosu dajte
  \`--password-store=gnome-libsecret\`. Pokrenut s \`--plain-secrets\`, svoje spremište ključeva čuva tamo onakvo kakvo
  jeste, čitljivo vašem korisniku: tada postavite zaključavanje lozinkom. Prenosiva Windows aplikacija čuva svoje
  stvari u istom folderu kao i instalirana, a deinstalacija ih ostavlja tamo.

**Zašto:** bez privjeska za ključeve, spremište ključeva ležalo bi na disku onakvo kakvo jeste, čitljivo vašem
korisniku, pa Erevos tamo ne čuva ništa osim ako to ne izaberete sa \`--plain-secrets\`: nijedno mjesto za lozinku tamo
ne leži nezapečaćeno iznenada.

- **Windowsov zaštitni zid** pita, prvi put kad se Erevos otvori, smije li koristiti mrežu. Dozvolite to na privatnim
  mrežama, inače ga telefoni i računari na istoj Wi-Fi mreži ne mogu dosegnuti; relayi rade u oba slučaja.
- **Glasovne poruke** snimljene na računaru su Opus, a na telefonu AAC. Obje se puštaju na oba.
- **Fotografije** dolaze iz datoteka računara; kamere nema. **Sačuvaj** pita gdje da stavi fotografiju ili datoteku.
- **Računar i telefon mogu dijeliti nalog:** povežite računar s telefonom, i oba imaju iste razgovore i kontakte,
  pogledajte [Povezani uređaji](#devices). Ili rezervna kopija premješta sve s jednog na drugi, pogledajte
  [Rezervne kopije](#backup), a od tada koristite samo jedan.
- **Bez obavijesti i zvukova:** Erevos na računaru ne prikazuje nijednu obavijest sistema i ne pušta nikakav zvuk.
  Dok radi, nova poruka se prikazuje samo u njegovom prozoru, a poziv tamo prikazuje svoj ekran bez zvonjenja, pa
  kad je prozor minimiziran ili iza nekog drugog, ništa vam to ne javlja. Kad je zatvoren, ne prima ništa: poruke
  čekaju na relayu, a poziv se prikazuje kao propušteni poziv kad se otvori.
- **Dosad testirano** na Linuxu. Verzije za Mac i Windows grade se i otvaraju na GitHubovim računarima, još ne od
  strane neke osobe.

## Povezani uređaji {#devices}

Isti nalog na telefonu i na računaru, ili u pregledniku: isti razgovori, kontakti i poruke na oba. Telefon ostaje
nalog: samo on dodaje kontakte, te povezuje i odvaja uređaje. Svaki povezani uređaj ima vlastite ključeve, koje
telefon potpisuje u popis uređaja naloga i daje svojim kontaktima. Kontakti s ovom verzijom tada pišu i svakom
uređaju, šifrirano s kraja na kraj, pa on dobija njihove poruke i kad je telefon isključen; za one sa starijim
verzijama telefon prosljeđuje računaru ono što stigne i za njih zapečaćuje ono što računar napiše. Kontakti vide isti
nalog i isti sigurnosni broj, bez obzira na to koju verziju Erevosa imaju.

**Zašto:** svaki uređaj ima vlastite ključeve, nikad kopiju ključeva naloga: Erevos nema server koji bi mogao
isključiti izgubljeni uređaj, pa uređaj nikad nije ništa više od stavke na popisu koji telefon potpisuje, a odvajanje
je dovoljno. Popis uvijek ima četiri mjesta, a ona koja nijedan uređaj ne zauzima sadrže ključeve napravljene uzalud,
pa kontakti ne mogu saznati koliko uređaja imate. A s telefonom kao nalogom, kontakti s bilo kojim starijim Erevosom
dosežu vas kao i prije.

Da povežete računar:

1. Na računaru, u prostoru bez vlastitih razgovora (nova instalacija, prostor koji otvara nova lozinka ili razgovori
   povezanog računara vraćeni iz njegove rezervne kopije), otvorite **Postavke** → **Podaci i uređaji** → **Povezani
   uređaji**. Upišite relay ako ga traži, dajte ime uređaju i dodirnite **Poveži s mojim telefonom**. Prikazuje QR
   kod.
2. Na telefonu skenirajte kod kamerom: Erevos se otvara na **Povezani uređaji** s njim. Ili kopirajte kod na
   računaru, zalijepite ga na telefonu pod **Kod s računara** i dodirnite **Dalje**.
3. Telefon prikazuje ime računara i kod od četiri grupe po pet cifara. Izaberite koji dio historije ide (**Sve**,
   **Posljednji mjesec**, **Posljednja sedmica** ili **Ništa**) i da li **I fotografije i datoteke**, a zatim
   dodirnite **Poveži**.
4. I računar prikazuje kod. Ako je isti kao na telefonu, dodirnite **Podudaraju se**. Ako nije, dodirnite **Razlikuju
   se**: neko drugi je možda pročitao njegov QR kod, a njemu ništa nije otišlo.

Razgovori tada stižu na računar, a nakon njih i izabrane poruke.

- **Poruke** od kontakata stižu na oba, a svaki ih čuva jednom: poruka koja ponovo stigne u roku od 30 dana (do 2000
  od jednog kontakta) ne čuva se ponovo, čak ni nakon što je tamo nestala ili je obrisana. Za to svaki uređaj čuva,
  30 dana, koje su poruke stigle i kojeg dana, ali ne i šta su rekle, i nakon što su nestale ili obrisane, i u
  rezervnoj kopiji napravljenoj u međuvremenu; telefon to čuva i za kontakt koji je povezao uređaj. Ono što napišete
  na računaru ide kontaktu s ovom verzijom direktno s njega, kad je on pisao računaru, a inače preko telefona:
  telefon to prikazuje kao vaše, a kontakt to dobija od naloga. Ono što napišete na telefonu prikazuje se i na
  računaru. Oznake čitanja, reakcije, prikvačene poruke, glasovi, brisanje s oba telefona, imena, tajmeri, izgledi i
  slike razgovora, prikazivanje kao da niste na mreži i prihvatanje zahtjeva idu u oba smjera. Zvjezdica, ili brisanje
  na **Ovaj telefon**, urađeno na telefonu ide i na računar; urađeno na računaru, ostaje tamo.
- **Kad je telefon isključen**, kontakti s ovom verzijom i dalje dosežu računar, a računar njih: stiže ono što pišu,
  čitaju i na šta reaguju, a ide ono što vi pišete. Ako telefon ostane isključen toliko dugo da se njegov red na
  relayu napuni (1000 poruka), ono što pišu i čitaju i dalje stiže na računar, dugačka glasovna poruka cijela; ono na
  šta reaguju, što prikvače, za šta glasaju ili što obrišu, kao i njihovi pozivi, ne prolazi dok se telefon ponovo ne
  uključi. Za kontakte sa starijim verzijama, grupe, pozive, dodavanje kontakta i poruke poslane za kasnije **telefon
  mora biti uključen** i dosezati relay: ono što računar u međuvremenu napiše čeka na relayu i odlazi kad se telefon
  vrati. Dva ili više povezanih uređaja dosežu i jedni druge direktno: kad je telefon isključen, svaki i dalje
  prikazuje ono što drugi pišu, čitaju i na šta reaguju, i promjene koje prave na kontaktima; onaj koji je propustio
  prvu poruku drugog dobija novu dan ili više kasnije. Računar koji je bio isključen duže nego što relay čuva poruke
  (14 dana), ili je propustio prvu poruku kontakta njemu, ipak dobija ono što taj kontakt napiše kasnije: njegov
  Erevos počinje ispočetka s njim dan ili više kasnije, zatim sve rjeđe, dok ne odgovori. Nakon što vas kontakt
  obriše i ponovo doda, računar počinje ispočetka i s njegovim uređajima.
- **Fotografije i datoteke** koje stignu ostaju na relayu dok ih ne preuzmu i telefon i računar; tada ih telefon tamo
  briše. Ona koju računar nikad ne preuzme nestaje kad se on odvoji, ili nakon 14 dana, kao i svaka nepreuzeta.
- **Pozivi** zvone na telefonu i na računaru. Javite se na bilo kojem: drugi prestaje zvoniti i kaže da je poziv
  prihvaćen na drugom uređaju. Odbijanje poziva na jednom odbija ga na oba. Računar zove također preko telefona; sam
  poziv tada ide direktno između računara i kontakta, šifriran između njih, a telefon mora ostati uključen samo da ga
  uspostavi.
- **Grupe** su i na računaru, s njihovim porukama, fotografijama, datotekama i glasovnim porukama. Pišite u njima,
  odgovarajte, reagujte, glasajte, prikvačujte, brišite svoje poruke za sve, dodajte i uklanjajte članove,
  preimenujte grupu ili je napustite, tamo kao i na telefonu: telefon to radi za računar, kao svoje. Fotografija ili
  datoteka koju telefon čuva ide na računar kao kopija na relayu, koja se tamo briše kad je računar preuzme. Ono što
  članovi kasnije urade s porukom (reakcija, glas, prikvačivanje, brisanje za sve) prikazuje se i na računaru, kao i
  zvjezdica ili brisanje na **Ovaj telefon** urađeno na telefonu. Poruka koju telefon nije mogao poslati u grupu (na
  primjer u grupu zatvorenu u međuvremenu) prikazuje se na računaru kao **Telefon nije poslao**. Pravljenje grupe,
  javne grupe i grupni pozivi za sada ostaju na telefonu.
- **Skriveni razgovori i druge lozinke** nikad se ne povezuju. Skriveni razgovori pišu uređajima kontakta s ovom
  verzijom kao i vaši ostali razgovori, pa ih oni dobijaju i kad je telefon kontakta isključen, a kontaktu izgledaju
  kao razgovori telefona koji nikad nije povezao uređaj. Razgovor premješten u skrivene razgovore na telefonu napušta
  računar. Premješten u skrivene razgovore, ili iz njih u vaše razgovore, razgovor piše samo telefonu kontakta, kao
  stariji Erevos, dok se ne vrati tamo gdje je napravljen: njegovom Erevosu se to prvo javlja, pa njegovi uređaji
  prestaju pisati vašim, a on iz toga može saznati da je razgovor prestao znati za povezane uređaje: ako mu je dao
  popis vaših uređaja, da je otišao u skrivene razgovore. Prostor koji otvara druga lozinka
  povezuje se samo iznutra, s vlastitim uređajima.
- **Ponovo prenesi poruke**, na telefonu, ponovo šalje dio historije, s njegovim reakcijama, prikvačenim porukama,
  glasovima i zvjezdicama; ono što računar već ima ne čuva se dvaput.
- **Odvoji**, na telefonu, odmah isključuje uređaj: ništa mu više ne ide, i ništa što pošalje ne prima se. Kontaktima
  s ovom verzijom to se javlja sljedeći put kad telefon dođe do relaya: prestaju mu pisati i više ništa od njega ne
  primaju. Tako se isključuje izgubljeni računar. Ako je uključen, to mu se javlja, a razgovori naloga ga napuštaju. Na
  računaru, **Odvoji ovaj uređaj** radi isto odande.
- **Do četiri** uređaja povezuje se s jednim telefonom. Rezervna kopija ne nosi veze: nakon vraćanja kopije na drugom
  telefonu, na računaru dodirnite **Odvoji ovaj uređaj** i ponovo ga povežite, pogledajte [Rezervne kopije](#backup).

## Na iPhoneu, iz preglednika {#iphone}

Erevos nema aplikaciju u App Storeu. Na iPhoneu radi kao web-aplikacija, dodana na početni ekran iz Safarija, bez
Apple naloga. Razgovara preko relaya, šifrirano s kraja na kraj kao na telefonu, i čuva svoje kontakte, poruke i
postavke zapečaćene na isti način, u Safarijevoj pohrani za aplikaciju.

1. Otvorite u pregledniku **Safari** adresu Erevos servera koju ste dobili. Erevos pokazuje kako da ga dodate: dodirnite
   **Podijeli** (na iOS-u 26, pod **•••**), zatim **Dodaj na početni zaslon**, a zatim otvorite Erevos s početnog
   ekrana. Potreban je iOS 17 ili noviji.
2. U Erevosu otvorite **Postavke** → **Privatnost i sigurnost** → **Ova web-aplikacija** i uporedite otisak ključa
   izdanja s onim koji ste dobili uz adresu, znak po znak. Ako se razlikuje, obrišite aplikaciju i javite to onome ko
   vam je dao adresu.
3. Postavite zaključavanje lozinkom (u Erevosu, **Postavke** → **Privatnost i sigurnost** → **Zaključavanje i druga
   lozinka**). Na webu je to najvažnije: pogledajte ispod.
4. Postavite relay i dodajte kontakte kao na telefonu, pogledajte [Razgovor preko relaya](#relay).

**Kako sama sebe provjerava.** Web-aplikacija je kôd koji šalje server, pa bi server koji je provaljen, ili kojem je
to naređeno, mogao poslati izmijenjen kôd. Erevos tom kodu ne vjeruje na riječ:

- Prvi put kad se otvori, preuzima svoj kôd s popisom svih datoteka i njihovih otisaka, potpisanim ključem izdanja,
  koji ima samo osoba koja pravi izdanja; server ga nema. Provjerava potpis i svaku datoteku, čuva ih na iPhoneu i od
  tada pokreće samo njih. Server ih ne može promijeniti.
- Ažuriranje se prihvata samo ako je potpisano istim ključem i novije od onog koje se koristi; pokreće se sljedeći
  put kad se Erevos otvori. Nepotpisano ili starije se odbija, i Erevos to kaže.
- Ko god želi, može provjeriti server: \`node pwa/release.mjs verify https://<adresa>\` provjerava potpis i svaku
  datoteku koju server daje, a \`scripts/reproduce-web.sh <verzija> https://<adresa>\` ponovo gradi to izdanje iz
  njegovog izvornog koda i provjerava da svaka datoteka ispada ista.

**Šta preostaje.** Ovo su stvarna ograničenja; znajte ih:

- **Prvi put** kad je otvorite, vjerujete serveru: on šalje dio koji provjerava. Korak 2 je način da otkrijete
  pogrešan.
- **Sam dio koji provjerava** (service worker) Safari ponovo preuzima najmanje jednom dnevno, i Safari ga može
  zamijeniti a da ne pita Erevos. Erevos tada provjerava novi prema potpisanom izdanju i upozorava vas (**Erevos je
  izmijenjen bez dozvole**), ali server koji zna kako mogao bi zaobići tu provjeru. Ako vidite upozorenje, ne otvarajte
  ponovo Erevos s tog servera dok se to ne objasni. Sa zaključavanjem lozinkom vaši razgovori ostaju zapečaćeni.
- **Nema Bluetootha ni veze u blizini**, ni SMS-a: Safari ih ne dozvoljava.
- **Samo dok je otvorena:** iOS zaustavlja web-aplikacije u pozadini, pa poruke stižu kad otvorite Erevos; do tada
  čekaju na relayu.
- **Obavijesti** dok je Erevos zatvoren isključene su dok ih ne uključite: u Erevosu, **Postavke** → **Obavijesti** →
  **Obavijesti dok je Erevos zatvoren** → **Uključi** (iOS 16.4 ili noviji, s početnog ekrana). Kad stignu poruke,
  ili zazvoni poziv, vaš relay šalje push preko Applea, a Erevos prikazuje koliko je poruka stiglo otkako ste ga
  posljednji put otvorili (**3 nove poruke**), ili **Poziv** kad je samo zazvonio poziv, na jeziku aplikacije, ništa
  više. Broj je šifriran za vaš iPhone: Apple vidi kada nešto stigne za vaš iPhone i da on koristi Erevos, ali nikad
  šta ni od koga. S relayem ili Erevosom pošiljaoca starijim od 2.0.0, ili s porukom koju su drugi telefoni prenijeli
  do relaya, nema broja: Erevos prikazuje **Nova poruka**, ili **Nove poruke** kad ih je stiglo više, dok ga ne
  otvorite. Obavijesti su po prostoru, nikad za skrivene razgovore, a vaš relay mora biti podešen da ih šalje.
  Stižu i za vlastiti red svakog kontakta: vaš relay tada ima jednu push adresu za redove svih vaših kontakata, a
  Apple dobija po jedan push za svaki kontakt koji je pisao, u razmaku od 15 sekundi, pa iz takvog niza može
  pretpostaviti koliko ih je pisalo odjednom, ali nikad ko. Ikona Erevosa na početnom ekranu tada pokazuje i broj:
  nepročitane poruke u prostoru koji je bio otvoren, koje ostaju u broju i kad se Erevos zatvori, i one koje su
  stigle poslije (ono što je stiglo bez broja broji se kao jedna), nikad iz skrivenog razgovora. **Postavke** →
  **Obavijesti** → **Broj na ikoni** to isključuje. Obavijesti rade preko push servisa Applea, Googlea (Chrome, kao i
  Edge na Androidu, Brave i Opera), Mozille (Firefox) i Microsofta (Edge na Windowsu): preglednik koji koristi neki
  drugi ne može ih uključiti, osim ako onaj ko vodi vaš relay dozvoli njegov push servis. Prostori na različitim
  relayima dijele obavijesti preglednika: dobija ih samo onaj koji je posljednji otvoren. Zahtjev za razgovor od nekoga
  novog, preko vašeg linka za kontakt, možda će se prikazati tek kad se Erevos otvori.
- **Dozvole:** u Erevosu, **Postavke** → **Općenito** → **Dozvole** prikazuje šta preglednik dozvoljava Erevosu: radi
  li s početnog ekrana, obavijesti dok je zatvoren (potrebne kad ih je ovaj prostor uključio), mikrofon za pozive,
  kameru za videopozive i čuva li preglednik Erevosove podatke trajno. Bez toga Safari može obrisati podatke kad na
  iPhoneu ponestane prostora, pa je rezervna kopija sigurnosna mreža. Svaka stavka ima objašnjenje zašto i dugme s
  vlastitim pitanjem preglednika; tamo gdje preglednik više ne pita, kaže gdje je postavka (**Postavke → Obavijesti →
  Erevos** ili **Postavke → Aplikacije → Safari → Mikrofon**). Samo čita ono što preglednik kaže. Preglednik ne
  dozvoljava Erevosu da čita uštedu baterije ili Način rada niske potrošnje, pa toga tamo nema. Nakon svakog novog
  potpisanog izdanja otvara se sama kad nedostaje nešto što trebaju poruke, pozivi ili podaci. U drugom pregledniku
  (Chrome, Firefox) isto je, s postavkama tog preglednika.
- **Rezervne kopije** se prave ručno: **Napravi rezervnu kopiju** čuva datoteku preko izbornika za dijeljenje (Datoteke,
  iCloud Drive ili druga aplikacija). Preglednik daje datoteku tek nakon dodira, pa nema automatskih rezervnih kopija.
- **Glasovne poruke** snimljene na iPhoneu su AAC; puštaju se svuda.
- **Apple** pravi Safari i mogao bi ga promijeniti, kao i kod svake aplikacije na iPhoneu.

## Na Sailfish OS-u {#sailfish}

Na Sailfish OS telefonu Erevos je zasebna aplikacija: ista aplikacija kao u pregledniku, prikazana vlastitim
preglednikom Sailfisha unutar Sailfish prozora, s kodom instaliranim s aplikacijom, a ne preuzetim sa servera.
Razgovara preko relaya, šifrirano s kraja na kraj kao na telefonu, i čuva svoje kontakte, poruke i postavke
zapečaćene na isti način.

1. Dozvolite aplikacije izvan Jolla Storea: **Postavke → Nepouzdani softver → Dozvoli nepouzdani softver**.
2. Kopirajte \`erevos-sailfish-aarch64.rpm\` na telefon (Preuzimanja) i dodirnite ga u **Datoteke**, a zatim
   **Instaliraj**. Iz terminala (način rada za programere) to je \`pkcon install-local erevos-sailfish-aarch64.rpm\`.
   Potreban je Sailfish OS 5 u svojoj 64-bitnoj (aarch64) verziji.
3. Postavite zaključavanje lozinkom (u Erevosu, **Postavke** → **Privatnost i sigurnost** → **Zaključavanje i druga
   lozinka**). Pogledajte ispod zašto je ovdje važno.
4. Postavite relay i dodajte kontakte kao na telefonu, pogledajte [Razgovor preko relaya](#relay).

- **Šta radi samo Android:** veza u blizini (Bluetooth i Wi-Fi Aware), LoRa i SMS. Ostalo je isto: prostori i druga
  lozinka, skriveni razgovori, glasovne poruke, uvezeni razgovori i rezervne kopije.
- **Gdje čuva stvari:** u \`~/.local/share/erevos\` na telefonu, zapečaćene kao na telefonu. Sailfish nema privjesak
  za ključeve za aplikacije, pa se spremište ključeva tamo čuva onakvo kakvo jeste, čitljivo vašem korisniku, a time i
  svakoj aplikaciji koja radi kao vi: zaključavanje lozinkom je ono što ga zapečaćuje.
- **Rezervne kopije** idu u \`Documents/Erevos\` na telefonu, ručno ili svaki dan; kopirajte ih odatle na memorijsku
  karticu ili drugi uređaj. **Sačuvaj** stavlja fotografiju ili datoteku u Preuzimanja.
- **Samo dok radi:** kad je Erevos zatvoren, poruke čekaju na relayu dok se ne otvori.
- **Dosad testirano** na Sailfishovom pregledniku (Gecko 91) na računaru, uz razgovor s preglednikom preko relaya. Još
  ne na Sailfish telefonu.

## Ažuriranja {#updates}

Erevos pita GitHub za ažuriranja samo kad dodirnete dugme, kao u LPHL FASOULI: redovna provjera bi GitHubu svaki dan
govorila da ovaj telefon ili računar ima Erevos. Na Androidu vam javlja i kad izađe nova verzija, a da ne pita GitHub,
kao što kaže **Obavijest kad izađe nova verzija** ispod. Da ažurirate:

1. Otvorite **Postavke** → **Općenito** → **Ažuriranja** (ili **Provjeri ažuriranja** na dnu prvog ekrana ovog
   vodiča).
   Prikazuje verziju koju imate, kao **Erevos 2.0.0**.
2. Dodirnite **Provjeri ažuriranja**. GitHub tada vidi internet adresu ovog uređaja, ništa drugo; na Androidu je vidi
   i server web-aplikacije, koji sadrži potpis ažuriranja od računara za izdanja. Dok sve u
   prostoru ide preko Tora (**Sve** pod Torom), Erevos ne provjerava, jer bi to zaobišlo Tor.
3. Kad postoji nova verzija: na Androidu dodirnite **Instaliraj**. Preuzima se, provjerava prema izdanju (njegova
   veličina i SHA-256), i otvara se Androidov instalater: tamo dodirnite **Instaliraj**. Erevos je nudi tek kad je
   računar za izdanja, koji svoj ključ čuva van mreže, potpisao tu verziju i njen SHA-256: onaj ko bi sam preuzeo
   GitHub nalog ne bi mogao instalirati vlastiti APK. Do tada kaže da je verzija izašla, ali još nije potpisana. Kad
   server web-aplikacije nije dostupan, kaže to, s razlogom, a kad se potpis tamo ne podudara, kaže i to: u oba
   slučaja ništa se ne instalira. Prvi put Android traži da dozvolite instaliranje
   aplikacija iz Erevosa. Na računaru i Sailfish OS-u **Otvori stranicu za preuzimanje** otvara stranicu izdanja:
   uzmite datoteku koju Erevos navodi, onu za paket koji imate, i ažurirajte kao u tabeli ispod.

### Šta je novo {#whats-new}

**Postavke** → **Općenito** → **Šta je novo** (i **Šta je novo** u **Ažuriranja**) ukratko kaže šta je svaka verzija
promijenila, najnovija prva, samo po svom broju; verzija koju imate kaže **Ova verzija**. Svako izdanje dodaje svoje.
CHANGELOG izvornog koda opisuje svaku promjenu u cijelosti.
Svaka verzija, tamo kao i ovdje, prvo kaže šta se mijenja **Za vas**, ono što vidite i koristite, a zatim šta se
promijenilo **Ispod haube**: ispravke, brzina, baterija i sigurnost iznutra.

### Obavijest kad izađe nova verzija {#release-notice}

Na Androidu, jednom dnevno, Erevos pita LPHL-ov server, na kojem radi i relay, je li izašla nova verzija. Kad jeste,
**Erevos** se prikazuje na vrhu razgovora, prikvačen, sa svojom ikonom: **Izašao je Erevos 3.3.0. Dodirnite da vidite
šta je novo i ažurirate.**, označen dok ga ne otvorite, a i obavijest kaže **Erevos 3.3.0 is out**. Dodirnite bilo
koje za **Ažuriranja**, a zatim **Provjeri ažuriranja**. Nestaje kad budete imali tu verziju.

- **Samo kad je potpisano:** važi tek kad je računar za izdanja potpisao i verziju i njeno ime, istim potpisom koji
  omogućava da je **Ažuriranja** instalira. Zato stiže tek kad se ta verzija može instalirati, a sam server je ne može
  izmisliti.
- **Samo na LPHL-ovom relayu:** prostor pita samo dok koristi LPHL-ov relay i ne šalje sve preko Tora (**Sve** pod
  Torom): server tada ne vidi ništa što već ne vidi. Prostor na drugom relayu, ili bez relaya, ne pita ništa; tamo vam
  to kaže **Provjeri ažuriranja**.
- **Da to isključite:** **Postavke** → **Općenito** → **Ažuriranja** → **Javi mi kad izađe nova verzija**.
- Radi od verzije koja to ima uključeno: prethodna ne kaže ništa. Nije u F-Droid verziji, koju ažurira F-Droid.

**Zašto:** kako niko ne bi morao gledati na GitHubu, jednu po jednu, svaku novu verziju, a GitHub nikad ne saznaje
koji telefoni imaju Erevos: pitani server je onaj s kojim telefon već razgovara, a ono što kaže važi samo s potpisom
računara za izdanja, koji se čuva van mreže.

Ostatak ovog dijela je za ručno ažuriranje.

**Gdje su nove verzije:** na Erevosovoj stranici izdanja, \`https://github.com/azzinder/erevos-releases/releases\`.
Najnovija je na vrhu, kao **Erevos 2.0.0**, s datotekom za svaki
sistem. Pet najnovijih ostaje tamo.

**Provjerite datoteku** ako možete, na računaru: svako izdanje ima \`SHA256SUMS\`, a u folderu s preuzetim
datotekama \`sha256sum -c --ignore-missing SHA256SUMS\` mora za svaku reći **OK**.

**Prvo napravite rezervnu kopiju** (**Postavke** → **Podaci i uređaji** → **Rezervne kopije** → **Napravi rezervnu
kopiju**), pogledajte [Rezervne kopije](#backup). Ažuriranje zadržava sve, ali rezervna kopija traje minut i štiti od
svakog iznenađenja.

| Na | Kako ažurirati |
| --- | --- |
| **Android** | **Postavke** → **Općenito** → **Ažuriranja** → **Provjeri ažuriranja** → **Instaliraj**, ili ručno: otvorite stranicu izdanja na telefonu, dodirnite \`erevos-android.apk\`, a zatim **Instaliraj**. Instalira se preko verzije koju imate i zadržava sve. Jednom dozvolite instaliranje iz preglednika, kad Android to zatraži. |
| **Linux, zasnovan na Archu** | \`sudo pacman -U erevos-linux-x86_64.pacman\` |
| **Linux, AppImage** | Zamijenite stari \`erevos-linux-x86_64.AppImage\` novim i učinite ga izvršnim. |
| **macOS** | Otvorite \`erevos-macos.dmg\` i prevucite Erevos u Applications, **Zamijeni**. Zatim ga ponovo dozvolite pod **Postavke sistema → Privatnost i sigurnost → Ipak otvori**. |
| **Windows, instaliran** | Zatvorite Erevos i pokrenite novi \`erevos-windows-x64-setup.exe\`: instalira se preko verzije koju imate. Windows može ponovo upozoriti: **Više informacija**, a zatim **Ipak pokreni**. |
| **Windows, prenosivi** | Zatvorite Erevos i stavite novi \`erevos-windows-x64-portable.exe\` na mjesto starog. |
| **Sailfish OS** | Dodirnite \`erevos-sailfish-aarch64.rpm\` u **Datoteke**, a zatim **Instaliraj**, ili \`pkcon install-local erevos-sailfish-aarch64.rpm\`. |
| **iPhone, preglednik** | Ništa ne treba raditi: web-aplikacija sama preuzima novu potpisanu verziju kad se otvori, pogledajte [Na iPhoneu](#iphone). |

- **Kontakti, razgovori i postavke ostaju** na svakom sistemu: nalaze se u Erevosovom vlastitom folderu, a ne u
  aplikaciji.
- **Android, prvi put sa stranice izdanja:** Erevos izgrađen na računaru za testiranje potpisan je drugim ključem, i
  Android odbija da instalira preko njega (**Aplikacija nije instalirana**). Napravite rezervnu kopiju,
  deinstalirajte Erevos, instalirajte onaj sa stranice izdanja i vratite rezervnu kopiju. Nakon toga se svako
  ažuriranje instalira preko njega.
- **Erevos iz F-Droida**, kad bude tamo, ažurira F-Droid: njegova **Ažuriranja** prikazuju verziju i to kažu, bez
  **Provjeri ažuriranja**. F-Droid ga potpisuje vlastitim ključem, pa Android ne instalira ni njega preko Erevosa sa
  stranice izdanja ni onaj preko njega. Da pređete s jednog na drugi: napravite rezervnu kopiju, deinstalirajte
  Erevos, instalirajte drugi i vratite rezervnu kopiju.
- **Nikad starija:** ne instalirajte stariju verziju preko novije. Njeni podaci mogu biti u obliku koji starija ne
  može pročitati. Umjesto toga vratite rezervnu kopiju napravljenu tom starijom verzijom.
- **Izdanje kojem nedostaje vaš sistem** to kaže u svojim napomenama: ta izgradnja nije uspjela, pa uzmite prethodno
  izdanje.

## Ekrani za testiranje {#tests}

Dva ekrana pod **Postavke** → **Za testiranje** služe za testiranje veza, korak po korak.

- **Test radija (Android):** **Dozvole** traži od Androida ono što je radiju potrebno, **Pokreni** i **Zaustavi**
  uključuju i isključuju Bluetooth i Wi-Fi Aware, **Pošalji pozdrav** šalje običnu testnu poruku na Test radija
  telefona u blizini (razgovor je ne prikazuje), a **Zapisnik** pokazuje šta se desilo.
- **Test relaya (Wi-Fi):** **Napravi red** pravi red na relayu i prikazuje dva identifikatora. **ID za slanje** dajte
  telefonu koji vam piše, a **ID za primanje** čuvajte u tajnosti. **Pošalji** i **Primi** ručno prenose poruke.

> I s jednim telefonom možete isprobati razgovor preko relaya: vaši razgovori i vaši **Skriveni razgovori** imaju
> svaki vlastiti red na relayu i vlastite ključeve. Napravite oba reda na istom relayu, u jednom dodirnite **Podijeli
> moj link za kontakt** i kopirajte ga, zatim ga dodajte u drugom i pišite u oba smjera. Vlastiti link razgovora
> odbija se kao kontakt.

## Šta je danas zaštićeno {#privacy}

Erevos jasno kaže šta štiti, a šta još ne štiti.

| Šta | Danas | Dolazi |
| --- | --- | --- |
| **Nalog, broj telefona, e-mail** | Nije potrebno ništa od toga. Kontakti su parovi jednosmjernih redova na relayu. | |
| **Kontakti i njihova imena, ključevi, postavke relaya, izgled** | Zapečaćeni na telefonu ključem svakog prostora. | |
| **Poruke preko relaya** | Šifrirane s kraja na kraj: PQXDH s ML-KEM-768 na početku, zatim double ratchet. Relay ih ne može čitati, a kad oba telefona dobiju poruku jedan od drugog, ne može ih ni razlikovati po razgovoru: svaka je još jednom zapečaćena za telefon kojem ide. Vidi koje su poruke koje neko čita, koje su riječ između telefona, a koje pozivi koji zvone, jer to svaka kaže. Još nisu nezavisno provjerene. | Nezavisna provjera. |
| **Poruke telefonu u blizini** | Šifrirane s kraja na kraj, isto kao preko relaya. Onaj ko prisluškuje u blizini može saznati da su Erevos telefoni blizu jedan drugog, te kada i koliko šalju; na istoj Wi-Fi mreži to može svako na njoj, a preko Wi-Fi Directa svako ko se pridruži vlastitoj Wi-Fi mreži telefona. Dok telefon vašeg kontakta nije poznat, drugi Erevos telefoni povezani u blizini dobijaju vaše kratke poruke, zapečaćene. | |
| **Poruke koje prenose drugi telefoni** | Zapečaćene dvaput: s kraja na kraj za vaš kontakt, i za njegov relay. Telefon koji prenosi poruku vidi na koji relay ide, kada i koliko je velika; ne vidi od koga je ni za koga. Njegov relay vidi na koji relay ide, a taj relay vidi relay prenosioca, ali ne i njegov telefon. Čuvaju se zapečaćene na telefonu, najviše tri dana: one za druge u datoteci telefona, čija veličina otprilike pokazuje koliko ih ima; vaše vlastite u vašem prostoru, zapečaćene njegovim ključem. Skriveni razgovori se nikad ne prenose. | |
| **Poruke preko LoRa veze** | Šifrirane s kraja na kraj, isto kao preko relaya. Svako s radiom, kilometrima daleko, može saznati da vaš radio šalje, kada i koliko, a njegov signal može se pratiti do mjesta gdje se nalazi. Erevos sprječava da vaš radio javlja svoje ime i lokaciju (uloga Client hidden, GPS isključen, bez fiksne pozicije) osim ako mu to ne dozvolite; i dalje odgovara radiju koji pita za njegovo ime. Svaki Erevos na mesh mreži dobija vaše LoRa poruke, zapečaćene. | Postavljanje imena radija iz Erevosa. |
| **Ko s kim razgovara** | Relay vidi IP adrese, identifikatore redova, te kada i koliko. S drugim relayem vaš relay nikad ne vidi vašu adresu. S mjesta posuđenog na relayu kontakta vidi je svaki relay kojem šaljete. [Preko Tora](#tor), koji prenosi poruke ako to ne promijenite, nijedan relay je ne vidi za ono što pišete, a sa **Sve** ni za slike i datoteke; s mostovima, tamo gdje je Tor blokiran, mreža vidi samo most. Snowflakeov posrednik i STUN serveri vide vašu adresu. | Tor na računaru. |
| **Veza s relayem** | TLS, a unutar njega, kad je ključ relaya poznat, kanal do tog ključa: relay pri svakoj vezi dokazuje da ga ima, a token i svaki zahtjev idu šifrirani za njega, pa neko između s certifikatom za ime relaya ne može da se predstavi kao relay. Relayu koji je jednom dokazao svoj ključ nikad se više ne pristupa bez njega. Relay stariji od ove aplikacije radi kao i prije, a **Kako ste sada povezani** to kaže. Prvi ključ dolazi od relaya prvi put kad ga se pita, ili iz linka za kontakt: onaj ko je između upravo tog prvog puta mogao bi dati svoj. [Vlastiti ključ relaya](#relay). Nije nezavisno provjereno. | Ključ našeg relaya ugrađen u aplikaciju i u pozivnice. |
| **Tekstovi preko Nostra** | Šifrirani s kraja na kraj kao preko relaya, zatim još jednom umotani za ključ koji je vaš kontakt dao samo tom razgovoru, potpisani ključem napravljenim samo za taj tekst. Nostr relayi vide kada i koliko je veliko, i da ključ koji ne imenuje nikoga dobija tekst; vaš telefon čita sve svoje ključeve na jednoj vezi, preko Tora, pa relay može saznati da se čitaju zajedno, ali nikad odakle. Vaš relay ih vidi samo kao rezervu, i zvono za skrivene razgovore. [Preko Nostra](#nostr). | Slike i glasovne poruke preko Nostra. |
| **SMS** | Običan SMS čita telefonska kompanija, kao i svaki SMS. Na broj povezan s Erevos kontaktom umjesto toga ide preko Erevosa. Skrivena pozivnica je još jedan kratki SMS koji telefonska kompanija vidi. | |
| **Kontakti telefona** | U Androidovim vlastitim kontaktima, a Erevos ih ne zapečaćuje, kao i kod svake aplikacije za kontakte: vidi ih svaka aplikacija kojoj je dozvoljeno da ih čita, a nalog (Google) ih može sinhronizovati. Erevos ih nikud ne šalje. .vcf datoteka sačuvana od njih je izvan Erevosa, nezapečaćena. Pozivi i SMS poruke kontakta čitaju se iz vlastitog zapisnika poziva i SMS poruka telefona samo da bi se prikazala njegova historija, i nigdje se ne čuvaju. | |
| **Kontakti koji se čuvaju samo u Erevosu** | Zapečaćeni ključem prostora, ili ključem skrivenih razgovora za njihove, u jednoj datoteci za svaki prostor čija veličina otprilike pokazuje koliko ih ukupno ima, ali ne i čiji su; njihove fotografije svaka u vlastitoj datoteci. Nikad u Androidovim kontaktima. .vcf datoteka sačuvana od njih, i od onih iz skrivenih razgovora, je izvan Erevosa, nešifrirana. Pozivi i SMS poruke prema njima idu preko telefona i prikazuju se u njegovom zapisniku poziva i SMS porukama. | |
| **Telefonski pozivi** | Obični telefonski pozivi: prenosi ih telefonska kompanija i može ih prisluškivati, kao i kod svake aplikacije za telefon. Android čuva historiju poziva, a Erevos je ne zapečaćuje, kao i za svaku aplikaciju za telefon; Erevos je čita, kao i favorite, da bi ih prikazao, iz nje briše samo pozive koje vi obrišete, i ne čuva nikakvu kopiju. SIM kartica izabrana za svaki broj zapečaćena je u prostoru; brzi odgovori i ono što je blokirano (samo prefiksi, identifikatori grupa i vremena, isto za svaki prostor) čuvaju se na telefonu, nezapečaćeni. | |
| **Uvezeni razgovori** | Zapečaćeni u prostoru u koji su uneseni, kao i njihove fotografije i datoteke, svaka u svojim dijelovima kao i datoteka razgovora. Veličina datoteke, i broj dijelova, otprilike govore koliko je uvezeno, ali ne i gdje. | Viberove fotografije i datoteke, i datoteke veće od 1 GB. |
| **Historija poruka** | Čuva se na telefonu, zapečaćena u svom prostoru, bez ograničenja, u stranicama iste veličine pomiješanim za sve prostore. Vidi se samo koliko sve zajedno zauzima, a ne kojem prostoru pripada. Brisanje na oba telefona i poruke koje nestaju oslanjaju se na Erevos drugog telefona. | |
| **Poruke u blizini** | Otvaraju se samo u prostoru koji ima taj kontakt. Poruka za drugi prostor čeka u memoriji, najviše šest sati, dok se taj prostor ne otvori. Skriveni razgovori nikad ne koriste vezu u blizini. | Skriveni razgovori u blizini. |
| **Glasovne poruke** | Šifrirane s kraja na kraj preko relaya ili u blizini, u dijelovima: relay, ili onaj ko prisluškuje u blizini, može otprilike saznati koliko je svaka duga. Svaki zvuk zapečaćen je u vlastitoj datoteci; broj datoteka i njihove veličine otprilike pokazuju koliko ih se čuva, ali ne i u kojem prostoru. Otpečaćen u kešu samo dok se pušta. | Zvučne datoteke sve iste veličine. |
| **Fotografije i datoteke** | Šifrirane s kraja na kraj, preko pohrane datoteka relaya, u dijelovima iste veličine: relay vidi koliko ih je i kada, dakle otprilike koliko su velike. Vaš relay vidi vašu adresu, kao i kod poruka; kontakt ih preuzima preko vlastitog relaya. Fotografije gube lokaciju, telefon i vrijeme, osim ako su poslane kao datoteka; datoteka zadržava ono što govori u sebi. Zapečaćene na telefonu u svojim dijelovima, prikazane iz memorije. Sačuvane kopije su izvan Erevosa. Još nisu u rezervnim kopijama. | Rezervne kopije koje ih sadrže. |
| **Na računaru** | Zapečaćeno kao na telefonu, u vlastitom folderu aplikacije. Njeno spremište ključeva zapečaćeno je privjeskom za ključeve sistema (na Windowsu ključem vašeg naloga); na Linux sistemu bez njega Erevos ne čuva ništa osim ako nije pokrenut sa \`--plain-secrets\`, a tada ga čuva onakvo kakvo jeste. | |
| **Rezervne kopije** | Jedna datoteka zapečaćena vlastitom lozinkom, koja sadrži svaki prostor onako kako je zapečaćen na telefonu. Njeno ime kaže da je to Erevos rezervna kopija, a njena veličina otprilike pokazuje koliko se čuva. Automatske rezervne kopije čuvaju svoju lozinku na telefonu. | Rezervne kopije direktno na Nextcloud ili WebDAV. |
| **Oznake ✓✓ i ✓✓✓** | Telefon kontakta saznaje, šifrirano, kada je vaš dobio i pročitao njegove poruke. Relay, ili onaj ko prisluškuje u blizini, vidi još jednu malu poruku. | Prekidač da se ne javlja kada čitate. |
| **Otisak prsta ili lice (Android)** | Isključeno dok se ne uključi. Otvara samo prostor prve lozinke: njegov ključ zapečaćen je u Android Keystoreu, upotrebljiv samo odmah nakon jake provjere otiska prsta ili lica, i odbacuje se kad se oni promijene. Neko ko vas drži može upotrijebiti vaš prst. | |
| **Obavijesti (Android)** | U pozadini: „Erevos – Ready for calls and messages“ (ne na zaključanom ekranu), „Incoming call“ ili „Incoming video call“ – „Open Erevos to answer“, i „New message“ ili koliko ih je stiglo; kad ga zaustavi Android ili lozinka, „Closed by Android“ ili „Locked“ – „Open it to receive calls and messages again“; podsjetnik, „Reminder“ ili koliko ih je; nova verzija, „Erevos X is out“. Nikad od koga ni šta. Na zaključanom telefonu obavijest o porukama kaže samo „Erevos“. Skriveni razgovori kojima je to dozvoljeno prikazuju istu obavijest, brojanu s ostalima: onaj ko je vidi i ne nađe ništa novo mogao bi pretpostaviti da ih ima još. Kao aplikacija za telefon, obavijest o telefonskom pozivu navodi ko zove, i preko zaključanog ekrana, kao kod svake aplikacije za telefon, ali nikad imenom koje znaju samo skriveni razgovori: poziv od jednog od njihovih kontakata prikazuje broj. | |
| **Widget i Telefon (Android)** | Widget, kad se doda, prikazuje koliko ima propuštenih poziva, nepročitanih SMS poruka i novih poruka, nikad od koga ni šta. Telefon se otvara bez lozinke samo ako to dozvolite: tada svako ko drži otključan telefon vidi pozive i favorite koje Android čuva, samo s imenima iz kontakata telefona. | |
| **Pozivi** | Šifrirani s kraja na kraj (DTLS-SRTP, čiji se ključ šalje u šifriranom razgovoru). Preko relaya za pozive nijedan telefon ne vidi IP adresu drugog; server na kojem on radi vidi obje, kada i koliko dugo, i koliko prolazi. Bez relaya za pozive, samo na istoj Wi-Fi mreži, svaki telefon vidi adresu drugog. Relayi vide kada poziv počinje zvoniti. | Zvonjenje na računaru i u web-aplikaciji dok su zatvoreni. Pozivi preko Bluetootha (walkie-talkie tamo radi). |
| **Grupni razgovori** | Šifrirani s kraja na kraj pomoću MLS-a (RFC 9420); uklonjeni članovi nakon toga ništa ne čitaju. Kopija svakog člana zapečaćena je zasebno, pa relayi ne mogu saznati ko je u grupi; svaki relay ipak vidi da poruka stiže u red. Članovi vide ključeve i adrese relaya jedni drugih. Fotografije, datoteke i glasovne poruke idu preko pohrane datoteka relaya pošiljaoca, kao i kontaktu, i ostaju tamo 14 dana. Nije nezavisno provjereno. | |
| **Grupni pozivi** | Glasovni i video, šifrirani s kraja na kraj između svaka dva telefona u pozivu (DTLS-SRTP, čiji se ključevi šalju u šifriranju grupe). Preko relaya za pozive nijedan telefon ne vidi IP adresu drugog; server na kojem on radi vidi adresu svakog telefona, kada i koliko dugo, i koliko prolazi. Svaki član, u pozivu ili ne, saznaje ko je u njemu. Relayi vide kada poziv počinje. | Video s više od četiri osobe, preko servera; više od osam osoba. |
| **Javne grupe** | Kao grupni razgovori, a svako ko ima link može zatražiti ulazak i čitati od trenutka kad ga puste. Zahtjevi stižu na relay vlasnika zapečaćeni za telefon vlasnika: relay vidi koliko ih je i kada, ali ne i od koga. Članovi vide izabrana imena jedni drugih, ključeve napravljene samo za tu grupu, adrese relaya i identifikatore pošiljaoca redova. Nije nezavisno provjereno. | |
| **Pregledi linkova** | Isključeni dok se ne uključe. Tada, dok šaljete link, vaš telefon preuzima njegovu stranicu direktno sa sajta, koji vidi vašu IP adresu i vrijeme, ali ne i za koga je poruka. Pregled ide unutar šifrirane poruke; telefon koji je primi ništa ne preuzima. Nijedan dok prostor ide preko Tora; u skrivenim razgovorima samo s vlastitim prekidačem njihovog mjesta. | Pregledi preko Tora. |

## Transparentnost {#transparency}

Šta čuva server iza Erevosa (lphl.nekten.eu) i šta je od njega traženo. Ova stranica izlazi unutar svakog izdanja,
pa je potpisana s izdanjem, kao i aplikacija.

**Zahtjevi vlasti.** Zaključno s ovim izdanjem: nijedan. Nijedna vlast, sud ni kompanija nije tražila podatke o
bilo kome ko koristi Erevos, i od nikoga nije traženo da prešuti takav zahtjev. Ako ovaj pasus ikad nestane, ili
više ne kaže „nijedan“, shvatite to kao znak. **Zašto:** zahtjev koji dolazi s naredbom da se prešuti ne može se
reći, ali rečenica koja se prestane pisati može se primijetiti. To radi samo dok se obnavlja: svako izdanje to
ponovo kaže.

Šta relay čuva, i koliko dugo:

| Šta | Koliko dugo |
| --- | --- |
| **Poruke koje čekaju**, šifrirane s kraja na kraj | Dok se ne preuzmu, najviše 14 dana. |
| **Fotografije i datoteke**, šifrirane, u dijelovima | Kao i poruke: dok se ne preuzmu, najviše 14 dana. |
| **Poruke poslane za kasnije**, šifrirane | Dok ne dođe njihovo vrijeme. |
| **Redovi**, nasumični identifikatori bez imena | Dok ih njihov telefon ne koristi 180 dana. |
| **Pristupni redovi**: za svaki telefon, SHA-256 njegovog tokena i ime: ono koje je upisao onaj ko je pozvao, ili LPHL korisničko ime za one koji su se prijavili preko LPHL-a | Dok se red ne ukloni, ili dok ne nestane red koji ga je pozvao. |
| **Push adrese web-aplikacije**, za obavijesti dok je web-aplikacija zatvorena | Dok se ne isključe u web-aplikaciji. |

Šta ne čuva:

- **Nema popisa veza.** Relay ne piše nikakav zapisnik o tome ko se povezao ni kada, a web server ispred relaya i
  web-aplikacije ne vodi zapisnik pristupa od 24. oktobra 2026. Greške se zapisuju, a greška može navesti adresu.
- **Nema kontakata, imena ni brojeva telefona.** Nema ih šta čuvati.

Šta i dalje vidi dok radi: IP adrese koje se povezuju, kada poruke stižu i odlaze, i koliko su velike, kao što kaže
[Šta je danas zaštićeno](#privacy). Tokom poziva preko relaya za pozive, IP adrese telefona u njemu.

**Kopije.** Folder relaya kopira se svaki dan, s porukama na čekanju i dalje šifriranim s kraja na kraj. Kopije sadrže
ono što navodi tabela iznad, onoliko dugo koliko se čuvaju.

**Drugi koji nešto vide:** hosting kompanija (Hetzner), koja vodi mašinu i njenu mrežu; LPHL-ova prijava (Authentik),
koja vidi svaku prijavu preko LPHL-a; a za web-aplikaciju s obavijestima dok je zatvorena, push usluga preglednika
(Apple, Google ili Mozilla), koja vidi da je obavijest stigla, nikad šta.

## Šta dolazi {#coming}

Šifriranje s kraja na kraj je tu, preko relaya i preko veze u blizini, i većina onoga što slijedi gradi se na njemu.

- **Više načina da ostanete u kontaktu:** Tor mostovi za mjesta gdje je Tor blokiran su tu, pogledajte [Preko
  Tora](#tor). Sljedeće: Tor na računaru.
  - **LoRa radiji (Meshtastic):** tu su, pogledajte [Preko LoRa radija](#lora). Sljedeće: postavljanje imena radija
    iz Erevosa.
  - **SMS:** Erevos kao SMS aplikacija je tu, s MMS fotografijama, grupnim MMS-om i dvije SIM kartice, pogledajte
    [SMS](#sms).
  - **Telefon:** Erevos kao aplikacija za telefon je tu, s vlastitim ekranom za pozive, pogledajte [Telefon](#phone).
  - **E-mail, QR kodovi, USB, NFC:** za kad ništa drugo ne prolazi.
- **Pozivi:** glasovni i video pozivi su tu, a na Androidu zvone u pozadini, pogledajte [Razgovor preko
  relaya](#relay), a tu je i walkie-talkie koji radi čak i preko Bluetootha.
- **Grupe:** grupni razgovori, s fotografijama, datotekama i glasovnim porukama, te grupni glasovni i video pozivi su
  tu, pogledajte [Grupni razgovori](#groups). Sljedeće: video s više od četiri osobe, preko servera na koji poziv sam
  prelazi, i dalje šifriran s kraja na kraj.
- **Donošenje vaših razgovora:** Telegram i WhatsApp već dolaze, sa svojim fotografijama i datotekama, a Viber sa
  svojim riječima, pogledajte [Uvezeni razgovori](#import). Sljedeće: Viberove fotografije i datoteke.
- **Više sistema:** javne grupe i grupni pozivi i na povezanim uređajima; nalog, njegovi pozivi i njegove grupe već su
  na računaru, pogledajte [Povezani uređaji](#devices). Linux, macOS i Windows su tu, pogledajte [Na
  računaru](#desktop), iPhone iz preglednika, pogledajte [Na iPhoneu](#iphone), i Sailfish OS, pogledajte [Na
  Sailfish OS-u](#sailfish); a tu su i rezervne kopije, pogledajte [Rezervne kopije](#backup).

## Pitanja {#faq}

### Ne sjećam se lozinke.

Ne postoji način da se vrati. Erevos ne čuva ništa što bi moglo otvoriti vaše podatke bez nje. Samo ako je uključeno
otključavanje [otiskom prsta ili licem](#lock), još uvijek otvara prvi prostor: tamo postavite novu lozinku pomoću
**Promijeni lozinku**.

### Kontakt koji je u blizini nikad ne prikazuje „U blizini“.

- Pišite mu: telefoni saznaju koji je koji iz prve poruke koja
  stigne u blizini. Pronalaze se samo kontakti, pa prvo dodajte jedno drugo.
- Držite prostor otvoren na oba telefona: Erevos na ekranu, ili u pozadini s **U pozadini** postavljenim na **Primaj
  i zvoni**.
- Provjerite je li Bluetooth uključen (a na Androidu 12 i starijem i lokacija), i smije li Erevos pronalaziti uređaje
  u blizini (postavke Androida → Aplikacije → Erevos → Dozvole).
- Približite telefone. Ako jedan od njih nema Wi-Fi Aware, sreću se preko Bluetootha, koji se sporije pokreće.
- Ili povežite oba na jednu Wi-Fi mrežu, ili na hotspot jednog telefona, s uključenim **Pronađi Erevos na istoj Wi-Fi
  mreži**. Neke javne Wi-Fi mreže drže uređaje na sebi razdvojenima: tamo to ne može raditi. Bez zajedničke Wi-Fi
  mreže, **Napravi Wi-Fi mrežu s telefonima u blizini** im omogućava da je naprave (Android 10 i noviji); dajte tome
  do minut-dva.

### Preko LoRa veze ništa ne stiže.

- Oba radija trebaju istu regiju i isti prvi kanal (njegovo ime i ključ) u aplikaciji Meshtastic, i moraju biti u
  dometu jedan drugog, ili radija između njih.
- **LoRa radio**, pod **Postavke** → **Relay i mreže**, mora reći **Povezano**. Ako ne kaže, zatvorite aplikaciju
  Meshtastic: radio se povezuje s jednom po jednom aplikacijom.
- Idu samo tekstovi, i to samo kad relay nije dostupan i nijedan telefon nije u blizini.
- U EU radio smije slati samo ograničeno svakog sata: nakon mnogo poruka, čeka.

### Kod kontakta nije dodan.

Kontaktu na drugom relayu potreban je link s ključem tog relaya, koji imaju linkovi iz ažurnog Erevosa: linija ispod
razgovora navodi taj relay. Kod iz starijeg Erevosa nema ključeve i odbija se: zatražite novi.

### Može li relay čitati moje poruke?

Ne. Poruke preko relaya šifrirane su s kraja na kraj, a ključeve imaju samo dva telefona. Relay ipak vidi koji se
redovi koriste, te kada i koliko stiže ([Vlastiti relay](#own-relay)). Uporedite sigurnosni broj, kao u [Razgovor
preko relaya](#relay), da biste bili sigurni da niko nije između. Još ništa nisu provjerili nezavisni stručnjaci.

### Zašto Erevos ne traži moj broj telefona?

Zato što mu ne treba. Svaki kontakt je par jednosmjernih redova na relayu, pa nijedan server ne čuva popis ko koga
poznaje.

### Radi li na iPhoneu ili računaru?

Na računaru, da: Linux, macOS i Windows, pogledajte [Na računaru](#desktop).
Na iPhoneu, da, iz preglednika, kao web-aplikacija, pogledajte [Na iPhoneu](#iphone).
`;
