'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const seedDatabase = async () => {
    setLoading(true);
    setStatus('Seeding database...');

    try {
      const response = await fetch('/api/admin/seed?secret=jessica-fletcher', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`Success! Imported ${data.imported} episodes.`);
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

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Seed Database</h2>
          <p className="text-gray-400 mb-4">
            Click the button below to populate the database with 30 Murder, She Wrote episodes.
          </p>

          <button
            onClick={seedDatabase}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Seeding...' : 'Seed Database'}
          </button>

          {status && (
            <div className={`mt-4 p-3 rounded ${status.includes('Success') ? 'bg-green-800' : 'bg-gray-700'}`}>
              {status}
            </div>
          )}
        </div>

        <a href="/" className="block mt-6 text-amber-500 hover:text-amber-400">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
