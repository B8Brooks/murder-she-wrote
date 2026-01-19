import type { ParentalGuide } from '@/lib/types';

interface ParentalGuideBadgeProps {
  guide: ParentalGuide;
  compact?: boolean;
}

export default function ParentalGuideBadge({ guide, compact = false }: ParentalGuideBadgeProps) {
  // Calculate overall TV rating based on severity levels
  const maxSeverity = Math.max(
    guide.violence_severity,
    guide.sex_severity,
    guide.profanity_severity,
    guide.alcohol_severity,
    guide.frightening_severity
  );

  let tvRating = 'TV-G';
  let ratingColor = 'bg-green-100 text-green-800';

  if (maxSeverity === 0) {
    tvRating = 'TV-G';
    ratingColor = 'bg-green-100 text-green-800';
  } else if (maxSeverity === 1) {
    tvRating = 'TV-PG';
    ratingColor = 'bg-yellow-100 text-yellow-800';
  } else if (maxSeverity === 2) {
    tvRating = 'TV-14';
    ratingColor = 'bg-orange-100 text-orange-800';
  } else {
    tvRating = 'TV-MA';
    ratingColor = 'bg-red-100 text-red-800';
  }

  const severityColor = (severity: number) => {
    if (severity === 0) return 'text-gray-400';
    if (severity === 1) return 'text-yellow-600';
    if (severity === 2) return 'text-orange-600';
    return 'text-red-600';
  };

  const severityLabel = (severity: number) => {
    if (severity === 0) return 'None';
    if (severity === 1) return 'Mild';
    if (severity === 2) return 'Moderate';
    return 'Severe';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${ratingColor}`}>
          {tvRating}
        </span>
        <div className="flex gap-1 text-xs">
          {guide.violence_severity > 0 && (
            <span className={severityColor(guide.violence_severity)} title={`Violence: ${severityLabel(guide.violence_severity)}`}>
              ⚔️
            </span>
          )}
          {guide.sex_severity > 0 && (
            <span className={severityColor(guide.sex_severity)} title={`Sex/Nudity: ${severityLabel(guide.sex_severity)}`}>
              💋
            </span>
          )}
          {guide.profanity_severity > 0 && (
            <span className={severityColor(guide.profanity_severity)} title={`Profanity: ${severityLabel(guide.profanity_severity)}`}>
              🗣️
            </span>
          )}
          {guide.alcohol_severity > 0 && (
            <span className={severityColor(guide.alcohol_severity)} title={`Alcohol/Drugs: ${severityLabel(guide.alcohol_severity)}`}>
              🍺
            </span>
          )}
          {guide.frightening_severity > 0 && (
            <span className={severityColor(guide.frightening_severity)} title={`Frightening: ${severityLabel(guide.frightening_severity)}`}>
              😱
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <span className={`px-3 py-1.5 rounded-md text-sm font-bold ${ratingColor}`}>
          {tvRating}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Violence:</span>
          <span className={`font-semibold ${severityColor(guide.violence_severity)}`}>
            {severityLabel(guide.violence_severity)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Sex/Nudity:</span>
          <span className={`font-semibold ${severityColor(guide.sex_severity)}`}>
            {severityLabel(guide.sex_severity)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Profanity:</span>
          <span className={`font-semibold ${severityColor(guide.profanity_severity)}`}>
            {severityLabel(guide.profanity_severity)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Alcohol/Drugs:</span>
          <span className={`font-semibold ${severityColor(guide.alcohol_severity)}`}>
            {severityLabel(guide.alcohol_severity)}
          </span>
        </div>
        <div className="flex items-center justify-between col-span-2">
          <span className="text-gray-600">Frightening:</span>
          <span className={`font-semibold ${severityColor(guide.frightening_severity)}`}>
            {severityLabel(guide.frightening_severity)}
          </span>
        </div>
      </div>
    </div>
  );
}
