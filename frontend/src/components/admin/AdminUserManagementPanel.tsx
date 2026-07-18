import React, { useEffect, useState } from 'react';
import {
  Ban,
  Eye,
  PencilLine,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
} from 'lucide-react';
import { Button } from '../Button';
import { Input, TextArea } from '../Input';
import { AdminDialog } from './AdminDialog';

export type AdminUserRole = 'admin' | 'developer' | 'customer';
export type AdminUserStatus = 'active' | 'inactive' | 'suspended' | 'banned';

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  avatarUrl?: string;
  createdAt?: string;
  isSoftDeleted?: boolean;
}

export interface AdminUserUpdateInput {
  id: string;
  fullName: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  banReason?: string;
}

interface AdminUserManagementPanelProps {
  users: AdminUserRecord[];
  isLoading: boolean;
  error: string | null;
  currentUserEmail?: string;
  onRefresh: () => void;
  onUpdateUser: (input: AdminUserUpdateInput) => Promise<void>;
}

type DialogMode = 'detail' | 'edit' | 'role' | 'suspend' | 'ban' | null;
type RoleFilter = 'all' | AdminUserRole;
type StatusFilter = 'all' | AdminUserStatus;

const roleOptions: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'customer', label: 'Customer' },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

const dialogActionClasses =
  'flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-studio hover:border-amber-300 hover:bg-amber-50/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/30 dark:hover:bg-slate-900';

const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

const filterSelectClassName =
  'w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-100';

const getRoleLabel = (role: AdminUserRole) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'developer':
      return 'Developer';
    case 'customer':
    default:
      return 'Customer';
  }
};

const getStatusLabel = (status: AdminUserStatus) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    case 'banned':
      return 'Banned';
    default:
      return status;
  }
};

const getRoleBadgeClass = (role: AdminUserRole) => {
  switch (role) {
    case 'admin':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-500';
    case 'developer':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-500';
    case 'customer':
    default:
      return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400';
  }
};

const getStatusBadgeClass = (status: AdminUserStatus) => {
  switch (status) {
    case 'active':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500';
    case 'inactive':
      return 'border-slate-300 bg-slate-200/70 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400';
    case 'suspended':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-500';
    case 'banned':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-500';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-600';
  }
};

