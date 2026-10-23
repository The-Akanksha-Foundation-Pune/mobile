# Capture Akanksha – test prompt

Paste everything below the line into Claude (or give it to a human tester).
Fill the `<...>` placeholders first. Update the "What changed" section for each test round.

---

## Role

You are a QA engineer testing **Capture Akanksha**, an Android app (Expo / React Native) used by
Akanksha Foundation staff and volunteers to capture photos and stories from events. Your job is to
find bugs, confusing behaviour and visual problems, and report them in a form a developer can act on.

## How the app works

**Roles** (set per user in the database or from Access management):
- `user` – views the feed, posts photos and stories to live events.
- `donor` (donor relations team) – everything a user can do, plus approve posts/stories, create events, review queue.
- `special` – same as donor without access management.
- `super_admin` – everything, plus Admin console (limits, cities, cost centres) and Access management.

**Content kinds**
- **Event** – has a title, start/end date, location, cost centre, city, cover image. Status is derived
  from dates: *Upcoming* (before start), *Live* (start to end date), *Ended*. Events are approved automatically.
- **Post** – a photo or video with a caption, attached to a **live** event. Starts as *pending*.
- **Story** – a photo with a title and longer text, attached to a live event. Starts as *pending*.

**Rules**
- Posts and stories can only be added to live events.
- Per event, each user may add at most N posts and M stories (defaults 5 and 1, configurable by a super admin
  in Admin console → Limits). Super admins are exempt.
- Approval controls the feed: while an event is live, everyone sees all its posts/stories on the event
  page; once the event has ended only approved items show. Counts follow the same rule.
- Only donor/special/super_admin see the Review queue (My activity → Review queue → pick an event).
- Normal users never see approval controls or pending/approved status.

**Screens**
- Feed (home tab): all content as one card style; search, city filter, "Only my uploads".
- Events tab: event list with month calendar.
- `+` button: Post / Story / New event (New event only for roles that may create events). Post and Story
  ask Camera or Gallery, then open the capture form (event picker, caption, Polish with AI).
- My activity: my uploads; Review queue for reviewers.
- Profile: details, edit name/city/cost centre, log out. More menu (⋮): Admin panel, Access management.
- Notifications (bell): event went live; new post/story on a live event; new event (donor/special/admin);
  post approved by a donor-team member (admin only).
- Android back button walks back one level at a time; on the Feed it exits the app.

## Test environment

- Build: `<dev client APK / EAS preview link>`
- Backend: `<http://<mac-ip>:4000 or https://mobile-sand-chi.vercel.app>`
- Test accounts (Google sign-in): `<email – role>` for each of user, donor, super_admin
- Live event to use: `<event title>` (live until `<date>`)
- Ended event to use: `<event title>`

## What changed in this round

<!-- Replace each round. Example: -->
- New single feed card design (tag on image, date chip, place line).
- Popup dialogs replaced system alerts.
- Camera-or-gallery step after choosing Post/Story.
- Android back button handling.
- Role-based notifications.

## What to test

Go through every item. For each, record **Pass / Fail / Not tested** with a note.

1. **Sign-in**: Google sign-in succeeds; wrong network shows a clear error; log out returns to sign-in.
2. **Feed**: loads within a few seconds; scrolling 30+ items is smooth; cards show tag, date, title,
   author/event line (posts, stories), place line (cost centre, city); tapping opens the right detail page.
3. **Filters**: content type tabs and counts; city filter; "Only my uploads"; search by title, caption,
   author, city; Reset.
4. **Events tab**: calendar highlights dates; status badges match dates (Upcoming / Live / Ended).
5. **Event page**: photo, dates, location, description "Read more"; Posts/Stories tabs with counts;
   `+` enabled only on live events; budget line "N of M posts left" counts down; gallery and story list.
6. **Add a post** (as `user`): `+` → Post → Camera; `+` → Post → Gallery; event picker required;
   caption required; Polish with AI; success popup; post appears in event page and in My activity.
7. **Add a story**: same with title and story text.
8. **Limits**: exceed the post limit → blocked with a clear message; super admin not blocked.
9. **Create event** (donor and super_admin): start/end dates, location; event appears as Upcoming/Live correctly.
10. **Review queue** (donor): choose event → Pending/Approved tabs → approve one, Select all + bulk approve,
    move back to pending; counts on the event page update.
11. **Visibility**: as `user`, an ended event shows only approved posts; a live event shows all.
12. **Notifications**: each role sees only its rules (see above); unread badge; tapping opens the item;
    mark all read.
13. **Profile**: edit name, city, cost centre; validation on empty name; More menu shows Admin panel /
    Access management only for the right roles.
14. **Admin console** (super_admin): change limits and confirm they apply; cities and cost centres lists.
15. **Access management** (super_admin): change a user's role; sign in as that user and confirm.
16. **Popups**: every error / confirmation uses the branded popup, not the Android grey dialog; back button
    and tapping outside close it; confirmations need an explicit choice.
17. **Back button**: from a detail page, from the capture form, from Review queue, from Notifications,
    from any tab; from Feed it exits.
18. **Loading states**: pulse loader on app start, feed, event page, review queue; no blank screens.
19. **Edge cases**: airplane mode mid-upload; very long titles; event with no image; video post;
    rotate phone; low-end device performance; kill and reopen app keeps you signed in.
20. **Visual check**: alignment, spacing, truncation, bottom bar spacing, header logo/back arrow, fonts.

## How to report

Produce one report with:

1. **Summary**: counts of Pass / Fail / Not tested, and the three most serious problems.
2. **Bug list**, most severe first. For each bug:
   - Title (one line)
   - Role and screen
   - Steps to reproduce (numbered)
   - Expected vs actual
   - Severity: Blocker / Major / Minor / Cosmetic
   - Screenshot or screen recording if you have one
3. **UX notes**: anything confusing even if it works.
4. **Not tested** items and why.

Do not guess. If you could not reproduce something twice, say so. Do not fix anything; only report.
