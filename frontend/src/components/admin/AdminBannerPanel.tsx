import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { bannerApi, BannerPayload, BannerResponse } from '../../api/bannerApi';
import { useToast } from '../../hooks/useToast';

const EMPTY_FORM: BannerPayload = {
  title: '',
  description: '',
  imageUrl: '',
  displayOrder: 0,
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const AdminBannerPanel: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { showConfirm } = useToast();
  const [banners, setBanners] = React.useState<BannerResponse[]>([]);
  const [form, setForm] = React.useState<BannerPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const loadBanners = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bannerApi.getAdminBanners();
      if (!response.success || !response.data) {
        throw new Error(response.message || t('bannerPanel.loadError'));
      }
      setBanners(response.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, t('bannerPanel.loadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(form.imageUrl);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile, form.imageUrl]);

  React.useEffect(() => {
    if (!success) return undefined;
    const timeout = window.setTimeout(() => setSuccess(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const startEdit = (banner: BannerResponse) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      description: banner.description,
      imageUrl: banner.imageUrl,
      displayOrder: banner.displayOrder,
    });
    setSelectedFile(null);
    setPreviewUrl(banner.imageUrl);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageUrl = form.imageUrl.trim();
      if (selectedFile) {
        const uploadResponse = await bannerApi.uploadImage(selectedFile);
        if (!uploadResponse.success || !uploadResponse.data?.imageUrl) {
          throw new Error(uploadResponse.message || t('bannerPanel.uploadError'));
        }
        imageUrl = uploadResponse.data.imageUrl;
      }
      if (!imageUrl) {
        throw new Error(t('bannerPanel.missingImage'));
      }

      const payload: BannerPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrl,
        displayOrder: Number(form.displayOrder),
      };
      const response = editingId
        ? await bannerApi.updateBanner(editingId, payload)
        : await bannerApi.createBanner(payload);
      if (!response.success) {
        throw new Error(response.message || t('bannerPanel.saveError'));
      }
      setSuccess(editingId ? t('bannerPanel.updateSuccess') : t('bannerPanel.createSuccess'));
      resetForm();
      await loadBanners();
    } catch (saveError) {
      setError(getErrorMessage(saveError, t('bannerPanel.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (banner: BannerResponse) => {
    showConfirm(t('bannerPanel.deleteConfirm', { title: banner.title }), async () => {
      setError(null);
      try {
        const response = await bannerApi.deleteBanner(banner.id);
        if (!response.success) {
          throw new Error(response.message || t('bannerPanel.deleteError'));
        }
        if (editingId === banner.id) resetForm();
        setSuccess(t('bannerPanel.deleteSuccess'));
        await loadBanners();
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, t('bannerPanel.deleteError')));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {t('bannerPanel.title')}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('bannerPanel.description')}
          </p>
        </div>
        <button
          type="button"
          onClick={loadBanners}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-400/50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('bannerPanel.refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {editingId ? t('bannerPanel.edit') : t('bannerPanel.add')}
            </h4>
            {editingId && (
              <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X size={15} /> {t('bannerPanel.cancelEdit')}
              </button>
            )}
          </div>

          <label className="block space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>{t('bannerPanel.fieldTitle')}</span>
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder={t('bannerPanel.titlePlaceholder')}
            />
          </label>

          <label className="block space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>{t('bannerPanel.fieldDescription')}</span>
            <textarea
              required
              maxLength={1000}
              rows={4}
              value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder={t('bannerPanel.descriptionPlaceholder')}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <label className="block space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>{t('bannerPanel.fieldImageUrl')}</span>
              <input
                value={form.imageUrl}
                onChange={(event) => setForm((previous) => ({ ...previous, imageUrl: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                placeholder={t('bannerPanel.imageUrlPlaceholder')}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>{t('bannerPanel.fieldDisplayOrder')}</span>
              <input
                required
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(event) => setForm((previous) => ({ ...previous, displayOrder: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-300">
            <UploadCloud size={18} />
            {selectedFile ? selectedFile.name : t('bannerPanel.uploadImage')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={17} className="animate-spin" /> : editingId ? <Pencil size={16} /> : <Plus size={17} />}
            {saving ? t('bannerPanel.saving') : editingId ? t('bannerPanel.update') : t('bannerPanel.create')}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-800">
          {previewUrl ? (
            <div className="relative h-full min-h-64">
              <img src={previewUrl} alt={t('bannerPanel.previewAlt')} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{t('bannerPanel.previewLabel')}</div>
                <div className="mt-2 font-display text-2xl font-black">{form.title || t('bannerPanel.previewTitleFallback')}</div>
                <p className="mt-2 line-clamp-3 text-sm text-white/75">{form.description || t('bannerPanel.previewDescriptionFallback')}</p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
              <ImageIcon size={34} />
              <span className="text-sm">{t('bannerPanel.previewEmpty')}</span>
            </div>
          )}
        </div>
      </form>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-slate-500">
          <LoaderCircle size={24} className="animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-700">
          {t('bannerPanel.empty')}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {banners.map((banner) => (
            <article key={banner.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
              <div className="relative h-44 overflow-hidden bg-slate-900">
                <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                  {t('bannerPanel.orderBadge', { order: banner.displayOrder })}
                </span>
                <h4 className="absolute inset-x-0 bottom-0 p-4 font-display text-xl font-bold text-white">{banner.title}</h4>
              </div>
              <div className="flex items-start justify-between gap-4 p-4">
                <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{banner.description}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => startEdit(banner)} className="rounded-lg p-2 text-sky-500 hover:bg-sky-500/10" aria-label={t('bannerPanel.editAria', { title: banner.title })}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => handleDelete(banner)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10" aria-label={t('bannerPanel.deleteAria', { title: banner.title })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
