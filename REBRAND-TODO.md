# Rebrand TODO: Larrykonn -> Hrčak

Ovaj dokument prati konkretne taskove za rebrand forka u **Hrčak**. Originalni `README.md` je sačuvan kao `README.original.md`.

## Dokumentacija

- [x] Sačuvati originalni `README.md` kao `README.original.md`.
- [x] Dodati hrvatski overview dokument `README-HR.md`.
- [x] Odlučiti hoće li glavni `README.md` ostati originalni Larrykonn README ili postati novi Hrčak README.
- [x] Ako `README.md` postaje novi glavni README, prebaciti sadržaj iz `README-HR.md` i zadržati link na `README.original.md`.

## Brand naziv u frontend kodu

- [x] `resources/js/pages/welcome.tsx` - promijeniti `<Head title="Larrykonn" />` u `Hrčak`.
- [x] `resources/js/pages/welcome.tsx` - promijeniti landing naslov `Larrykonn` u `Hrčak`.
- [x] `resources/js/layouts/auth/auth-simple-layout.tsx` - promijeniti auth brand tekst `Larrykonn` u `Hrčak`.
- [x] `resources/js/components/app-header.tsx` - promijeniti desktop/mobile brand tekst `Larrykonn` u `Hrčak`.
- [x] `resources/js/components/app-logo.tsx` - promijeniti screen-reader ili vizualni brand tekst `Larrykonn` u `Hrčak`.
- [x] Pretražiti frontend s `rg "Larrykonn|larrykonn"` i ukloniti preostale reference gdje nisu namjerno povijesne.

## Logo i slika

- [x] `resources/js/components/app-logo-icon.tsx` - promijeniti `alt="Larrykonn"` u `alt="Hrčak"`.
- [x] Odlučiti ostaje li postojeća slika `/public/images/larrykonn.png` ili se dodaje nova Hrčak slika.
- [x] Ako se dodaje nova slika, spremiti je u `public/images/` i ažurirati `src` u `app-logo-icon.tsx`.
- [x] Ako se mijenja filename, provjeriti da build ne referencira staru `/images/larrykonn.png` putanju.

## Footer

- [x] `resources/js/layouts/app/app-header-layout.tsx` - zadržati tekst:

```text
Built with Laravel & Laravel AI SDK. Deployed on Laravel Cloud.
```

- [x] U istom footeru promijeniti GitHub link iz:

```text
https://github.com/joshcirre/larrykonn
```

u:

```text
https://github.com/mkopcic/laravel-ai-agent-demo
```

- [x] U istom footeru promijeniti labelu iz:

```text
joshcirre/larrykonn
```

u:

```text
mkopcic/laravel-ai-agent-demo
```

## Konfiguracija i metadata

- [x] `solo.yml` - promijeniti `name: larrykonn` u odgovarajući slug, npr. `name: hrcak`.
- [x] Provjeriti `.env.example`, `config/app.php` i ostale metadata datoteke za eventualni `APP_NAME` ili brand tekst.
- [x] Pretražiti cijeli repo s `rg "Larrykonn|larrykonn|joshcirre/larrykonn"` nakon izmjena.

## Verifikacija

- [x] Pokrenuti frontend typecheck:

```shell
npm run types
```

- [x] Pokrenuti frontend build:

```shell
npm run build
```

- [ ] Ako su mijenjani PHP fajlovi, pokrenuti Pint:

```shell
vendor/bin/pint --dirty --format agent
```

- [ ] Ako su mijenjani behavior ili rute, pokrenuti relevantne Pest testove:

```shell
php artisan test --compact
```

## Napomena

Ovaj TODO je namjerno fokusiran na rebrand. Ne uključuje promjene AI ponašanja, modele, queue flow, storage ili database strukturu.
