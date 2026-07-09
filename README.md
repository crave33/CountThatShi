# CountThatShi

Compact local counter app for tracking output blocks, account usage, moderated outputs, and category preview estimates.

## Run

### Browser

Open `index.html` in a modern browser.

Required files:

- `index.html`
- `styles.css`
- `app.js`
- `assets/`

No build step, npm install, or backend is required.

### Desktop-style launcher on Windows

Run:

```bat
run_app_desktop.bat
```

Requirements:

- Python 3
- Microsoft Edge or Google Chrome

The launcher creates a local `.venv`, starts `desktop_server.py`, and opens the app in an isolated browser profile.

## Data

The app stores data locally in browser `localStorage`.

Desktop launcher data is stored under:

```text
%APPDATA%\CountThatShi\BrowserProfile
```

Use block export/import when moving data between browsers, profiles, or machines.

## Preview

The sheet preview is local and uses the app's entered block data.

Important formula behavior:

- Block usage is `usage end % - usage start %`.
- Category usage is allocated within a block by output share.
- `Outputs / 1%` is `category outputs / category usage percentage points`.
- `Only category` is `category outputs / category usage`, projecting if 100% usage were spent on that category.

If many categories share one block usage range, those categories can show the same `Outputs / 1%`. To get category-specific rates, split tracking into smaller blocks with their own usage start/end values.

## Import template

```text
Week 1                                                                                               ->
Account: Month1
Date: Not set
Time: Not set
Usage: 0% - 0%

Sub-blocks:
  A. Types of output
     1. Images Quality mode: 0 | Category: Images Quality mode | Moderated: 0 | Include: Y
     2. Images Speed mode: 0 | Category: Images Speed mode | Moderated: 0 | Include: Y
     3. Image edits: 0 | Category: Image edits | Moderated: 0 | Include: Y
     4. 720p 6s: 0 | Category: 720p 6s | Moderated: 0 | Include: Y
     5. 720p 10s: 0 | Category: 720p 10s | Moderated: 0 | Include: Y
     6. 720p 15s: 0 | Category: 720p 15s | Moderated: 0 | Include: Y
     7. 720p extend 6s: 0 | Category: 720p extend 6s | Moderated: 0 | Include: Y
     8. 720p extend 10s: 0 | Category: 720p extend 10s | Moderated: 0 | Include: Y
     9. 480p 6s: 0 | Category: 480p 6s | Moderated: 0 | Include: Y
     10. 480p 10s: 0 | Category: 480p 10s | Moderated: 0 | Include: Y
     11. 480p 15s: 0 | Category: 480p 15s | Moderated: 0 | Include: Y
     12. 480p extend 6s: 0 | Category: 480p extend 6s | Moderated: 0 | Include: Y
     13. 480p extend 10s: 0 | Category: 480p extend 10s | Moderated: 0 | Include: Y
```
