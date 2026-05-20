import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Lightbulb, 
  PlayCircle,
  AlertTriangle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function DevGuides() {
  const { t } = useLanguage();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGuides = async () => {
      setLoading(true);
      setError('');
      try {
        // Public API for Dev Portal to get active guides
        const response = await fetch('/api/guides', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch publishing guides');
        }
        setGuides(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, []);

  return (
    <div className="flex-1 w-full lg:ml-64 bg-background/50 relative px-6 md:px-10 pb-8 md:pb-12 pt-28 md:pt-32 min-h-screen overflow-y-auto">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed-dim/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col gap-3 border-b border-outline-variant/20 pb-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary-fixed-dim/10 p-3.5 rounded-xl border border-primary-fixed-dim/30 shadow-[0_0_20px_rgba(0,219,231,0.15)]">
               <BookOpen className="w-8 h-8 text-primary-fixed-dim" />
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
                Publishing Directives
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-2xl mt-1">
                A comprehensive step-by-step manual to prepare, upload, and publish your game to the IndieCore network.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
            <Loader2 className="w-10 h-10 animate-spin text-primary-fixed-dim" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Loading Directives...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-error-container/20 border border-error/40 text-error rounded-xl flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="font-body-md text-body-md">{error}</p>
          </div>
        ) : guides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant bg-surface-container-low/40 border border-outline-variant/20 rounded-2xl">
            <BookOpen className="w-12 h-12 text-on-surface-variant/40" />
            <p className="font-body-lg text-on-surface-variant/80">There are no publishing directives available at the moment.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-primary-fixed-dim via-secondary/50 to-transparent hidden md:block"></div>
            
            <div className="flex flex-col gap-12">
              {guides.map((guide, index) => (
                <div key={guide.id} className="relative flex flex-col md:flex-row gap-6 md:gap-10 group">
                  
                  {/* Step Indicator (Timeline marker) */}
                  <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-low border border-outline-variant/40 md:bg-background md:border-primary-fixed-dim/30 font-display-lg text-2xl font-black text-primary-fixed-dim shadow-[0_0_15px_rgba(0,219,231,0.1)] group-hover:shadow-[0_0_25px_rgba(0,219,231,0.3)] group-hover:border-primary-fixed-dim transition-all z-10 relative">
                    {guide.stepOrder}
                    {/* Connecting dot for timeline */}
                    <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-fixed-dim hidden md:block group-hover:scale-150 transition-transform"></div>
                  </div>

                  {/* Content Card */}
                  <div className="flex-grow bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 group-hover:border-outline-variant/50 rounded-2xl p-6 md:p-8 transition-all relative overflow-hidden">
                    {/* Decorative gradient inside card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed-dim/5 rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <h3 className="font-headline-md text-xl md:text-2xl text-on-surface mb-4">
                      {guide.title}
                    </h3>
                    
                    <div className="font-body-lg text-on-surface-variant leading-relaxed whitespace-pre-wrap mb-6">
                      {guide.description}
                    </div>

                    {(guide.tip || guide.videoUrl) && (
                      <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-outline-variant/10">
                        {guide.tip && (
                          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-5 flex gap-4">
                            <Lightbulb className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-label-md text-label-md text-secondary uppercase tracking-widest mb-1.5">Pro Tip</h4>
                              <p className="font-body-md text-on-surface-variant text-sm whitespace-pre-wrap">{guide.tip}</p>
                            </div>
                          </div>
                        )}

                        {guide.videoUrl && (
                          <a 
                            href={guide.videoUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 w-fit bg-tertiary/10 border border-tertiary/30 hover:bg-tertiary/20 hover:border-tertiary/50 text-tertiary px-5 py-3 rounded-xl transition-all font-label-md text-label-md uppercase tracking-wider"
                          >
                            <PlayCircle className="w-5 h-5" />
                            Watch Video Tutorial
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* End of timeline indicator */}
            <div className="flex justify-center mt-12 md:pl-16 relative z-10 hidden md:flex">
              <div className="w-4 h-4 rounded-full border-2 border-primary-fixed-dim bg-background"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
