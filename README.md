# Quick Coffee POS
Buy-and-go coffee shop POS. No login, no members.

- Run locally: `npm install` then `npm run dev` (http://localhost:5173)
- Build: `npm run build`   · Tests: `npm test`
- APK: push to GitHub and run the "Build APK" action, or `npm run apk` with Android Studio/SDK installed.

In ⚙️ Settings: logo, shop name, currency, tax, theme, menu (with photos), and Backup / Restore.
Everything saves automatically on the device. Use Backup to move to another device.

## Layout checks (optional)
With the app running (`npm run preview`, port 4173) and Playwright for Python installed:
- `python tools/layout_test.py` – 21 phone/tablet/desktop sizes, full sale flow
- `python tools/stress_test.py` – same flow with long names, big totals, photos, tax, light/dark
- `python tools/overlap_test.py` – detects order rows whose parts overlap
