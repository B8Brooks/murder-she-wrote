// Database types for Murder, She Wrote app

export interface Episode {
  id: string;
  season_number: number;
  episode_number: number;
  title: string;
  air_date: string | null;
  synopsis: string | null;
  setting: string | null;
  imdb_rating: number | null;
  tags: string | null; // JSON array as string
  imdb_id: string | null; // IMDb episode ID
}

export interface EpisodeWithDetails extends Episode {
  guest_stars: GuestStar[];
  user_rating?: Rating | null;
  is_bookmarked?: boolean;
  community_rating?: number | null;
  rating_count?: number;
  parental_guide?: ParentalGuide | null;
}

export interface GuestStar {
  id: string;
  name: string;
}

export interface ParentalGuide {
  id: string;
  episode_id: string;
  imdb_id: string | null;
  violence_severity: number;
  violence_description: string | null;
  sex_severity: number;
  sex_description: string | null;
  profanity_severity: number;
  profanity_description: string | null;
  alcohol_severity: number;
  alcohol_description: string | null;
  frightening_severity: number;
  frightening_description: string | null;
  scraped_at: string;
}

export interface UserParentalPreferences {
  id: string;
  user_id: string;
  filter_enabled: boolean;
  max_violence: number;
  max_sex: number;
  max_profanity: number;
  max_alcohol: number;
  max_frightening: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  episode_id: string;
  rating: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingWithEpisode extends Rating {
  episode: Episode;
}

export interface Bookmark {
  id: string;
  user_id: string;
  episode_id: string;
  created_at: string;
}

export interface BookmarkWithEpisode extends Bookmark {
  episode: Episode;
}

export interface UserStats {
  total_rated: number;
  total_bookmarked: number;
  average_rating: number | null;
  top_rated_season: number | null;
  ratings_by_season: { season: number; count: number; avg_rating: number }[];
}

// Search/filter types
export interface EpisodeFilters {
  search?: string;
  season?: number;
  guest_star?: string;
  setting?: string;
  min_rating?: number;
  sort_by?: 'episode' | 'title' | 'rating';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
    max_violence?: number;
  max_sex?: number;
  max_profanity?: number;
  max_alcohol?: number;
  max_frightening?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Auth types
export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
}

// Import types
export interface EpisodeImport {
  season_number: number;
  episode_number: number;
  title: string;
  air_date?: string;
  synopsis?: string;
  setting?: string;
  imdb_rating?: number;
  tags?: string[];
  guest_stars?: string[];
}
