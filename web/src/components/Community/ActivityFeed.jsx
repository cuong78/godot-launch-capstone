import React from 'react';
import { ImageIcon, LinkIcon, MoreVertical, Star, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function ActivityFeed() {
    const { t } = useLanguage();
    return (
        <section className="col-span-1 md:col-span-6 flex flex-col gap-8">
            <div className="bg-surface-container/60 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 border-b border-surface-variant pb-4">
                    <img className="w-10 h-10 rounded-full" alt="Stylized user avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8xb1mmTqFyH_6N8lqF4a8q23H1vvGhLZY_TWqiMEstDYfJsSl9OpMiMqkf9vUuXLIRafmgLbXSjgZrRqktuFIZ3lTPOwx1A9Y5WPj3dfOSQDEp9sX8O4z4tMlMoMoKqOjLFzmPv8PRutYu1I-wPrEcSVMBArYcs3YKjRmnFzTKsBCutY98478B3MV9w3ZUxgRJkNd_aZsXac3-BZKSubeQspPNseQfVSbEvexqyg4HsCC0ksA4dphNbF3tUUETNibBLZ6YRiEPjfh" />
                    <input className="w-full bg-transparent border-none outline-none text-on-surface font-body-md text-body-md focus:ring-0 placeholder:text-on-surface-variant" placeholder={t('shareConceptArt')} type="text" />
                </div>
                <div className="flex justify-between items-center pt-4">
                    <div className="flex gap-2">
                        <button className="text-on-surface-variant hover:text-surface-tint transition-colors p-2"><ImageIcon size={20} /></button>
                        <button className="text-on-surface-variant hover:text-surface-tint transition-colors p-2"><LinkIcon size={20} /></button>
                    </div>
                    <button className="bg-surface-tint text-background px-6 py-2 rounded-lg font-label-sm text-label-sm font-bold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors">{t('post')}</button>
                </div>
            </div>

            <article className="bg-surface-container/40 backdrop-blur-lg rounded-xl border border-white/5 p-6 hover:border-surface-tint/50 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <img className="w-10 h-10 rounded-full" alt="Player X" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzhoIH6IFd0jRaWHQdEfdrtbd6xe2n7pwlx4c3kUq5l8zJTj9nyRQATqttSsDbJyK2bAMG-nMAsQC68IQyn2RkLCwz15RloMQb0Sr_t-CHaiERhb8SncKn3LO_mngLY0mxGhqHIBdg-aLMcqn3Th10jmZGwiYTXBKlYKZeVZl5xIH2aG8q71MJfjAUmk61dOJ4BndP6-MvUnn4H7hCQj0wbYzSWWj2OTO5xmH2T-tH0FU4jQdSI5wzgATslz_wGqhw42r8mlc1fTsG" />
                        <div>
                            <span className="font-headline-md text-headline-md text-on-surface text-[16px] block">Player_X</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">2 hours ago</span>
                        </div>
                    </div>
                    <MoreVertical className="text-on-surface-variant" size={20} />
                </div>
                <div className="mb-2">
                    <span className="font-body-md text-body-md text-on-surface-variant">posted a review of</span>
                    <span className="font-headline-md text-headline-md text-secondary ml-1 text-[18px]">Student Quest</span>
                </div>
                <div className="flex gap-1 text-surface-tint mb-4">
                    <Star size={18} className="fill-current" />
                    <Star size={18} className="fill-current" />
                    <Star size={18} className="fill-current" />
                    <Star size={18} className="fill-current" />
                    <Star size={18} className="text-surface-tint fill-transparent" />
                </div>
                <p className="font-body-md text-body-md text-on-surface mb-6 leading-relaxed">
                    "An absolute masterpiece of emergent gameplay. The way the stealth mechanics integrate with the environment manipulation is something I haven't seen since the golden age of immersive sims. Highly recommend keeping an eye on this dev."
                </p>
                <div className="flex items-center gap-6 border-t border-surface-variant pt-4">
                    <button className="flex items-center gap-2 text-on-surface-variant hover:text-surface-tint transition-colors font-label-sm text-label-sm">
                        <Heart size={18} /> 243
                    </button>
                    <button className="flex items-center gap-2 text-on-surface-variant hover:text-surface-tint transition-colors font-label-sm text-label-sm">
                        <MessageCircle size={18} /> 18
                    </button>
                    <button className="flex items-center gap-2 text-on-surface-variant hover:text-surface-tint transition-colors font-label-sm text-label-sm ml-auto">
                        <Share2 size={18} /> {t('share')}
                    </button>
                </div>
            </article>

            <article className="bg-surface-container/40 backdrop-blur-lg rounded-xl border border-white/5 p-6 hover:border-secondary/50 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <img className="w-10 h-10 rounded-full" alt="Dev Sarah" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCW-ykp1jUCLRT4XbDCBhzw7b_FwtJsvbui4DndpV4iNJVBdcbFp6ror8N11PeNrhDJaRLsl0MSa5tdAvutEtKm-SG23P-PAf6AM_-FE-oU-uJ2TajOs5rATm99bQBLdLZC1_oUQ1r7DccXzzoHMimk98FILRMrM7-CNmHYZfDIWWVN7f-rnluI245O_YIoKJpnBzQKye4c70vy00HMFZLQ6dEysd0__zfvCPyfM4xtZJHKyUrsPtKRkg-OntJryHkH1eqNEgRvRRPR" />
                        <div>
                            <span className="font-headline-md text-headline-md text-on-surface text-[16px] block"> {t('devSarah')} </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant"> {t('5HoursAgo')}</span>
                        </div>
                    </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface mb-4">
                    {t('earlyEnvironmentExplorations')}
                </p>
                <div className="w-full h-64 rounded-xl overflow-hidden mb-4 border border-white/10 relative group cursor-pointer">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Concept art" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVpE3PBtecYxwftcQobruvxOwVcvN4W0-TFlLkTZ7DUaBFtJg2PjxHTvVw6gcn26EnyJTBDzlXwpUpFFNu_qw216ZkaBC_ir8dmbYFlBCPc6-N-s59EgTXJ1txFY2bMuv3-hEKabPCXb_6ND0aDhSvZpJfEP7yOos9P6iDZ2KmyVaGF3v4VYaxO7icNPUpH5TczOtWRgkyX5goKauAIOiVIPKpHSqqHpjppt3Lh73r3g0AZfsgOaNiD_1NomnHW5uyjzYtoDRS9TD4" />
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-surface-dim border border-surface-variant text-on-surface font-label-sm text-label-sm px-3 py-1 rounded"> {t('rpg')}</span>
                    <span className="bg-surface-dim border border-surface-variant text-on-surface font-label-sm text-label-sm px-3 py-1 rounded"> {t('multiplayer')}</span>
                    <span className="bg-surface-dim border border-surface-variant text-on-surface font-label-sm text-label-sm px-3 py-1 rounded"> {t('stealth')}</span>
                    <span className="bg-surface-dim border border-surface-variant text-on-surface font-label-sm text-label-sm px-3 py-1 rounded"> {t('puzzle')}</span>
                </div>
                <div className="flex items-center gap-6 border-t border-surface-variant pt-4">
                    <button className="flex items-center gap-2 text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm">
                        <Heart className="text-secondary fill-current" size={18} /> 892
                    </button>
                    <button className="flex items-center gap-2 text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm">
                        <MessageCircle size={18} /> 104
                    </button>
                </div>
            </article>
        </section>
    );
}
