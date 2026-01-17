'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import StarRating from '@/components/StarRating';
import type { RatingWithEpisode, BookmarkWithEpisode, UserStats } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'ratings' | 'bookmarks'>('ratings');
  const [ratings, setRatings] = useState<RatingWithEpisode[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkWithEpisode[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [ratingsRes, bookmarksRes, statsRes] = await Promise.all([
          fetch('/api/user/ratings'),
          fetch('/api/user/bookmarks'),
          fetch('/api/user/stats'),
        ]);

        const ratingsData = await ratingsRes.json();
        const bookmarksData = await bookmarksRes.json();
        const statsData = await statsRes.json();

        setRatings(ratingsData.ratings || []);
        setBookmarks(bookmarksData.bookmarks || []);
        setStats(statsData.stats || null);
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">My Profile</h1>
      <p className="text-slate-400 mb-6">{user.name || user.email}</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <span className="text-slate-400 text-sm block">Episodes Rated</span>
            <span className="text-2xl font-bold text-white">{stats.total_rated}</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <span className="text-slate-400 text-sm block">Bookmarked</span>
            <span className="text-2xl font-bold text-white">{stats.total_bookmarked}</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <span className="text-slate-400 text-sm block">Average Rating</span>
            <span className="text-2xl font-bold text-green-400">
              {stats.average_rating ? stats.average_rating.toFixed(1) : '-'}
            </span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <span className="text-slate-400 text-sm block">Top Season</span>
            <span className="text-2xl font-bold text-white">
              {stats.top_rated_season ? `Season ${stats.top_rated_season}` : '-'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('ratings')}
          className={`pb-3 px-1 text-sm font-medium transition ${
            activeTab === 'ratings'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          My Ratings ({ratings.length})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`pb-3 px-1 text-sm font-medium transition ${
            activeTab === 'bookmarks'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Watchlist ({bookmarks.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : activeTab === 'ratings' ? (
        ratings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">You haven&apos;t rated any episodes yet.</p>
            <Link href="/" className="text-green-400 hover:text-green-300">
              Browse episodes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((r) => (
              <Link
                key={r.id}
                href={`/episode/${r.episode_id}`}
                className="block bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-500 text-sm font-mono">
                      S{r.episode.season_number}E{r.episode.episode_number.toString().padStart(2, '0')}
                    </span>
                    <h3 className="text-white font-medium">{r.episode.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-white font-medium">{r.rating.toFixed(1)}</span>
                  </div>
                </div>
                {r.notes && (
                  <p className="text-slate-400 text-sm mt-2">{r.notes}</p>
                )}
                <p className="text-slate-600 text-xs mt-2">
                  Rated {new Date(r.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">Your watchlist is empty.</p>
          <Link href="/" className="text-green-400 hover:text-green-300">
            Browse episodes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((b) => (
            <Link
              key={b.id}
              href={`/episode/${b.episode_id}`}
              className="block bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition"
            >
              <span className="text-slate-500 text-sm font-mono">
                S{b.episode.season_number}E{b.episode.episode_number.toString().padStart(2, '0')}
              </span>
              <h3 className="text-white font-medium">{b.episode.title}</h3>
              {b.episode.synopsis && (
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                  {b.episode.synopsis}
                </p>
              )}
              <p className="text-slate-600 text-xs mt-2">
                Added {new Date(b.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
