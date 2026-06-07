import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Check, 
  X, 
  Settings, 
  Terminal, 
  Activity, 
  FileCheck, 
  UserMinus, 
  UserCheck, 
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Trash2
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { User } from '../types';
import { userApi } from '../api/userApi';

interface PendingAsset {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  date: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'developer' | 'player';
  status: 'active' | 'suspended' | 'inactive' | 'banned';
}

interface AdminPageProps {
  setCurrentScreen: (screen: any) => void;
  currentUser: User | null;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  setCurrentScreen,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'moderation' | 'users' | 'logs' | 'settings'>('moderation');
  
  // Mock Moderation state
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([
    { id: 'p1', title: 'Cyberpunk Vehicle Rigged 3D', author: 'RacerDev', category: '3D Models', price: 19.99, date: 'Just now' },
    { id: 'p2', title: 'Medieval Dungeon Pixel Tileset', author: 'AssetGuild', category: '2D Assets', price: 0, date: '2 hours ago' },
    { id: 'p3', title: 'Ambient Retro Synth Chiptunes', author: 'SoundCraft', category: 'Audio & SFX', price: 9.50, date: 'Yesterday' }
  ]);

  // Mock Users state (initial fallback)
  const [users, setUsers] = useState<AdminUser[]>([
    { id: 'u1', username: 'Cuong78', email: 'admin@godotlaunch.com', fullName: 'Cuong Admin', role: 'admin', status: 'active' },
    { id: 'u2', username: 'NeoArtisans', email: 'neo@artisans.com', fullName: 'Neo Artisans', role: 'developer', status: 'active' },
    { id: 'u3', username: 'LofiDev', email: 'lofi@dev.com', fullName: 'Lofi Dev', role: 'developer', status: 'active' },
    { id: 'u4', username: 'SlyGamer', email: 'sly@gamer.com', fullName: 'Sly Gamer', role: 'player', status: 'active' },
    { id: 'u5', username: 'SpamBot99', email: 'spam@bot.com', fullName: 'Spam Bot', role: 'player', status: 'suspended' }
  ]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const response = await userApi.getAllUsers();
      if (response.success && response.data) {
        const mappedUsers: AdminUser[] = response.data.map((u: any) => ({
          id: u.id || '',
          username: u.username || u.email || '',
          email: u.email || '',
          fullName: u.fullName || '',
          role: (u.roleName?.toLowerCase() as any) || 'player',
          status: u.status === 'active' ? 'active' : u.status === 'banned' ? 'banned' : 'inactive'
        }));
        setUsers(mappedUsers);
      } else {
        setUsersError(response.message || 'Failed to load users');
      }
    } catch (err: any) {
      setUsersError(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Mock settings state
  const [commission, setCommission] = useState(15);
  const [maintenance, setMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState('GodotLaunch Matrix Engine Upgrade is complete!');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Mock System Logs state
  const [logs, setLogs] = useState<string[]>([
    `[11:02:14] [SYSTEM] API Gateway successfully scaled to 3 container node nodes.`,
    `[11:03:02] [DATABASE] Connected to Postgres Cloud cluster - Latency: 4ms.`,
    `[11:04:45] [AUTH] Token issue request approved for user "NeoArtisans" (developer).`,
    `[11:08:12] [BILLING] Payout batch #492 processed successfully: $4,842.20 distributed.`,
    `[11:15:33] [WEBSOCKET] Client handshake completed: 184 concurrent creator connections.`
  ]);

  // Add random logs simulator
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'logs') {
        const services = ['SYSTEM', 'DATABASE', 'AUTH', 'WEBSOCKET', 'ASSETS'];
        const msgs = [
          'Memory compaction run completed. Cleared 284MB.',
          'Database check completed. 0 locks active.',
          'User session heartbeats synchronized.',
          'New asset upload payload signature verified.',
          'Marketplace index rebuild completed in 142ms.'
        ];
        const randomService = services[Math.floor(Math.random() * services.length)];
        const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
        const time = new Date().toTimeString().split(' ')[0];
        setLogs(prev => [`[${time}] [${randomService}] ${randomMsg}`, ...prev.slice(0, 15)]);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleApproveAsset = (id: string, title: string) => {
    setPendingAssets(pendingAssets.filter(a => a.id !== id));
    alert(`Asset "${title}" approved! It has been listed live in the Marketplace.`);
  };

  const handleRejectAsset = (id: string, title: string) => {
    setPendingAssets(pendingAssets.filter(a => a.id !== id));
    alert(`Asset "${title}" rejected. Creator notification sent.`);
  };

  const handleToggleUserRole = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    const nextRole = userToUpdate.role === 'admin' ? 'developer' : userToUpdate.role === 'developer' ? 'player' : 'admin';
    
    try {
      const response = await userApi.updateUser(id, {
        fullName: userToUpdate.fullName || userToUpdate.username,
        roleName: nextRole,
        status: userToUpdate.status === 'suspended' ? 'banned' : userToUpdate.status === 'active' ? 'active' : 'inactive'
      });
      if (response.success) {
        setUsers(users.map(u => {
          if (u.id === id) {
            return {
              ...u,
              role: nextRole
            };
          }
          return u;
        }));
      } else {
        alert(response.message || 'Failed to update user role');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    const nextStatus = userToUpdate.status === 'active' ? 'banned' : 'active';

    try {
      const response = await userApi.updateUser(id, {
        fullName: userToUpdate.fullName || userToUpdate.username,
        roleName: userToUpdate.role,
        status: nextStatus
      });
      if (response.success) {
        setUsers(users.map(u => {
          if (u.id === id) {
            return {
              ...u,
              status: nextStatus === 'active' ? 'active' : 'suspended'
            };
          }
          return u;
        }));
      } else {
        alert(response.message || 'Failed to update user status');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This will soft-delete their account.")) {
      return;
    }

    try {
      const response = await userApi.deleteUser(id);
      if (response.success) {
        setUsers(users.filter(u => u.id !== id));
        alert("User soft-deleted successfully.");
      } else {
        alert(response.message || "Failed to delete user");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete user");
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in py-2">
      
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase flex items-center gap-1.5 font-bold">
            <ShieldAlert size={12} /> SECURED SYSTEM ADMINISTRATION AREA
          </span>
          <h1 className="font-display font-bold text-2xl text-white pt-0.5">Admin Control Matrix</h1>
          <p className="text-xs text-slate-400 mt-1">Configure platform rates, moderate packages, manage user roles, and monitor live nodes</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const time = new Date().toTimeString().split(' ')[0];
              setLogs(prev => [`[${time}] [SYSTEM] Force manual telemetry diagnostics successfully run.`, ...prev]);
              alert('Diagnostics run complete. Health metrics healthy.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-studio rounded-lg text-xs font-semibold cursor-pointer active:scale-95"
          >
            <RefreshCw size={13} /> Run Diagnostics
          </button>
        </div>
      </div>

      {/* Admin KPI Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <DollarSign size={12} className="text-sky-500" /> Gross volume sales
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">$14,842.20</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+8.4%</span>
          </div>
          <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-tight">Net fee earnings: ${(14842.2 * (commission/100)).toFixed(2)} ({commission}%)</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Users size={12} className="text-amber-500" /> Platform accounts
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{users.length * 280 + 32} users</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+32 today</span>
          </div>
          <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-tight">Active sessions: 184 creators online</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <FileCheck size={12} className="text-purple-500" /> Pending Moderation
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{pendingAssets.length} packages</span>
            {pendingAssets.length > 0 && (
              <span className="text-[10px] text-amber-500 font-bold font-mono animate-pulse">Action required</span>
            )}
          </div>
          <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-tight">Average response turnaround: 4.8 hours</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Activity size={12} className="text-emerald-500" /> Node Infrastructure
          </span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-2xl font-display font-bold dark:text-white">99.98%</span>
          </div>
          <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-tight">API nodes healthy (US-West / SG-East)</p>
        </div>

      </div>

      {/* Navigation tabs for Admin screens */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-1.5 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'moderation' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <FileCheck size={14} /> Moderation Queue ({pendingAssets.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'users' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Users size={14} /> User Directory
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'logs' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Terminal size={14} /> System Logs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-studio shrink-0 flex items-center gap-1.5 cursor-pointer ${activeTab === 'settings' ? 'border-amber-400 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
        >
          <Settings size={14} /> Platform Settings
        </button>
      </div>

      {/* Main Admin Tab Content Area */}
      <div className="bg-white/80 dark:bg-slate-900/45 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm min-h-[300px]">
        
        {/* Tab 1: Moderation Queue */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Asset Submission Queue</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review, test, and approve community-uploaded packages before they go public</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                    <th className="p-3">Asset Details</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Uploaded</th>
                    <th className="p-3 text-center">Decisions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                  {pendingAssets.length > 0 ? (
                    pendingAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{asset.title}</div>
                          <div className="text-[10px] text-slate-450">by @{asset.author}</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-350">{asset.category}</td>
                        <td className="p-3 font-mono font-semibold dark:text-amber-400">
                          {asset.price === 0 ? 'Free' : `$${asset.price.toFixed(2)}`}
                        </td>
                        <td className="p-3 text-slate-450">{asset.date}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApproveAsset(asset.id, asset.title)}
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-lg transition-studio border border-transparent dark:border-emerald-900/30 cursor-pointer"
                              title="Approve & Publish"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleRejectAsset(asset.id, asset.title)}
                              className="p-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-studio border border-transparent dark:border-rose-900/30 cursor-pointer"
                              title="Reject & Notify"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-600 font-medium">
                        🎉 Clean slate! No pending submissions to moderate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}        {/* Tab 2: User Directory */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Account Database Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modify credentials, adjust user permissions, or suspend access keys</p>
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                <RefreshCw className="animate-spin" size={18} /> Loading platform users...
              </div>
            ) : usersError ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                Error loading users: {usersError}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-display font-mono">
                      <th className="p-3">User</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Access Level</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">@{u.username}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-350">{u.email}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            u.role === 'admin' 
                              ? 'bg-amber-450/10 text-amber-500 border-amber-500/20' 
                              : u.role === 'developer'
                              ? 'bg-sky-450/10 text-sky-500 border-sky-500/20'
                              : 'bg-slate-100 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 font-bold ${u.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleUserRole(u.id)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded border border-slate-250 dark:border-slate-800 font-semibold transition-studio cursor-pointer"
                            >
                              Toggle Role
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              className={`p-1 rounded cursor-pointer transition-studio ${
                                u.status === 'active' 
                                  ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100' 
                                  : 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                              }`}
                              title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                            >
                              {u.status === 'active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 rounded cursor-pointer transition-studio bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Real-time Node Telemetry Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Read logs emitted by system clusters and microservices</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-450 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live streaming active
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 space-y-1.5 max-h-80 overflow-y-auto shadow-inner leading-relaxed">
              {logs.map((log, idx) => (
                <div key={idx} className="hover:bg-slate-900/50 py-0.5 rounded px-1 transition-colors">
                  <span className="text-slate-500">[{idx + 1}]</span> {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Platform Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Platform Parameters Config</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modify global payout percentages, alert headers, and maintenance statuses</p>
            </div>

            {settingsSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-500 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <Check size={14} /> System variables successfully updated. Node servers reloading...
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Platform Commission rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={(e) => setCommission(parseInt(e.target.value) || 0)}
                  helperText="Percentage kept by the platform from each marketplace transaction"
                  required
                />
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                    System Maintenance Status
                  </label>
                  <div className="flex items-center gap-3 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setMaintenance(!maintenance)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${maintenance ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenance ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {maintenance ? 'ACTIVE - Site Locked' : 'INACTIVE - Online'}
                    </span>
                  </div>
                </div>
              </div>

              <Input
                label="Site-Wide Alert Header Banner Text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Leave blank to disable banner"
                helperText="Banner text displayed at the top of all user screens"
              />

              {maintenance && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-500 text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold">Warning: Maintenance mode is active.</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal block mt-0.5">This locks non-admin users out of performing checkouts, uploading files, or sync repos. Use with care.</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="md" type="submit" icon={<Sliders size={16} />}>
                  Save Platform Variable Config
                </Button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
};
