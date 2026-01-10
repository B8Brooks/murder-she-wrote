# Murder, She Wrote - Episode Database

A web application for browsing and rating episodes of the classic TV series "Murder, She Wrote". Features full-text search, user accounts, ratings, and bookmarking.

## Features

- **Episode Database**: Browse all episodes with metadata (title, synopsis, guest stars, setting, IMDb rating)
- **Full-Text Search**: Search across titles, synopses, settings, and guest stars using SQLite FTS5
- **Filtering**: Filter by season, guest star, setting, or minimum rating
- **Sorting**: Sort by episode order, title, or rating
- **User Accounts**: Register and login with email/password
- **Ratings**: Rate episodes 1-5 stars (supports half-stars) with optional notes
- **Bookmarks**: Save episodes to your watchlist
- **Profile**: View your ratings, bookmarks, and statistics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with better-sqlite3
- **Search**: SQLite FTS5 for full-text search
- **Auth**: JWT-based with bcrypt password hashing
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd murder-she-wrote
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional - defaults work for development):
```bash
cp .env.example .env
# Edit .env to customize JWT_SECRET for production
```

4. Initialize the database with seed data:
```bash
npm run setup
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run setup` | Initialize database with seed data |
| `npm run db:init` | Initialize/reset database schema and seed |
| `npm run db:import -- --file <path>` | Import episodes from JSON/CSV file |

## Importing Episode Data

### JSON Format

Create a JSON file with an array of episode objects:

```json
[
  {
    "season_number": 1,
    "episode_number": 1,
    "title": "The Murder of Sherlock Holmes",
    "air_date": "1984-09-30",
    "synopsis": "Jessica Fletcher attends a costume party...",
    "setting": "New York City, New York",
    "imdb_rating": 7.8,
    "tags": ["pilot", "costume party"],
    "guest_stars": ["Brian Keith", "Bert Convy"]
  }
]
```

### CSV Format

Create a CSV with headers:
```csv
season_number,episode_number,title,air_date,synopsis,setting,imdb_rating,tags,guest_stars
1,1,"The Murder of Sherlock Holmes",1984-09-30,"Jessica Fletcher attends...","New York City, New York",7.8,pilot|costume party,Brian Keith|Bert Convy
```

Note: Tags and guest_stars use `|` as delimiter within the field.

### Running Import

```bash
npm run db:import -- --file data/my-episodes.json
# or
npm run db:import -- --file data/my-episodes.csv
```

## Database Schema

### Episodes
- `id`: Unique identifier (CUID)
- `season_number`: Season number
- `episode_number`: Episode number within season
- `title`: Episode title
- `air_date`: Original air date
- `synopsis`: Episode description
- `setting`: Location (city, state/country)
- `imdb_rating`: IMDb rating (1-10 scale)
- `tags`: JSON array of tags

### Guest Stars
Normalized table with many-to-many relationship to episodes.

### Users
- Email/password authentication
- Created/updated timestamps

### Ratings
- User rating (1-5, supports 0.5 increments)
- Optional notes
- One rating per user per episode

### Bookmarks
- Watchlist functionality
- One bookmark per user per episode

## API Endpoints

### Public
- `GET /api/episodes` - List/search episodes
- `GET /api/episodes/[id]` - Get episode details
- `GET /api/guest-stars?q=<query>` - Search guest stars (typeahead)
- `GET /api/settings?q=<query>` - Search settings (typeahead)

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### User (requires auth)
- `GET /api/user/ratings` - Get user's ratings
- `POST /api/user/ratings` - Create/update rating
- `DELETE /api/user/ratings/[episodeId]` - Remove rating
- `GET /api/user/bookmarks` - Get user's bookmarks
- `POST /api/user/bookmarks` - Create bookmark
- `DELETE /api/user/bookmarks/[episodeId]` - Remove bookmark
- `GET /api/user/stats` - Get user statistics

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./prisma/dev.db` |
| `JWT_SECRET` | Secret for JWT signing | Development default |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |

## Project Structure

```
murder-she-wrote/
├── data/
│   └── seed-episodes.json    # Initial seed data
├── scripts/
│   ├── init-db.ts            # Database initialization
│   └── import-episodes.ts    # CSV/JSON import tool
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── episode/[id]/     # Episode detail page
│   │   ├── login/            # Login page
│   │   ├── profile/          # User profile page
│   │   ├── register/         # Registration page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home/search page
│   ├── components/           # React components
│   ├── context/              # React context (Auth)
│   └── lib/
│       ├── auth.ts           # Authentication logic
│       ├── db.ts             # Database connection/schema
│       ├── episodes.ts       # Episode data access
│       ├── types.ts          # TypeScript types
│       ├── user-actions.ts   # User ratings/bookmarks
│       └── validations.ts    # Zod schemas
└── prisma/
    └── dev.db                # SQLite database file
```

## Next Steps for Scaling

### Hosting Options
- **Vercel**: Recommended for Next.js apps. Note: SQLite requires persistent storage (use Vercel KV or switch to Postgres)
- **Railway/Render**: Good for SQLite with persistent volumes
- **Self-hosted**: Any Node.js hosting with file system access

### Moving from SQLite to PostgreSQL

1. Update `better-sqlite3` to `pg` or use Prisma with PostgreSQL
2. Migrate FTS5 to PostgreSQL full-text search (`tsvector`, `tsquery`)
3. Update database connection URL
4. Migrate data using export/import scripts

### Improving Search
- Add search result ranking/relevance scoring
- Implement fuzzy matching for typo tolerance
- Add search suggestions/autocomplete
- Consider Elasticsearch for larger datasets

### Adding Episode Images
1. Add `image_url` or `image_path` column to episodes table
2. Create image upload/storage solution (S3, Cloudinary, or local)
3. Update import script to handle image URLs
4. Add image display to episode cards and detail pages
5. Implement lazy loading for performance

## License

MIT

## Data Sources

The seed data includes minimal factual metadata. For a complete database, you can import your own episode data via CSV/JSON. Do not include copyrighted content (full synopses, copyrighted images, etc.) without proper licensing.
