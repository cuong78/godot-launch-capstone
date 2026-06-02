import React from 'react';
import { CheckCircle2, Upload, Star } from 'lucide-react';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { IMAGE_SEED_MAP } from '../../assets/images';

type CoverPreset = keyof typeof IMAGE_SEED_MAP;

interface UploadPageProps {
  uploadSuccessMessage: string | null;
  newTitle: string;
  setNewTitle: (text: string) => void;
  newPrice: string;
  setNewPrice: (text: string) => void;
  newCategory: 'Scripts & Plugins' | 'Shaders & VFX' | '2D Assets' | '3D Models' | 'Audio & SFX';
  setNewCategory: (cat: any) => void;
  newCoverPreset: CoverPreset;
  setNewCoverPreset: (preset: CoverPreset) => void;
  newTags: string;
  setNewTags: (text: string) => void;
  newDesc: string;
  setNewDesc: (text: string) => void;
  handleCreateProduct: (e: React.FormEvent) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({
  uploadSuccessMessage,
  newTitle,
  setNewTitle,
  newPrice,
  setNewPrice,
  newCategory,
  setNewCategory,
  newCoverPreset,
  setNewCoverPreset,
  newTags,
  setNewTags,
  newDesc,
  setNewDesc,
  handleCreateProduct
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="border-l-4 border-amber-400 pl-3">
        <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Upload New Asset Pack</h1>
        <p className="text-xs text-slate-500">List your open source scripts, game assets, or components</p>
      </div>

      {uploadSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-500 font-display font-medium text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          {uploadSuccessMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Entries panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl space-y-6">
          
          <form onSubmit={handleCreateProduct} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Asset Product Title"
                placeholder="e.g. Vintage Top-Down Zelda Tiles"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <Input
                label="Listing Price (USD)"
                prefix="$"
                placeholder="e.g. 19.99 (or 0 for Free)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-202">
                  Asset Category Classification
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                >
                  <option>Scripts & Plugins</option>
                  <option>Shaders & VFX</option>
                  <option>2D Assets</option>
                  <option>3D Models</option>
                  <option>Audio & SFX</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-804 dark:text-slate-202">
                  Graphic Cover Mockup Preset
                </label>
                <select
                  value={newCoverPreset}
                  onChange={(e) => setNewCoverPreset(e.target.value as CoverPreset)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                >
                  <option value="drift">Neon Racer Theme</option>
                  <option value="interior">Cyberpunk Station Tech</option>
                  <option value="forest">Organic Cozy Woodlands</option>
                  <option value="sky">Dynamic Sky Ocean shader</option>
                  <option value="char">RPG Retro Anthology</option>
                </select>
              </div>
            </div>

            <Input
              label="Search Terms / Metadata tags"
              placeholder="e.g. Godot 4.x, 2D, Cozy, Retro (separated by comma)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
            />

            <TextArea
              label="Product Pitch Description"
              placeholder="State key configurations, assets files list, and usage directions..."
              rows={4}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />

            {/* Simulated Drag and drop file select block */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 text-center hover:border-amber-400 bg-slate-50 dark:bg-slate-950/40 cursor-pointer transition-studio group">
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload size={24} className="text-slate-400 group-hover:text-amber-400 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drag & Drop package source code bundle (.zip) here</span>
                <span className="text-[10px] text-slate-450 uppercase tracking-widest font-mono">Maximum file limits: 50MB</span>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="primary" size="md" type="submit" icon={<Upload size={16} />}>
                Create Package Listing
              </Button>
            </div>

          </form>

        </div>

        {/* Right Column: Live dynamic item preview Card! */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white pl-1 uppercase tracking-wider text-slate-400">
            Live Preview Widget
          </h3>

          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden shadow-md flex flex-col">
              
              <div className="relative h-44 bg-slate-900/10">
                <img referrerPolicy="no-referrer" src={IMAGE_SEED_MAP[newCoverPreset]} alt="Dynamic preview cover" className="w-full h-full object-cover" />
                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-950 dark:bg-slate-900 text-amber-500 border border-slate-800">
                  {newPrice ? `$${parseFloat(newPrice) || '0.00'}` : '$0.00'}
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-sky-500 font-bold uppercase">{newCategory}</span>
                  <h4 className="font-display font-bold text-sm text-slate-800 dark:text-white truncate">
                    {newTitle || 'Asset Title Placeholder'}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-400 line-clamp-3">
                    {newDesc || 'Your pitch description details will populate here in the live layout cards preview.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-500 text-amber-500" /> 5.0 (0 reviews)</span>
                  <span className="font-semibold text-slate-400 font-serif">Creator Room (You)</span>
                </div>
              </div>

            </div>

            <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 leading-relaxed italic">
              All inputs dynamically update the visual rendering layout representation of your product package listing structure in standard sizes.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
