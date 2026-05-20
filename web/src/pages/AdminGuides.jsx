import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  AlertTriangle, 
  Filter, 
  BookOpen, 
  Edit, 
  Trash2,
  ShieldAlert, 
  CheckCircle,
  Loader2,
  X,
  PlaySquare,
  AlignLeft
} from 'lucide-react';

export default function AdminGuides() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, inactive
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    stepOrder: 1,
    title: '',
    description: '',
    tip: '',
    videoUrl: '',
    isActive: true
  });

  const fetchGuides = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/guides/all', {
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (!token || !userJson) {
      setError('Unauthorized access. Redirecting...');
      setTimeout(() => window.location.href = '/login', 2000);
      return;
    }
    try {
      const userObj = JSON.parse(userJson);
      if (userObj.roleName.toLowerCase() !== 'admin') {
        setError('Forbidden access. Admin privileges required.');
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }
    } catch (e) {
      setError('Invalid session. Redirecting...');
      setTimeout(() => window.location.href = '/login', 2000);
      return;
    }
    
    fetchGuides();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const handleOpenCreateModal = () => {
    setFormData({
      stepOrder: guides.length > 0 ? Math.max(...guides.map(g => g.stepOrder)) + 1 : 1,
      title: '',
      description: '',
      tip: '',
      videoUrl: '',
      isActive: true
    });
    setIsEditing(false);
    setSelectedGuideId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (guide) => {
    setFormData({
      stepOrder: guide.stepOrder,
      title: guide.title,
      description: guide.description,
      tip: guide.tip || '',
      videoUrl: guide.videoUrl || '',
      isActive: guide.isActive
    });
    setIsEditing(true);
    setSelectedGuideId(guide.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const url = isEditing ? `/api/guides/${selectedGuideId}` : '/api/guides';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save directive');
      }
      setSuccess(`Directive step ${formData.stepOrder} ${isEditing ? 'updated' : 'provisioned'} successfully.`);
      setShowModal(false);
      fetchGuides();
    } catch (err) {
      setError(err.message);
      // scroll to top to see error if needed, but error is shown on main screen. 
      // Actually, we should show modal error if we want it inside the modal, 
      // but for simplicity, we close modal and show error on main screen.
      setShowModal(false);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteGuide = async (id, title) => {
    if (!window.confirm(`Are you sure you want to completely delete directive "${title}"? This action cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/guides/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (!response.ok) {
        // DELETE might not return JSON if it's 204 No Content, check status first
        if (response.status !== 204) {
           const data = await response.json();
           throw new Error(data.message || 'Failed to delete directive');
        }
      }
      setSuccess(`Directive "${title}" deleted successfully.`);
      fetchGuides();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleToggleActive = async (guide) => {
    try {
      const response = await fetch(`/api/guides/${guide.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...guide,
          isActive: !guide.isActive
        })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to toggle status');
      }
      fetchGuides();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Filtered list
  const filteredGuides = guides.filter(guide => {
    if (activeFilter === 'active' && !guide.isActive) return false;
    if (activeFilter === 'inactive' && guide.isActive) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return guide.title.toLowerCase().includes(q) || 
             guide.description.toLowerCase().includes(q) ||
             guide.stepOrder.toString().includes(q);
    }
    return true;
  });

  return (
    <main className="flex-grow pt-28 md:pt-32 pb-20 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col gap-8 min-h-screen">
      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-error-container/20 border border-error/40 text-error rounded-xl flex items-center gap-3 animate-fade-in shadow-[0_0_15px_rgba(255,180,171,0.1)]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="font-body-md text-body-md uppercase tracking-wider">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-primary-fixed-dim/10 border border-primary-fixed-dim/40 text-primary-fixed-dim rounded-xl flex items-center gap-3 animate-fade-in shadow-[0_0_15px_rgba(0,219,231,0.1)]">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-body-md text-body-md uppercase tracking-wider">{success}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/20 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary-fixed-dim/10 p-3 rounded-lg border border-primary-fixed-dim/30">
             <BookOpen className="w-8 h-8 text-primary-fixed-dim" />
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface drop-shadow-md">Publishing Directives</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_rgba(0,219,231,0.8)]"></span>
              {guides.length} DIRECTIVES INDEXED
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleOpenCreateModal}
            className="bg-[#121418] text-primary-fixed-dim border border-primary-fixed-dim/50 rounded px-4 py-2 font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-fixed-dim/10 hover:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all cursor-pointer"
          >
            <Plus className="w-[18px] h-[18px]" />
            CREATE DIRECTIVE
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container/30 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`font-label-sm text-label-sm px-4 py-2 rounded transition-all cursor-pointer ${
              activeFilter === 'all' 
                ? 'bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-primary-fixed-dim hover:text-primary-fixed-dim'
            }`}
          >
            ALL DIRECTIVES
          </button>
          <button 
            onClick={() => setActiveFilter('active')}
            className={`font-label-sm text-label-sm px-4 py-2 rounded transition-all cursor-pointer ${
              activeFilter === 'active' 
                ? 'bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-primary-fixed-dim hover:text-primary-fixed-dim'
            }`}
          >
            ACTIVE ONLY
          </button>
          <button 
            onClick={() => setActiveFilter('inactive')}
            className={`font-label-sm text-label-sm px-4 py-2 rounded transition-all cursor-pointer ${
              activeFilter === 'inactive' 
                ? 'bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-primary-fixed-dim hover:text-primary-fixed-dim'
            }`}
          >
            INACTIVE ONLY
          </button>
        </div>

        <div className="relative w-full md:w-auto flex-shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-[18px] h-[18px]" />
          <input 
            className="bg-[#0A0C10] border border-outline-variant/50 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded py-2 pl-10 pr-4 font-label-sm text-label-sm w-full md:w-80 transition-all placeholder:text-on-surface-variant/50" 
            placeholder="Search directives..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main List */}
      <div className="bg-surface-container/40 backdrop-blur-[16px] rounded-xl border border-white/5 overflow-hidden flex flex-col relative min-h-[400px]">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary-fixed-dim/50"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary-fixed-dim/50"></div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant h-full m-auto">
            <Loader2 className="w-10 h-10 animate-spin text-primary-fixed-dim" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Retrieving Directives...</span>
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-on-surface-variant h-full m-auto">
            <AlertTriangle className="w-8 h-8 text-on-surface-variant/50" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider">No directives found</span>
          </div>
        ) : (
          <div className="flex flex-col p-4 gap-4">
             {filteredGuides.map((guide) => (
               <div key={guide.id} className={`p-5 rounded-xl border transition-all ${guide.isActive ? 'bg-[#121418]/80 border-primary-fixed-dim/20 hover:border-primary-fixed-dim/50' : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50 opacity-70'}`}>
                  <div className="flex flex-col lg:flex-row gap-6 justify-between">
                     <div className="flex gap-4">
                        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-surface-container border border-outline-variant/30 font-display-md text-xl font-bold text-primary-fixed-dim">
                           {guide.stepOrder}
                        </div>
                        <div className="flex flex-col gap-2">
                           <h3 className="font-headline-sm text-on-surface">{guide.title}</h3>
                           <p className="font-body-md text-on-surface-variant line-clamp-2 max-w-3xl">{guide.description}</p>
                           
                           {(guide.tip || guide.videoUrl) && (
                             <div className="flex gap-4 mt-2">
                               {guide.tip && (
                                 <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-secondary px-2 py-1 bg-secondary/10 border border-secondary/20 rounded">
                                   <AlignLeft className="w-3.5 h-3.5" /> Has Tip
                                 </span>
                               )}
                               {guide.videoUrl && (
                                 <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-tertiary px-2 py-1 bg-tertiary/10 border border-tertiary/20 rounded">
                                   <PlaySquare className="w-3.5 h-3.5" /> Has Video
                                 </span>
                               )}
                             </div>
                           )}
                        </div>
                     </div>
                     <div className="flex items-center gap-3 shrink-0">
                        <button 
                           onClick={() => handleToggleActive(guide)}
                           className={`px-3 py-1.5 rounded font-label-sm text-xs border transition-all cursor-pointer ${guide.isActive ? 'bg-primary-fixed-dim/10 text-primary-fixed-dim border-primary-fixed-dim/40 hover:bg-primary-fixed-dim hover:text-[#0A0C10]' : 'bg-surface-container text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-high'}`}
                        >
                           {guide.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(guide)}
                          className="p-2 text-on-surface-variant hover:text-primary-fixed-dim bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 rounded transition-all cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGuide(guide.id, guide.title)}
                          className="p-2 text-on-surface-variant hover:text-error bg-surface-container hover:bg-error/10 border border-outline-variant/20 hover:border-error/30 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Render Modal into a Portal attached to document.body */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in overflow-y-auto">
          <div className="bg-[#0c0e12] border border-primary-fixed-dim/30 w-full max-w-2xl rounded-xl overflow-hidden relative shadow-[0_0_30px_rgba(0,219,231,0.15)] flex flex-col my-8">
            <div className="h-1 bg-gradient-to-r from-primary-fixed-dim via-secondary to-primary-fixed-dim"></div>
            
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-primary-fixed-dim uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {isEditing ? 'Edit Directive' : 'Provision Directive Step'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-1">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Step Order</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all text-xl font-bold text-center"
                    value={formData.stepOrder}
                    onChange={(e) => setFormData({...formData, stepOrder: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Title</label>
                  <input 
                    required
                    type="text" 
                    maxLength={200}
                    className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                    placeholder="e.g. Upload Your Build"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Main Description</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all resize-none"
                  placeholder="Explain exactly what the developer needs to do..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest flex items-center justify-between">
                  <span>Pro Tip (Optional)</span>
                  <span className="text-[10px] text-on-surface-variant/50">Supports Markdown</span>
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-all resize-none"
                  placeholder="Add a helpful tip, warning, or best practice..."
                  value={formData.tip}
                  onChange={(e) => setFormData({...formData, tip: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Video URL (Optional)</label>
                <input 
                  type="url" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-tertiary focus:outline-none focus:ring-1 focus:ring-tertiary transition-all"
                  placeholder="e.g. https://youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox"
                  id="isActiveToggle"
                  className="w-4 h-4 accent-primary-fixed-dim cursor-pointer"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                />
                <label htmlFor="isActiveToggle" className="text-label-sm font-label-sm text-on-surface cursor-pointer uppercase tracking-wider">
                  Publish this step to Developer Portal immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-label-sm font-label-sm text-on-surface-variant border border-outline-variant/50 rounded hover:border-on-surface hover:text-on-surface transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 text-label-sm font-label-sm bg-primary-fixed-dim text-[#0c0e12] rounded hover:shadow-[0_0_15px_rgba(0,219,231,0.4)] transition-all font-bold cursor-pointer"
                >
                  {isEditing ? 'SAVE CHANGES' : 'PROVISION'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
