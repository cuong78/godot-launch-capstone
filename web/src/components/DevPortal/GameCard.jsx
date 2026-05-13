import React from 'react';

export default function GameCard({
  title,
  version,
  platform,
  imageSrc,
  statusText,
  statusIcon,
  isActive,
  isDraft,
  isUnderReview,
  primaryStats,
  actions,
  themeColor = 'cyan',
}) {
  let hoverBorderColor = 'hover:border-surface-tint/50';
  let hoverShadow = 'hover:shadow-[0_0_30px_rgba(0,242,255,0.1)]';
  
  if (themeColor === 'purple') {
    hoverBorderColor = 'hover:border-secondary/50';
    hoverShadow = 'hover:shadow-[0_0_30px_rgba(209,188,255,0.1)]';
  } else if (themeColor === 'gray') {
    hoverBorderColor = 'hover:border-white/30';
    hoverShadow = '';
  }

  return (
    <div className={`group bg-surface/40 backdrop-blur-[16px] border border-white/10 rounded-xl overflow-hidden ${hoverBorderColor} ${hoverShadow} transition-all duration-500 flex flex-col ${isDraft ? 'grayscale hover:grayscale-0' : ''}`}>
      <div className="relative h-48 w-full overflow-hidden">
        {imageSrc ? (
          <img alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={imageSrc} />
        ) : (
          <div className="absolute inset-0 bg-[#121418] flex items-center justify-center">
            {statusIcon}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] to-transparent opacity-80"></div>
        
        <div className={`absolute top-4 right-4 bg-[#121418] font-label-sm text-label-sm px-3 py-1 rounded flex items-center space-x-2 ${
          isActive ? 'border border-surface-tint text-surface-tint shadow-[0_0_10px_rgba(0,242,255,0.2)]' : 
          isUnderReview ? 'border border-[#ffb4ab] text-[#ffb4ab] shadow-[0_0_10px_rgba(255,180,171,0.2)]' : 
          'border border-on-surface-variant text-on-surface-variant'
        }`}>
          {isActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-surface-tint animate-pulse"></span>
              <span>{statusText}</span>
            </>
          ) : (
            <>
              {statusIcon}
              <span>{statusText}</span>
            </>
          )}
        </div>

        <div className="absolute bottom-4 left-4">
          <h2 className="font-headline-md text-headline-md text-on-background">{title}</h2>
          <div className="flex space-x-2 mt-2">
            <span className="bg-[#121418] border border-white/10 text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded">{version}</span>
            {platform && (
              <span className="bg-[#121418] border border-white/10 text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded">{platform}</span>
            )}
          </div>
        </div>
      </div>
      <div className="p-6 bg-[#121418]/50 flex-1 flex flex-col justify-between">
        {primaryStats}
        <div className="flex gap-3 mt-auto">
          {actions}
        </div>
      </div>
    </div>
  );
}
