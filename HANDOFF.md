# Nourish Family Hub — handoff notes for Claude Code

Paste or attach this file together with the project folder. Goal: **finish the setup and get the app live and working for Trinath's family, at zero cost.** Nothing has been deployed yet.

## 1. What this is

A free, no-backend-server family app, installable on iPhone ("Add to Home Screen") and usable on laptop browsers.

- One static file `index.html` (HTML + CSS + JS, no build tooling needed to run it) hosted on **GitHub Pages**.
- Sign-in with **Google**, data in **Firebase Firestore** (Spark/free plan), realtime sync.
- Family members join by an **8-character family code** (no Claude accounts involved).
- Optional free **Google Gemini** key for AI calorie estimates. Packaged-food search uses **Open Food Facts** (no key).
- Works in "this device only" mode (localStorage) if Firebase isn't configured. That is the mode it was tested in.

Modules: Home, Calendar (repeating events, birthdays), Timetable (weekly, per person), Tasks/chores (assignee, priority, repeat), Shopping (aisle grouping, "2 milk" quick add, multiple lists), Money (income/expenses, budgets, bills with mark-paid, savings goals, spend by person, CSV), Calories (food search, units, custom foods remembered, daily goal calculator, week and family views), Trips (plan, packing, bookings, budget, .ics export), Meal plan (adds ingredients to shopping), Family info notes (Wi-Fi, doctors, emergency numbers), Family & settings (profile, members, invite code, currency, text size, theme, backup export).

## 2. Folder layout

```
site/                      <- what gets published (copy to the GitHub repo root)
  index.html               built output, ~147 KB
  app-config.js            ** the only file that needs the user's keys **
  firestore.rules          paste into Firebase console -> Firestore -> Rules
  manifest.webmanifest, icon.svg, icon-180/192/512.png, sw.js, README.md
src/                       <- source parts (only needed if changing the app)
  app.css, shell.tpl.html, foods.txt
  10-core.js      helpers, Store (makeCol), Firebase connect/gates, UI kit, router
  20-pages-a.js   events, Home, More, Calendar, Timetable, Family/settings
  21-pages-b.js   Tasks, Shopping
  22-money.js     Money
  23-food.js      Calories (search, OFF, Gemini, goal calc)
  24-pages-c.js   Trips, Meals, Family info
  90-main.js      route table, boot, service worker registration
build.py                   python3 build.py  -> writes out/index.html (also writes /tmp/chk.js for `node --check`)
```

If you edit `src/`, run `python3 build.py` and copy `out/index.html` to `site/index.html`.

## 3. Setup the user must do (you cannot do these for them; walk them through)

1. **Firebase project** at console.firebase.google.com (free Spark plan, no card).
   - Authentication → Sign-in method → enable **Google**.
   - Firestore Database → Create database → **production mode**, any nearby region.
   - Firestore → Rules → paste `firestore.rules` → Publish.
   - Project settings → Your apps → add **Web app** → copy the `firebaseConfig` values.
2. **Edit `app-config.js`**: replace `PASTE_YOUR_FIREBASE_API_KEY`, `PASTE_PROJECT_ID.firebaseapp.com`, `PASTE_PROJECT_ID`, `PASTE_APP_ID`. (Firebase web keys are not secrets; security comes from the rules.)
3. **GitHub**: create a **public** repo (free Pages needs public), upload the contents of `site/` to the repo root, Settings → Pages → deploy from `main` / root. URL will be `https://<user>.github.io/<repo>/`.
4. **Firebase → Authentication → Settings → Authorized domains**: add `<user>.github.io`. (Without this Google sign-in fails with `auth/unauthorized-domain`.)
5. **Optional Gemini**: AI Studio now issues `AQ.` keys, which cannot be referrer-restricted. So the key is NOT in `app-config.js`; the family owner pastes it in Family & settings and it is stored in `families/{code}.geminiKey` (readable only by allow-listed members, writable only by the owner). Model: `gemini-3.8-flash` (`gemini-2.5-flash` returns 404 for new users). The key is sent in the `x-goog-api-key` header.
6. First person signs in → "Start a family" → gets the code (Family tab → share). Others sign in → "Join with a code". Everyone: Safari → Share → Add to Home Screen.

