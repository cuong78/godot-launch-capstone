import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Cloud, HardDrive, Plus, Trash2, RefreshCw, Save,
  Check, AlertCircle, Loader2, Database, Server, Pencil, X
} from 'lucide-react';
import {
  storageApi,
  StorageAccountResponse,
  StorageBucketResponse,
  StorageRoutingResponse,
  StorageAccountRequest,
} from '../api/storageApi';

// ── Draggable FileType card ───────────────────────────────────────────────────
function DraggableFileType({ fileType, routing }: {
  fileType: string;
  routing?: StorageRoutingResponse;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: fileType });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging
          ? 'opacity-40 border-amber-400 bg-amber-400/10'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-amber-400/50'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-amber-400">⠿</span>
        <span className="text-xs font-semibold text-slate-200 truncate">{fileType}</span>
      </div>
      {routing ? (
        <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
          routing.provider === 'aws_s3'
            ? 'bg-orange-400/10 border-orange-400/30 text-orange-300'
            : 'bg-blue-400/10 border-blue-400/30 text-blue-300'
        }`}>
          {routing.bucketName}
        </span>
      ) : (
        <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-600 text-slate-500">
          unassigned
        </span>
      )}
    </div>
  );
}

// ── Droppable Bucket zone ─────────────────────────────────────────────────────
function DroppableBucket({ bucket, assignedTypes }: {
  bucket: StorageBucketResponse;
  assignedTypes: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id });
  const isS3 = bucket.provider === 'aws_s3';
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 transition-all p-4 min-h-[120px] ${
        isOver
          ? 'border-amber-400 bg-amber-400/5 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
          : 'border-slate-700/50 bg-slate-800/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isS3 ? (
          <Cloud size={14} className="text-orange-400 shrink-0" />
        ) : (
          <Server size={14} className="text-blue-400 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-200 truncate">{bucket.name}</p>
          <p className="text-[10px] text-slate-500 truncate">{bucket.accountName} · {bucket.provider}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {assignedTypes.length === 0 && (
          <p className="text-[10px] text-slate-600 italic">Kéo file type vào đây...</p>
        )}
        {assignedTypes.map(ft => (
          <span key={ft} className="text-[10px] font-mono bg-slate-700/60 border border-slate-600/50 text-slate-300 px-1.5 py-0.5 rounded">
            {ft}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── AWS S3 Form ───────────────────────────────────────────────────────────────
interface S3FormState {
  accountName: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

function AwsS3Tab({
  accounts, buckets, onRefresh, onMsg,
}: {
  accounts: StorageAccountResponse[];
  buckets: StorageBucketResponse[];
  onRefresh: () => void;
  onMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<S3FormState>({
    accountName: '', bucket: '', region: 'ap-southeast-1', accessKey: '', secretKey: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<S3FormState>({
    accountName: '', bucket: '', region: 'ap-southeast-1', accessKey: '', secretKey: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  const s3Accounts = accounts.filter(a => a.provider === 'aws_s3');
  const s3Buckets = buckets.filter(b => b.provider === 'aws_s3');

  const startEdit = (acc: StorageAccountResponse) => {
    const bkt = s3Buckets.find(b => b.accountId === acc.id);
    setEditingId(acc.id);
    setEditForm({
      accountName: acc.name,
      bucket: bkt?.name ?? '',
      region: bkt?.region ?? 'ap-southeast-1',
      accessKey: '',
      secretKey: '',
    });
    setShowForm(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setEditSaving(true);
    try {
      const hasNewCredentials = editForm.accessKey.trim() !== '' && editForm.secretKey.trim() !== '';

      if (hasNewCredentials) {
        // Gửi toàn bộ config mới (kèm credentials mới)
        const config = JSON.stringify({
          bucket: editForm.bucket,
          region: editForm.region,
          accessKey: editForm.accessKey,
          secretKey: editForm.secretKey,
        });
        const res = await storageApi.updateAccount(editingId, {
          name: editForm.accountName, provider: 'aws_s3', config, isActive: true,
        });
        if (!res.success) { onMsg('error', 'Cập nhật thất bại.'); return; }
      } else {
        // Chỉ đổi tên — không đụng credentials đã encrypt trong DB
        await storageApi.renameAccount(editingId, editForm.accountName);
      }

      // Cập nhật bucket name/region nếu thay đổi
      const bkt = s3Buckets.find(b => b.accountId === editingId);
      if (bkt && (bkt.name !== editForm.bucket || bkt.region !== editForm.region)) {
        await storageApi.deleteBucket(bkt.id);
        await storageApi.createBucket({
          accountId: editingId, name: editForm.bucket, region: editForm.region,
        });
      }

      onMsg('success', `Đã cập nhật "${editForm.accountName}".`);
      setEditingId(null);
      onRefresh();
    } catch {
      onMsg('error', 'Cập nhật thất bại.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.accountName || !form.bucket || !form.region || !form.accessKey || !form.secretKey) {
      onMsg('error', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setSaving(true);
    try {
      const config = JSON.stringify({
        bucket: form.bucket,
        region: form.region,
        accessKey: form.accessKey,
        secretKey: form.secretKey,
      });
      const accReq: StorageAccountRequest = {
        name: form.accountName, provider: 'aws_s3', config, isActive: true,
      };
      const accRes = await storageApi.createAccount(accReq);
      if (!accRes.success) { onMsg('error', 'Tạo account thất bại.'); return; }

      // Auto-create bucket từ config
      const bktRes = await storageApi.createBucket({
        accountId: accRes.data.id,
        name: form.bucket,
        region: form.region,
      });
      if (!bktRes.success) { onMsg('error', 'Account đã tạo nhưng không tạo được bucket.'); return; }

      onMsg('success', `AWS S3 "${form.accountName}" đã được thêm với bucket "${form.bucket}".`);
      setShowForm(false);
      setForm({ accountName: '', bucket: '', region: 'ap-southeast-1', accessKey: '', secretKey: '' });
      onRefresh();
    } catch {
      onMsg('error', 'Tạo AWS S3 thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Xóa account này sẽ xóa bucket và routing liên quan. Tiếp tục?')) return;
    await storageApi.deleteAccount(id);
    onMsg('success', 'Đã xóa.');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-400/10 border border-orange-400/20 text-orange-400 text-xs font-semibold hover:bg-orange-400/20 transition-all"
      >
        <Plus size={13} /> Thêm AWS S3
      </button>

      {showForm && (
        <div className="p-4 rounded-xl border border-orange-400/20 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2">
            <Cloud size={14} className="text-orange-400" />
            <p className="text-xs font-bold text-orange-400">Cấu hình AWS S3</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Tên account <span className="text-rose-400">*</span></label>
              <input
                value={form.accountName}
                onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))}
                placeholder="VD: AWS Production"
                className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Bucket name <span className="text-rose-400">*</span></label>
              <input
                value={form.bucket}
                onChange={e => setForm(p => ({ ...p, bucket: e.target.value }))}
                placeholder="godot-launch-storage"
                className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Region <span className="text-rose-400">*</span></label>
            <select
              value={form.region}
              onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
            >
              <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
              <option value="ap-southeast-2">ap-southeast-2 (Sydney)</option>
              <option value="ap-northeast-1">ap-northeast-1 (Tokyo)</option>
              <option value="us-east-1">us-east-1 (N. Virginia)</option>
              <option value="us-west-2">us-west-2 (Oregon)</option>
              <option value="eu-west-1">eu-west-1 (Ireland)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Access Key ID <span className="text-rose-400">*</span></label>
              <input
                value={form.accessKey}
                onChange={e => setForm(p => ({ ...p, accessKey: e.target.value }))}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Secret Access Key <span className="text-rose-400">*</span></label>
              <input
                type="password"
                value={form.secretKey}
                onChange={e => setForm(p => ({ ...p, secretKey: e.target.value }))}
                placeholder="••••••••••••••••••••"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            Credentials sẽ được mã hóa AES-256 trước khi lưu vào database.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-400 text-slate-900 text-xs font-bold hover:bg-orange-300 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Cloud size={11} />}
              Thêm AWS S3
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Danh sách S3 accounts */}
      <div className="space-y-2">
        {s3Accounts.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Chưa có AWS S3 account nào.</p>
        )}
        {s3Accounts.map(acc => {
          const accBuckets = s3Buckets.filter(b => b.accountId === acc.id);
          const isEditing = editingId === acc.id;
          return (
            <div key={acc.id} className="rounded-xl border border-slate-700/40 bg-slate-800/40 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Cloud size={15} className="text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{acc.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {accBuckets.length > 0
                        ? `${accBuckets[0].name} · ${accBuckets[0].region}`
                        : 'aws_s3'
                      } · {acc.isActive ? 'active' : 'inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => isEditing ? setEditingId(null) : startEdit(acc)}
                    className={`p-1.5 rounded-lg transition-all ${
                      isEditing
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-slate-500 hover:text-amber-400 hover:bg-amber-400/10'
                    }`}
                    title={isEditing ? 'Đóng' : 'Chỉnh sửa'}
                  >
                    {isEditing ? <X size={13} /> : <Pencil size={13} />}
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-700/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Tên account</label>
                      <input
                        value={editForm.accountName}
                        onChange={e => setEditForm(p => ({ ...p, accountName: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Bucket name</label>
                      <input
                        value={editForm.bucket}
                        onChange={e => setEditForm(p => ({ ...p, bucket: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Region</label>
                    <select
                      value={editForm.region}
                      onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
                    >
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                      <option value="ap-southeast-2">ap-southeast-2 (Sydney)</option>
                      <option value="ap-northeast-1">ap-northeast-1 (Tokyo)</option>
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="us-west-2">us-west-2 (Oregon)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Access Key ID</label>
                      <input
                        value={editForm.accessKey}
                        onChange={e => setEditForm(p => ({ ...p, accessKey: e.target.value }))}
                        placeholder="Để trống nếu không đổi"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Secret Access Key</label>
                      <input
                        type="password"
                        value={editForm.secretKey}
                        onChange={e => setEditForm(p => ({ ...p, secretKey: e.target.value }))}
                        placeholder="Để trống nếu không đổi"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">Để trống Access Key / Secret Key nếu không muốn thay đổi credentials.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={editSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-400 text-slate-900 text-xs font-bold hover:bg-orange-300 transition-colors disabled:opacity-60"
                    >
                      {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      Lưu thay đổi
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SeaweedFS Form ────────────────────────────────────────────────────────────
interface SeaweedAccountFormState {
  accountName: string;
  filerHost: string;
  filerGrpcPort: string;
  filerHttpPort: string;
  firstBasePath: string;
}

interface SeaweedBucketFormState {
  accountId: string;
  basePath: string;
}

function SeaweedFsTab({
  accounts, buckets, onRefresh, onMsg,
}: {
  accounts: StorageAccountResponse[];
  buckets: StorageBucketResponse[];
  onRefresh: () => void;
  onMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [accountForm, setAccountForm] = useState<SeaweedAccountFormState>({
    accountName: '', filerHost: 'localhost', filerGrpcPort: '18888',
    filerHttpPort: '8888', firstBasePath: '/godotlaunch',
  });
  const [bucketForm, setBucketForm] = useState<SeaweedBucketFormState>({ accountId: '', basePath: '' });
  const [saving, setSaving] = useState(false);

  const seaweedAccounts = accounts.filter(a => a.provider === 'seaweedfs');
  const seaweedBuckets = buckets.filter(b => b.provider === 'seaweedfs');

  const handleCreateAccount = async () => {
    if (!accountForm.accountName || !accountForm.filerHost) {
      onMsg('error', 'Vui lòng điền tên account và Filer Host.');
      return;
    }
    setSaving(true);
    try {
      const config = JSON.stringify({
        filerHost: accountForm.filerHost,
        filerGrpcPort: parseInt(accountForm.filerGrpcPort) || 18888,
        filerHttpPort: parseInt(accountForm.filerHttpPort) || 8888,
        basePath: accountForm.firstBasePath || '/godotlaunch',
      });
      const accRes = await storageApi.createAccount({
        name: accountForm.accountName, provider: 'seaweedfs', config, isActive: true,
      });
      if (!accRes.success) { onMsg('error', 'Tạo account thất bại.'); return; }

      // Auto-create bucket đầu tiên từ basePath
      await storageApi.createBucket({
        accountId: accRes.data.id,
        name: accountForm.firstBasePath,
        publicUrl: `http://${accountForm.filerHost}:${accountForm.filerHttpPort}`,
      });

      onMsg('success', `SeaweedFS "${accountForm.accountName}" đã được thêm.`);
      setShowAccountForm(false);
      setAccountForm({ accountName: '', filerHost: 'localhost', filerGrpcPort: '18888', filerHttpPort: '8888', firstBasePath: '/godotlaunch' });
      onRefresh();
    } catch {
      onMsg('error', 'Tạo SeaweedFS thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBucket = async () => {
    if (!bucketForm.accountId || !bucketForm.basePath) {
      onMsg('error', 'Chọn account và nhập basePath.');
      return;
    }
    try {
      const acc = accounts.find(a => a.id === bucketForm.accountId);
      const res = await storageApi.createBucket({
        accountId: bucketForm.accountId,
        name: bucketForm.basePath,
        publicUrl: acc ? `(from account config)` : undefined,
      });
      if (res.success) {
        onMsg('success', `Bucket "${bucketForm.basePath}" đã được thêm.`);
        setShowBucketForm(false);
        setBucketForm({ accountId: '', basePath: '' });
        onRefresh();
      }
    } catch { onMsg('error', 'Tạo bucket thất bại.'); }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Xóa account này sẽ xóa tất cả buckets liên quan. Tiếp tục?')) return;
    await storageApi.deleteAccount(id);
    onMsg('success', 'Đã xóa.');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => { setShowAccountForm(v => !v); setShowBucketForm(false); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-400/10 border border-blue-400/20 text-blue-400 text-xs font-semibold hover:bg-blue-400/20 transition-all"
        >
          <Plus size={13} /> Thêm SeaweedFS Server
        </button>
        {seaweedAccounts.length > 0 && (
          <button
            onClick={() => { setShowBucketForm(v => !v); setShowAccountForm(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700/60 border border-slate-600/40 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all"
          >
            <HardDrive size={13} /> Thêm Bucket Path
          </button>
        )}
      </div>

      {/* Form: Thêm SeaweedFS Server */}
      {showAccountForm && (
        <div className="p-4 rounded-xl border border-blue-400/20 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-blue-400" />
            <p className="text-xs font-bold text-blue-400">Cấu hình SeaweedFS</p>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Tên account <span className="text-rose-400">*</span></label>
            <input
              value={accountForm.accountName}
              onChange={e => setAccountForm(p => ({ ...p, accountName: e.target.value }))}
              placeholder="VD: SeaweedFS Local, SeaweedFS Production"
              className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Filer Host <span className="text-rose-400">*</span></label>
              <input
                value={accountForm.filerHost}
                onChange={e => setAccountForm(p => ({ ...p, filerHost: e.target.value }))}
                placeholder="localhost"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">gRPC Port</label>
              <input
                value={accountForm.filerGrpcPort}
                onChange={e => setAccountForm(p => ({ ...p, filerGrpcPort: e.target.value }))}
                placeholder="18888"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">HTTP Port</label>
              <input
                value={accountForm.filerHttpPort}
                onChange={e => setAccountForm(p => ({ ...p, filerHttpPort: e.target.value }))}
                placeholder="8888"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Base Path (bucket đầu tiên)</label>
            <input
              value={accountForm.firstBasePath}
              onChange={e => setAccountForm(p => ({ ...p, firstBasePath: e.target.value }))}
              placeholder="/godotlaunch"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
            />
            <p className="text-[10px] text-slate-500 mt-1">File sẽ upload vào: http://{accountForm.filerHost}:{accountForm.filerHttpPort}{accountForm.firstBasePath}/...</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateAccount}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-400 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Server size={11} />}
              Thêm SeaweedFS
            </button>
            <button
              onClick={() => setShowAccountForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Form: Thêm bucket path */}
      {showBucketForm && (
        <div className="p-4 rounded-xl border border-slate-600/40 bg-slate-900/60 space-y-3">
          <p className="text-xs font-bold text-slate-300">Thêm Bucket Path</p>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">SeaweedFS Server</label>
            <select
              value={bucketForm.accountId}
              onChange={e => setBucketForm(p => ({ ...p, accountId: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
            >
              <option value="">-- Chọn server --</option>
              {seaweedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Base Path</label>
            <input
              value={bucketForm.basePath}
              onChange={e => setBucketForm(p => ({ ...p, basePath: e.target.value }))}
              placeholder="/godotlaunch-media"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateBucket}
              className="px-4 py-2 rounded-lg bg-slate-600 text-slate-200 text-xs font-bold hover:bg-slate-500 transition-colors"
            >
              Thêm Bucket
            </button>
            <button
              onClick={() => setShowBucketForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Danh sách SeaweedFS accounts */}
      <div className="space-y-3">
        {seaweedAccounts.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Chưa có SeaweedFS server nào.</p>
        )}
        {seaweedAccounts.map(acc => {
          const accBuckets = seaweedBuckets.filter(b => b.accountId === acc.id);
          return (
            <div key={acc.id} className="rounded-xl border border-slate-700/40 bg-slate-800/40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
                <div className="flex items-center gap-3 min-w-0">
                  <Server size={15} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{acc.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">seaweedfs · {acc.isActive ? 'active' : 'inactive'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {accBuckets.length > 0 && (
                <div className="px-4 py-2 space-y-1">
                  {accBuckets.map(b => (
                    <div key={b.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <HardDrive size={11} className="text-slate-500" />
                        <span className="text-[10px] font-mono text-slate-400">{b.name}</span>
                      </div>
                      <button
                        onClick={() => storageApi.deleteBucket(b.id).then(onRefresh)}
                        className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminStoragePanel() {
  const [activeTab, setActiveTab] = useState<'aws_s3' | 'seaweedfs' | 'routing'>('aws_s3');
  const [accounts, setAccounts] = useState<StorageAccountResponse[]>([]);
  const [buckets, setBuckets] = useState<StorageBucketResponse[]>([]);
  const [routing, setRouting] = useState<StorageRoutingResponse[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pendingRouting, setPendingRouting] = useState<Record<string, string>>({});
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [isSavingRouting, setIsSavingRouting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accRes, bktRes, rtRes, ftRes] = await Promise.all([
        storageApi.listAccounts(),
        storageApi.listBuckets(),
        storageApi.listRouting(),
        storageApi.listFileTypes(),
      ]);
      if (accRes.success) setAccounts(accRes.data);
      if (bktRes.success) setBuckets(bktRes.data);
      if (rtRes.success) setRouting(rtRes.data);
      if (ftRes.success) setFileTypes(ftRes.data);
    } catch {
      showMsg('error', 'Không thể tải dữ liệu storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveDrag(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    if (!e.over) return;
    setPendingRouting(prev => ({ ...prev, [e.active.id as string]: e.over!.id as string }));
  };

  const handleSaveRouting = async () => {
    if (Object.keys(pendingRouting).length === 0) return;
    setIsSavingRouting(true);
    try {
      const items = Object.entries(pendingRouting).map(([fileType, bucketId]) => ({ fileType, bucketId }));
      const res = await storageApi.batchUpdateRouting(items);
      if (res.success) {
        showMsg('success', `Đã lưu ${items.length} routing.`);
        setPendingRouting({});
        loadAll();
      }
    } catch { showMsg('error', 'Lưu routing thất bại.'); }
    finally { setIsSavingRouting(false); }
  };

  const getEffectiveRouting = (fileType: string): StorageRoutingResponse | undefined => {
    const pendingBucketId = pendingRouting[fileType];
    if (pendingBucketId) {
      const bucket = buckets.find(b => b.id === pendingBucketId);
      if (bucket) return {
        fileType, bucketId: bucket.id, bucketName: bucket.name,
        accountId: bucket.accountId, accountName: bucket.accountName,
        provider: bucket.provider, updatedAt: new Date().toISOString(),
      };
    }
    return routing.find(r => r.fileType === fileType);
  };

  const getAssignedFileTypes = (bucketId: string) =>
    fileTypes.filter(ft => getEffectiveRouting(ft)?.bucketId === bucketId);

  const hasPendingChanges = Object.keys(pendingRouting).length > 0;

  const s3Count = accounts.filter(a => a.provider === 'aws_s3').length;
  const seaweedCount = accounts.filter(a => a.provider === 'seaweedfs').length;

  const tabClass = (tab: typeof activeTab) =>
    `px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
      activeTab === tab
        ? 'bg-amber-400 text-slate-900'
        : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <Database size={16} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-white">Storage Management</h2>
            <p className="text-[10px] text-slate-500 font-mono">Quản lý AWS S3 & SeaweedFS</p>
          </div>
        </div>
        <button onClick={loadAll} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-amber-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {msg.type === 'success' ? <Check size={13} /> : <AlertCircle size={13} />}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
        <button className={tabClass('aws_s3')} onClick={() => setActiveTab('aws_s3')}>
          <Cloud size={11} className="inline mr-1.5" />AWS S3 ({s3Count})
        </button>
        <button className={tabClass('seaweedfs')} onClick={() => setActiveTab('seaweedfs')}>
          <Server size={11} className="inline mr-1.5" />SeaweedFS ({seaweedCount})
        </button>
        <button className={tabClass('routing')} onClick={() => setActiveTab('routing')}>
          <RefreshCw size={11} className="inline mr-1.5" />Routing
          {hasPendingChanges && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
        </button>
      </div>

      {/* ── Tab: AWS S3 ── */}
      {activeTab === 'aws_s3' && (
        <AwsS3Tab
          accounts={accounts}
          buckets={buckets}
          onRefresh={loadAll}
          onMsg={showMsg}
        />
      )}

      {/* ── Tab: SeaweedFS ── */}
      {activeTab === 'seaweedfs' && (
        <SeaweedFsTab
          accounts={accounts}
          buckets={buckets}
          onRefresh={loadAll}
          onMsg={showMsg}
        />
      )}

      {/* ── Tab: Routing (Drag & Drop) ── */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Kéo <span className="text-amber-400 font-semibold">File Type</span> vào <span className="text-amber-400 font-semibold">Bucket</span> để phân công lưu trữ.
            </p>
            {hasPendingChanges && (
              <button onClick={handleSaveRouting} disabled={isSavingRouting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-900 text-xs font-bold hover:bg-amber-300 transition-all disabled:opacity-60">
                {isSavingRouting ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Lưu {Object.keys(pendingRouting).length} thay đổi
              </button>
            )}
          </div>

          {buckets.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Thêm AWS S3 hoặc SeaweedFS trước để config routing.</p>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">File Types</p>
                  <div className="space-y-1.5">
                    {fileTypes.map(ft => (
                      <DraggableFileType key={ft} fileType={ft} routing={getEffectiveRouting(ft)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Buckets</p>
                  <div className="space-y-3">
                    {buckets.map(b => (
                      <DroppableBucket key={b.id} bucket={b} assignedTypes={getAssignedFileTypes(b.id)} />
                    ))}
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activeDrag && (
                  <div className="px-3 py-2 rounded-lg border border-amber-400 bg-amber-400/10 text-xs font-semibold text-amber-300 shadow-xl">
                    ⠿ {activeDrag}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
