import React from 'react';
import { CloudDownload, Filter } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-[280px] h-full border-r border-outline-variant/20 flex flex-col bg-surface-container-lowest/40 backdrop-blur-sm z-20">
      <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center">
        <span className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">My Collection (12)</span>
        <button className="text-outline hover:text-primary-container transition-colors">
          <Filter className="w-[18px] h-[18px]" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        {/* Game Item: Cyber Bloom (Inactive) */}
        <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-all group text-left">
          <div className="w-10 h-10 rounded bg-surface-container-high flex-shrink-0 border border-outline-variant/30 group-hover:border-primary-container/50 overflow-hidden relative">
            <img alt="Cyber Bloom Icon" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcmzcSKNW4dD2p1OeclLByamOHQiiKbicYzLBnVSNEBdEc7OxF_dt01bNJrf8rJtFtRNrHWgCkS5lzeAm-VfCIuiwRV-375DqQlBfBV7STPsIxhgPnryhsu_mAmQjixN-oUYMNWke0AhINUlP70UeATUL2H4Wmrj9FANnAOe1niCpMnbOxV---F6HDJT9potk_FO5io3qmtWSI6HDCrkvuLumh9l0OEmsI5Ql1G6OkMmDGE0YFIMdKvovlGPMvwNB-lKQsJPlDK6wj" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-body-md text-[14px] text-on-surface font-medium truncate group-hover:text-primary-container transition-colors">Cyber Bloom</span>
            <span className="font-label-sm text-[10px] text-on-surface-variant opacity-60">Installed</span>
          </div>
        </button>
        {/* Game Item: Neon Drifter (Active) */}
        <button className="w-full flex items-center gap-3 p-2 rounded bg-primary-container/10 border-l-2 border-primary-container text-left">
          <div className="w-10 h-10 rounded bg-surface-container-high flex-shrink-0 border border-primary-container overflow-hidden relative shadow-[0_0_10px_rgba(0,242,255,0.2)]">
            <img alt="Neon Drifter Icon" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfIrYbzDCTPoRUf2QINvdiUqpgGGviu88TH3ksIT6VJ84x-y3QRHr7n0Bemxkr6Dp5q5R57vUCyzUq3Rc9bTvgoE6ogkw8XPdRoUTVgxVxE4QB2o0OcNs7cldPaz4jiKLihbz1ZK9i4WJ98toaCUYP44O25nRNp_eGPNAqCz6WOSjpDv80aSU6OUj-ZOCA1F_WvgVCfyEhWnt6_rNnD-B7c7d7gE8HynTjwyfh5fWKijx3L4ozbGFxXzUzmO5xY7IvwzE8wHNwAaHH" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-body-md text-[14px] text-primary-container font-bold truncate">Neon Drifter</span>
            <span className="font-label-sm text-[10px] text-primary-container/70">Update Available</span>
          </div>
        </button>
        {/* Game Item: void Protocol (Inactive) */}
        <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-all group text-left">
          <div className="w-10 h-10 rounded bg-surface-container-high flex-shrink-0 border border-outline-variant/30 group-hover:border-primary-container/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-surface-container-lowest opacity-80 z-10 flex items-center justify-center">
              <CloudDownload className="text-outline w-4 h-4" />
            </div>
            <img alt="void Protocol Icon" className="w-full h-full object-cover opacity-40 grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsea2XBPKKDaSJ4_gEnqStLxvBI9cU9iliTxrEFABn5N0jSkRfnJQotHCslsjyz8tOT9O44EBnO06tr3iz2V4pjnc2XbjHSMJfuY_RWb4GG3uENPVrpRxd7aLnsfJx3DOBkhw74dcjKJaDvkB2TCbxgIfFVJk-NSXiSQnDCpqLHPNpe4l6U-dYAHeA2GFPKxoz34Jf7Ziui_0PY_5LM39GkzSTDa8OAeFSpvgrTsEcenFWbYIRRzeRsx1zrERtd7i6QDyZQZ1ZGViQ" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-body-md text-[14px] text-on-surface-variant font-medium truncate group-hover:text-on-surface transition-colors">void Protocol</span>
            <span className="font-label-sm text-[10px] text-on-surface-variant opacity-60">Not Installed</span>
          </div>
        </button>
      </div>
    </div>
  );
}
