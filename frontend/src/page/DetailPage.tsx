import React from 'react';
import { ChevronRight, Check, Info, Star, Film } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';
import { IMAGE_SEED_MAP } from '../../assets/images';

interface DetailPageProps {
  focusedAsset: Asset;
  setCurrentScreen: (screen: any) => void;
  selectedThumbIndex: number;
  setSelectedThumbIndex: (index: number) => void;
  activeDetailTab: string;
  setActiveDetailTab: (tab: "overview" | "tech" | "documentation") => void;
  handleAddToCart: (asset: Asset) => void;
  handleCheckout: () => void;
  handleBuyNow: (asset: Asset) => void;
  assets: Asset[];
  handleViewAssetDetails: (asset: Asset) => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({
  focusedAsset,
  setCurrentScreen,
  selectedThumbIndex,
  setSelectedThumbIndex,
  activeDetailTab,
  setActiveDetailTab,
  handleAddToCart,
  handleCheckout,
  handleBuyNow,
  assets,
  handleViewAssetDetails
}) => {
  const [showLicenseModal, setShowLicenseModal] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);

  const handlePurchaseAction = (action: () => void) => {
    if (focusedAsset.license === 'Proprietary' && focusedAsset.licenseTerms) {
      setPendingAction(() => action);
      setAcceptedTerms(false);
      setShowLicenseModal(true);
    } else {
      action();
    }
  };

