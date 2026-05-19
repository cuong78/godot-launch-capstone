import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  AlertTriangle, 
  Filter, 
  Hash, 
  Code, 
  User, 
  UserCog, 
  Ban, 
  Gavel, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ShieldAlert, 
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering and Searching
  const [activeFilter, setActiveFilter] = useState('all'); // all, developers, users, suspended
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    roleName: 'player',
    status: 'active'
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch platform users');
      }
      setUsers(data.data || []);
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
    
    fetchUsers();
  }, []);

  // Reset pagination on filter or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // Clean utilities
  const cleanUsername = (username) => {
    if (!username) return '';
    return username.split('_deleted_')[0];
  };

  const cleanEmail = (email) => {
    if (!email) return '';
    return email.split('_deleted_')[0];
  };

  // CRUD Actions
  const handleOpenCreateModal = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      password: '',
      roleName: 'player',
      status: 'active'
    });
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to provision user');
      }
      setSuccess(`Operator ${formData.username} provisioned successfully.`);
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      roleName: user.roleName,
      status: user.status,
      password: '',
      avatarUrl: user.avatarUrl || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        fullName: formData.fullName,
        roleName: formData.roleName,
        status: formData.status,
        avatarUrl: formData.avatarUrl
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user');
      }
      setSuccess(`Operator ${cleanUsername(selectedUser.username)} updated successfully.`);
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to soft-delete the operator "${cleanUsername(user.username)}"? Their access will be revoked, but their statistics and transactions will remain intact.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to soft-delete user');
      }
      setSuccess(`Operator ${cleanUsername(user.username)} has been soft-deleted.`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Filtered list
  const filteredUsers = users.filter(user => {
    // Filter by type
    if (activeFilter === 'developers') {
      if (user.roleName.toLowerCase() !== 'developer') return false;
    } else if (activeFilter === 'users') {
      if (user.roleName.toLowerCase() !== 'player') return false;
    } else if (activeFilter === 'suspended') {
      if (user.status.toLowerCase() !== 'banned' && user.status.toLowerCase() !== 'deleted') return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const cleanUser = cleanUsername(user.username).toLowerCase();
      const cleanEmailStr = cleanEmail(user.email).toLowerCase();
      const name = user.fullName.toLowerCase();
      const id = user.id.toLowerCase();
      return cleanUser.includes(q) || cleanEmailStr.includes(q) || name.includes(q) || id.includes(q);
    }
    return true;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const getAccessLevel = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'Lvl 5 (Root)';
      case 'developer': return 'Lvl 3 (Publish)';
      case 'player': default: return 'Lvl 1 (Base)';
    }
  };

  return (
    <main className="flex-grow pt-28 md:pt-32 pb-20 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col gap-8">
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
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface drop-shadow-md">Operative Directory</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_rgba(0,219,231,0.8)]"></span>
            {users.length} ENTRIES INDEXED
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleOpenCreateModal}
            className="bg-[#121418] text-primary-fixed-dim border border-primary-fixed-dim/50 rounded px-4 py-2 font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-fixed-dim/10 hover:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all cursor-pointer"
          >
            <Plus className="w-[18px] h-[18px]" />
            PROVISION USER
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container/30 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`font-label-sm text-label-sm px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeFilter === 'all' 
                ? 'bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-primary-fixed-dim hover:text-primary-fixed-dim'
            }`}
          >
            ALL OPERATIVES
          </button>
          <button 
            onClick={() => setActiveFilter('developers')}
            className={`font-label-sm text-label-sm px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeFilter === 'developers' 
                ? 'bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-primary-fixed-dim hover:text-primary-fixed-dim'
            }`}
          >
            DEVELOPERS
          </button>
          <button 
            onClick={() => setActiveFilter('users')}
            className={`font-label-sm text-label-sm px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeFilter === 'users' 
                ? 'bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-primary-fixed-dim hover:text-primary-fixed-dim'
            }`}
          >
            END USERS
          </button>
          <div className="w-[1px] h-6 bg-outline-variant/30 mx-2"></div>
          <button 
            onClick={() => setActiveFilter('suspended')}
            className={`font-label-sm text-label-sm px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'suspended' 
                ? 'bg-error text-[#0A0C10] shadow-[0_0_10px_rgba(255,180,171,0.2)] font-semibold' 
                : 'bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-error hover:text-error'
            }`}
          >
            <AlertTriangle className="w-[14px] h-[14px]" />
            SUSPENDED / DELETED
          </button>
        </div>

        <div className="relative w-full md:w-auto flex-shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-[18px] h-[18px]" />
          <input 
            className="bg-[#0A0C10] border border-outline-variant/50 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded py-2 pl-10 pr-4 font-label-sm text-label-sm w-full md:w-80 transition-all placeholder:text-on-surface-variant/50" 
            placeholder="Filter by ID, Name, Email..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container/40 backdrop-blur-[16px] rounded-xl border border-white/5 overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary-fixed-dim/50"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary-fixed-dim/50"></div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
            <Loader2 className="w-10 h-10 animate-spin text-primary-fixed-dim" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Retrieving Operative Index...</span>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-on-surface-variant">
            <AlertTriangle className="w-8 h-8 text-on-surface-variant/50" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider">No corresponding operatives found</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-[#121418]/80 border-b border-outline-variant/30">
                  <tr>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Operator ID</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Identity</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Role</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Access Level</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-on-surface divide-y divide-outline-variant/10">
                  {paginatedUsers.map((user) => {
                    const isBanned = user.status?.toLowerCase() === 'banned';
                    const isDeleted = user.status?.toLowerCase() === 'deleted';
                    
                    return (
                      <tr 
                        key={user.id} 
                        className={`transition-colors group ${
                          isDeleted ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className={`py-4 px-6 font-label-sm ${isDeleted ? 'text-error/80' : 'text-primary-fixed-dim'}`}>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 opacity-50" />
                            {user.id.substring(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${isDeleted ? 'text-on-surface/60 line-through' : ''}`}>
                              {user.fullName}
                            </span>
                            <span className={`font-label-sm text-label-sm ${isDeleted ? 'text-error/70' : 'text-on-surface-variant'}`}>
                              {cleanEmail(user.email)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {user.roleName?.toLowerCase() === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/10 border border-secondary/30 text-secondary font-label-sm text-label-sm">
                              <UserCog className="w-[14px] h-[14px]" />
                              Admin
                            </span>
                          ) : user.roleName?.toLowerCase() === 'developer' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 text-primary-fixed-dim font-label-sm text-label-sm">
                              <Code className="w-[14px] h-[14px]" />
                              Dev
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm">
                              <User className="w-[14px] h-[14px]" />
                              User
                            </span>
                          )}
                        </td>
                        <td className={`py-4 px-6 font-label-sm ${isDeleted ? 'text-error/70' : 'text-on-surface-variant'}`}>
                          {isDeleted ? 'REVOKED' : getAccessLevel(user.roleName)}
                        </td>
                        <td className="py-4 px-6">
                          {isDeleted ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-error/50 text-error bg-error/10 shadow-[0_0_8px_rgba(255,180,171,0.2)] font-label-sm text-label-sm">
                              <Gavel className="w-[14px] h-[14px]" />
                              Deleted
                            </div>
                          ) : isBanned ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-error/50 text-error bg-error/10 shadow-[0_0_8px_rgba(255,180,171,0.2)] font-label-sm text-label-sm">
                              <Ban className="w-[14px] h-[14px]" />
                              Banned
                            </div>
                          ) : user.status?.toLowerCase() === 'inactive' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline-variant/50 text-on-surface-variant font-label-sm text-label-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50"></span>
                              Inactive
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary-fixed/50 text-primary-fixed shadow-[0_0_8px_rgba(0,219,231,0.2)] font-label-sm text-label-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>
                              Active
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenEditModal(user)}
                              className="text-on-surface-variant hover:text-primary-fixed transition-colors cursor-pointer" 
                              title="Edit Operator Settings"
                            >
                              <UserCog className="w-5 h-5" />
                            </button>
                            {!isDeleted && (
                              <button 
                                onClick={() => handleDeleteUser(user)}
                                className="text-on-surface-variant hover:text-error transition-colors cursor-pointer" 
                                title="Soft-delete Operator"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-[#121418]/80 border-t border-outline-variant/30 p-4 flex items-center justify-between">
                <div className="font-label-sm text-label-sm text-on-surface-variant">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} records
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded text-on-surface-variant hover:text-primary-fixed-dim hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button 
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded font-label-sm text-label-sm flex items-center justify-center transition-colors cursor-pointer ${
                          currentPage === page 
                            ? 'bg-primary-fixed-dim text-[#0A0C10] font-semibold shadow-[0_0_10px_rgba(0,242,255,0.2)]' 
                            : 'text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed-dim'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded text-on-surface-variant hover:text-primary-fixed-dim hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0c0e12] border border-primary-fixed-dim/30 w-full max-w-md rounded-xl overflow-hidden relative shadow-[0_0_30px_rgba(0,219,231,0.15)] flex flex-col">
            <div className="h-1 bg-gradient-to-r from-primary-fixed-dim via-secondary to-primary-fixed-dim"></div>
            
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-primary-fixed-dim uppercase tracking-wider flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Provision Operator
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Username</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                  placeholder="e.g. nakamura"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Email Address</label>
                <input 
                  required
                  type="email" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                  placeholder="e.g. t.naka@indiecore.net"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                  placeholder="e.g. Takashi Nakamura"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Password</label>
                <input 
                  required
                  type="password" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Role</label>
                  <select 
                    className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none transition-all"
                    value={formData.roleName}
                    onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                  >
                    <option value="player">Player</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none transition-all"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-label-sm font-label-sm text-on-surface-variant border border-outline-variant/50 rounded hover:border-on-surface hover:text-on-surface transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-label-sm font-label-sm bg-primary-fixed-dim text-[#0c0e12] rounded hover:shadow-[0_0_15px_rgba(0,219,231,0.4)] transition-all font-semibold cursor-pointer"
                >
                  PROVISION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0c0e12] border border-primary-fixed-dim/30 w-full max-w-md rounded-xl overflow-hidden relative shadow-[0_0_30px_rgba(0,219,231,0.15)] flex flex-col">
            <div className="h-1 bg-gradient-to-r from-primary-fixed-dim via-secondary to-primary-fixed-dim"></div>
            
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-primary-fixed-dim uppercase tracking-wider flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Edit Operator Details
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Username</label>
                <input 
                  disabled
                  type="text" 
                  className="w-full bg-[#121418] border border-outline-variant/30 rounded p-3 text-on-surface-variant/70 cursor-not-allowed outline-none"
                  value={cleanUsername(selectedUser?.username)}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Email Address</label>
                <input 
                  disabled
                  type="email" 
                  className="w-full bg-[#121418] border border-outline-variant/30 rounded p-3 text-on-surface-variant/70 cursor-not-allowed outline-none"
                  value={cleanEmail(selectedUser?.email)}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                  placeholder="e.g. Takashi Nakamura"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">New Password (Leave blank if unchanged)</label>
                <input 
                  type="password" 
                  className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Role</label>
                  <select 
                    className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none transition-all"
                    value={formData.roleName}
                    onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                  >
                    <option value="player">Player</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full bg-[#121418] border border-outline-variant/50 rounded p-3 text-on-surface focus:border-primary-fixed-dim focus:outline-none transition-all"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="banned">Banned</option>
                    <option value="deleted">Deleted (Soft Deleted)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-label-sm font-label-sm text-on-surface-variant border border-outline-variant/50 rounded hover:border-on-surface hover:text-on-surface transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-label-sm font-label-sm bg-primary-fixed-dim text-[#0c0e12] rounded hover:shadow-[0_0_15px_rgba(0,219,231,0.4)] transition-all font-semibold cursor-pointer"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

