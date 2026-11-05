# Clapp Game

Expo (React Native + TypeScript) mobiljáték, Expo Routerrel és Supabase háttérrel. A környezetek (EAS build profilok, EAS env, GitHub Actions) ugyanúgy vannak beállítva, mint a Clapp OBDII reader appban.

- **Expo SDK 58**, React Native 0.88, TypeScript (strict)
- **Expo Router**: fájl alapú navigáció, a képernyők a `src/app/` mappában vannak
- **Supabase** (opcionális, pl. ranglistához): a kliens a `src/lib/supabase.ts` fájlban
- **EAS**: build profilok az `eas.json` fájlban

A kezdőképernyő (`src/app/index.tsx`) egyelőre egy helykitöltő koppintós játék.

## Előfeltételek

- Node.js 20 vagy újabb
- A telefonodon az **Expo Go** alkalmazás ([iOS](https://apps.apple.com/app/expo-go/id982107779), [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Egy Supabase projekt ([supabase.com](https://supabase.com))

## Indítás Expo Go-val

```bash
npm install
cp .env.example .env   # majd töltsd ki a Supabase adatokat
npx expo start
```

A terminálban megjelenik egy QR-kód:

- **iOS**: olvasd be a beépített Kamera alkalmazással.
- **Android**: olvasd be az Expo Go alkalmazáson belül.

A telefonnak és a gépnek ugyanazon a Wi-Fi hálózaton kell lennie. Ha ez nem megy (például céges hálózaton), indítsd így: `npx expo start --tunnel`.



## Környezeti változók

A konfiguráció a `.env` fájlból jön, ami nincs verziókezelve. Minta: [`.env.example`](.env.example).

| Változó | Honnan |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon / publishable key |

Az `EXPO_PUBLIC_` előtagú változók bekerülnek az app bundle-be, ezért csak publikus értéket tegyél ide. A `service_role` kulcsot soha ne használd az appban: a jogosultságokat Row Level Security szabályokkal kezeld.

A `.env` módosítása után indítsd újra a dev szervert (`npx expo start -c`).

## Supabase használata

```ts
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.from('todos').select('*');
```

## EAS (build és kiadás)

```bash
npm install -g eas-cli   # vagy: npx eas-cli@latest <parancs>
eas login
eas init                 # összeköti a projektet az Expo fiókoddal (projectId az app.json-ba)
```

Profilok (`eas.json`):

| Profil | Mire való |
| --- | --- |
| `development` | Development build (`expo-dev-client` kell hozzá), ha olyan natív modul kerül be, amit az Expo Go nem tartalmaz |
| `preview` | Belső tesztelésre szánt build (APK / ad hoc iOS) |
| `production` | Áruházba szánt build, automatikus verziószám-növeléssel |

```bash
eas build --profile preview --platform android
eas build --profile production --platform all
```

A buildekhez a környezeti változókat az EAS-ben kell megadni (`eas env:create`, vagy az expo.dev felületén), mert a `.env` nem kerül fel.

Az `app.json`-ban a `com.clapp.game` bundle azonosító helykitöltő: az első áruházi build előtt cseréld a sajátodra.

## Automatikus Android build (parancsok nélkül)

Minden alkalommal, amikor valami bekerül a `main` ágba (például merge-elsz egy PR-t), a GitHub magától elindít egy Android buildet az EAS-en ([`.github/workflows/android-build.yml`](.github/workflows/android-build.yml)). Ez **preview** build: önálló app, a teljes kód benne van, nem kell hozzá gép vagy dev szerver.

### Egyszeri beállítás (kb. 3 perc, csak kattintás)

1. **Expo token**: [expo.dev → Access tokens](https://expo.dev/settings/access-tokens) → **Create token** → név: `github` → **Create**, és másold ki a tokent (csak egyszer látod).
2. **GitHub secret**: a repóban **Settings → Secrets and variables → Actions → New repository secret**. Name: `EXPO_TOKEN`, Secret: a kimásolt token → **Add secret**.
3. Első build kézzel: **Actions → Android build → Run workflow → Run workflow**.

### Telepítés a telefonra

- A futás végén a GitHub **Actions** fülön, a futás összefoglalójában ott a build linkje. Ugyanez megtalálható az [expo.dev](https://expo.dev) oldalon a Clapp Game projekt **Builds** listájában.
- A build 10–30 perc. Utána nyisd meg a linket a telefonon → **Install** → telepítsd az `.apk`-t (az első alkalommal engedélyezd az „ismeretlen forrásból” telepítést a böngészőnek). Az új verzió a régire települ, az adatok megmaradnak.

A **development** profilt (dev client) is lehet kézzel indítani: **Run workflow** → Build profil: `development`.

A Supabase adatokat (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) az expo.dev oldalon a projekt **Environment variables** menüjében kell megadni a `preview` környezethez, mert a `.env` nem kerül fel.

## Webes élő előnézet

A `.github/workflows/web-preview.yml` minden pull requestnél és minden main-re kerülő változásnál feltölti a játék webes változatát az EAS Hostingra, így linkről, telepítés nélkül kipróbálható:

- **Pull request:** `https://clapp-game--pr-<szám>.expo.app`, a link kommentben jelenik meg a PR alatt, és minden push után frissül.
- **main:** `https://clapp-game--main.expo.app`

## Hasznos parancsok

```bash
npx expo start            # dev szerver
npx expo install <csomag> # SDK-kompatibilis csomagtelepítés (npm install helyett)
npx tsc --noEmit          # típusellenőrzés
npx expo lint             # lint
npx expo-doctor           # függőségek és konfiguráció ellenőrzése
```

## Mappaszerkezet

```
src/
  app/          # Expo Router képernyők és layoutok
  components/   # Újrahasználható komponensek
  constants/    # Téma, színek, térközök
  hooks/        # Saját hookok
  lib/          # Supabase kliens és egyéb szolgáltatások
assets/         # Ikonok, képek, splash
```