Claude Code can do: edit `app-config.js` once the user pastes the values, create the repo and push with `gh` if the user is logged in, enable Pages (`gh api`), and verify the live URL loads. It cannot create the Firebase project or enable Google auth.

## 4. Data model (Firestore)

```
families/{code}                owner, created, name, currency
  events, tasks, shop, txns, bills, budgets, goals, trips, notes, meals   (subcollections, docs have an id + fields)
users/{uid}                    kind:'profile', name, emoji, color, familyId, goal, goalSet
  days/{YYYY-MM-DD}            { entries:[...] } calorie log per day
  foods/{id}                   custom/remembered foods
```
Code is 8 chars from a 32-char alphabet via `crypto.getRandomValues`. Local mode mirrors the same paths in localStorage under prefix `nourish2:`.

## 5. Things I could NOT test — verify these first

Everything was tested only in local mode in headless Chromium at 390px and 1280px. Not verified:

1. **Members list query (most likely bug).** `10-core.js` ~line 181 runs `users where familyId == S.famId`. The rule for `users/{uid}` read uses `resource.data.familyId == myFamily()` where `myFamily()` is a `get()`. Firestore may reject this list query as "insufficient permissions" because it cannot prove the filter equals the caller's family. Symptoms: family page shows no members or console shows `permission-denied`. **Fix option A (recommended):** write a public-to-family member doc at `families/{code}/members/{uid}` (name, emoji, color) on profile save and read the member list from there (already protected by `inFamily(code)`); keep `users/{uid}/days` reads as direct `get`s. **Fix option B:** change the rule to `allow list: if signedIn();` (weaker: any signed-in user could list profiles).
2. **Google sign-in** popup on iPhone Safari and when launched from the Home Screen (popup auth sometimes fails in standalone PWAs; if so, switch `signInWithPopup` to `signInWithRedirect` plus `getRedirectResult`).
3. **Realtime sync** between two devices, and the `persistentLocalCache` offline behavior.
4. **Rules**: test with the Firebase Rules Playground, and check a non-member cannot read `families/{code}/*` or another family's days.
5. **Gemini estimate** call and **Open Food Facts** search from the live origin (CORS, key referrer restriction).
6. **Service worker** (`sw.js`, network-first, cache fallback): confirm updates reach users (bump the cache name in `sw.js` when releasing).
7. Real-iPhone layout: safe-area insets, bottom tab bar, bottom sheets, keyboard overlap, dark mode, large text.

## 6. Known limitations / caveats

- Each **trip is one document** (plan, packing, bookings together); two people editing the same trip at once can overwrite each other.
- **Family code is the only join barrier.** Anyone with the code and a Google account can join. Add an owner-approval flow or code rotation if that matters.
- Calorie goal uses Mifflin-St Jeor with a 1200 floor and a "talk to a doctor" note; AI/OFF estimates are approximate.
- No push notifications/reminders (iOS web push is unreliable for free static apps), no bank sync, no photo/file uploads.
- GitHub Pages requires a **public repo**; the app contains no secrets besides the (non-secret) Firebase web config and the referrer-restricted Gemini key.
- Data from the earlier Claude-artifact version is not migrated (the Settings backup export exists in the new app for future moves).
- Free-tier limits (Spark): ~50k reads and 20k writes per day; ample for a household, but a runaway listener bug could burn through reads.

## 7. Quick test plan after deploy

1. Open the live URL on laptop → sign in → start a family → add a task, a shopping item ("2 milk"), an expense, an event, a food ("ap" → Apple first).
2. Open on iPhone → sign in with a second Google account → join with the code → confirm those items appear, and that the other person's calorie log is viewable read-only.
3. Add to Home Screen, reopen, check offline (airplane mode) shows cached data.
4. Fix anything from section 5, bump `sw.js` cache version, redeploy.

## 8. Style preferences of the user

Non-developer, wants it simple, free to run, modern and very user-friendly, iPhone first and laptop second. Explain steps plainly, one at a time, and confirm before adding new features.
