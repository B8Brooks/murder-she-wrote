'use client';

import { useState } from 'react';
import type { ParentalGuide } from '@/lib/types';

interface ParentalGuideDetailsProps {
  guide: ParentalGuide;
}

export default function ParentalGuideDetails({ guide }: ParentalGuideDetailsProps) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleExpand = (category: string) => {
    setExpanded(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const severityColor = (severity: number) => {
    if (severity === 0) return 'bg-gray-100 text-gray-600';
    if (severity === 1) return 'bg-yellow-100 text-yellow-700';
    if (severity === 2) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const severityLabel = (severity: number) => {
    if (severity === 0) return 'None';
    if (severity === 1) return 'Mild';
    if (severity === 2) return 'Moderate';
    return 'Severe';
  };

  const categories = [
    {
      id: 'violence',
      name: 'Violence & Gore',
      severity: guide.violence_severity,
      description: guide.violence_description,
      icon: '⚔️',
    },
    {
      id: 'sex',
      name: 'Sex & Nudity',
      severity: guide.sex_severity,
      description: guide.sex_description,
      icon: '💋',
    },
    {
      id: 'profanity',
      name: 'Profanity',
      severity: guide.profanity_severity,
      description: guide.profanity_description,
      icon: '🗣️',
    },
    {
      id: 'alcohol',
      name: 'Alcohol, Drugs & Smoking',
      severity: guide.alcohol_severity,
      description: guide.alcohol_description,
      icon: '🍺',
    },
    {
      id: 'frightening',
      name: 'Frightening & Intense Scenes',
      severity: guide.frightening_severity,
      description: guide.frightening_description,
      icon: '😱',
    },
  ];

  return (
    <div className="space-y-2">
      {categories.map(category => (
        <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleExpand(category.id)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{category.icon}</span>
              <span className="font-medium text-gray-900">{category.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${severityColor(category.severity)}`}>
                {severityLabel(category.severity)}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expanded.includes(category.id) ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expanded.includes(category.id) && category.description && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {category.description.split(' | ').map((item, idx) => (
                  <span key={idx} className="block mb-2">
                    • {item}
                  </span>
                ))}
              </p>
            </div>
          )}
          
          {expanded.includes(category.id) && !category.description && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-500 italic">No details available</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