const formatCreatedDate = (createdAt?: string) => {
  if (!createdAt) {
    return 'Unavailable';
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unavailable';
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getAvatarInitials = (fullName: string, username: string) => {
  const source = fullName.trim() || username.trim() || 'GL';
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unable to update this user right now.';
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const StatusBadge: React.FC<{ status: AdminUserStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(status)}`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {getStatusLabel(status)}
  </span>
);

const RoleBadge: React.FC<{ role: AdminUserRole }> = ({ role }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getRoleBadgeClass(role)}`}
  >
    {getRoleLabel(role)}
  </span>
);

const UserAvatar: React.FC<{
  avatarUrl?: string;
  fullName: string;
  username: string;
  size?: 'sm' | 'lg';
}> = ({ avatarUrl, fullName, username, size = 'sm' }) => {
  const sizeClasses = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-xs';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName || username}
        className={`${sizeClasses} rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-slate-800`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} flex items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-300/20 via-slate-100 to-sky-200/30 font-display font-bold text-slate-700 dark:border-slate-800 dark:from-amber-500/10 dark:via-slate-900 dark:to-sky-500/10 dark:text-slate-200`}
    >
      {getAvatarInitials(fullName, username)}
    </div>
  );
};

const FilterSelect: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="space-y-1">
    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={filterSelectClassName}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const AdminUserManagementPanel: React.FC<AdminUserManagementPanelProps> = ({
  users,
  isLoading,
  error,
  currentUserEmail,
  onRefresh,
  onUpdateUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '' });
  const [roleDraft, setRoleDraft] = useState<AdminUserRole>('customer');
  const [banReason, setBanReason] = useState('');

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedUser && dialogMode) {
      setDialogMode(null);
      setSelectedUserId(null);
      setActionError(null);
    }
  }, [dialogMode, selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setActionError(null);

    if (dialogMode === 'edit') {
      setEditForm({
        fullName: selectedUser.fullName,
        email: selectedUser.email,
      });
    }

    if (dialogMode === 'role') {
      setRoleDraft(selectedUser.role);
    }

    if (dialogMode === 'ban') {
      setBanReason('');
    }
  }, [dialogMode, selectedUser]);

  const filteredUsers = users.filter((user) => {
    const searchable = `${user.fullName} ${user.email}`.toLowerCase();
    const matchesSearch = !debouncedSearch || searchable.includes(debouncedSearch);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const openDialog = (userId: string, mode: Exclude<DialogMode, null>) => {
    setSelectedUserId(userId);
    setDialogMode(mode);
  };

  const closeAllDialogs = () => {
    setDialogMode(null);
    setSelectedUserId(null);
    setActionError(null);
    setBanReason('');
  };

  const goBackToDetail = () => {
    setDialogMode('detail');
    setActionError(null);
    setBanReason('');
  };

  const submitUserUpdate = async (payload: AdminUserUpdateInput, nextMode: DialogMode = 'detail') => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      await onUpdateUser(payload);
      setDialogMode(nextMode);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!selectedUser) {
      return;
    }

    const fullName = editForm.fullName.trim();
    const email = editForm.email.trim();

    if (!fullName) {
      setActionError('Full name is required.');
      return;
    }

    if (!emailPattern.test(email)) {
      setActionError('Please enter a valid email address.');
      return;
    }

    await submitUserUpdate({
      id: selectedUser.id,
      fullName,
      email,
      role: selectedUser.role,
      status: selectedUser.status,
    });
  };

  const handleRoleSave = async () => {
    if (!selectedUser) {
      return;
    }

    await submitUserUpdate({
      id: selectedUser.id,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: roleDraft,
      status: selectedUser.status,
    });
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) {
      return;
    }

    await submitUserUpdate({
      id: selectedUser.id,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: selectedUser.role,
      status: 'suspended',
    });
  };

  const handleActivateUser = async () => {
    if (!selectedUser) {
      return;
    }

    await submitUserUpdate({
      id: selectedUser.id,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: selectedUser.role,
      status: 'active',
    });
  };

  const handleBanUser = async () => {
    if (!selectedUser) {
      return;
    }

    const trimmedReason = banReason.trim();
    if (!trimmedReason) {
      setActionError('Ban reason is required.');
      return;
    }

    await submitUserUpdate({
      id: selectedUser.id,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: selectedUser.role,
      status: 'banned',
      banReason: trimmedReason,
    });
  };

  const renderActionError = actionError ? (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-500">
      {actionError}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
            User Management
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search accounts, inspect details, and manage roles or account access without deleting users.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={onRefresh}
          className="self-start lg:self-auto"
        >
          Refresh
        </Button>
      </div>

      <div className="rounded-[24px] border border-slate-200/90 bg-slate-50/75 p-4 shadow-[0_14px_30px_rgba(148,163,184,0.1)] dark:border-slate-800/70 dark:bg-slate-950/20 dark:shadow-none">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_170px_170px] xl:items-end">
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Search User
            </span>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </label>

          <FilterSelect
            label="Role Filter"
            value={roleFilter}
            options={roleOptions}
            onChange={(value) => setRoleFilter(value as RoleFilter)}
          />
          <FilterSelect
            label="Status Filter"
            value={statusFilter}
            options={statusOptions}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-medium dark:border-slate-800/80 dark:bg-slate-950/90">
            {filteredUsers.length} matching users
          </span>
          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="text-[11px] font-medium text-amber-500 transition-studio hover:text-amber-400"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <RefreshCw className="animate-spin" size={18} /> Loading platform users...
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
          <p className="font-semibold">Error loading users: {error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            Try Again
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-slate-200/90 bg-white/92 shadow-[0_16px_36px_rgba(148,163,184,0.1)] dark:border-slate-800 dark:bg-slate-950/25 dark:shadow-none">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-400">
                <th className="p-3">Avatar</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created Date</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No users match the current search and filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentUser = currentUserEmail?.toLowerCase() === user.email.toLowerCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/10">
                      <td className="p-3">
                        <UserAvatar
                          avatarUrl={user.avatarUrl}
                          fullName={user.fullName}
                          username={user.username}
                        />
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {user.fullName}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                                You
                              </span>
                            )}
                            {user.isSoftDeleted && (
                              <span className="rounded-full border border-slate-300 bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            @{user.username || user.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                      <td className="p-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="p-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-350">
                        {formatCreatedDate(user.createdAt)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={<Eye size={14} />}
                            onClick={() => openDialog(user.id, 'detail')}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdminDialog
        isOpen={dialogMode === 'detail' && !!selectedUser}
        onClose={closeAllDialogs}
        title="User Detail"
        description="Review account information and take administrative actions."
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <UserRound size={14} />
                User Information
              </div>

              <div className="grid gap-5 lg:grid-cols-[auto,1fr]">
                <UserAvatar
                  avatarUrl={selectedUser.avatarUrl}
                  fullName={selectedUser.fullName}
                  username={selectedUser.username}
                  size="lg"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Full Name</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedUser.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Email</p>
                    <p className="break-all font-medium text-slate-700 dark:text-slate-200">{selectedUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Role</p>
                    <RoleBadge role={selectedUser.role} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</p>
                    <StatusBadge status={selectedUser.status} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Created Date</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {formatCreatedDate(selectedUser.createdAt)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">User ID</p>
                    <p className="break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedUser.id}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <ShieldCheck size={14} />
                Actions
              </div>

              {renderActionError}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  className={dialogActionClasses}
                  onClick={() => setDialogMode('edit')}
                  disabled={selectedUser.isSoftDeleted || isSubmitting}
                >
                  <PencilLine size={18} className="mt-0.5 text-sky-500" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Edit User</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Update full name and email address.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={dialogActionClasses}
                  onClick={() => setDialogMode('role')}
                  disabled={selectedUser.isSoftDeleted || isSubmitting}
                >
                  <UserCog size={18} className="mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Change Role</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Assign admin, developer, or customer access.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={dialogActionClasses}
                  onClick={() => setDialogMode('suspend')}
                  disabled={
                    selectedUser.isSoftDeleted ||
                    selectedUser.status !== 'active' ||
                    isSubmitting
                  }
                >
                  <ShieldCheck size={18} className="mt-0.5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Suspend User</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Temporarily block access without deleting the account.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={dialogActionClasses}
                  onClick={handleActivateUser}
                  disabled={
                    selectedUser.isSoftDeleted ||
                    selectedUser.status === 'active' ||
                    isSubmitting
                  }
                >
                  <ShieldCheck size={18} className="mt-0.5 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Activate User</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Restore access for suspended or banned accounts.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={dialogActionClasses}
                  onClick={() => setDialogMode('ban')}
                  disabled={
                    selectedUser.isSoftDeleted ||
                    selectedUser.status === 'banned' ||
                    isSubmitting
                  }
                >
                  <Ban size={18} className="mt-0.5 text-rose-500" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Ban User</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Permanently block account access with a required reason.
                    </p>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'edit' && !!selectedUser}
        onClose={goBackToDetail}
        title="Edit User"
        description="Update the user's primary identity details."
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full Name"
              value={editForm.fullName}
              onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="Enter full name"
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Enter email address"
            />
          </div>

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSave} disabled={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'role' && !!selectedUser}
        onClose={goBackToDetail}
        title="Change Role"
        description="Assign the appropriate role for this account."
      >
        <div className="space-y-5">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">Role</span>
            <select
              value={roleDraft}
              onChange={(event) => setRoleDraft(event.target.value as AdminUserRole)}
              className={selectClassName}
            >
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="customer">Customer</option>
            </select>
          </label>

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRoleSave} disabled={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'suspend' && !!selectedUser}
        onClose={goBackToDetail}
        title="Suspend User"
        description="Temporarily block account access while preserving account data."
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-600 dark:text-orange-300">
            Are you sure you want to suspend this user?
          </div>

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSuspendUser}
              disabled={isSubmitting}
              className="border-orange-300 bg-orange-500 text-white shadow-[0_4px_0_0_#9a3412] hover:bg-orange-400 hover:shadow-[0_3px_0_0_#9a3412]"
            >
              Confirm
            </Button>
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'ban' && !!selectedUser}
        onClose={goBackToDetail}
        title="Ban User"
        description="Ban this account and record the reason for the action."
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
            Confirm banning this user. A ban reason is required before continuing.
          </div>

          <TextArea
            label="Ban Reason"
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder="Describe why this account is being banned..."
            rows={5}
          />

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBanUser}
              disabled={isSubmitting}
              className="border-rose-700 bg-rose-600 text-white shadow-[0_4px_0_0_#881337] hover:bg-rose-500 hover:shadow-[0_3px_0_0_#881337]"
            >
              Confirm Ban
            </Button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
};
