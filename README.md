# 🐹 Hrčak

Hrčak je personal agent library i demo aplikacija izgrađena na Laravel AI SDK-u. Korisnik sprema linkove, dokumente i slike, a AI ih analizira, kategorizira i pretvara u privatnu bazu znanja dostupnu kroz chat agenta.

Detaljan hrvatski pregled projekta nalazi se u [README-HR.md](README-HR.md). Originalni Larrykonn README je sačuvan u [README.original.md](README.original.md).

## ✨ Što radi

- 🔗 Sprema research iteme kao URL-ove, dokumente ili slike.
- 🤖 Analizira sadržaj pomoću Laravel AI SDK agenata.
- 🏷️ Generira sažetak, naslov i kategoriju.
- 🗄️ Kreira osobni vector store za svakog korisnika.
- 💬 Omogućuje chat s agentom koji koristi korisnikovu bazu znanja i web search.
- ⚡ Streama odgovore kroz Inertia React sučelje.
- 🔐 Koristi Fortify za auth, profil i 2FA.

## 🛠️ Tech stack

- ⚙️ Laravel 13
- 🧠 Laravel AI SDK
- 🌐 Inertia.js v2
- ⚛️ React 19
- 🔷 TypeScript
- 🎨 Tailwind CSS v4
- 🔑 Laravel Fortify
- 📡 Laravel Reverb / Echo
- 🗺️ Laravel Wayfinder
- 🐘 PostgreSQL
- 🧪 Pest 4
- ⚡ Vite

## 🚀 Lokalno pokretanje

```shell
cp .env.example .env
composer install
npm install
php artisan key:generate
php artisan migrate
npm run dev
```

Za obradu uploadanih research itema pokreni queue worker:

```shell
php artisan queue:listen --tries=1 --timeout=0
```

Ili koristi postojeći helper:

```shell
composer run dev
```

## 🔗 Linkovi

- 🧠 Laravel AI SDK: https://laravel.com/ai
- ☁️ Laravel Cloud: https://laravel.com/cloud
- 🌍 App: https://hrcak.mellon.hr
- 📦 Repo: https://github.com/mkopcic/ai-agent-demo

Built with ❤️ using Laravel & Laravel AI SDK. Deployed on Laravel Cloud.
