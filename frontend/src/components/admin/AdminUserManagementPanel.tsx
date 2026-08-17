import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  ChevronDown,
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

const dialogActionClasses =
  'flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-studio hover:border-amber-300 hover:bg-amber-50/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/30 dark:hover:bg-slate-900';

const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

const filterSelectClassName =
  'w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-100';

const getRoleLabel = (role: AdminUserRole, t: (key: string) => string) => {
  switch (role) {
    case 'admin':
      return t('roles.admin');
    case 'developer':
      return t('roles.developer');
    case 'customer':
    default:
      return t('roles.customer');
  }
};

const getStatusLabel = (status: AdminUserStatus, t: (key: string) => string) => {
  switch (status) {
    case 'active':
      return t('status.user.active');
    case 'inactive':
      return t('status.user.inactive');
    case 'suspended':
      return t('status.user.suspended');
    case 'banned':
      return t('status.user.banned');
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

const formatCreatedDate = (createdAt: string | undefined, fallback: string) => {
  if (!createdAt) {
    return fallback;
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const StatusBadge: React.FC<{ status: AdminUserStatus; label: string }> = ({ status, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(status)}`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {label}
  </span>
);

const RoleBadge: React.FC<{ role: AdminUserRole; label: string }> = ({ role, label }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getRoleBadgeClass(role)}`}
  >
    {label}
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
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 relative w-full">
      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/92 px-3.5 py-2.5 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/90 dark:bg-slate-950/70 dark:text-white"
      >
        <span className="truncate">
          {options.find((opt) => opt.value === value)?.label || value}
        </span>
        <ChevronDown
          size={15}
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800/80 dark:bg-slate-950/95">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                  value === option.value
                    ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const AdminUserManagementPanel: React.FC<AdminUserManagementPanelProps> = ({
  users,
  isLoading,
  error,
  currentUserEmail,
  onRefresh,
  onUpdateUser,
}) => {
  const { t } = useTranslation(['admin']);
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
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  const roleOptions: Array<{ value: RoleFilter; label: string }> = [
    { value: 'all', label: t('userPanel.filterAll') },
    { value: 'admin', label: t('roles.admin') },
    { value: 'developer', label: t('roles.developer') },
    { value: 'customer', label: t('roles.customer') },
  ];

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: t('userPanel.filterAll') },
    { value: 'active', label: t('status.user.active') },
    { value: 'inactive', label: t('status.user.inactive') },
    { value: 'suspended', label: t('status.user.suspended') },
    { value: 'banned', label: t('status.user.banned') },
  ];

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
      setActionError(getErrorMessage(error, t('userPanel.updateError')));
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
      setActionError(t('userPanel.fullNameRequired'));
      return;
    }

    if (!emailPattern.test(email)) {
      setActionError(t('userPanel.invalidEmail'));
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
      setActionError(t('userPanel.banReasonRequired'));
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
            {t('userPanel.title')}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('userPanel.description')}
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
          {t('userPanel.refresh')}
        </Button>
      </div>

      <div className="rounded-[24px] border border-slate-200/90 bg-slate-50/75 p-4 shadow-[0_14px_30px_rgba(148,163,184,0.1)] dark:border-slate-800/70 dark:bg-slate-950/20 dark:shadow-none">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_170px_170px] xl:items-end">
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {t('userPanel.searchUser')}
            </span>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('userPanel.searchPlaceholder')}
                className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </label>

          <FilterSelect
            label={t('userPanel.roleFilter')}
            value={roleFilter}
            options={roleOptions}
            onChange={(value) => setRoleFilter(value as RoleFilter)}
          />
          <FilterSelect
            label={t('userPanel.statusFilter')}
            value={statusFilter}
            options={statusOptions}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-medium dark:border-slate-800/80 dark:bg-slate-950/90">
            {t('userPanel.matchingUsers', { count: filteredUsers.length })}
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
              {t('userPanel.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <RefreshCw className="animate-spin" size={18} /> {t('userPanel.loading')}
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
          <p className="font-semibold">{t('userPanel.loadError', { error })}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            {t('userPanel.tryAgain')}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-slate-200/90 bg-white/92 shadow-[0_16px_36px_rgba(148,163,184,0.1)] dark:border-slate-800 dark:bg-slate-950/25 dark:shadow-none">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-400">
                <th className="p-3">{t('userPanel.headers.avatar')}</th>
                <th className="p-3">{t('userPanel.headers.name')}</th>
                <th className="p-3">{t('userPanel.headers.email')}</th>
                <th className="p-3">{t('userPanel.headers.role')}</th>
                <th className="p-3">{t('userPanel.headers.status')}</th>
                <th className="p-3">{t('userPanel.headers.createdDate')}</th>
                <th className="p-3 text-center">{t('userPanel.headers.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t('userPanel.empty')}
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
                                {t('userPanel.you')}
                              </span>
                            )}
                            {user.isSoftDeleted && (
                              <span className="rounded-full border border-slate-300 bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                {t('userPanel.archived')}
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
                        <RoleBadge role={user.role} label={getRoleLabel(user.role, t)} />
                      </td>
                      <td className="p-3">
                        <StatusBadge status={user.status} label={getStatusLabel(user.status, t)} />
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-350">
                        {formatCreatedDate(user.createdAt, t('withdrawal.na'))}
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
                            {t('userPanel.view')}
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
        title={t('userPanel.detailTitle')}
        description={t('userPanel.detailDescription')}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <UserRound size={14} />
                {t('userPanel.userInformation')}
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userPanel.fullName')}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedUser.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userPanel.headers.email')}</p>
                    <p className="break-all font-medium text-slate-700 dark:text-slate-200">{selectedUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userPanel.headers.role')}</p>
                    <RoleBadge role={selectedUser.role} label={getRoleLabel(selectedUser.role, t)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userPanel.headers.status')}</p>
                    <StatusBadge status={selectedUser.status} label={getStatusLabel(selectedUser.status, t)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userPanel.createdDate')}</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {formatCreatedDate(selectedUser.createdAt, t('withdrawal.na'))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userPanel.userId')}</p>
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
                {t('userPanel.actionsTitle')}
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
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{t('userPanel.editUser')}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('userPanel.editUserHint')}
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
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{t('userPanel.changeRole')}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('userPanel.changeRoleHint')}
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
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{t('userPanel.suspendUser')}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('userPanel.suspendUserHint')}
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
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{t('userPanel.activateUser')}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('userPanel.activateUserHint')}
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
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{t('userPanel.banUser')}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('userPanel.banUserHint')}
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
        title={t('userPanel.editDialogTitle')}
        description={t('userPanel.editDialogDescription')}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('userPanel.fullName')}
              value={editForm.fullName}
              onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder={t('userPanel.fullNamePlaceholder')}
            />
            <Input
              label={t('userPanel.headers.email')}
              type="email"
              value={editForm.email}
              onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
              placeholder={t('userPanel.emailPlaceholder')}
            />
          </div>

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              {t('userPanel.cancel')}
            </Button>
            <Button type="button" onClick={handleEditSave} disabled={isSubmitting}>
              {t('userPanel.save')}
            </Button>
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'role' && !!selectedUser}
        onClose={goBackToDetail}
        title={t('userPanel.roleDialogTitle')}
        description={t('userPanel.roleDialogDescription')}
      >
        <div className="flex flex-col min-h-[260px] justify-between">
          <div className="space-y-2 mb-6">
            <label className="block text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
              {t('userPanel.headers.role')}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/92 px-4 py-3 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/90 dark:bg-slate-950/70 dark:text-white"
              >
                <span className="truncate font-medium">
                  {roleDraft === 'admin'
                    ? t('roles.admin')
                    : roleDraft === 'developer'
                    ? t('roles.developer')
                    : t('roles.customer')}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {roleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setRoleDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800/80 dark:bg-slate-950/95">
                    {[
                      { value: 'admin', label: t('roles.admin') },
                      { value: 'developer', label: t('roles.developer') },
                      { value: 'customer', label: t('roles.customer') },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setRoleDraft(opt.value as AdminUserRole);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 ${
                          roleDraft === opt.value
                            ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {renderActionError}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              {t('userPanel.cancel')}
            </Button>
            <Button type="button" onClick={handleRoleSave} disabled={isSubmitting}>
              {t('userPanel.save')}
            </Button>
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'suspend' && !!selectedUser}
        onClose={goBackToDetail}
        title={t('userPanel.suspendDialogTitle')}
        description={t('userPanel.suspendDialogDescription')}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-600 dark:text-orange-300">
            {t('userPanel.suspendConfirm')}
          </div>

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              {t('userPanel.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSuspendUser}
              disabled={isSubmitting}
              className="border-orange-300 bg-orange-500 text-white shadow-[0_4px_0_0_#9a3412] hover:bg-orange-400 hover:shadow-[0_3px_0_0_#9a3412]"
            >
              {t('userPanel.confirm')}
            </Button>
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        isOpen={dialogMode === 'ban' && !!selectedUser}
        onClose={goBackToDetail}
        title={t('userPanel.banDialogTitle')}
        description={t('userPanel.banDialogDescription')}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
            {t('userPanel.banConfirm')}
          </div>

          <TextArea
            label={t('userPanel.banReason')}
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder={t('userPanel.banReasonPlaceholder')}
            rows={5}
          />

          {renderActionError}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBackToDetail} disabled={isSubmitting}>
              {t('userPanel.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleBanUser}
              disabled={isSubmitting}
              className="border-rose-700 bg-rose-600 text-white shadow-[0_4px_0_0_#881337] hover:bg-rose-500 hover:shadow-[0_3px_0_0_#881337]"
            >
              {t('userPanel.confirmBan')}
            </Button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
};
