import React from 'react';
import { Video, User } from '../types';
import { X, Bookmark, ExternalLink, Play, Eye } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { CommentsSection } from './CommentsSection';

interface VideoDetailModalProps {
  video: Video | null;
  onClose: () => void;
  onToggleFavorite: (id: string, type: 'video', title: string, path: string) => void;
  isBookmarked: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onRate?: (stars: number) => void;
}

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({
  video,
  onClose,
  onToggleFavorite,
  isBookmarked,
  user,
  onOpenAuth,
  onRate,
}) => {
  if (!video) return null;

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/').split('&')[0];
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const handleBookmark = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleFavorite(String(video.id), 'video', video.title, video.videourl);
  };

  const embedUrl = getEmbedUrl(video.videourl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Video Player */}
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl mb-4">
          {embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be') ? (
            <iframe
              src={embedUrl}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={video.videourl} controls className="w-full h-full object-cover" />
          )}
        </div>

        {/* Details & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {video.category || 'شرح تعليمي'}
              </span>
              <span className="text-xs text-zinc-400">
                📺 {video.channel || 'المكتبة الرقمية'}
              </span>
              <span className="text-xs text-zinc-500">
                ⏱️ {video.duration || '25:00'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100">{video.title}</h2>
            
            {/* Interactive Rating */}
            <div className="flex items-center gap-3 mt-2">
              <RatingStars
                rating={video.rating || 4.9}
                ratingCount={video.ratingCount || 420}
                size="md"
                interactive={true}
                onRate={onRate}
              />
              <span className="text-[10px] text-zinc-500">اضغط لتقييم الشرح</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                isBookmarked 
                  ? 'bg-amber-500 text-zinc-950 border-amber-400' 
                  : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>{isBookmarked ? 'محفوظ في المفضلة' : 'حفظ في المفضلة'}</span>
            </button>

            <a
              href={video.videourl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
              title="فتح الرابط الأصلي"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Interactive Student Comments & Questions Section */}
        <CommentsSection
          itemId={video.id}
          itemType="video"
          user={user}
          onOpenAuth={onOpenAuth}
          title="نقاشات وأسئلة الطلاب حول الفيديو"
        />
      </div>
    </div>
  );
};
