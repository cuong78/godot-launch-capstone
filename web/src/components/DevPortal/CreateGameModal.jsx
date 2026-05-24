import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon, FileArchive } from 'lucide-react';

export default function CreateGameModal({ isOpen, onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceProposed: 0,
    categoryId: ''
  });
  
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [gameFile, setGameFile] = useState(null);
  
  const [status, setStatus] = useState('idle'); // idle, uploading_draft, uploading_thumbnail, uploading_game, success, error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch categories
      fetch('/api/v1/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCategories(data.data);
            if (data.data.length > 0) {
              setFormData(prev => ({ ...prev, categoryId: data.data[0].id }));
            }
          }
        })
        .catch(err => console.error('Failed to fetch categories', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (status !== 'idle' && status !== 'success' && status !== 'error') {
      if (!window.confirm("Upload is in progress. Are you sure you want to cancel?")) return;
    }
    // Reset state
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    setThumbnailFile(null);
    setGameFile(null);
    setFormData({ title: '', description: '', priceProposed: 0, categoryId: categories[0]?.id || '' });
    onClose();
  };

  const uploadFileWithProgress = (url, file) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      });
      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.open("PUT", url, true);
      xhr.setRequestHeader("Content-Type", file.type || 'application/octet-stream');
      xhr.send(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setErrorMsg("Title is required");
      return;
    }

    try {
      setStatus('uploading_draft');
      setErrorMsg('');
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. Create Draft
      const draftRes = await fetch('/api/v1/games', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priceProposed: parseFloat(formData.priceProposed),
          categoryId: formData.categoryId || null
        })
      });
      const draftData = await draftRes.json();
      if (!draftRes.ok || !draftData.success) throw new Error(draftData.message || 'Failed to create game draft');
      
      const gameId = draftData.data.gameId;

      // 2. Upload Thumbnail
      if (thumbnailFile) {
        setStatus('uploading_thumbnail');
        setProgress(0);
        
        // Get URL
        const tUrlRes = await fetch(`/api/v1/games/${gameId}/upload-url?fileType=thumbnail&contentType=${encodeURIComponent(thumbnailFile.type || 'image/jpeg')}`, { headers });
        const tUrlData = await tUrlRes.json();
        if (!tUrlRes.ok) throw new Error("Failed to get thumbnail upload URL");
        
        // PUT S3
        await uploadFileWithProgress(tUrlData.data.uploadUrl, thumbnailFile);
        
        // Confirm
        await fetch(`/api/v1/games/${gameId}/upload-complete?fileType=thumbnail`, { method: 'POST', headers });
      }

      // 3. Upload Game File
      if (gameFile) {
        setStatus('uploading_game');
        setProgress(0);
        
        // Get URL
        const gUrlRes = await fetch(`/api/v1/games/${gameId}/upload-url?fileType=game&contentType=${encodeURIComponent(gameFile.type || 'application/zip')}`, { headers });
        const gUrlData = await gUrlRes.json();
        if (!gUrlRes.ok) throw new Error("Failed to get game upload URL");
        
        // PUT S3
        await uploadFileWithProgress(gUrlData.data.uploadUrl, gameFile);
        
        // Confirm
        await fetch(`/api/v1/games/${gameId}/upload-complete?fileType=game`, { method: 'POST', headers });
      }

      setStatus('success');
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during upload');
    }
  };

  const isUploading = status.startsWith('uploading');

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/30 bg-surface-container-low">
          <h2 className="text-headline-md font-headline-md text-primary-container uppercase tracking-wide flex items-center gap-2">
            <UploadCloud className="w-6 h-6" /> Initialize Project
          </h2>
          <button onClick={handleClose} disabled={isUploading} className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="mb-6 p-4 bg-error-container/20 border border-error/50 rounded-lg flex items-start gap-3 text-error">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-body-md font-body-md">{errorMsg}</p>
            </div>
          )}

          {status === 'success' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-10 h-10 text-primary-container" />
              </div>
              <h3 className="text-headline-md text-on-surface">Upload Complete</h3>
              <p className="text-on-surface-variant">Your game has been initialized and is now processing.</p>
            </div>
          ) : (
            <form id="uploadForm" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider block">Project Title *</label>
                  <input type="text" required disabled={isUploading} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary-container rounded-lg px-4 py-3 text-on-surface outline-none transition-colors" placeholder="e.g. Cyber Bloom" />
                </div>
                
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider block">Category</label>
                  <select disabled={isUploading} value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary-container rounded-lg px-4 py-3 text-on-surface outline-none transition-colors appearance-none">
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    {categories.length === 0 && <option value="">Loading categories...</option>}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider block">Description</label>
                <textarea disabled={isUploading} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary-container rounded-lg px-4 py-3 text-on-surface outline-none transition-colors resize-none" placeholder="Briefly describe your project..."></textarea>
              </div>

              {/* Price */}
              <div className="space-y-2 w-1/2 pr-3">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider block">Proposed Price (USD)</label>
                <input type="number" step="0.01" min="0" disabled={isUploading} value={formData.priceProposed} onChange={e => setFormData({...formData, priceProposed: e.target.value})} className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary-container rounded-lg px-4 py-3 text-on-surface outline-none transition-colors" />
              </div>

              <hr className="border-outline-variant/20" />

              {/* Files */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Thumbnail */}
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider flex items-center gap-2 block mb-2"><ImageIcon className="w-4 h-4"/> Thumbnail Art</label>
                  <div className="relative border-2 border-dashed border-outline-variant/40 hover:border-primary-container/60 rounded-xl p-6 text-center transition-colors bg-surface-container/30">
                    <input type="file" accept="image/jpeg, image/png" disabled={isUploading} onChange={e => setThumbnailFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <ImageIcon className="w-8 h-8 text-on-surface-variant" />
                      <span className="text-body-sm text-on-surface">{thumbnailFile ? thumbnailFile.name : 'Select Image (JPG/PNG)'}</span>
                      {thumbnailFile && <span className="text-label-sm text-primary-container">Ready to upload</span>}
                    </div>
                  </div>
                </div>

                {/* Game Build */}
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider flex items-center gap-2 block mb-2"><FileArchive className="w-4 h-4"/> Game Payload (.zip)</label>
                  <div className="relative border-2 border-dashed border-outline-variant/40 hover:border-secondary/60 rounded-xl p-6 text-center transition-colors bg-surface-container/30">
                    <input type="file" accept=".zip, application/zip" disabled={isUploading} onChange={e => setGameFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <FileArchive className="w-8 h-8 text-on-surface-variant" />
                      <span className="text-body-sm text-on-surface">{gameFile ? gameFile.name : 'Select Build Archive (ZIP)'}</span>
                      {gameFile && <span className="text-label-sm text-secondary">Ready to upload</span>}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer & Progress */}
        <div className="p-6 border-t border-outline-variant/30 bg-surface-container">
          {isUploading ? (
            <div className="space-y-3">
              <div className="flex justify-between text-label-sm uppercase tracking-wider">
                <span className="text-primary-container flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> 
                  {status === 'uploading_draft' && 'Initializing Data...'}
                  {status === 'uploading_thumbnail' && 'Uploading Key Art...'}
                  {status === 'uploading_game' && 'Uploading Game Payload...'}
                </span>
                <span className="text-on-surface font-mono">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary-container transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : status !== 'success' ? (
            <div className="flex justify-end gap-4">
              <button type="button" onClick={handleClose} disabled={isUploading} className="px-6 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-md tracking-wider uppercase">
                Cancel
              </button>
              <button type="submit" form="uploadForm" disabled={isUploading || !formData.title} className="px-8 py-3 rounded-lg bg-primary-container text-on-primary font-headline-sm uppercase tracking-widest hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Initialize & Upload
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
