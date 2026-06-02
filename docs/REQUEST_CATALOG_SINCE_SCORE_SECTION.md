# Request catalog (since “Score Section / Score Whole CV” thread)

Authoritative list of user requests from the assistant session, in order.  
**Repo baseline today:** `v1.1.0` (`760879a`). Commits after 1.1.0 were removed per explicit request.

Status key: **Pending** = not on `v1.1.0` · **Done (reverted)** = was implemented then removed by reset to 1.1.0 · **Declined** = user said not to do it.

---

## 1. Editor — AI score actions (your anchor message)

| # | Request | Status |
|---|---------|--------|
| 1.1 | **Score Section** and **Score Whole CV** toolbar buttons must show the **AI stars icon** (✨) so they read as AI actions, not generic buttons. | **Pending** |
| 1.2 | When running **Professional Rewrite** on a field: **current/original text score** shows as a **plain number** (no `%`). | **Pending** (verify on 1.1.0; may already be number-only in code) |
| 1.3 | **Rewrite proposals** keep **`%`** on their confidence score (e.g. `72%`). | **Pending** (verify on 1.1.0) |

---

## 2. Editor — Auto Save switch + Save Section

| # | Request | Status |
|---|---------|--------|
| 2.1 | Add a control **to the left of Save Section**: **“Auto Save ON” / “Auto Save OFF”** (toggle or paired buttons). | **Pending** |
| 2.2 | **Auto Save ON:** hide **Save Section**; persist section on content change (immediate autosave behavior). | **Pending** |
| 2.3 | **Auto Save OFF:** show **Save Section**. | **Pending** |
| 2.4 | **Auto Save OFF + has unsaved changes:** Save Section is **blue** and clickable. | **Pending** |
| 2.5 | **Auto Save OFF + nothing to save:** Save Section is **mid gray** and **not clickable**. | **Pending** |

*Note: Your message was cut off at “save immediately on …”; the table above reflects the full intent described in the same thread (ON = autosave + no manual button, OFF = manual save with dirty-state styling).*

---

## 3. Rebuild session work (“redo everything since…”)

You asked to **rebuild with a todo list** everything that had been done in the session but **felt missing in dev**, including work from **before** the Score Section message.

| # | Request | Status |
|---|---------|--------|
| 3.1 | **Header:** title **MuhFweeCeeVee** only (drop “Composer” suffix). | **Done (reverted)** — was in `3ab1dad` |
| 3.2 | **Editor panel title:** **CV Editor** (not “Section Editor”). | **Done (reverted)** |
| 3.3 | **Tab order:** Print Room → **Photo Booth** → Editor → Templates (Settings stays right). | **Done (reverted)** — `72c44c0` |
| 3.4 | **Settings:** “Approximate Cost per Check” as **one short paragraph** (no token/overhead breakdown). | **Done (reverted)** |
| 3.5 | **Settings:** image models show **per-image USD** (not misleading `/1M` token averages). | **Done (reverted)** — `c712eac` |
| 3.6 | **Photo Booth:** `/api/photos` list/upload/delete (fix JSON error on empty gallery). | **Done (reverted)** — `3ab1dad` |
| 3.7 | **Photo Booth:** overlay action buttons visible in **dark mode** (not white-on-white). | **Done (reverted)** |
| 3.8 | **Editor:** per-field **✨** trigger visible (wider actions column). | **Done (reverted)** — `69cf587` |
| 3.9 | **Editor:** toolbar **Saving… / Saved** pill while autosave runs. | **Done (reverted)** — optional; may overlap with §2 Auto Save switch |
| 3.10 | **Editor:** applying an AI proposal triggers same **autosave path** as typing. | **Done (reverted)** |
| 3.11 | **Privacy:** `AGENTS.md` + `.gitignore` — never commit paths with **Apostol** / **ApoApostolov** or **Apostol Apostolov CV** internal names. | **Done (reverted)** — `c712eac` |
| 3.12 | **Commit / push / changelog** (user-facing only) for the above. | **Done (reverted)** |

---

## 4. Git / repo operations (explicit, separate from UI)

| # | Request | Status |
|---|---------|--------|
| 4.1 | **Commit and push** pending work; changelog via changelog skill (**user-facing only**). | **Done (reverted)** with 1.1.1+ commits |
| 4.2 | Include all tracked work **except** personal Apostol Apostolov CV artifacts. | **Done (reverted)** |
| 4.3 | **“no i didn’t ask this”** — do not run unrequested ops (e.g. `git reset` without being asked). | **Constraint** |
| 4.4 | **Nuke all commits since 1.1.0** (`reset` + force-push; remove `v1.1.1` tag). | **Done** — current `master` = `760879a` |
| 4.5 | **Revert to 1.1.0** (confirm clean tree at tag). | **Done** |

---

## 5. Operational / debugging (context, not feature specs)

These explain “missing” UI; they were **not** separate feature requests but came up in the thread:

| Topic | User concern | Finding |
|-------|----------------|---------|
| Dev looked “old” | Thought 1.1.1+ was reverted | Often **wrong port** (3000 vs **3005**), **stale HMR** on `/mnt/c`, or **local `master` behind `origin`** — not git erasing 1.1.0 features |
| 1.1.0 vs later | “Everything since 1.1.0 missing” | **1.1.0** still has modular Composer, field AI rewrite, autosave+toast, etc.; **post-1.1.0** items are §3 |
| Hot reload “revert” | Server exit **143** | Normal **SIGTERM** on restart, not code rollback |

---

## 6. Suggested implementation order (when you ask to build again)

1. §1 — AI stars on Score Section / Whole CV; score `%` rules on field rewrite UI.  
2. §2 — Auto Save ON/OFF + Save Section visibility and colors (dirty tracking).  
3. §3 — Reapply other session items you still want (pick from table; not all are required if §2 replaces autosave pill).  
4. §4 — Single release commit + user-facing changelog only.

---

## 7. Out of scope for this catalog

- Requests **before** the Score Section thread (e.g. full 1.1.0 Composer refactor, Keywords retirement) — already in **CHANGELOG 1.1.0**.  
- Lifestyle backup of personal CVs under `/mnt/c/git/lifestyle/...` — operational, not app UI.

*Last updated: 2026-06-02 — repo at `v1.1.0`.*