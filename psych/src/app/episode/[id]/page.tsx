'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StarRating from '@/components/StarRating';
import { useAuth } from '@/context/AuthContext';
import type { EpisodeWithDetails } from '@/lib/types';

export default function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [episode, setEpisode] = useState<EpisodeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userRating, setUserRating] = useState<number>(0);
  const [userNotes, setUserNotes] = useState<string>('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEpisode = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/episodes/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Episode not found');
          } else {
            throw new Error('Failed to fetch episode');
          }
          return;
        }
        const data = await res.json();
        setEpisode(data.episode);
        if (data.episode.user_rating) {
          setUserRating(data.episode.user_rating.rating);
          setUserNotes(data.episode.user_rating.notes || '');
        }
        setIsBookmarked(data.episode.is_bookmarked || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [id]);

  const handleRatingChange = async (newRating: number) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setUserRating(newRating);

    try {
      const res = await fetch('/api/user/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: id,
          rating: newRating,
          notes: userNotes || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to save rating');

      // Refresh episode data
      const epRes = await fetch(`/api/episodes/${id}`);
      const data = await epRes.json();
      setEpisode(data.episode);
    } catch {
      // Revert on error
      setUserRating(episode?.user_rating?.rating || 0);
    } finally {
      setSaving(false);
    }
  };

  const handleNotesBlur = async () => {
    if (!user || !userRating) return;

    setSaving(true);
    try {
      await fetch('/api/user/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: id,
          rating: userRating,
          notes: userNotes || undefined,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setSaving(true);
    const newState = !isBookmarked;
    setIsBookmarked(newState);

    try {
      if (newState) {
        await fetch('/api/user/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode_id: id }),
        });
      } else {
        await fetch(`/api/user/bookmarks/${id}`, {
          method: 'DELETE',
        });
      }
    } catch {
      setIsBookmarked(!newState);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/user/ratings/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUserRating(0);
        setUserNotes('');
        // Refresh episode data
        const epRes = await fetch(`/api/episodes/${id}`);
        const data = await epRes.json();
        setEpisode(data.episode);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading episode...</p>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Episode not found'}</p>
        <Link href="/" className="text-green-400 hover:text-green-300">
          &larr; Back to episodes
        </Link>
      </div>
    );
  }

  const tags = episode.tags ? (JSON.parse(episode.tags) as string[]) : [];
  const airDate = episode.air_date
    ? new Date(episode.air_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div>
      <Link href="/" className="text-green-400 hover:text-green-300 text-sm mb-4 inline-block">
        &larr; Back to episodes
      </Link>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-slate-500 text-sm font-mono">
              Season {episode.season_number}, Episode {episode.episode_number}
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">{episode.title}</h1>
          </div>

          <button
            onClick={handleBookmarkToggle}
            disabled={saving}
            className={`text-2xl transition ${
              isBookmarked ? 'text-green-400' : 'text-slate-600 hover:text-green-400'
            }`}
            title={isBookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {airDate && (
            <div>
              <span className="text-slate-500 text-xs block">Air Date</span>
              <span className="text-white">{airDate}</span>
            </div>
          )}

          {episode.setting && (
            <div>
              <span className="text-slate-500 text-xs block">Setting</span>
              <Link
                href={`/?setting=${encodeURIComponent(episode.setting)}`}
                className="text-white hover:text-green-400 transition"
              >
                {episode.setting}
              </Link>
            </div>
          )}

          {episode.imdb_rating && (
            <div>
              <span className="text-slate-500 text-xs block">TMDB Rating</span>
              <span className="text-green-400 font-semibold">
                {episode.imdb_rating.toFixed(1)}/10
              </span>
            </div>
          )}

          {episode.community_rating && (
            <div>
              <span className="text-slate-500 text-xs block">
                Community Rating ({episode.rating_count})
              </span>
              <div className="flex items-center gap-2">
                <StarRating rating={episode.community_rating} size="sm" />
                <span className="text-white">{episode.community_rating.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Synopsis */}
        {episode.synopsis && (
          <div className="mb-6">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Synopsis</h2>
            <p className="text-white leading-relaxed">{episode.synopsis}</p>
          </div>
        )}

        {/* Guest Stars */}
        {episode.guest_stars.length > 0 && (
          <div className="mb-6">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Guest Stars</h2>
            <div className="flex flex-wrap gap-2">
              {episode.guest_stars.map((gs) => (
                <Link
                  key={gs.id}
                  href={`/?guest_star=${encodeURIComponent(gs.name)}`}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-full text-sm transition"
                >
                  {gs.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-6">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User Rating Section */}
        <div className="border-t border-slate-700 pt-6 mt-6">
          <h2 className="text-white font-medium mb-4">Your Rating</h2>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <StarRating
                  rating={userRating}
                  interactive
                  onChange={handleRatingChange}
                  size="lg"
                />
                {userRating > 0 && (
                  <span className="text-white font-medium">
                    {userRating.toFixed(1)} / 5
                  </span>
                )}
                {saving && (
                  <span className="text-slate-500 text-sm">Saving...</span>
                )}
              </div>

              {userRating > 0 && (
                <>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Add notes about this episode (optional)..."
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                  />
                  <button
                    onClick={handleDeleteRating}
                    disabled={saving}
                    className="text-slate-400 hover:text-red-400 text-sm"
                  >
                    Remove rating
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="text-slate-400">
              <Link href="/login" className="text-green-400 hover:text-green-300">
                Log in
              </Link>{' '}
              to rate this episode.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
