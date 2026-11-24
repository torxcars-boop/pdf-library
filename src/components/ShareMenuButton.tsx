import React, { useState, useRef, useEffect } from 'react';
import { Share2, Link2, Check, Send } from 'lucide-react';
import {
  ShareContentType,
  buildContentShareUrl,
  copyLinkToClipboard,
  shareContentNative,
  canUseNativeShare,
} from '../utils/shareUtils';

interface ShareMenuButtonProps {
  itemType: ShareContentType;
  itemId: string | number;
  title: string;
  subtitle?: string;
  className?: string;
}

export const ShareMenuButton: React.FC<ShareMenuButtonProps> = ({
  itemType,
  itemId,
  title,
  subtitle,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareUrl = buildContentShareUrl(itemType, itemId);
  const nativeSupported = canUseNativeShare();

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const showTempStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2400);
  };

  const handleCopyDirectLink = async () => {
    const ok = await copyLinkToClipboard(shareUrl);
    if (ok) {
      showTempStatus('تم نسخ الرابط المباشر!');
    } else {
      showTempStatus('تعذر النسخ التلقائي');
    }
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    const typeLabel = itemType === 'book' ? 'كتاب' : itemType === 'article' ? 'مقال' : 'فيديو شرح';
    const result = await shareContentNative({
      title,
      text: subtitle || `شاهد هذا ال${typeLabel} المميز في المكتبة الرقمية الفاخرة: ${title}`,
      url: shareUrl,
    });
    if (result === 'shared') {
      showTempStatus('تمت المشاركة بنجاح!');
    } else if (result === 'copied') {
      showTempStatus('تم نسخ الرابط المباشر!');
    } else if (result === 'failed') {
      showTempStatus('تعذرت المشاركة');
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
          statusMessage
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
            : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
        }`}
        title="مشاركة المحتوى"
      >
        {statusMessage ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>{statusMessage}</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>مشاركة</span>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 sm:right-0 sm:left-auto bottom-full mb-2 w-60 rounded-2xl bg-white dark:bg-zinc-900 border border-amber-500/30 shadow-2xl p-2 z-50 text-right animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 mb-1.5">
            مشاركة رابط المحتوى المباشر
          </div>

          <button
            type="button"
            onClick={handleCopyDirectLink}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 transition text-right"
          >
            <span className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>نسخ الرابط المباشر</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 transition text-right mt-0.5"
          >
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{nativeSupported ? 'مشاركة عبر التطبيقات (Web Share)' : 'مشاركة سريعة / نسخ الرابط'}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
