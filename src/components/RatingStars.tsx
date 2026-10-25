import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating?: number;
  ratingCount?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (stars: number) => void;
  showCount?: boolean;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating = 5.0,
  ratingCount = 0,
  size = 'sm',
  interactive = false,
  onRate,
  showCount = true,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userRated, setUserRated] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const starSizeClass =
    size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleRate = (starIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive) return;
    setUserRated(starIndex);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 800);
    if (onRate) {
      onRate(starIndex);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      onClick={(e) => interactive && e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = displayRating >= star;
          const isHalf = !isFilled && displayRating >= star - 0.5;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              onClick={(e) => handleRate(star, e)}
              className={`transition-transform p-0.5 ${
                interactive
                  ? 'cursor-pointer hover:scale-125 focus:outline-none'
                  : 'cursor-default pointer-events-none'
              } ${animating && userRated === star ? 'scale-125' : ''}`}
              title={interactive ? `تقييم ${star} من 5 نجوم` : `${rating} من 5 نجوم`}
            >
              <Star
                className={`${starSizeClass} ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                    : isHalf
                    ? 'text-amber-400 fill-amber-400/50'
                    : 'text-zinc-600 fill-zinc-800/40'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 text-[11px] font-bold">
        <span className="text-amber-300 font-mono">
          {Number(rating).toFixed(1)}
        </span>
        {showCount && ratingCount > 0 && (
          <span className="text-zinc-400 text-[10px] font-normal">
            ({ratingCount.toLocaleString('ar-EG')})
          </span>
        )}
      </div>

      {userRated !== null && (
        <span className="text-[10px] text-emerald-400 font-bold animate-in fade-in mr-1">
          ✓ تم التقييم!
        </span>
      )}
    </div>
  );
};
