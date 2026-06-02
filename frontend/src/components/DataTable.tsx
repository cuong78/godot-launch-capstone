import React, { useState } from 'react';
import { Eye, ShieldAlert, BadgeInfo, Play, Database, Server } from 'lucide-react';

interface RowData {
  id: string;
  projectName: string;
  version: string;
  date: string;
  status: 'LIVE' | 'BETA' | 'ALPHA';
  engine: string;
  downloads: string;
}

interface DataTableProps {
  data: RowData[];
  onSelectRow?: (row: RowData) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onSelectRow }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter(row =>
    row.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.engine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: RowData['status']) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        );
      case 'BETA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            BETA
          </span>
        );
      case 'ALPHA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            ALPHA
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Project Repositories</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage and monitor deployment status</p>
        </div>
        <input
          type="text"
          placeholder="Filter repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 max-w-sm text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-slate-800 dark:text-slate-200"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase font-display">
              <th className="p-4">Project Name</th>
              <th className="p-4">Version</th>
              <th className="p-4">Engine Spec</th>
              <th className="p-4">Downloads</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
            {filteredData.length > 0 ? (
              filteredData.map(row => (
                <tr 
                  key={row.id} 
                  onClick={() => onSelectRow?.(row)}
                  className="hover:bg-slate-50/40 dark:hover:bg-slate-950/10 cursor-pointer active:bg-slate-50 dark:active:bg-slate-950/30 transition-all duration-100"
                >
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <Server size={16} />
                    </div>
                    {row.projectName}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{row.version}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1">
                    <Database size={13} className="text-slate-400" />
                    {row.engine}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{row.downloads}</td>
                  <td className="p-4">{getStatusBadge(row.status)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRow?.(row);
                      }}
                      className="p-1 px-2.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-950/40 rounded transition-studio"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-600 text-sm">
                  No projects match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
