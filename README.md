# Payday Ledger

A paycheck-to-paycheck budgeting app for iPhone, played as an 8-bit RPG. Saving earns XP and gems, wants are monsters that cost hearts, and debts are bosses. It runs as a Home Screen web app. There's no account and no server, and all data stays on the phone.

## Install on iPhone

1. Open the GitHub Pages address for this repo in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open it from the Home Screen icon. It works offline after the first visit.

## Host it with GitHub Pages

1. Push these files to a public GitHub repository.
2. Open the repo's **Settings → Pages**.
3. Under "Build and deployment", choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute or two, the address appears at the top of that page: `https://<your-username>.github.io/<repo-name>/`.

## Your data

- Everything is stored on the phone in its on-device database (IndexedDB), with a mirror copy in browser storage. This repo contains only the app code, never your numbers.
- Deleting the Home Screen icon deletes the data. Use **Settings → Back up** and keep the file in iCloud Drive.
- You log purchases by hand. Arti calls each one a need or a want, and remembers when you correct her. The app never connects to a bank.

## How the game works

- **XP:** $1 saved (net of withdrawals) or paid toward debt = 1 XP. Logging, paying bills on time, clear days, quests and skipped wants add more.
- **Gems:** about 1 per $10 saved or paid on debt, plus quests, clear days and trophies. Spend them in Grubb's shop on potions, Treat Passes, outfits and your own real-world rewards.
- **Hearts:** each want you log is a monster that knocks off 1–4 hearts (delivery hits harder). A Treat Pass lets you have a want with no damage. Hit zero and you faint: lose 10 gems and your streak.
- **Clear days:** rest at the Hearth Inn each night. No wants that day = a clear day, and clear days in a row build a streak.
- **Classes (from level 2):** Ranger (saver), Knight (debt slayer), Monk (no-spend), Rogue (hustler), Sage (scholar). Each has a passive bonus and a weekly ability. Bonuses only count for entries made while you hold the class.
- **Skills:** 1 skill point per level for perks like Thick Skin, Haggler, Lucky Find and Second Wind.
- **Quest board tab:** the inn, daily quests, weekly challenges and holiday events live here. A red badge shows when something is ready.
- **First week:** you start with logging, safe-to-spend, hearts and the inn. Quests and the shop, the companion, holiday events and weekly challenges open over the first four days (or sooner as you play).
- **Holiday events:** a boss for every major holiday (New Year, Valentine's, St. Patrick's, Easter, Memorial Day, July 4th, Labor Day, Halloween, Thanksgiving, Black Friday, Christmas). Win for gems, XP and event-only gear.
- **Weekly challenges:** 3 random challenges each Monday; reroll one per week.
- **Companion:** Ember hatches and evolves as your emergency fund and "one month ahead" fund grow, and weakens if you pull money out.
- **Payday ceremony:** logging a paycheck opens a loot screen; deposit savings the same day for a pay-yourself-first bonus.
- **Chronicle:** a recap of each month on the Stats tab, with a reminder in the first week of the next month.
- **Map:** the 7-step money plan is the main quest across the Ledgerlands. Each region has an NPC with advice.
- **Receipts:** attach photos to any purchase or paycheck. They're stored on the phone and can be included in backups.

## Files

- `index.html`: page and styles
- `app.js`: budgeting logic
- `game.js`: RPG layer (XP, quests, NPCs, shop, classes)
- `quests.js`: holiday events, weekly challenges, companion, payday, Chronicle
- `sprites.js`: pixel art and the world map
- `receipts.js`: receipt photo storage
- `fonts/`: Press Start 2P and VT323 (SIL Open Font License)
- `sw.js`: offline cache
- `manifest.webmanifest`, `icons/`: Home Screen name and icon
