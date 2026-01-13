'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const seedDatabase = async () => {
    setLoading(true);
    setStatus('Seeding database with local data...');

    try {
      const response = await fetch('/api/admin/seed?secret=jessica-fletcher', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`Success! Imported ${data.imported} episodes from local data.`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromTMDB = async () => {
    setLoading(true);
    setStatus('Fetching from TMDB... This may take a minute.');

    try {
      const response = await fetch('/api/admin/fetch-tmdb?secret=jessica-fletcher', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`Success! Fetched ${data.fetched} episodes from TMDB, imported ${data.imported}.`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Option 1: Fetch from TMDB</h2>
          <p className="text-gray-400 mb-4">
            Fetch accurate episode data directly from The Movie Database.
            Requires TMDB_API_KEY environment variable.
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Get a free API key at: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">themoviedb.org/settings/api</a>
          </p>

          <button
            onClick={fetchFromTMDB}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : 'Fetch from TMDB'}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Option 2: Seed Local Data</h2>
          <p className="text-gray-400 mb-4">
            Seed with bundled episode data (264 episodes, but synopses may be placeholders).
          </p>

          <button
            onClick={seedDatabase}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Seeding...' : 'Seed Local Data'}
          </button>
        </div>

        {status && (
          <div className={`mt-6 p-4 rounded-lg ${status.includes('Success') ? 'bg-green-800' : status.includes('Error') ? 'bg-red-800' : 'bg-gray-700'}`}>
            {status}
          </div>
        )}

        <a href="/" className="block mt-6 text-amber-500 hover:text-amber-400">
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}
