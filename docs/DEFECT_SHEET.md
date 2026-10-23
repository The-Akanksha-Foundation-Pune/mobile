# Capture Akanksha – defect sheet

Source: web test round on 15 Oct 2026 (local build, `feature/role-access`).
Work through one bug at a time with the prompt below. Update the tracker row after every decision.

---

## How to use

1. Copy the **Fix-session prompt** below into Claude.
2. Replace `<BUG-ID>` with the bug you want to pick up (for example `BUG-01`).
3. Claude explains the bug, lists the options, and waits for your choice. Nothing is changed until you choose.
4. After the fix (or the decision to leave it), Claude updates the tracker row and the bug's **Decision** line in this file.

---

## Fix-session prompt

> Copy everything inside the block.

```text
We are fixing bugs from docs/DEFECT_SHEET.md one at a time. Today's bug: <BUG-ID>.

Work in these steps and stop where it says STOP.

Step 1 – Confirm the bug
- Read the bug entry in docs/DEFECT_SHEET.md.
- Read the code it points to, and anything that calls it.
- Reproduce it if you can (local web build at http://localhost:8081, backend at :4000, LocalDB).
- Tell me in a few lines: is it still happening, what is the real cause, and which files are involved.
- If it is already fixed or not reproducible, say so and suggest closing it. STOP.

Step 2 – Options
Give me 2 to 4 ways to handle it. Always include "Leave as it is" as one option.
For each option give:
- What changes (files, roughly how many lines)
- What the user will see after the change
- Risk: what else could break, and whether it touches the database, API, or the Android/iOS app
- Effort: Small / Medium / Large
Then say which option you recommend and why, in one or two sentences. STOP and wait for my choice.

Step 3 – Fix (only after I choose)
- Make only the change for the chosen option. No unrelated clean-up.
- Match the existing code style.
- If the fix needs a database change, a new env variable, or a new dependency, ask me first.

Step 4 – Verify
- Re-run the steps to reproduce from the bug entry and show me the result.
- Check the nearby flows the bug list mentions as related, so we don't break them.
- If something could only be checked on a phone, say so clearly.

Step 5 – Update the sheet
- In docs/DEFECT_SHEET.md, update the tracker row: Status, Option chosen, Date.
- Fill in the bug's "Decision" line with one sentence: what we did and why.
- Show me the git diff summary. Do not commit unless I ask.

Rules
- One bug per session. If you notice another bug, add it to the end of the sheet as a new BUG-ID with status "New" and tell me; don't fix it now.
- Don't guess. If you are unsure about the intended behaviour, ask me.
```

---

## Tracker

Status values: **New** · **In discussion** · **Fixed** · **Won't fix** (left as it is) · **Needs decision** (product question) · **Cannot reproduce**

| ID | Title | Severity | Area | Status | Option chosen | Date |
|---|---|---|---|---|---|---|
| BUG-01 | Polish with AI always fails | Major | Backend – AI | New | | |
| BUG-02 | `SUPER_ADMIN_EMAILS` is never loaded | Major | Backend – config | Fixed | A – fix env files | 16 Oct 2026 |
| BUG-03 | Donor role can't create events (spec vs app) | Major | Roles | Needs decision | | |
| BUG-04 | Discarded draft text leaks into the next form | Major | Capture form | Fixed | A – clear draft on close | 16 Oct 2026 |
| BUG-05 | Web: no browser history, Back leaves the app | Major (web) | Navigation | Won't fix | D – leave as it is | 16 Oct 2026 |
| BUG-06 | Admin console Content shows "Untitled" and wrong "Ended" | Minor | Admin console | Fixed | A – use event status, "Post on" heading | 19 Oct 2026 |
| BUG-07 | Admin console has no cost-centre / event-type tabs | Minor | Admin console | Fixed | C for cost centers (add/edit/turn off) + A for event types (menu text) | 19 Oct 2026 |
| BUG-08 | New event form has no city / cost-centre picker | Minor | Create event | New | | |
| BUG-09 | Wrong success message after creating an event | Minor | Create event | Fixed | A – plain accurate message | 19 Oct 2026 |
| BUG-10 | Feed and event page disagree about pending posts | Minor | Visibility | Needs decision | | |
| BUG-11 | Events list: no status badge, no Ended filter, calendar marks start day only | Minor | Events tab | New | | |
| BUG-12 | New accounts start with every old notification unread | Minor | Notifications | Fixed | B – unread only since account created | 19 Oct 2026 |
| BUG-13 | Story with no event can't be reviewed | Minor | Data / Review | New | | |
| BUG-14 | Cosmetic issues (6 items) | Cosmetic | Visual | New | | |
| UX-01 | Normal users see "for review" wording | Minor | Copy | Needs decision | | |
| UX-02 | Back on capture form discards work without asking | Minor | Capture form | New | | |
| UX-03 | Post limit only shown after writing the post | Minor | Limits | New | | |
| UX-04 | Tab counts don't follow search / filters | Minor | Feed | New | | |
| UX-05 | Admin can set post limit to 0 with no warning | Minor | Admin – Limits | Needs decision | | |
| CHK-01 | Taps ignored after closing a popup or typing (unconfirmed) | ? | Web input | New | | |
| CHK-02 | Gallery pick for story didn't open form (seen once) | ? | Capture form | New | | |

