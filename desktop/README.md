# Word Blaster — Standalone Windows 11 Desktop App

A standalone Electron wrapper (`Word Blaster.exe`) designed for **kids' Windows 11 PCs using Microsoft Family Safety**.

## Why This Works With Microsoft Family Safety
- **100% independent of Microsoft Edge:** Bundles its own isolated Chromium engine inside `Word Blaster.exe` (does not use `msedge.exe`). You can block Microsoft Edge, Chrome, and Firefox completely in Microsoft Family Safety while keeping **Word Blaster** set to **Always Allowed**.
- **Kid-proofed window:** No address bar, no browser tabs, no DevTools, and external links (such as SoroMath's Discord/GitHub buttons) are blocked from opening a browser or leaving Word Blaster.
- **Automatic remote updates:** Connects to your hosted Word Blaster server, so any UI improvements or new questions you add from anywhere sync automatically without rebuilding or reinstalling the `.exe`.
- **Full offline play + background sync:** Uses Word Blaster's built-in Service Worker and IndexedDB sync queue so your child can study offline and progress syncs automatically when Wi-Fi reconnects.

---

## Building the Windows 11 `.exe` Installer (No Windows Build Tools Needed Locally)

### Option A: Build Automatically via GitHub Actions (Recommended)
1. Go to your GitHub repository → **Actions** → **Build Windows Desktop App**.
2. Click **Run workflow**.
3. *(Optional)* Paste your hosted Word Blaster URL (e.g., `https://your-app.onrender.com`) into **Hosted Word Blaster URL** so the `.exe` comes pre-configured (otherwise it asks once on first launch).
4. When the workflow completes (~2 minutes), download the **`word-blaster-windows-installer`** artifact and unzip **`Word-Blaster-Setup-1.0.0.exe`**.

### Option B: Build Locally on Windows
```bash
cd desktop
npm install
npm run build:win
```
The installer will be created in `desktop/dist-desktop/`.

---

## Installing on Your Kid's Windows 11 PC
1. Run `Word-Blaster-Setup-1.0.0.exe`.
   - *Note:* Because this is a personal unsigned `.exe`, Windows SmartScreen may say *"Windows protected your PC"* once → click **More info → Run anyway**.
2. Launch **Word Blaster** from the Desktop or Start Menu while online.
3. If you didn't pre-fill the URL during build, enter your hosted URL once and click **Test & Connect**.
4. Log in with your child's learner account and wait a few seconds until the bottom-left pill says **Offline Ready**.
5. In **Microsoft Family Safety** (`family.microsoft.com`):
   - Keep **Microsoft Edge** (and any other browsers) blocked or time-limited.
   - Set **Word Blaster** to **Always allowed** (or give it its own generous study schedule).

## Parent Tip: Changing the Server URL Later
Press **`Ctrl + Shift + Alt + P`** anywhere inside Word Blaster to reopen the parent setup screen.
