# Repository Mental Map

This file is the living map of the codebase structure and module relationships.

## High-Level Topology

```text
captureAkanksha/
├── backend/                  # Node.js + Express API
│   ├── prisma/
│   │   └── schema.prisma     # MySQL: CostCenter, Donor, Event+type+status, CalendarEntry, City
│   ├── src/
│   │   ├── app.js            # Express app wiring and route mounting
│   │   ├── server.js         # Process entrypoint
│   │   ├── lib/
│   │   │   ├── prisma.js
│   │   │   ├── allowedMedia.js
│   │   │   ├── publicApiBase.js   # PUBLIC_API_BASE_URL / Host for absolute links
│   │   │   └── resolveMediaUrl.js # Rewrite loopback media URLs for client devices
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT auth + role checks (admin)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── ai.routes.js
│   │   │   ├── events.routes.js    # CRUD + filters (city, status, gallery)
│   │   │   ├── types.routes.js
│   │   │   ├── cities.routes.js        # City list + admin CRUD
│   │   │   ├── costCenters.routes.js   # Cost center list + admin CRUD
│   │   │   ├── donors.routes.js        # Donors per cost center (admin)
│   │   │   ├── calendar.routes.js      # Calendar scoped by costCenterId
│   │   │   ├── notifications.routes.js # Queue donor notifications
│   │   │   └── admin.routes.js         # Moderation + notify donors per event
│   │   ├── services/
│   │   │   ├── drive.js
│   │   │   ├── localMediaStorage.js
│   │   │   ├── mediaUpload.js
│   │   │   └── googleAuth.js
│   │   ├── constants/
│   │   │   └── allowedCities.js  # Mumbai, Pune, Nagpur allowlist
│   │   └── scripts/
│   │       ├── seed.js                # Base seed: event types + cities
│   │       ├── seedDummyData.js       # Preview dataset → LocalDB (CC, donors, events, calendar)
│   │       └── backfillEventCityIds.js  # Set event.cityId from cost center when null
│   ├── uploads/
│   ├── package.json
│   └── .env.example
├── mobile/                   # Expo React Native app (BookMyShow-style flow)
│   ├── App.tsx
│   ├── index.ts
│   ├── src/
│   │   ├── App.tsx           # Auth + session bootstrap
│   │   ├── config/constants.ts
│   │   ├── config/cities.ts      # Allowed city filter (Mumbai, Pune, Nagpur)
│   │   ├── data/
│   │   │   ├── dummyHubData.ts   # Optional preview events/calendar per cost center (USE_DUMMY_HUB_DATA)
│   │   │   └── dummyGalleryEvents.ts
│   │   ├── theme/theme.ts    # Brand palette (BMS-inspired red + accent gold)
│   │   ├── components/
│   │   │   ├── EventCalendar.tsx
│   │   │   ├── EventPosterCard.tsx
│   │   │   └── ...
│   │   ├── screens/
│   │   │   ├── CostCenterPickerScreen.tsx  # Cost centers grouped by city (hub entry)
│   │   │   ├── EventsHubScreen.tsx    # Ongoing | Upcoming | CaptureAkanksha | Calendar
│   │   │   ├── AddEventScreen.tsx
│   │   │   ├── AdminScreen.tsx        # Admin-only moderation + calendar + cities
│   │   │   ├── HomeScreen.tsx         # City picker → cost center picker → hub
│   │   │   └── LoginScreen.tsx
│   │   ├── services/api.ts
│   │   ├── types/app.ts
│   │   └── utils/
│   │       ├── costCenterGrouping.ts
│   │       ├── eventGrouping.ts
│   │       └── mediaUrl.ts         # Client-side loopback → API_BASE_URL rewrite
│   └── package.json
├── package.json
├── README.md
└── REPO_MAP.md
```

## Runtime Relationship Graph