---

## Bug details

### BUG-01 – Polish with AI always fails
- **Role / screen:** any role · post, story and event forms
- **Steps:** 1. Open the post form. 2. Type a caption. 3. Tap Polish with AI.
- **Expected:** caption is polished.
- **Actual:** popup shows Google's raw error: model `gemini-2.5-pro` is no longer available.
- **Where:** `backend/src/routes/ai.routes.js:37-43` (model list), the loop in `callGeminiPolish`; `fallbackPolish` is not used for this error. `GOOGLE_AI_MODEL` is not set in `backend/.env`.
- **Related:** event form and story form use the same endpoint.
- **Decision:** Fixed 2026-10-16. Model list is now `gemini-3.1-pro-preview` → `gemini-3.8-flash` → `gemini-3.5-flash-lite`; retired (404) and tier-blocked (429 "limit: 0") models are skipped, and an empty prepaid balance (402) returns the local fallback with a clear message instead of Google's raw error. The key still needs AI Studio credit for any Gemini call to succeed.

### BUG-02 – `SUPER_ADMIN_EMAILS` is never loaded
- **Role / screen:** backend start-up / Google login
- **Steps:** 1. Add an email to `SUPER_ADMIN_EMAILS` in `backend/.env`. 2. Sign in with that email.
- **Expected:** user becomes Super Admin.
- **Actual:** stays Normal User. The line starts with literal `\n` characters, so dotenv skips it (`process.env.SUPER_ADMIN_EMAILS` is undefined).
- **Where:** `backend/.env` and `backend/.env.example` (last lines); read in `backend/src/lib/permissions.js` `isBootstrapSuperAdmin`.
- **Related:** Vercel / EC2 env settings may have the same problem.
- **Decision:** Replaced the literal `\n` characters with real line breaks in `backend/.env` and `backend/.env.example` so dotenv reads the variable; no code change was needed, but the hosted Vercel/EC2 settings still need checking by hand.

### BUG-03 – Donor role can't create events (spec vs app)
- **Role / screen:** donor · `+` menu
- **Steps:** 1. Sign in as donor. 2. Tap `+`.
- **Expected (test spec):** "New event" is offered.
- **Actual:** only Post and Story. `create_event` is given only to special and super_admin.
- **Where:** `backend/src/lib/permissions.js` (`ROLE_PERMISSIONS`), role descriptions in Access management.
- **Question to decide first:** is the spec wrong or the app wrong?
- **Decision:**

### BUG-04 – Discarded draft text leaks into the next form
- **Role / screen:** any role · capture form
- **Steps:** 1. `+` → Post → Gallery, type a caption. 2. Tap ←. 3. Open a Story from an event page.
- **Expected:** empty fields.
- **Actual:** "Short excerpt" is pre-filled with the old caption, and it is saved with the story.
- **Where:** caption / title / media state lives in `client/src/App.tsx` and is not reset when the form closes (`HomeScreen.tsx` `setOverlay(null)`).
- **Related:** UX-02 (confirm before discarding).
- **Decision:** Added `resetDraft()` in `App.tsx` and call it whenever the capture form is closed without saving (← and Android back), so text and media no longer carry into the next post, story or event form; this makes UX-02 more important, since leaving now really discards the draft.

### BUG-05 – Web: no browser history, Back leaves the app
- **Role / screen:** any · web build
- **Steps:** 1. Open an event page. 2. Press the browser Back button (or reload).
- **Expected:** goes back one screen; reload keeps the screen.
- **Actual:** URL is always `/`; Back leaves the app; reload returns to Feed.
- **Where:** navigation is in-memory state in `client/src/screens/HomeScreen.tsx` (`detailStack`, `overlay`, tabs).
- **Related:** Android back handling in the same file must keep working.
- **Decision:** Left as it is for now: navigation stays in-memory, so on web Back still leaves the app and reload returns to Feed; the smallest fix later is to share the Android back logic with the browser Back button (option A), with real URLs (option B) on top if links need to be shareable.

