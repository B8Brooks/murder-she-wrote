# Brooks TV Shows

Episode databases for classic TV shows. Browse, search, and rate episodes.

## Shows

| Show | Folder | Episodes | Seasons | Years |
|------|--------|----------|---------|-------|
| **Murder, She Wrote** | `/` (root) | 264 | 12 | 1984-1996 |
| **Psych** | `/psych` | 121 | 8 | 2006-2014 |

## Features

- Episode search with filters (season, guest star, location, rating)
- TMDB integration for accurate episode data
- User accounts with personal ratings and bookmarks
- Community ratings
- Clickable guest stars and locations

## Tech Stack

- Next.js 14 with App Router
- Turso (libSQL) for serverless SQLite
- JWT authentication
- Tailwind CSS

## Deployment

Each show deploys as a **separate Vercel project** pointing to different root directories.

### 1. Create Turso Database

1. Sign up at [turso.tech](https://turso.tech) (free)
2. Create a database for each show (e.g., `murder-she-wrote`, `psych`)
3. Get the Database URL and Auth Token

### 2. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repository
3. **Set Root Directory:**
   - Murder, She Wrote: `/` (leave blank)
   - Psych: `psych`
4. Add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET` (any random string)
   - `TMDB_API_KEY` (get free at [themoviedb.org](https://www.themoviedb.org/settings/api))

### 3. Seed Database

After deployment, go to `/admin` and click **"Fetch from TMDB"** to populate episodes.

## Local Development

```bash
# Murder, She Wrote
npm install
npm run dev

# Psych
cd psych
npm install
npm run dev
```

## License

MIT
