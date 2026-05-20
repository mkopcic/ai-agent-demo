# Hrčak

Hrčak je personal agent library i demo aplikacija izgrađena na Laravel AI SDK-u. Projekt je kloniran iz Larrykonn demo aplikacije, ali je cilj rebrandirati ga u vlastiti alat za osobnu bazu znanja: mjesto gdje korisnik sprema linkove, dokumente i slike, a AI ih analizira, kategorizira i pretvara u sadržaj koji se kasnije može pretraživati kroz chat agenta.

Ukratko: Hrčak je osobni research assistant. Spremaš materijale, aplikacija ih obradi u pozadini, doda ih u korisnikov vector store i zatim možeš razgovarati s agentom koji prvo traži po tvojoj privatnoj bazi znanja, a po potrebi koristi i web pretragu.

## Što aplikacija radi

- Sprema research iteme kao URL-ove, dokumente ili slike.
- Analizira slike, dokumente i web stranice pomoću Laravel AI SDK agenata.
- Generira AI sažetak, kraći naslov i kategoriju sadržaja.
- Kreira osobni vector store za svakog korisnika.
- Dodaje obrađeni sadržaj u vector store kako bi bio dostupan kroz file search.
- Omogućuje chat s research agentom koji koristi spremljenu bazu znanja i web search.
- Sprema i nastavlja razgovore kroz Laravel AI conversation memory.
- Streama odgovore agenta prema Inertia React sučelju.
- Podržava autentikaciju, registraciju, korisničke postavke i 2FA kroz Laravel Fortify.

## Glavni koncept

Hrčak tretira svaki spremljeni materijal kao dio osobne biblioteke:

1. Korisnik doda URL, dokument ili sliku.
2. Aplikacija spremi item u bazu i storage.
3. Queue job `AnalyzeResearchItem` preuzima obradu.
4. `AnalysisAgent` analizira sadržaj ovisno o tipu itema.
5. AI generira sažetak, naslov i kategoriju.
6. Sadržaj se sprema u provider file/vector store.
7. `ResearchAgent` koristi `FileSearch` i `WebSearch` za odgovore u chatu.

Ovaj flow čini aplikaciju praktičnim primjerom RAG obrasca u Laravelu: korisnik gradi vlastiti skup znanja, a agent ga koristi kao kontekst.

## AI agenti

### ResearchAgent

`ResearchAgent` je glavni chat agent. On ima upute da najprije pretraži korisnikovu bazu znanja, zatim po potrebi web, i da u odgovorima navede izvore.

Koristi:

- `RemembersConversations` za spremanje i nastavak razgovora.
- `FileSearch` za pretragu korisnikovog vector storea.
- `WebSearch` za dodatni vanjski kontekst.
- OpenAI provider kroz Laravel AI SDK.

### AnalysisAgent

`AnalysisAgent` je zadužen za analizu spremljenog sadržaja. Ima tri specijalizirana moda:

- analiza slike,
- analiza dokumenta,
- analiza URL sadržaja.

Njegov izlaz se koristi za sažetak, naslov, kategoriju i indeksiranje u vector store.

## Research itemi

Svaki research item može biti:

- `image` - slika koju AI opisuje i pretvara u tekstualni sažetak,
- `document` - dokument koji se uploadava provideru i dodaje u vector store,
- `url` - web stranica koju aplikacija pokušava dohvatiti, očistiti od HTML-a i sažeti.

Item sprema:

- korisnika,
- tip sadržaja,
- naslov,
- originalni URL ili putanju do datoteke,
- provider file ID,
- AI sažetak,
- korisničke bilješke,
- metadata podatke poput kategorije, originalnog imena datoteke, MIME tipa i veličine.

## Kategorije

Sadržaj se automatski kategorizira kroz enum `ResearchCategory`. Trenutne kategorije su:

- technology
- design
- research
- news
- recipes
- finance
- health
- education
- entertainment
- travel
- science
- business
- art
- reference
- other

## Tech stack

