# Gundavaram – your family hub (free to run)

One app for the whole family: Home dashboard, Calendar, Timetable, Tasks & chores, Shopping lists, Money (income, spending, budgets, bills, savings goals), Calories, Trips (plan, packing, bookings), Meal plan, and a Family info vault.
Works on iPhone (add it to your Home Screen) and on a laptop browser. Everything syncs live between family members.

## Files in this folder
`index.html` the app · `app-config.js` your keys (you edit this) · `firestore.rules` privacy rules · `sw.js`, `manifest.webmanifest`, `icon*` make it installable and usable offline.

## 1. Firebase: shared family storage (free "Spark" plan, no card)
1. Go to https://console.firebase.google.com, sign in with Google, **Create a project** (e.g. `nourish-family`). Turn Google Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick your email as the support email) → Save.
3. **Build → Firestore Database → Create database** → pick a location near you → **Start in production mode**.
4. In Firestore open the **Rules** tab, delete everything, paste the contents of `firestore.rules`, click **Publish**.
5. **Project settings (gear) → General → Your apps → Web (</>)** → register an app (skip Firebase Hosting). Copy `apiKey`, `authDomain`, `projectId`, `appId` into `app-config.js`.

## 2. Put the app online with GitHub Pages (free)
1. On https://github.com create a **new public repository** (e.g. `nourish`).
2. **Add file → Upload files** and drag in everything from this folder (all files). Commit.
3. **Settings → Pages → Deploy from a branch → `main` / root → Save.** In about a minute your app is at `https://YOUR-USERNAME.github.io/nourish/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → `YOUR-USERNAME.github.io`.

(The code is public, your family's data is not. It lives in Firebase and the rules only let your family read it.)

## 3. Free AI food estimates (optional)
1. https://aistudio.google.com/apikey → **Create API key** → paste as `geminiKey` in `app-config.js`.
2. In Google Cloud Console (APIs & Services → Credentials → that key) set **Application restrictions → Websites** to `https://YOUR-USERNAME.github.io/*`.
3. If estimates stop working, the model name may have changed: update `geminiModel` to the current "flash" model on https://ai.google.dev/gemini-api/docs/models.
No key? The "Ask AI" button just doesn't appear; everything else works.

## 4. Start using it
- **First person:** open your app link → Continue with Google → give the family a name → **Start a new family**.
- **Invite:** Family & settings → **Share invite** (sends the link + code). Others open the link, sign in with Google, choose **Join with a code**.
- **iPhone:** open the link in Safari → Share button → **Add to Home Screen**. **Android:** Chrome menu → **Install app**. **Laptop:** just bookmark it.
- Calendar, tasks, shopping, money, trips and notes are shared: every family member can see and edit them. Calorie logs and profiles are visible to the family but can only be changed by their owner.

## Good to know
- Free tiers (GitHub Pages, Firebase Spark, Gemini free tier) are plenty for a family. Limits can change, so glance at their pricing pages now and then.
- The family code is the key to join. Only share it with family. Anyone with it who signs in can join.
- Trips are saved as one record each, so if two people edit the same trip at the exact same second, one edit can overwrite the other.
- Use **Family & settings → Download everything (backup)** now and then.
- Not included yet: push notifications/reminders, bank syncing, and photos or documents upload.
