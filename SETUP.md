# Family App — full setup, step by step

Your app's web address will be: **https://trinathgundavaram.github.io/familyapp/**

Everything here is free. You never need to add a credit card.

---

## Part A — Turn on the website (GitHub Pages)

1. Open https://github.com/trinathgundavaram/familyapp
2. Click **Settings** (top bar of the repo).
3. In the left menu, click **Pages**.
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)**
   - Click **Save**.
5. Wait 1–2 minutes, then open https://trinathgundavaram.github.io/familyapp/
   The app should load. It will say "Saved on this device only" — that is expected until Part B is done.

---

## Part B — Create the free family database (Firebase)

### B1. Create the project
1. Open https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name: `familyapp` → tick the terms box → **Continue**.
4. Google Analytics: switch it **off** → **Create project**.
5. Wait until it says "Your project is ready" → **Continue**.

If it ever asks you to choose a plan, choose **Spark (free)**.

### B2. Turn on "Sign in with Google"
1. In the left menu, click **Build** → **Authentication**.
   (If you don't see the left menu, click the ☰ icon at the top left.)
2. Click **Get started**.
3. Open the **Sign-in method** tab → click **Google**.
4. Switch **Enable** on.
5. **Project support email**: pick your email from the list.
6. Click **Save**.

### B3. Allow your website address to sign in
1. Still in **Authentication**, open the **Settings** tab.
2. Click **Authorized domains** → **Add domain**.
3. Type: `trinathgundavaram.github.io` → **Add**.

### B4. Create the database
1. Left menu: **Build** → **Firestore Database**.
2. Click **Create database**.
3. Edition (if asked): **Standard**. Database ID: leave as `(default)`.
4. Location: pick one near you (for example `nam5 (United States)`) → **Next**.
5. Choose **Start in production mode** → **Create**.

### B5. Paste the security rules
1. In Firestore, open the **Rules** tab.
2. Delete everything in the box.
3. Open `firestore.rules` from this repo (https://github.com/trinathgundavaram/familyapp/blob/main/firestore.rules), copy all of it, paste it into the box.
4. Click **Publish**.

### B6. Get your app keys
1. Click the **gear icon ⚙** (top left, next to "Project Overview") → **Project settings**.
2. Scroll down to **Your apps** → click the **</>** (Web) icon.
3. App nickname: `familyapp`. Leave "Firebase Hosting" **unticked** → **Register app**.
4. You will see a block like this:
   ```
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "familyapp-xxxx.firebaseapp.com",
     projectId: "familyapp-xxxx",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "1:...:web:..."
   };
   ```
5. Copy that whole block and paste it to Claude. (These are not secret passwords; the rules from B5 keep your data private.)
6. Click **Continue to console**.

Claude will put the keys into `app-config.js` and publish the update.

---

## Part C — Optional: AI calorie estimates (Gemini)

Skip this if you don't need it. The rest of the app works without it.

1. Open https://aistudio.google.com/apikey → **Create API key** → pick your `familyapp` project.
2. Copy the key and paste it to Claude.
3. To protect it: open https://console.cloud.google.com/apis/credentials → click the key → **Application restrictions: Websites** → add `https://trinathgundavaram.github.io/*` → **Save**.

---

## Part D — Start using it

1. **On your laptop**: open https://trinathgundavaram.github.io/familyapp/ → **Continue with Google** → type a family name → **Start a new family**.
2. Go to the **Family** page and copy the **family code** (8 letters). Send it to your family.
3. **Each family member on iPhone**:
   - Open the link in **Safari** → **Continue with Google** → type the code → **Join with a code**.
   - Tap the **Share** button → **Add to Home Screen** → **Add**.
4. Quick check: add a shopping item ("2 milk") on one device and see it show up on the other.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| "This web address is not allowed yet" | Do step B3 again; check the spelling `trinathgundavaram.github.io` |
| "Could not create the family" | Do step B5 again and make sure you clicked **Publish** |
| Page shows 404 | Wait 2 minutes after Part A; check Pages is set to **main** / **root** |
| Sign-in popup does nothing on iPhone | Tell Claude; there is a known fix to switch the sign-in style |
| Old version still showing | Close the app fully and reopen it |