- PHP 8.x
- Laravel 13
- Laravel AI SDK
- Inertia.js v2
- React 19
- TypeScript
- Tailwind CSS v4
- Laravel Fortify
- Laravel Reverb / Echo
- Laravel Wayfinder
- Laravel Queues
- PostgreSQL
- Pest 4
- Vite
- Lucide React
- Radix UI / shadcn-style UI komponente

## Važne datoteke

- `routes/web.php` - glavne web rute za landing, dashboard, research i chat.
- `app/Http/Controllers/ResearchController.php` - upload, prikaz, pretraga, zamjena i brisanje research itema.
- `app/Http/Controllers/ConversationController.php` - chat sučelje, streaming odgovora i brisanje razgovora.
- `app/Jobs/AnalyzeResearchItem.php` - queue job koji analizira spremljeni sadržaj i dodaje ga u vector store.
- `app/Agents/ResearchAgent.php` - conversational agent za osobnu research bazu.
- `app/Agents/AnalysisAgent.php` - agent za analizu slika, dokumenata i URL sadržaja.
- `app/Models/ResearchItem.php` - Eloquent model za spremljene research materijale.
- `app/Models/User.php` - korisnik s vezom prema research itemima i `vector_store_id`.
- `resources/js/pages/research/index.tsx` - pregled spremljenih itema.
- `resources/js/pages/research/show.tsx` - detaljan prikaz itema.
- `resources/js/pages/research/chat.tsx` - chat stranica.
- `resources/js/components/chat/chat-interface.tsx` - frontend chat iskustvo.
- `resources/js/components/research/capture-form.tsx` - forma za dodavanje materijala.

## Lokalne upute

Kopiraj environment datoteku:

```shell
cp .env.example .env
```

Dodaj barem jedan AI provider API ključ u `.env`. Za postojeći flow aplikacija očekuje OpenAI jer koristi OpenAI file/vector store i provider tools.

Instaliraj dependencyje, generiraj app key i pokreni migracije:

```shell
composer install
npm install
php artisan key:generate
php artisan migrate
```

Pokreni frontend build/dev server:

```shell
npm run dev
```

Za obradu uploadanih itema mora raditi queue worker:

```shell
php artisan queue:listen --tries=1 --timeout=0
```

Projekt ima i Composer helper za paralelno pokretanje servera, queue workera, logova i Vitea:

```shell
composer run dev
```

## Testiranje

Projekt koristi Pest:

```shell
php artisan test --compact
```

Za PHP formatiranje koristi se Laravel Pint:

```shell
vendor/bin/pint --dirty --format agent
```

## Rebrand bilješke

Originalni naziv projekta bio je Larrykonn. Ovaj fork je rebrandiran u Hrčak.

Odrađeno:

- glavni `README.md` sada opisuje Hrčak,
- originalni README je sačuvan kao `README.original.md`,
- frontend brand tekstovi su promijenjeni u `Hrčak`,
- footer link sada pokazuje na `mkopcic/laravel-ai-agent-demo`,
- `solo.yml` koristi slug `hrcak`,
- logo asset se referencira kao `/images/hrcak.png`.

Footer tekst koji želiš prenijeti u svoj repo:

```text
Built with Laravel & Laravel AI SDK. Deployed on Laravel Cloud.
GitHub: mkopcic/laravel-ai-agent-demo
```

GitHub:

```text
https://github.com/mkopcic/laravel-ai-agent-demo
```

## Porijeklo

Projekt je nastao iz Larrykonn demo aplikacije koja pokazuje mogućnosti Laravel AI SDK-a. Ovaj fork ga širi i pozicionira kao Hrčak, osobnu biblioteku AI agenata i research asistenta.

Originalni footer referencirao je:

```text
Built with Laravel & Laravel AI SDK. Deployed on Laravel Cloud.
GitHub: joshcirre/larrykonn
```

Za ovaj repo koristi se:

```text
Built with Laravel & Laravel AI SDK. Deployed on Laravel Cloud.
GitHub: mkopcic/laravel-ai-agent-demo
```

## Linkovi

- Laravel: https://laravel.com
- Laravel AI SDK: https://laravel.com/ai
- Laravel Cloud: https://laravel.com/cloud
- Repo: https://github.com/mkopcic/laravel-ai-agent-demo
