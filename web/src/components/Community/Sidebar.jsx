import React from 'react';
import { MessageSquare, Bug, Code, Headset } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function Sidebar() {
    const { t } = useLanguage();
    return (
        <aside className="col-span-1 md:col-span-3 flex flex-col gap-6">
            <div className="bg-surface-container/40 backdrop-blur-md rounded-xl border border-white/5 p-6 neon-border">
                <h2 className="font-headline-md text-headline-md text-surface-tint mb-6 tracking-wide"> {t('discussionForums')}</h2>
                <ul className="flex flex-col gap-4">
                    <li className="flex items-start justify-between group cursor-pointer">
                        <div className="flex gap-3">
                            <MessageSquare className="text-on-surface-variant group-hover:text-surface-tint transition-colors" size={20} />
                            <div>
                                <span className="font-body-md text-body-md text-on-surface group-hover:text-surface-tint transition-colors block"> {t('generalDiscussions')}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block"> {t('postCount', { count: '12.4k' })}</span>
                            </div>
                        </div>
                        <div className="flex -space-x-2">
                            <img className="w-6 h-6 rounded-full border border-surface" alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJdB4H8lFOVIgLxxU_ezqTkbzY91RVrClHmf_TnM7Nx-zVP5gaCWsqbdpefiyTD8yiqJJMzvgEr2gQTruDvEAA69Nme9ek1jOXxelnu9EafRPf4le93aSI7gRGBo3aw-pnc4AWufD456N0rwTshd56lk0DqqL_jV2GFqQr2jCWVlcJ07HlvGuXwrbsPjRCAgGOLE6MeLe6vN6RnECTZSmCK98XuCAQfn49ohROyN3YDrgypm5QMtctLB3y2pGz8z1aW-5JwLXQtznX" />
                        </div>
                    </li>
                    <li className="flex items-start justify-between group cursor-pointer">
                        <div className="flex gap-3">
                            <Bug className="text-on-surface-variant group-hover:text-secondary transition-colors" size={20} />
                            <div>
                                <span className="font-body-md text-body-md text-on-surface group-hover:text-secondary transition-colors block"> {t('cyberBloomFeedback')}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block"> {t('postCount', { count: '842' })}</span>
                            </div>
                        </div>
                    </li>
                    <li className="flex items-start justify-between group cursor-pointer">
                        <div className="flex gap-3">
                            <Code className="text-on-surface-variant group-hover:text-surface-tint transition-colors" size={20} />
                            <div>
                                <span className="font-body-md text-body-md text-on-surface group-hover:text-surface-tint transition-colors block"> {t('voidProtocolModding')}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block"> {t('postCount', { count: '3.1k' })}</span>
                            </div>
                        </div>
                    </li>
                    <li className="flex items-start justify-between group cursor-pointer">
                        <div className="flex gap-3">
                            <Headset className="text-on-surface-variant group-hover:text-primary-fixed-dim transition-colors" size={20} />
                            <div>
                                <span className="font-body-md text-body-md text-on-surface group-hover:text-primary-fixed-dim transition-colors block"> {t('helpAndSupport')}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block"> {t('postCount', { count: '5.2k' })}  </span>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </aside>
    );
}
