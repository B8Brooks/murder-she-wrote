'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EpisodeCard from '@/components/EpisodeCard';
import SearchFilters from '@/components/SearchFilters';
import Pagination from '@/components/Pagination';
import type { EpisodeWithDetails } from '@/lib/types';

interface EpisodesResponse {
  data: EpisodeWithDetails[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  seasons: number[];
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EpisodesResponse | null>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/episodes?${searchParams.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch episodes');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [searchParams]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <>
      <SearchFilters seasons={data?.seasons || []} />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading episodes...</p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No episodes found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>

          {data && (
            <Pagination
              currentPage={data.page}
              totalPages={data.total_pages}
              total={data.total}
            />
          )}
        </>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Psych</h1>
      <p className="text-slate-400 mb-6">
        Browse and rate episodes from the hit comedy-mystery series
      </p>

      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
