import React, { useState } from 'react';
import { ListFilter, CheckCircle2, Ban, Rocket } from 'lucide-react';

const MOCK_GAMES = [
  {
    id: '1',
    title: 'Neon Drift VR',
    devId: 'USR_883A9',
    engine: 'Unity 2023.2',
    submitTime: 'T-14:32:00',
    gameId: 'G-992-XKA',
    developer: 'Pixel Syndicate',
    buildSize: '4.2 GB',
    targetPlatform: 'PC_VR',
    antiCheat: 'EAC_ENABLED',
    telemetry: 'High-speed arcade racer utilizing experimental VR locomotion mechanics. Automated scan returned 0 malicious signatures. Build requires manual validation for motion sickness thresholds per Store Policy V2.',
    coverArt: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC19S97vYafWaDiDoowOFi-UFNMZOEVB6EO990GQYsFlG3wrBtQhNIEi7wHYevyocuc-apbagqjseAWeSbHI2aZC7gRtFGND57rZwrFLWYYyBgglfBFHjtXrloV29T9jZfD8LZLKFw3nfsh2HR29saUkWuxucAQ6PNdePITCAhakWkN5VaElYSyCGIKHMA2zV5KwRQrw7pI9arZx3tx8jeVJ_8JauojRr3W2ZBzM_Pg5VidH9GsiVFCbTVXAWbBmJz9WR01zdqBeuJP',
    iconUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfxBZidkd7RtO-4D4G1PAWgrxsnbGSx0ZbcUqcqLumm48zRnmN1UdGNlRUOJ_cfSsCAdFkbt4QeacQowAPF9VozatvyWWOxBgDlPtjJVhdy9waVqe2jz29r1hMabVtwMfyu46haNXo4TJ16XW4AnrkPBC-c1nx-29llCHxor5zu7h-mfLRQz-EaMNWbQ8nL19JTES3EwVa3TcsqNMZd0Dj2r5KX-kGbIzGO2HOoyVSBMeZHu8E3N0AisDUkS3JRnP8-txRG7529cZl'
  },
  {
    id: '2',
    title: 'Echoes of the Void',
    devId: 'USR_119B2',
    engine: 'UE5.3',
    submitTime: 'T-18:45:11',
    gameId: 'G-112-XKA',
    developer: 'Starlight Studios',
    buildSize: '12.4 GB',
    targetPlatform: 'PS5, PC',
    antiCheat: 'DISABLED',
    telemetry: 'Story-driven action RPG. Found 2 warning flags related to unoptimized texture streams. Requires review.',
    coverArt: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop',
    iconUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: '3',
    title: 'Pixel Farm Pro',
    devId: 'USR_442C1',
    engine: 'Godot 4.1',
    submitTime: 'T-22:10:05',
    gameId: 'G-445-PTR',
    developer: 'Cozy Dev',
    buildSize: '850 MB',
    targetPlatform: 'Nintendo Switch',
    antiCheat: 'N/A',
    telemetry: 'Casual farming simulator. Clean scan. Safe for auto-approval workflow.',
    coverArt: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    iconUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop'
  }
];

