# AGENTS.md

## Cursor Cloud specific instructions

### Primary product

The **Administration Portal** is a static SPA (`index.html` + `assets/`) deployed to **GitHub Pages**. It authenticates via **Supabase Auth** and reads/writes HR tables through Supabase REST with RLS policies.

- **Live URL:** https://citi-homes.github.io/citi-homes-pc-admin/
- **Supabase project:** `xcddssirxwhywvhspica` (config in `assets/supabase-config.js`)
- **Deploy:** push to `main` → `.github/workflows/pages.yml` publishes the repo root as static files

Do **not** use Streamlit or local SQLite for development/testing unless explicitly requested. The legacy Streamlit app (`app.py`) is a separate product path.

### Services

| Service | Required? | Notes |
|---------|-----------|-------|
| GitHub Pages (deployed portal) | **MUST** | Primary way to run/test the app |
| Supabase HRIS (`xcddssirxwhywvhspica`) | **MUST** | Auth + all table CRUD |
| jsdelivr CDN | **MUST** (network) | Loads `@supabase/supabase-js` and `xlsx` |
| External Attendance Portal | OPTIONAL | Linked from nav only |
| Streamlit / SQLite | OUT OF SCOPE | Not used for this portal |

### Development workflow

There is **no build step** and **no package manager** for the static portal. Dependencies load from CDN at runtime.

1. Edit `index.html`, `assets/admin-clean.js`, `assets/admin.css`, or `assets/supabase-config.js`.
2. Push to `main` to deploy (or open the live GitHub Pages URL to test the current deployment).
3. For Supabase access rules, run `scripts/github_pages_supabase_policies.sql` in the Supabase SQL Editor.

### Test accounts

Portal users are Supabase Auth accounts registered in `admin_portal_users`:

- `umer@citihomes.ae` — Super User (full edit access)
- `test@citihomes.ae` — Viewer (read-only)

Passwords are managed in Supabase Authentication, not in this repo. Store them as Cursor secrets (e.g. `TEST_LOGIN_USERNAME` / `TEST_LOGIN_PASSWORD`) for automated login tests.

### Lint / test / build

No linter, test runner, or build command is configured for the static portal. Validation is manual: open the GitHub Pages URL, log in, and exercise a table page (e.g. Employee Master).

### Quick Supabase connectivity check

```bash
# From repo root — should return HTTP 200 (empty array without auth is normal)
python3 -c "
import re, urllib.request
t=open('assets/supabase-config.js').read()
url=re.search(r'url: \"([^\"]+)\"', t).group(1)
key=re.search(r'anonKey: \"([^\"]+)\"', t).group(1)
req=urllib.request.Request(f'{url}/rest/v1/employees?select=id&limit=1', headers={'apikey':key,'Authorization':f'Bearer {key}'})
print(urllib.request.urlopen(req).status)
"
```
