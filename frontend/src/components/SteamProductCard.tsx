import React, { useState, useRef, useEffect } from 'react';
import { Star, ShoppingCart, Volume2, VolumeX, Sparkles, Check, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface SteamProductCardItem {
  id: string;
  title: string;
  price?: number;
  rating?: number;
  reviewedCount?: number;
  author?: string;
  creatorName?: string;
  category?: string;
  categoryName?: string;
  description?: string;
  image?: string;
  thumbnailUrl?: string;
  screenshots?: string[];
  videoUrl?: string;
  itemType?: string;
  isBestseller?: boolean;
  tagList?: string[];
}

export interface SteamProductCardProps {
  item: SteamProductCardItem;
  onViewDetails?: (item: any) => void;
  onAddToCart?: (item: any) => void;
  isOwner?: boolean;
  isOwned?: boolean;
  numberLocale?: string;
  className?: string;
}

export const SteamProductCard: React.FC<SteamProductCardProps> = ({
  item,
  onViewDetails,
  onAddToCart,
  isOwner = false,
  isOwned = false,
  numberLocale = 'vi-VN',
  className = '',
}) => {
  const { t, i18n } = useTranslation(['marketplace', 'home']);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isHoverIntent, setIsHoverIntent] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  // Screenshots carousel state fallback
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0);

  const primaryImage =
    item.thumbnailUrl ||
    item.image ||
    (item.screenshots && item.screenshots.length > 0 ? item.screenshots[0] : '');

  const videoUrl = item.videoUrl;
  const screenshots = item.screenshots || [];
  const hasScreenshots = screenshots.length > 0;
  const canPlayVideo = Boolean(videoUrl && !hasVideoError);

  // Hover Intent Timer (avoid triggering heavy video loads on fast mouse-over)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsHoverIntent(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsHoverIntent(false);
    setIsVideoReady(false);
    setVideoProgress(0);

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (screenshotTimerRef.current) clearInterval(screenshotTimerRef.current);

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch (e) {
        // Safe catch for media element interruptions
      }
    }
    setActiveScreenshotIdx(0);
  };

  // Screenshot slideshow timer when video is not available or hasn't loaded
  useEffect(() => {
    if (isHoverIntent && !canPlayVideo && hasScreenshots && screenshots.length > 1) {
      screenshotTimerRef.current = setInterval(() => {
        setActiveScreenshotIdx((prev) => (prev + 1) % screenshots.length);
      }, 1600);
    } else {
      if (screenshotTimerRef.current) clearInterval(screenshotTimerRef.current);
    }

    return () => {
      if (screenshotTimerRef.current) clearInterval(screenshotTimerRef.current);
    };
  }, [isHoverIntent, canPlayVideo, hasScreenshots, screenshots.length]);

  // Video playback handle when hover intent becomes active
  useEffect(() => {
    if (isHoverIntent && canPlayVideo && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoReady(true);
          })
          .catch((err) => {
            console.warn('[SteamProductCard] Autoplay prevented or failed:', err);
            setHasVideoError(true);
          });
      }
    } else if (!isHoverIntent && videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {
        // ignore
      }
    }
  }, [isHoverIntent, canPlayVideo]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setVideoProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const authorName = item.author || item.creatorName || t('home:sectionRow.creatorFallback', 'Developer');
  const badgeCategory = item.category || item.categoryName || (item.itemType === 'GAME' ? 'Game' : 'Asset');
  const isFree = item.price === 0 || item.price === undefined;

  return (
    <article
      onClick={() => onViewDetails && onViewDetails(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group/card cursor-pointer flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-500/60 hover:shadow-[0_16px_36px_rgba(14,165,233,0.18)] dark:border-night-700/60 dark:bg-[#0c1017] dark:hover:border-sky-400/50 dark:hover:shadow-[0_20px_44px_rgba(0,0,0,0.65),0_0_20px_rgba(56,189,248,0.12)] ${className}`}
    >
      {/* ── Media Thumbnail / Video Container ───────────────────────────────── */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 border-b border-slate-150 dark:border-night-700/40 select-none">
        {/* Base Static Image */}
        <img
          referrerPolicy="no-referrer"
          src={
            isHoverIntent && !canPlayVideo && hasScreenshots
              ? screenshots[activeScreenshotIdx]
              : primaryImage
          }
          alt={item.title}
          className={`h-full w-full object-cover transition-transform duration-500 ${
            isHovered && !canPlayVideo ? 'scale-105' : 'scale-100'
          }`}
        />

        {/* Live Hover Video Player */}
        {canPlayVideo && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted={isMuted}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onError={() => setHasVideoError(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              isHoverIntent && isVideoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
        )}

        {/* Video Loading Indicator */}
        {isHoverIntent && canPlayVideo && !isVideoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-sky-400 border border-sky-500/30">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span>Previewing...</span>
            </div>
          </div>
        )}

        {/* Top-Left Category Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          <span className="rounded-md bg-slate-950/70 dark:bg-black/60 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-slate-200 border border-white/10 backdrop-blur-md shadow-sm">
            {badgeCategory}
          </span>
          {item.isBestseller && (
            <span className="flex items-center gap-1 rounded-md bg-amber-500/90 text-slate-950 px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase shadow-sm">
              <Sparkles size={10} className="fill-current" />
              HOT
            </span>
          )}
        </div>

        {/* Top-Right Steam Status & Quick Action Buttons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {isOwner ? (
            <span className="rounded-md bg-sky-500/90 dark:bg-sky-500 text-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md shadow-sm border border-sky-300/30">
              {t('card.owner', 'OWNER')}
            </span>
          ) : isOwned ? (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/90 text-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md shadow-sm border border-emerald-300/30">
              <Check size={11} className="stroke-[3]" />
              {t('card.owned', 'OWNED')}
            </span>
          ) : (
            onAddToCart && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(item);
                }}
                className="p-1.5 rounded-md bg-slate-900/85 hover:bg-sky-500 text-white transition-all duration-200 shadow-md cursor-pointer border border-white/15 hover:scale-105 active:scale-95"
                title={t('card.addToCart', 'Add to Cart')}
              >
                <ShoppingCart size={13} />
              </button>
            )
          )}

          {/* Sound Toggle (Only when video playing) */}
          {canPlayVideo && isHoverIntent && isVideoReady && (
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-white/15"
              title={isMuted ? 'Unmute preview sound' : 'Mute preview sound'}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} className="text-sky-400" />}
            </button>
          )}
        </div>

        {/* Bottom Live Preview Bar / Screenshot Indicator */}
        {isHoverIntent && (
          <div className="absolute bottom-0 left-0 right-0 z-10">
            {canPlayVideo && isVideoReady ? (
              // Video Progress Line
              <div className="h-1 w-full bg-black/40">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-100"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
            ) : hasScreenshots && screenshots.length > 1 ? (
              // Screenshot Dots
              <div className="flex justify-center gap-1 pb-1.5 bg-gradient-to-t from-black/70 to-transparent pt-4">
                {screenshots.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === activeScreenshotIdx
                        ? 'w-3 bg-sky-400'
                        : 'w-1 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Card Content Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4 text-left justify-between bg-white dark:bg-[#0c1017]">
        <div className="space-y-1.5">
          {/* Title */}
          <h5
            className="font-display text-sm font-bold leading-snug text-slate-900 dark:text-zinc-100 group-hover/card:text-sky-500 dark:group-hover/card:text-sky-400 transition-colors duration-200 line-clamp-1"
            title={item.title}
          >
            {item.title}
          </h5>

          {/* Author */}
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            by <span className="text-slate-700 dark:text-slate-300 group-hover/card:underline">{authorName}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="flex items-center gap-0.5 text-amber-500 font-bold text-[11px]">
              <Star size={11} className="fill-current text-amber-500" />
              <span>{(item.rating || 5.0).toFixed(1)}</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
              ({item.reviewedCount || 0} {i18n.language === 'vi' ? 'đánh giá' : 'reviews'})
            </span>
          </div>
        </div>

        {/* ── Footer: Steam Style Price Tag ──────────────────────────────────── */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-night-700/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isFree ? (
              <span className="rounded bg-emerald-500/15 dark:bg-emerald-500/20 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {t('common.free', 'FREE')}
              </span>
            ) : (
              <span className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-display">
                ₫{Number(item.price).toLocaleString(numberLocale)}
              </span>
            )}
          </div>

          {/* Hover indicator link */}
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center gap-0.5">
            <Eye size={10} />
            <span>Detail</span>
          </span>
        </div>
      </div>
    </article>
  );
};
