# Lokalizacija Hrčak aplikacije

Ovaj dokument opisuje preporučeni plan lokalizacije Hrčak aplikacije na hrvatski jezik. Ne mijenja postojeću implementaciju, nego služi kao tehnički dogovor prije uvođenja prijevoda.

## Cilj

Hrčak je Inertia React aplikacija na Laravel backendu. Većina korisničkog sučelja nalazi se u React komponentama, dok backend generira validacijske poruke, auth poruke, flash poruke i server-side tekstove. Zbog toga je najbolji pristup kombinirati frontend i backend lokalizaciju umjesto tražiti jedan package koji rješava sve.

Primarni cilj je hrvatski kao glavni jezik aplikacije, uz arhitekturu koja kasnije može podržati engleski ili dodatne jezike bez većeg refaktora.

## Preporučeni pristup

Najbolja kombinacija za trenutni projekt je:

```text
react-i18next + i18next
Laravel native localization
laravel-lang/publisher
```

`react-i18next` pokriva React/Inertia sučelje, `Laravel native localization` pokriva backend stringove i server-side poruke, a `laravel-lang/publisher` donosi gotove hrvatske prijevode za Laravel/Fortify/validation sloj.

Ne bih uvodio lokalizirane URL-ove u ovoj fazi. Package poput `mcamara/laravel-localization` ima smisla za rute tipa `/hr/research` i `/en/research`, ali Hrčak trenutno treba prijevod aplikacije, ne multi-language routing. To bi sada dodalo nepotrebnu kompleksnost.

## Frontend lokalizacija

Za React UI najbolji izbor je `i18next` s `react-i18next`.

Predloženi paketi:

```shell
npm install i18next react-i18next
```

Razlozi:

- standardan izbor za React aplikacije,
- dobra TypeScript podrška,
- podržava pluralizaciju i interpolaciju,
- radi dobro s Viteom,
- ne ovisi o Next.js ili posebnom routing modelu,
- može se koristiti u Inertia stranicama, layoutima, formama i reusable komponentama.

Predložena struktura:

```text
resources/js/i18n/index.ts
resources/js/i18n/locales/hr/common.json
resources/js/i18n/locales/hr/auth.json
resources/js/i18n/locales/hr/research.json
resources/js/i18n/locales/hr/chat.json
resources/js/i18n/locales/hr/settings.json
```

Ako se kasnije doda engleski:

```text
resources/js/i18n/locales/en/common.json
resources/js/i18n/locales/en/auth.json
resources/js/i18n/locales/en/research.json
resources/js/i18n/locales/en/chat.json
resources/js/i18n/locales/en/settings.json
```

`resources/js/i18n/index.ts` bi inicijalizirao i18next, registrirao namespaceove i postavio `hr` kao default locale. Aplikacija bi taj setup uvozila u `resources/js/app.tsx` i `resources/js/ssr.tsx` prije renderiranja Inertia aplikacije.

## Backend lokalizacija

Laravel već ima ugrađenu lokalizaciju. Za Hrčak backend sloj treba pokriti:

- validacijske poruke,
- auth/Fortify poruke,
- flash poruke iz kontrolera,
- eventualne server-side nazive ili poruke koje se šalju u Inertia props.

Predloženi package:

```shell
composer require --dev laravel-lang/publisher
php artisan lang:update
```

Ovaj package je najbolji izbor jer održava prijevode za Laravel ekosustav i podržava Laravel 13. Nakon publish/update koraka očekuje se `lang` direktorij s hrvatskim prijevodima.

Laravel konfiguracija bi trebala imati hrvatski kao default:

```php
'locale' => 'hr',
'fallback_locale' => 'en',
```

Ako se želi zadržati mogućnost promjene jezika kasnije, locale se može vezati uz korisničku postavku. Za sada je dovoljno postaviti hrvatski kao aplikacijski default.

## Inertia povezivanje

Locale treba biti dostupan frontendu kroz Inertia shared props. Najbolje mjesto je postojeći middleware:

```text
app/Http/Middleware/HandleInertiaRequests.php
```

Tamo bi se uz postojeće shared podatke dodalo nešto poput:

```php
'locale' => app()->getLocale(),
```

Frontend zatim može koristiti taj locale za inicijalizaciju i18nexta ili ga držati kao informaciju za budući language switcher.

Za trenutnu fazu, ako je hrvatski jedini podržani jezik, frontend može jednostavno inicijalizirati `hr` kao default bez dodatnog UI switchera.

## Scope prijevoda

Prvi prolaz prijevoda treba pokriti sav vidljivi tekst u:

```text
resources/js/pages/welcome.tsx
resources/js/pages/auth/
resources/js/pages/research/
resources/js/pages/settings/
resources/js/components/app-*.tsx
resources/js/components/chat/
resources/js/components/research/
resources/js/components/nav-*.tsx
resources/js/components/user-*.tsx
```

Posebno važne domene:

- auth: login, register, reset password, 2FA, verify email,
- research library: capture form, item cards, filters, empty states, actions,
- chat: input placeholderi, tool activity, conversation controls, stream states,
- settings: profile, password, appearance, 2FA,
- navigation/footer/header.

Nazive domena u UI-u vrijedi prevesti pažljivo. Primjerice, `Library` može biti `Biblioteka`, `Research` može biti `Istraživanje`, a `Chat` može ostati `Chat` jer je korisnicima prirodan izraz.

## AI promptovi

AI promptovi u agentima trenutno su na engleskom. Ne bih ih prevodio u istom koraku kao UI lokalizaciju.

Razlog je praktičan: promptovi utječu na ponašanje modela i kvalitetu odgovora. Njih treba tretirati kao zaseban AI behavior task. UI može biti na hrvatskom, dok agenti i dalje mogu imati engleske sistemske upute ako to daje stabilnije rezultate.

Kasnije se može dodati pravilo da agent odgovara korisniku na hrvatskom, ali to treba testirati odvojeno.

## Dokumentacija

Od stare dokumentacije vrijedi zadržati korisne dijelove:

- instalacija dependencyja,
- kopiranje `.env.example`,
- generiranje app keya,
- migracije,
- pokretanje Vitea,
- pokretanje queue workera,
- kratki opis Laravel AI SDK mogućnosti,
- pregled ključnih datoteka.

Trenutni `README.md` treba ostati kratak i praktičan. Detaljniji opis projekta može ostati u `README-HR.md`, a originalni Larrykonn sadržaj već je sačuvan u `README.original.md`.

## Preporučeni redoslijed integracije

Prvo treba uvesti backend hrvatske prijevode kroz Laravel Lang Publisher i postaviti locale. Nakon toga treba dodati frontend i18n setup s hrvatskim namespaceovima. Tek onda ima smisla prolaziti komponentu po komponentu i zamjenjivati hardkodirane stringove s `t(...)` pozivima.

Nakon svake veće grupe stranica treba pokrenuti typecheck i build. Budući da se ovdje dira puno UI stringova, korisno je napraviti i ručni smoke test ključnih ekrana: landing, login, register, research index, research show, chat i settings.

## Verifikacija

Za frontend:

```shell
npm run types
npm run build
```

Ako `npm` nije dostupan u shellu, može se koristiti lokalni Node runtime i postojeći `node_modules` binariji kao kod prethodne provjere.

Za backend:

```shell
php artisan test --compact
```

Ako se mijenjaju PHP datoteke:

```shell
vendor/bin/pint --dirty --format agent
```

## Zaključak

Za trenutni Hrčak projekt najbolja i najčišća lokalizacijska arhitektura je `react-i18next` za React UI, Laravelova ugrađena lokalizacija za backend i `laravel-lang/publisher` za hrvatske framework/Fortify/validation prijevode. Time se dobiva ozbiljna osnova za hrvatsko sučelje bez nepotrebnog zahvata u rute, AI behavior ili database strukturu.
