# 🎈 StorytimeRadar — Community Storytimes & Kids Calendar

A modern web application built for parents to discover local library storytimes, baby lap-sits, toddler music hours, and community kids' activities—and subscribe to them directly in **Google Calendar**, **Apple Calendar / iOS**, or any iCal-compatible app with auto-updating feeds.

---

## ✨ Features

- 📍 **Location-Based Search**: Enter any US ZIP code, city, or neighborhood (or tap "Current Location") to automatically discover nearby public library systems and branches within a configurable radius (5, 10, 15, or 25 miles).
- 🏛️ **Multi-Library Branch Selector**: Toggle which local branches you want to include in your feed. Compare distances in miles.
- 👶 **Smart Age Category Filtering**: Filter events by:
  - 👶 **Baby & Lap-sit** (0 – 18 months)
  - 🧒 **Toddler Time** (18 months – 3 years)
  - 🎨 **Preschool** (3 – 5 years)
  - 🚀 **School Age** (5+ years)
  - 👨‍👩‍👧‍👦 **Family & All Ages**
- ⏰ **Nap-Schedule Friendly Timing**: Filter by Morning (< 11:30 AM), Midday (11:30 AM – 2:00 PM), or Afternoon (> 2:00 PM).
- 📅 **Dual Calendar Views**:
  - **Agenda / List View**: Clean, grouped day-by-day feed highlighting today and tomorrow.
  - **Month Grid View**: Full visual calendar grid with color-coded age badges.
- 🔄 **Live Dynamic iCal / Webcal Subscription Feed**:
  - Generates a persistent URL (e.g. `webcal://.../api/feed.ics?branches=...&ages=toddler,baby`)
  - **1-Click Apple Calendar / iOS subscription**: Tap on your iPhone or Mac to subscribe.
  - **1-Click Google Calendar subscription**: Adds a live synced calendar feed.
  - **Auto-Syncing**: When libraries update or schedule new storytimes, your phone's calendar updates automatically without manual imports.
- ⚡ **1-Click Add Single Events**: Quick direct button on every event card to push a specific event into your Google Calendar or download a single `.ics` file.

---

## 🚀 Getting Started

### 1. Install & Run Locally

```bash
cd /Users/nabeelz/storytime-radar
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Available API Endpoints

- `GET /api/feed.ics`
  - Generates an RFC 5545 compliant `.ics` calendar feed.
  - Parameters:
    - `branches`: Comma-separated branch IDs (e.g. `spl-ballard,kcls-bellevue`)
    - `ages`: Comma-separated age groups (`baby`, `toddler`, `preschool`, `kids`, `all-ages`)
    - `types`: Comma-separated event types (`storytime`, `music-movement`, `crafts-stem`, `playgroup`)
    - `days`: Number of days ahead (default: 60)
- `GET /api/libraries?lat=...&lon=...&radius=...`
  - Returns library systems and branches sorted by distance in miles.
- `GET /api/geocode?q=...`
  - Resolves any US zip code, city name, or address to geographic coordinates.
- `GET /api/events`
  - JSON list of filtered events for frontend views.

---

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Calendar Engine**: `ical-generator` (RFC 5545) + `date-fns`
- **Geocoding**: Fast offline zip table + OpenStreetMap Nominatim fallback