### BUG-06 – Admin console Content shows "Untitled" and wrong "Ended"
- **Role / screen:** super_admin · Admin panel → Content
- **Steps:** 1. Open Admin panel. 2. Look at posts on the live Science Fair event.
- **Expected:** a useful title (caption) and the parent event's status (Live).
- **Actual:** every post is "Untitled"; older posts show "Ended". Status is worked out from the post's own dates, and older posts have no `endDate`.
- **Where:** `client/src/screens/AdminScreen.tsx`; `backend/src/lib/eventStatus.js`; serializer in `backend/src/routes/admin.routes.js`.
- **Decision:** Fixed (option A): the admin API now takes a post's or story's Live/Ended status from its event's dates, and posts are headed "Post on ‹event›" instead of "Untitled"; no database change.

### BUG-07 – Admin console has no cost-centre / event-type tabs
- **Role / screen:** super_admin · Admin panel
- **Actual:** tabs are Content, Calendar, Cities, Limits. The menu text says "Manage cities, cost centers and event types". Backend routes for both exist.
- **Where:** `client/src/screens/AdminScreen.tsx`; `backend/src/routes/costCenters.routes.js`, `types.routes.js`.
- **Decision:** Fixed: new "Cost centers" tab in the Admin console to add, edit and turn cost centers off/on (grouped by city, donor count, Finance warning when editing a synced one; duplicate codes rejected with a clear message; turned-off ones are hidden from the Calendar picker). Event types are not used anywhere in the app, so only the menu text changed (now "Manage content, cities, cost centers and limits"). No database change.

### BUG-08 – New event form has no city / cost-centre picker
- **Role / screen:** special, super_admin · `+` → New event
- **Actual:** city shows a fixed "Mumbai" for a user with no city; event saved without a cost centre.
- **Where:** `client/src/screens/AddEventScreen.tsx`, `addCity` / `addCostCenter` in `HomeScreen.tsx`.
- **Decision:**

### BUG-09 – Wrong success message after creating an event
- **Actual:** "Event saved. An admin can approve it and notify donors." Events are approved automatically.
- **Where:** `client/src/App.tsx:460`.
- **Decision:** Fixed (option A): the popup now says "Event created. It shows in the Events tab as Upcoming or Live based on its dates." since events are approved automatically and status comes only from their dates; one-line copy change, nothing else touched.

### BUG-10 – Feed and event page disagree about pending posts
- **Role / screen:** user · Feed vs event page (live event)
- **Actual:** event page shows other users' pending posts (Posts 8); the Feed hides them (approved + your own only).
- **Where:** `backend/src/routes/events.routes.js:151-153` (feed) vs `:204-206` (event page).
- **Question to decide first:** which rule is correct for the Feed?
- **Decision:**

### BUG-11 – Events list: no status badge, no Ended filter, calendar marks start day only
- **Role / screen:** any · Events tab
- **Actual:** cards show only "Event"; chips are All / Upcoming / Live / Calendar; the 12–20 Oct event is dotted only on 12 Oct.
- **Where:** `client/src/screens/EventsScreen.tsx`.
- **Decision:**

### BUG-12 – New accounts start with every old notification unread
- **Role / screen:** donor (new account) · bell
- **Actual:** 27 unread on first sign-in, back to 6 Oct.
- **Where:** `client/src/hooks/useNotifications.ts` (notifications are computed, read state is local).
- **Decision:** Fixed (option B): the login/profile payload now includes the account's `createdAt`, and the hook treats anything that happened before that as already read, so a new account starts at 0 unread while returning users on a new device still see activity since they joined. No database change; read state stays per device.

### BUG-13 – Story with no event can't be reviewed
- **Actual:** story "Gsjs" has `parentEventId = NULL`; it shows in reviewer feeds but never in the Review queue.
- **To find out:** how it was created (older build? API allows it?).
- **Where:** `backend/src/routes/events.routes.js` create route; LocalDB row.
- **Decision:**

### BUG-14 – Cosmetic issues
1. "Live" badge on the event photo is hard to read.
2. "Special Acce…" cut off in Access management.
3. Approve toast covers the Pending / Approved tabs.
4. "Choose an event" popup opens on top of the event picker sheet.
5. Date error is titled "Upload error".
6. Post page link says "View Hub" instead of "View event".
- **Decision:** (one line per item)

### UX-01 – Normal users see "for review" wording
- "Post added for review" / "Story published for review". Spec says users never see approval status.
- **Decision:**

### UX-02 – Back on capture form discards work without asking
- **Decision:**

### UX-03 – Post limit only shown after writing the post
- Event picker could show "limit reached" before the user writes anything.
- **Decision:**

### UX-04 – Tab counts don't follow search / filters
- **Decision:**

### UX-05 – Admin can set post limit to 0 with no warning
- Allowed by `backend/src/routes/settings.routes.js` (`min(0)`).
- **Decision:**

### CHK-01 – Taps ignored after closing a popup or typing (unconfirmed)
- Only seen with automated coordinate clicks. Check by hand on a phone and in a desktop browser before working on it.
- **Decision:**

### CHK-02 – Gallery pick for story didn't open form (seen once)
- Could not reproduce a second time. Close if not seen again.
- **Decision:**
