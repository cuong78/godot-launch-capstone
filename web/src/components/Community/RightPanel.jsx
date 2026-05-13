import React from 'react';
import { BadgeCheck } from 'lucide-react';

export default function RightPanel() {
    return (
        <aside className="col-span-1 md:col-span-3 flex flex-col gap-8">
            <div className="bg-surface-container/30 backdrop-blur-md rounded-xl border border-white/5 p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4 text-[18px]">Top Creators</h3>
                <ul className="flex flex-col gap-4">
                    <li className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" alt="Creator Studio Nomad" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyhEoAm0aNQFigKAS5D1SrpAcLrJB4gsAcAVeF0XIbXqQDvO6OgOWICufYDQt-1isLeJrI5o_VuxP9KaprAVHrURUz_QZQnwyY31NOO6fwR_27SVqw662-gDoZJ5EtZLHAAxUyXxdtV8ahllR_fXw4BpAruKr7XEQVuePod9brT9C6ieWtoSydTa-gkDgNFCPzLNytq7hmMaL1XAj6xBvMRPhRhir1OQnBpxBZVeQHPH0b6ziRS_sl9qpv_Q7wvYpXmfc_X86A6uaB" />
                        <span className="font-body-md text-body-md text-on-surface flex-grow">Studio_Nomad</span>
                        <BadgeCheck className="text-surface-tint" size={16} />
                    </li>
                    <li className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" alt="Creator PixelForge" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_b5U2UlnDpP4xX-FZNomjb97fOZawMpUdjY5qduWFALekv-zkKUzJJt-0zEquoCWMFtv1D_DggSjyN5pYHpQSPOSR4ZmN-eHqSIq_m662HjbmDrgAXC6NkjKmLVvBWqdu-CTEwZl_0PiVYmox8ovKqigrJSPm7V2V_bdUqhk0v1mC5_v-PcoNG0TyxobAG_vRISf9k92s0oIbDzKzex3mwTqdMEsHznfEqF11jPUMqdiOG2afGw4qU5sxDLJtTGgEc1xJKdQDI36m" />
                        <span className="font-body-md text-body-md text-on-surface flex-grow">PixelForge</span>
                    </li>
                </ul>
            </div>

            <div className="bg-surface-container/30 backdrop-blur-md rounded-xl border border-white/5 p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4 text-[18px]">Community Content</h3>
                <div className="grid grid-cols-2 gap-2">
                    <div className="w-full h-20 bg-surface-dim rounded overflow-hidden border border-white/5 hover:border-surface-tint cursor-pointer transition-colors">
                        <img className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" alt="Abstract geometry" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHKa-HoFcaX8y2boGoEG7j2aB68TVt6CTCNePl24RmADMY7Lx3A5gWru8zlNBTZmLFxzhrICFcR5ZZLBWLWIA82qGMh22UV9X8EY9fpMT3CVKqdS81WaJeZWnhGrgvedT4j-xzb6tHoE1Nenpavx9t6vpUgqAE0AIPjRDbmaa3xhm_2GpsGcwCqZVw8zUKaKGo9vqVkhPhpqST-u1BN0IROpEuik_PzIRvEvWv26-EZD754flCNMNZi79zpkCBG2lCNGLTQtfw6JII" />
                    </div>
                    <div className="w-full h-20 bg-surface-dim rounded overflow-hidden border border-white/5 hover:border-surface-tint cursor-pointer transition-colors">
                        <img className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" alt="Control panel" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHVlWkZK3DkdK20xLXznc6uO1EsEMOuHJlkM0yog_N18j0CVsoPP9wgPz0uTPkePSGctDSRw-INbOv5z1eMaDQC5nCK8xZezLqvn3PCXjVWdaLffLgzJepVqOiNOSOEBfCZEY34GD9VhhRymKdrPv-EMa04BWOYPyFA0rf01tXSqEV9wGsUpXyj1GdacBbxM1PQkhPiOpHS2kDxB9c2JWVvMjXapECiYrxXYoHA3jSnjbgFqGJSnrcUC4RYxmyvaZd_LCBhLcGniSh" />
                    </div>
                </div>
            </div>

            <div className="bg-surface-container/30 backdrop-blur-md rounded-xl border border-white/5 p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4 text-[18px]">Friends List</h3>
                <ul className="flex flex-col gap-3">
                    <li className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <img className="w-8 h-8 rounded-full" alt="Online friend" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAluoxS7sfenSrXarn2pJ9REYNdL8o94ylmSa1ZNG5JTg3J7uWeXUtJO9ITA4ojVn13qXIArK_94yZXDCcF6J93_HjHQ2uyoBU7YKftaf_wXjEqkLePYASHNa9S07EGwooHpyLGIx6hTPqMiRV0X4ustk3RYcqTsS3iaMkq69sqxRs79NmNCvcJfnNxGYE1PRf4eqQqxzQxodvuPanbhmVzIb600Nk8upJm9_-Fy4J5Lu6L0HIaU9uYKsJE4ewztODaWL5wt5Zr9Lcc" />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary-fixed-dim rounded-full border-2 border-surface-container"></span>
                        </div>
                        <span className="font-body-md text-body-md text-on-surface group-hover:text-primary-fixed-dim transition-colors">Alex_Dev</span>
                    </li>
                    <li className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <img className="w-8 h-8 rounded-full opacity-50" alt="Offline friend" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrAI1ews2Y4c7vKoCGKuSaNuYFwbowL2-BLk03LhXwIDDq4zuBPLnnBD07c2bJTb5ziVyycmCrRT0AEcnsjwGLKIjvV2mYbwBCEOzCV-43UiJN_N4olSHpJJao6b7wB6eZ4qawFRcyx4z_Jmd-el9lV_S6gGaHAo2PMoCWnfxTFjgNoEEL5Fn46VAlfGuFGaqsAQlotHMNY8NBKyLPnSvLQzQqAYkg_5X0Al0xswmiKtYurkY8N6Nz6zQ_-Ow-2CcrMm0CtKCQg7Hc" />
                        </div>
                        <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">GhostCoder</span>
                    </li>
                </ul>
            </div>
        </aside>
    );
}
