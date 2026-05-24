import React, { useState, useEffect } from 'react';
import { ListFilter, CheckCircle2, Ban, Rocket, Loader2, AlertTriangle } from 'lucide-react';

function QueueSection({ games, activeGameId, onSelect, onApprove, onReject, loading }) {
  return (
    <section className="lg:col-span-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">PENDING_APPROVAL</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant tracking-widest">
            QUEUE: {games.length} ITEMS // URGENCY: HIGH
          </p>
        </div>
        <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-3 py-1 rounded border border-outline-variant/30 w-fit">
          <ListFilter className="w-4 h-4" />
          <span>FILTER: PENDING</span>
        </div>
      </div>

      <div className="bg-surface-container-low/60 glass-panel rounded-xl border border-outline-variant/20 overflow-x-auto min-h-[300px] relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-background/50 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-fixed-dim animate-spin" />
          </div>
        )}
        {!loading && games.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <CheckCircle2 className="w-12 h-12 text-surface-variant opacity-50" />
            <p className="font-label-md text-label-md tracking-wider">QUEUE IS EMPTY</p>
          </div>
        )}
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-outline-variant/30 bg-surface-container/50">
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">GAME_TITLE</th>
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">DEV_ID</th>
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">CATEGORY</th>
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {games.map((game) => {
              const isActive = game.id === activeGameId;
              return (
                <tr 
                  key={game.id}
                  onClick={() => onSelect(game.id)}
                  className={`cursor-pointer transition-colors group ${
                    isActive 
                      ? 'bg-primary-fixed-dim/5 neon-border-cyan' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        isActive 
                          ? 'bg-primary-fixed-dim shadow-[0_0_8px_rgba(0,219,231,0.8)]' 
                          : 'bg-outline-variant'
                      }`}></div>
                      <span className={`font-body-md text-body-md ${
                        isActive ? 'font-medium text-primary-fixed' : 'text-on-surface'
                      }`}>
                        {game.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant">{game.creatorName}</td>
                  <td className="py-4 px-6">
                    <span className="font-label-sm text-label-sm bg-surface-bright/50 px-2 py-1 rounded text-on-surface border border-outline-variant/20">
                      {game.categoryName || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right flex justify-end gap-2">
                    {isActive ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onApprove(game.id); }} className="font-label-sm text-label-sm bg-primary-container text-background px-3 py-1.5 rounded scanline hover:bg-primary transition-colors flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFY
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onReject(game.id); }} className="font-label-sm text-label-sm bg-transparent border border-error text-error px-3 py-1.5 rounded hover:bg-error/10 transition-colors flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onApprove(game.id); }} className="font-label-sm text-label-sm bg-surface-bright text-on-surface px-3 py-1.5 rounded hover:bg-primary-container hover:text-background transition-colors">
                          VERIFY
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onReject(game.id); }} className="font-label-sm text-label-sm bg-transparent border border-outline-variant text-on-surface-variant px-3 py-1.5 rounded hover:border-error hover:text-error transition-colors">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailsPanel({ game, onApprove, onReject }) {
  if (!game) {
    return (
      <aside className="lg:col-span-4">
        <div className="bg-[#121418] rounded-xl border border-outline-variant/30 flex flex-col items-center justify-center h-full min-h-[500px] text-on-surface-variant">
          <p className="font-label-md text-label-md uppercase tracking-wider">No Selection</p>
        </div>
      </aside>
    );
  }

  const fallbackArt = 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop';
  
  return (
    <aside className="lg:col-span-4">
      <div className="bg-[#121418] rounded-xl border border-outline-variant/30 flex flex-col h-full sticky top-28">
        {/* Header / Cover */}
        <div className="h-48 relative rounded-t-xl overflow-hidden border-b border-outline-variant/30">
          <div className="absolute inset-0 bg-gradient-to-t from-[#121418] to-transparent z-10"></div>
          <img 
            alt="Game Cover Art" 
            className="w-full h-full object-cover" 
            src={game.thumbnailUrl || fallbackArt}
          />
          <div className="absolute bottom-4 left-4 z-20 flex items-end gap-4">
            <div className="w-16 h-16 rounded bg-surface-container border border-primary-fixed-dim/50 shadow-[0_0_15px_rgba(0,219,231,0.3)] flex items-center justify-center overflow-hidden shrink-0">
              <img 
                alt="Game Icon" 
                className="w-full h-full object-cover" 
                src={game.thumbnailUrl || fallbackArt}
              />
            </div>
            <div className="mb-1">
              <h2 className="font-headline-md text-headline-md text-on-surface leading-none mb-1 line-clamp-1">{game.title}</h2>
              <p className="font-label-sm text-label-sm text-primary-fixed-dim line-clamp-1">ID: {game.id}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 flex-grow">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20 col-span-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">DEVELOPER</span>
              <span className="font-label-sm text-label-sm text-on-surface">{game.creatorName}</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">PROPOSED_PRICE</span>
              <span className="font-label-sm text-label-sm text-on-surface">${game.priceProposed || 0}</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">COMMUNITY</span>
              <span className="font-label-sm text-label-sm text-secondary-fixed-dim">{game.communityAvailable ? 'ENABLED' : 'DISABLED'}</span>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase border-b border-outline-variant/20 pb-1">Description / Notes</h3>
            <p className="font-body-md text-body-md text-on-surface/80 text-sm whitespace-pre-wrap">
              {game.description || 'No description provided by the developer.'}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-auto pt-6 flex flex-col gap-3">
            <button className="w-full font-label-sm text-label-sm bg-transparent border border-secondary-container text-secondary-fixed-dim py-3 rounded hover:bg-secondary-container/10 transition-colors flex justify-center items-center gap-2 neon-border-purple disabled:opacity-50" disabled>
              <Rocket className="w-4.5 h-4.5" />
              DOWNLOAD BUILD
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onApprove(game.id)} className="font-label-sm text-label-sm bg-primary-container text-background py-2 rounded scanline hover:bg-primary transition-colors flex justify-center items-center gap-1 cursor-pointer">
                VERIFY_BUILD
              </button>
              <button onClick={() => onReject(game.id)} className="font-label-sm text-label-sm bg-error-container/20 border border-error/50 text-error py-2 rounded hover:bg-error-container/40 transition-colors flex justify-center items-center gap-1 cursor-pointer">
                REJECT
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function AdminModeration() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGameId, setActiveGameId] = useState(null);

  const fetchPendingGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/games?status=pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setGames(data.data);
        if (data.data.length > 0 && !activeGameId) {
          setActiveGameId(data.data[0].id);
        } else if (data.data.length === 0) {
          setActiveGameId(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch pending games', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingGames();
  }, []);

  const handleApprove = async (gameId) => {
    if (!window.confirm("Approve this build and publish to the store? An email will be sent to the developer.")) return;
    try {
      const res = await fetch(`/api/v1/admin/games/${gameId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Game approved successfully!");
        if (activeGameId === gameId) setActiveGameId(null);
        fetchPendingGames();
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const handleReject = async (gameId) => {
    const reason = window.prompt("Enter reason for rejection (this will be emailed to the developer):", "Violates store policies.");
    if (reason === null) return; // User cancelled

    try {
      const res = await fetch(`/api/v1/admin/games/${gameId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        alert("Game rejected successfully.");
        if (activeGameId === gameId) setActiveGameId(null);
        fetchPendingGames();
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const activeGame = games.find((g) => g.id === activeGameId);

  return (
    <main className="flex-grow pt-28 md:pt-32 pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      <QueueSection 
        games={games} 
        activeGameId={activeGameId} 
        onSelect={setActiveGameId}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
      />
      <DetailsPanel 
        game={activeGame} 
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </main>
  );
}
