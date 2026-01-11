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
- **Database**: SQLite with @libsql/client (Turso-compatible)
- **Search**: SQLite LIKE queries for full-text search
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

## Deployment

### Deploying to Vercel + Turso (Recommended)

This app uses `@libsql/client` which works with both local SQLite files and Turso cloud databases.

#### Step 1: Create a Turso Database

1. **Sign up** at [turso.tech](https://turso.tech) (free tier: 9GB storage, 500M reads/month)

2. **Install the Turso CLI**:
   ```bash
   # macOS
   brew install tursodatabase/tap/turso

   # Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

3. **Login and create a database**:
   ```bash
   turso auth login
   turso db create murder-she-wrote
   ```

4. **Get your connection details**:
   ```bash
   turso db show murder-she-wrote --url
   turso db tokens create murder-she-wrote
   ```

#### Step 2: Deploy to Vercel

1. **Push your code to GitHub**

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project" → Import your repository

3. **Set environment variables** in Vercel dashboard:
   ```
   TURSO_DATABASE_URL=libsql://murder-she-wrote-YOUR_USERNAME.turso.io
   TURSO_AUTH_TOKEN=your-token-from-step-4
   JWT_SECRET=<generate-with: openssl rand -base64 32>
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy!** Vercel will build and deploy automatically.

#### Step 3: Initialize the Database

After first deploy, run the setup script:

```bash
# Option 1: Using Vercel CLI
vercel env pull .env.local
npm run setup

# Option 2: Using Turso CLI directly
turso db shell murder-she-wrote < schema.sql
```

Your app is now live at `https://your-app.vercel.app`!

### Alternative: Railway (Traditional Hosting)

Railway supports persistent volumes, so you can use local SQLite files:

1. Create account at [railway.app](https://railway.app)
2. Deploy from GitHub
3. Add volume mounted at `/app/prisma`
4. Set `DATABASE_URL=file:./prisma/dev.db`
5. Run `railway run npm run setup`

### Other Hosting Options
- **Render**: Similar to Railway, supports persistent storage
- **Fly.io**: Good for SQLite with volume mounts
- **Self-hosted**: Any VPS (DigitalOcean, Linode, etc.)

## License

MIT

## Data Sources

The seed data includes minimal factual metadata. For a complete database, you can import your own episode data via CSV/JSON. Do not include copyrighted content (full synopses, copyrighted images, etc.) without proper licensing.