```mermaid
graph TD
  A[Mobile App: src/App.tsx] --> B[Backend API: app.js]
  A --> CP[CityPickerScreen]
  CP --> EH[EventsHubScreen]
  EH --> O[Ongoing events API]
  EH --> U[Upcoming events API]
  EH --> G[Gallery events API]
  EH --> CAL[Calendar API]
  EH --> ADM[AdminScreen]
  A --> ADD[AddEventScreen]
  B --> C[Auth Routes]
  B --> D[Event Type Routes]
  B --> E[Event Routes]
  B --> CI[Cities Routes]
  B --> CA[Calendar Routes]
  B --> AD[Admin Routes]
  C --> F[JWT Middleware]
  D --> F
  E --> F
  CI --> F
  CA --> F
  AD --> F
  C --> H[(MySQL via Prisma)]
  D --> H
  E --> H
  CI --> H
  CA --> H
  AD --> H
```

## Application Knowledge Graph

```mermaid
graph LR
  subgraph Mobile["Mobile (Expo React Native)"]
    MApp["src/App.tsx"]
    MCity["CityPickerScreen"]
    MHub["EventsHubScreen"]
    MAdmin["AdminScreen"]
    MApi["services/api.ts"]
  end

  subgraph Backend["Backend (Express + Prisma)"]
    BEvents["routes/events.routes.js"]
    BCities["routes/cities.routes.js"]
    BCal["routes/calendar.routes.js"]
    BAdmin["routes/admin.routes.js"]
  end

  subgraph Data["Data Stores"]
    DMySQL[("MySQL\nUser, EventType, City, CalendarEntry, Event")]
  end

  MCity -->|"GET /api/cities"| BCities
  MHub -->|"GET /api/events?status&cityId"| BEvents
  MHub -->|"GET /api/events?status=complete"| BEvents
  MHub -->|"GET /api/calendar"| BCal
  MAdmin -->|"PATCH /api/admin/events"| BAdmin
  MAdmin -->|"POST/PATCH/DELETE /api/calendar"| BCal
  MAdmin -->|"POST /api/cities"| BCities
  BCities --> DMySQL
  BCal --> DMySQL
  BAdmin --> DMySQL
  BEvents --> DMySQL
```

## Data Flow Snapshot

1. User signs in with Google; backend returns JWT.
2. Mobile loads cost centers (`GET /api/cost-centers`) synced from `Finance.costcenter` (only rows with a city that exists in `City` table).
3. **Cost center picker**: user selects a cost center (each has registered donors).
4. **Events hub** for that cost center (event **type** still applies per event):
   - **Ongoing** / **Upcoming** / **CaptureAkanksha** / **Calendar** — all filtered by `costCenterId`
   - CaptureAkanksha: `GET /api/events?cityId=&status=complete` (all completed events in the selected city, including via cost center), grouped by date and location; gallery-approved items show a badge
5. Upload: `POST /api/events` requires `costCenterId` + `typeId`; optional `cityId` for venue.
6. Media links: `GET /api/events` and `GET /api/events/grouped` rewrite loopback `mediaUrl` values via `resolveMediaUrl.js` (and mobile `utils/mediaUrl.ts` as a fallback).
7. **Admin** can moderate events, approve gallery, **Notify donors** (`POST /api/admin/events/:id/notify-donors`), and manage calendar entries per cost center.

## LocalDB dummy seed

- `npm run db:seed:dummy` — syncs `Finance.costcenter` → `CostCenter`, then seeds preview `Event` / `CalendarEntry` / `Donor` rows keyed by Finance `costcenter` name (not `ccCode`)
- `npm run db:seed:all` — runs base `seed.js` then `seedDummyData.js`
- Only Finance rows with a city that exists in `City` are synced; seed events reference names like `ASE Mumbai`, `ANWEMS`, `Coaches - Pune`

## Map Update Protocol

- Update this file when adding/removing routes, services, models, storage targets, or external integrations.
- Keep both graph views aligned: `Runtime Relationship Graph` and `Application Knowledge Graph`.