function QueueSection({ games, activeGameId, onSelect }) {
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
          <span>FILTER: ALL ENGINES</span>
        </div>
      </div>

      <div className="bg-surface-container-low/60 glass-panel rounded-xl border border-outline-variant/20 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-outline-variant/30 bg-surface-container/50">
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">GAME_TITLE</th>
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">DEV_ID</th>
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">ENGINE</th>
              <th className="font-label-sm text-label-sm text-on-surface-variant py-4 px-6 font-medium">SUBMIT_TIME</th>
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
                  <td className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant">{game.devId}</td>
                  <td className="py-4 px-6">
                    <span className="font-label-sm text-label-sm bg-surface-bright/50 px-2 py-1 rounded text-on-surface border border-outline-variant/20">
                      {game.engine}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant">{game.submitTime}</td>
                  <td className="py-4 px-6 text-right flex justify-end gap-2">
                    {isActive ? (
                      <>
                        <button className="font-label-sm text-label-sm bg-primary-container text-background px-3 py-1.5 rounded scanline hover:bg-primary transition-colors flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFY
                        </button>
                        <button className="font-label-sm text-label-sm bg-transparent border border-error text-error px-3 py-1.5 rounded hover:bg-error/10 transition-colors flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button className="font-label-sm text-label-sm bg-surface-bright text-on-surface px-3 py-1.5 rounded hover:bg-primary-container hover:text-background transition-colors">
                          VERIFY
                        </button>
                        <button className="font-label-sm text-label-sm bg-transparent border border-outline-variant text-on-surface-variant px-3 py-1.5 rounded hover:border-error hover:text-error transition-colors">
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

function DetailsPanel({ game }) {
  return (
    <aside className="lg:col-span-4">
      <div className="bg-[#121418] rounded-xl border border-outline-variant/30 flex flex-col h-full sticky top-28">
        {/* Header / Cover */}
        <div className="h-48 relative rounded-t-xl overflow-hidden border-b border-outline-variant/30">
          <div className="absolute inset-0 bg-gradient-to-t from-[#121418] to-transparent z-10"></div>
          <img 
            alt="Game Cover Art" 
            className="w-full h-full object-cover" 
            src={game.coverArt}
          />
          <div className="absolute bottom-4 left-4 z-20 flex items-end gap-4">
            <div className="w-16 h-16 rounded bg-surface-container border border-primary-fixed-dim/50 shadow-[0_0_15px_rgba(0,219,231,0.3)] flex items-center justify-center overflow-hidden shrink-0">
              <img 
                alt="Game Icon" 
                className="w-full h-full object-cover" 
                src={game.iconUrl}
              />
            </div>
            <div className="mb-1">
              <h2 className="font-headline-md text-headline-md text-on-surface leading-none mb-1 line-clamp-1">{game.title}</h2>
              <p className="font-label-sm text-label-sm text-primary-fixed-dim">ID: {game.gameId}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 flex-grow">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">DEVELOPER</span>
              <span className="font-label-sm text-label-sm text-on-surface">{game.developer}</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">BUILD_SIZE</span>
              <span className="font-label-sm text-label-sm text-on-surface">{game.buildSize}</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">TARGET_PLATFORM</span>
              <span className="font-label-sm text-label-sm text-on-surface">{game.targetPlatform}</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">ANTI_CHEAT</span>
              <span className="font-label-sm text-label-sm text-secondary-fixed-dim">{game.antiCheat}</span>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase border-b border-outline-variant/20 pb-1">Telemetry Summary</h3>
            <p className="font-body-md text-body-md text-on-surface/80 text-sm">
              {game.telemetry}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-auto pt-6 flex flex-col gap-3">
            <button className="w-full font-label-sm text-label-sm bg-transparent border border-secondary-container text-secondary-fixed-dim py-3 rounded hover:bg-secondary-container/10 transition-colors flex justify-center items-center gap-2 neon-border-purple">
              <Rocket className="w-4.5 h-4.5" />
              LAUNCH_SANDBOX
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button className="font-label-sm text-label-sm bg-primary-container text-background py-2 rounded scanline hover:bg-primary transition-colors flex justify-center items-center gap-1">
                VERIFY_BUILD
              </button>
              <button className="font-label-sm text-label-sm bg-error-container/20 border border-error/50 text-error py-2 rounded hover:bg-error-container/40 transition-colors flex justify-center items-center gap-1">
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
  const [activeGameId, setActiveGameId] = useState(MOCK_GAMES[0].id);
  const activeGame = MOCK_GAMES.find((g) => g.id === activeGameId) || MOCK_GAMES[0];

  return (
    <main className="flex-grow pt-28 md:pt-32 pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      <QueueSection 
        games={MOCK_GAMES} 
        activeGameId={activeGameId} 
        onSelect={setActiveGameId} 
      />
      <DetailsPanel game={activeGame} />
    </main>
  );
}
