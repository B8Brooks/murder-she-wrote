import { z } from 'zod';

// Auth validations
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Episode search/filter validations
export const episodeFiltersSchema = z.object({
  search: z.string().optional(),
  season: z.coerce.number().int().positive().optional(),
  guest_star: z.string().optional(),
  setting: z.string().optional(),
  min_rating: z.coerce.number().min(0).max(10).optional(),
  sort_by: z.enum(['episode', 'title', 'rating']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Rating validations
export const ratingSchema = z.object({
  rating: z.number().min(1).max(5).refine(
    (val) => (val * 2) % 1 === 0,
    'Rating must be in half-star increments (1, 1.5, 2, 2.5, etc.)'
  ),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
});

// Bookmark validation (just needs episode_id in URL)
export const bookmarkSchema = z.object({
  episode_id: z.string().min(1, 'Episode ID is required'),
});

// Episode import validation
export const episodeImportSchema = z.object({
  season_number: z.number().int().positive(),
  episode_number: z.number().int().positive(),
  title: z.string().min(1),
  air_date: z.string().optional(),
  synopsis: z.string().optional(),
  setting: z.string().optional(),
  imdb_rating: z.number().min(0).max(10).optional(),
  tags: z.array(z.string()).optional(),
  guest_stars: z.array(z.string()).optional(),
});

export const bulkImportSchema = z.array(episodeImportSchema);
