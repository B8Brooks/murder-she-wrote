'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchFiltersProps {
  seasons: number[];
}

export default function SearchFilters({ seasons }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [season, setSeason] = useState(searchParams.get('season') || '');
  const [guestStar, setGuestStar] = useState(searchParams.get('guest_star') || '');
  const [setting, setSetting] = useState(searchParams.get('setting') || '');
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'episode');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'asc');

  const [guestStarSuggestions, setGuestStarSuggestions] = useState<string[]>([]);
  const [settingSuggestions, setSettingSuggestions] = useState<string[]>([]);
  const [showGuestStarSuggestions, setShowGuestStarSuggestions] = useState(false);
  const [showSettingSuggestions, setShowSettingSuggestions] = useState(false);

  // Debounce search updates
  const updateFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (season) params.set('season', season);
    if (guestStar) params.set('guest_star', guestStar);
    if (setting) params.set('setting', setting);
    if (minRating) params.set('min_rating', minRating);
    if (sortBy !== 'episode') params.set('sort_by', sortBy);
    if (sortOrder !== 'asc') params.set('sort_order', sortOrder);

    router.push(`/?${params.toString()}`);
  }, [search, season, guestStar, setting, minRating, sortBy, sortOrder, router]);

  // Debounce the filter update
  useEffect(() => {
    const timer = setTimeout(updateFilters, 300);
    return () => clearTimeout(timer);
  }, [updateFilters]);

  // Fetch guest star suggestions
  useEffect(() => {
    if (guestStar.length < 2) {
      // Clear is handled via fetch returning empty
      return;
    }
    fetch(`/api/guest-stars?q=${encodeURIComponent(guestStar)}`)
      .then((res) => res.json())
      .then((data) => {
        setGuestStarSuggestions(data.guest_stars?.map((g: { name: string }) => g.name) || []);
      });
  }, [guestStar]);

  // Fetch setting suggestions
  useEffect(() => {
    if (setting.length < 2) {
      // Clear is handled via fetch returning empty
      return;
    }
    fetch(`/api/settings?q=${encodeURIComponent(setting)}`)
      .then((res) => res.json())
      .then((data) => {
        setSettingSuggestions(data.settings || []);
      });
  }, [setting]);

  const clearFilters = () => {
    setSearch('');
    setSeason('');
    setGuestStar('');
    setSetting('');
    setMinRating('');
    setSortBy('episode');
    setSortOrder('asc');
    router.push('/');
  };

  const hasFilters = search || season || guestStar || setting || minRating || sortBy !== 'episode' || sortOrder !== 'asc';

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-6">
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search episodes, guest stars, locations..."
          className="w-full bg-slate-700 text-white rounded px-4 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {/* Season filter */}
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Seasons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              Season {s}
            </option>
          ))}
        </select>

        {/* Guest star typeahead */}
        <div className="relative">
          <input
            type="text"
            value={guestStar}
            onChange={(e) => setGuestStar(e.target.value)}
            onFocus={() => setShowGuestStarSuggestions(true)}
            onBlur={() => setTimeout(() => setShowGuestStarSuggestions(false), 200)}
            placeholder="Guest star..."
            className="w-full bg-slate-700 text-white rounded px-3 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {showGuestStarSuggestions && guestStarSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-700 rounded mt-1 z-10 max-h-48 overflow-y-auto">
              {guestStarSuggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setGuestStar(name);
                    setShowGuestStarSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Setting typeahead */}
        <div className="relative">
          <input
            type="text"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            onFocus={() => setShowSettingSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSettingSuggestions(false), 200)}
            placeholder="Location..."
            className="w-full bg-slate-700 text-white rounded px-3 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {showSettingSuggestions && settingSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-700 rounded mt-1 z-10 max-h-48 overflow-y-auto">
              {settingSuggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setSetting(name);
                    setShowSettingSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Min rating */}
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Any Rating</option>
          <option value="9">9+ TMDB</option>
          <option value="8">8+ TMDB</option>
          <option value="7">7+ TMDB</option>
          <option value="6">6+ TMDB</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split('-');
            setSortBy(by);
            setSortOrder(order);
          }}
          className="bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="episode-asc">Episode (oldest)</option>
          <option value="episode-desc">Episode (newest)</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="rating-desc">Rating (high-low)</option>
          <option value="rating-asc">Rating (low-high)</option>
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-slate-400 hover:text-white text-sm"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