  const mediaList = React.useMemo(() => {
    const list: { type: 'image' | 'video'; url: string }[] = [];
    if (focusedAsset.image) {
      list.push({ type: 'image', url: focusedAsset.image });
    }
    if (focusedAsset.videoUrl) {
      list.push({ type: 'video', url: focusedAsset.videoUrl });
    }
    if (focusedAsset.screenshots && focusedAsset.screenshots.length > 0) {
      focusedAsset.screenshots.forEach(url => {
        list.push({ type: 'image', url });
      });
    }
    
    // Fallback if no screenshots or video uploaded
    if (list.length <= 1) {
      list.push({ type: 'image', url: IMAGE_SEED_MAP.interior });
      list.push({ type: 'image', url: IMAGE_SEED_MAP.forest });
      list.push({ type: 'image', url: IMAGE_SEED_MAP.char });
    }
    return list;
  }, [focusedAsset]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Upper navigation breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="cursor-pointer hover:text-slate-200" onClick={() => setCurrentScreen('explore')}>Explore</span>
        <ChevronRight size={12} />
        <span className="cursor-pointer hover:text-slate-200" onClick={() => setCurrentScreen('marketplace')}>Marketplace</span>
        <ChevronRight size={12} />
        <span className="text-amber-400 truncate max-w-[200px]">{focusedAsset.title}</span>
      </div>

      {/* Title & Tags Header */}
      <div className="space-y-3 pt-2">
        <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-white tracking-tight">
          {focusedAsset.title}
        </h1>
      </div>

      {/* Split gallery box on top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Grid: Screen images deck */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Master picture frame display */}
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
            {mediaList[selectedThumbIndex]?.type === 'video' ? (
              <video
                src={mediaList[selectedThumbIndex].url}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                referrerPolicy="no-referrer"
                src={mediaList[selectedThumbIndex]?.url}
                alt="Active focus frame"
                className="w-full h-full object-cover transition-all"
              />
            )}
            <div className="absolute inset-0 bg-neutral-900/10 pointer-events-none"></div>
          </div>

          {/* Mini index thumbnails */}
          <div className="flex gap-3 max-w-full overflow-x-auto py-1">
            {mediaList.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedThumbIndex(index)}
                className={`relative aspect-video w-24 sm:w-28 rounded-lg overflow-hidden border-2 cursor-pointer transition-studio shrink-0 ${selectedThumbIndex === index ? 'border-amber-400 scale-[1.02]' : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'}`}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover opacity-70"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10">
                      <div className="w-7 h-7 rounded-full bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white border border-white/10 shadow-lg">
                        <Film className="text-amber-400" size={12} />
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 rounded text-[8px] bg-slate-900 text-white font-mono">VIDEO</span>
                  </div>
                ) : (
                  <img referrerPolicy="no-referrer" src={item.url} alt="gallery thumbnail indicator" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>

          {/* Description and technical tags selectors inside tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
            
            {/* Underlay toggles */}
            <div className="flex border-b border-slate-100 dark:border-slate-850/80 pb-1.5 gap-4">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-studio ${activeDetailTab === 'overview' ? 'border-amber-400 text-slate-800 dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                Full Overview & Features
              </button>
              <button
                onClick={() => setActiveDetailTab('tech')}
                className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-studio ${activeDetailTab === 'tech' ? 'border-amber-400 text-slate-800 dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                Technical Specs
              </button>
              {focusedAsset.documentation && (
                <button
                  onClick={() => setActiveDetailTab('documentation')}
                  className={`pb-2.5 font-display text-sm font-bold border-b-2 transition-studio ${activeDetailTab === 'documentation' ? 'border-amber-400 text-slate-800 dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  Documentation
                </button>
              )}
            </div>

            {activeDetailTab === 'documentation' ? (
              <div className="space-y-4 animate-fade-in">
                <div className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850">
                  {focusedAsset.documentation}
                </div>
              </div>
            ) : activeDetailTab === 'overview' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {focusedAsset.description}
                </p>
                
                {focusedAsset.details && (
                  <div className="space-y-3 pt-3">
                    <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400">Included Features Detail:</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-350">
                      {focusedAsset.details.featuresList.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
                            <Check size={10} />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {focusedAsset.details ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono">TILESETS COUNT</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{focusedAsset.details.tilesCount}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono">SPRITES PREFABS</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{focusedAsset.details.spritesCount}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono">OBJECT PROPERTIES</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{focusedAsset.details.propsCount}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Technical details not mapped for this asset pack format.</p>
                )}

                <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-500 uppercase font-display flex items-center gap-1">
                    <Info size={11} /> Compatibility Notice
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This asset contains scenes utilizing native GDScript structures under free commercial authorization guidelines, certified and compatible with Godot 4.0 up to 4.3 stable series releases.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Purchase checklist sidebar column on right */}
        <div className="space-y-6">
          
          {/* Product Purchase configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs">
            
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-bold border border-slate-200 dark:border-slate-800">
                Single License Pack
              </span>
              <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white pt-1">
                {focusedAsset.price === 0 ? 'Tải miễn phí' : `${focusedAsset.price.toLocaleString('vi-VN')} đ`}
              </h2>
              <p className="text-xs text-slate-400">Royalty-Free Indie Standard Certification</p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                className="w-full"
                size="md"
                onClick={() => handlePurchaseAction(() => handleAddToCart(focusedAsset))}
              >
                Add To Creators Cart
              </Button>
              <button
                onClick={() => handlePurchaseAction(() => handleBuyNow(focusedAsset))}
                className="w-full py-2.5 px-4 bg-transparent border border-sky-400 dark:border-sky-800 hover:bg-sky-500/20 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-sky-600 dark:text-white font-display text-center transition-studio cursor-pointer"
              >
                Buy Now via Bank Transfer
              </button>
            </div>

            <hr className="border-slate-100 dark:border-slate-850/60" />

            {/* Metadata and Author profile */}
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2.5">
                <img referrerPolicy="no-referrer" src={focusedAsset.authorAvatar} alt={focusedAsset.author} className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800" />
                <div>
                  <span className="block font-semibold text-slate-800 dark:text-slate-200">{focusedAsset.author}</span>
                  <span className="text-[10px] text-slate-400">Verified Marketplace Partner</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span>VERSION:</span>
                  <span className="text-slate-800 dark:text-white font-bold">{focusedAsset.version || '1.0.0'}</span>
                </div>
                {focusedAsset.license && (
                  <div className="flex justify-between">
                    <span>LICENSE:</span>
                    <span className="text-slate-800 dark:text-white font-bold">{focusedAsset.license}</span>
                  </div>
                )}
                {focusedAsset.supportedPlatforms && (
                  <div className="flex justify-between">
                    <span>PLATFORMS:</span>
                    <span className="text-slate-800 dark:text-white font-bold">{focusedAsset.supportedPlatforms}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>LAST UPDATED:</span>
                  <span className="text-slate-800 dark:text-white font-bold">{focusedAsset.lastUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span>FILE SIZE:</span>
                  <span className="text-slate-800 dark:text-white font-bold">~42MB (ZIP ARCHIVE)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags list widget */}
          {focusedAsset.tagList && focusedAsset.tagList.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Keywords & Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {focusedAsset.tagList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-sky-500/10 dark:bg-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/10 dark:border-sky-500/20 shadow-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Related Assets suggestions from same category */}
          <div className="space-y-3">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 shadow-sm">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Other Assets You Might Need</h3>
            </div>
            <div className="space-y-3">
              {assets
                .filter(item => item.id !== focusedAsset.id)
                .slice(0, 2)
                .map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleViewAssetDetails(item)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/20 cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img referrerPolicy="no-referrer" src={item.image} alt={item.title} className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-800" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-white truncate">{item.title}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{item.category}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-500">{item.price === 0 ? 'Miễn phí' : `${item.price.toLocaleString('vi-VN')} đ`}</span>
                  </div>
                ))}
            </div>
          </div>

        </div>

      </div>

      {/* Proprietary License Commitment Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-in">
            <div className="space-y-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-500 uppercase font-bold border border-rose-500/20">
                Proprietary License Commitment Required
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Cam kết Điều khoản Bản quyền của Người bán
              </h3>
              <p className="text-xs text-slate-500">
                Sản phẩm này được phát hành dưới bản quyền thương mại riêng của người bán. Bạn cần đồng ý với các điều khoản dưới đây trước khi tải về hoặc mua hàng.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans whitespace-pre-wrap">
              {focusedAsset.licenseTerms || "Không có điều khoản cụ thể nào được cung cấp."}
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 focus:ring-2"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-normal">
                Tôi đồng ý và cam kết tuân thủ đầy đủ các điều khoản bản quyền sở hữu trí tuệ của người bán ở trên.
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowLicenseModal(false);
                  setPendingAction(null);
                }}
                className="px-4 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition-studio"
              >
                Từ chối
              </button>
              <button
                disabled={!acceptedTerms}
                onClick={() => {
                  if (pendingAction) {
                    pendingAction();
                  }
                  setShowLicenseModal(false);
                  setPendingAction(null);
                }}
                className="px-4 py-2 bg-sky-550 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition-studio"
              >
                Đồng ý & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
