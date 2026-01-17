'use client';

import Link from 'next/link';
import StarRating from './StarRating';
import type { EpisodeWithDetails } from '@/lib/types';

interface EpisodeCardProps {
  episode: EpisodeWithDetails;
}

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  const tags = episode.tags ? JSON.parse(episode.tags) as string[] : [];

  return (
    <Link
      href={`/episode/${episode.id}`}
      className="block bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition border border-slate-700 hover:border-slate-600"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-500 text-sm font-mono">
          S{episode.season_number}E{episode.episode_number.toString().padStart(2, '0')}
        </span>
        {episode.imdb_rating && (
          <div className="flex items-center gap-1">
            <span className="text-green-400 text-sm font-semibold">
              {episode.imdb_rating.toFixed(1)}
            </span>
            <span className="text-slate-500 text-xs">TMDB</span>
          </div>
        )}
      </div>

      <h3 className="text-white font-medium mb-2 line-clamp-2">
        {episode.title}
      </h3>

      {episode.synopsis && (
        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
          {episode.synopsis}
        </p>
      )}

      {episode.setting && (
        <p className="text-slate-500 text-xs mb-2">
          {episode.setting}
        </p>
      )}

      {episode.guest_stars.length > 0 && (
        <div className="text-slate-500 text-xs mb-2">
          Guests: {episode.guest_stars.slice(0, 3).map(g => g.name).join(', ')}
          {episode.guest_stars.length > 3 && ` +${episode.guest_stars.length - 3}`}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
        {episode.user_rating ? (
          <div className="flex items-center gap-2">
            <StarRating rating={episode.user_rating.rating} size="sm" />
            <span className="text-slate-500 text-xs">Your rating</span>
          </div>
        ) : episode.community_rating ? (
          <div className="flex items-center gap-2">
            <StarRating rating={episode.community_rating} size="sm" />
            <span className="text-slate-500 text-xs">
              ({episode.rating_count} {episode.rating_count === 1 ? 'rating' : 'ratings'})
            </span>
          </div>
        ) : (
          <span className="text-slate-600 text-xs">No ratings yet</span>
        )}

        {episode.is_bookmarked && (
          <span className="text-green-400 text-sm" title="Bookmarked">
            &#9733;
          </span>
        )}
      </div>
    </Link>
  );
}
