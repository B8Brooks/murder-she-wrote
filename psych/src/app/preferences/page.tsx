'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function PreferencesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [filterEnabled, setFilterEnabled] = useState(false);
  const [maxViolence, setMaxViolence] = useState(3);
  const [maxSex, setMaxSex] = useState(3);
  const [maxProfanity, setMaxProfanity] = useState(3);
  const [maxAlcohol, setMaxAlcohol] = useState(3);
  const [maxFrightening, setMaxFrightening] = useState(3);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchPreferences();
    }
  }, [user, authLoading, router]);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/user/parental-preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      
      const data = await res.json();
      setFilterEnabled(data.filter_enabled);
      setMaxViolence(data.max_violence);
      setMaxSex(data.max_sex);
      setMaxProfanity(data.max_profanity);
      setMaxAlcohol(data.max_alcohol);
      setMaxFrightening(data.max_frightening);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/parental-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter_enabled: filterEnabled,
          max_violence: maxViolence,
          max_sex: maxSex,
          max_profanity: maxProfanity,
          max_alcohol: maxAlcohol,
          max_frightening: maxFrightening,
        }),
      });

      if (!res.ok) throw new Error('Failed to save preferences');

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const severityLabel = (value: number) => {
    if (value === 0) return 'None';
    if (value === 1) return 'Mild';
    if (value === 2) return 'Moderate';
    return 'Severe';
  };

  if (authLoading || loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading preferences...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-green-400 hover:text-green-300 text-sm mb-4 inline-block">
        &larr; Back to episodes
      </Link>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6">Parental Guide Preferences</h1>

        <p className="text-slate-300 mb-6">
          Set your content preferences to automatically filter episodes based on parental guide ratings.
        </p>

        {/* Enable/Disable Filter */}
        <div className="mb-8 p-4 bg-slate-700 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-slate-500 text-green-500 focus:ring-2 focus:ring-green-500"
            />
            <div>
              <span className="text-white font-medium">Enable automatic content filtering</span>
              <p className="text-slate-400 text-sm">
                When enabled, episodes will be automatically filtered based on your preferences below
              </p>
            </div>
          </label>
        </div>

        {/* Content Sliders */}
        <div className="space-y-6 mb-8">
          {/* Violence */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white font-medium">Violence & Gore</label>
              <span className="text-green-400 font-semibold">{severityLabel(maxViolence)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              value={maxViolence}
              onChange={(e) => setMaxViolence(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Sex & Nudity */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white font-medium">Sex & Nudity</label>
              <span className="text-green-400 font-semibold">{severityLabel(maxSex)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              value={maxSex}
              onChange={(e) => setMaxSex(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Profanity */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white font-medium">Profanity</label>
              <span className="text-green-400 font-semibold">{severityLabel(maxProfanity)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              value={maxProfanity}
              onChange={(e) => setMaxProfanity(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Alcohol & Drugs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white font-medium">Alcohol, Drugs & Smoking</label>
              <span className="text-green-400 font-semibold">{severityLabel(maxAlcohol)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              value={maxAlcohol}
              onChange={(e) => setMaxAlcohol(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Frightening */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white font-medium">Frightening & Intense Scenes</label>
              <span className="text-green-400 font-semibold">{severityLabel(maxFrightening)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              value={maxFrightening}
              onChange={(e) => setMaxFrightening(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>
        </div>

        {/* Save Button and Messages */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>

          {message && (
            <span className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
              {message.text}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-slate-700 rounded-lg">
          <p className="text-slate-300 text-sm">
            <strong>Note:</strong> These preferences will automatically filter episodes when browsing.
            You can still manually adjust filters on the search page to override your preferences.
          </p>
        </div>
      </div>
    </div>
  );
}
