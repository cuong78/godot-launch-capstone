import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FolderTree,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { AdminBannerPanel } from './AdminBannerPanel';
import {
  contentApi,
  ContentCategory,
  ContentCollection,
  ContentCollectionPayload,
  ContentTag,
  HomepageSection,
  HomepageSectionType,
} from '../../api/contentApi';

type Tab = 'layout' | 'banners' | 'collections' | 'tags' | 'categories';
type CategoryForm = {
  id: string;
  name: string;
  nameVi: string;
  nameEn: string;
  nameJa: string;
  slug: string;
  description: string;
  descriptionVi: string;
  descriptionEn: string;
  descriptionJa: string;
  type: string;
  parentId: string;
};
type CategoryTreeRow = { item: ContentCategory; depth: number; path: string };

const createEmptyCollection = (): ContentCollectionPayload => ({
  title: '',
  slug: '',
  description: '',
  maxItems: 10,
  active: true,
  tagIds: [],
  categoryIds: [],
});
const createEmptyCategory = (): CategoryForm => ({
  id: '',
  name: '',
  nameVi: '',
  nameEn: '',
  nameJa: '',
  slug: '',
  description: '',
  descriptionVi: '',
  descriptionEn: '',
  descriptionJa: '',
  type: 'asset',
  parentId: '',
});

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white/92 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/90 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500';
const cardClass =
  'rounded-2xl border border-slate-200/85 bg-white/80 shadow-[0_18px_45px_rgba(148,163,184,0.14)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none';
const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white/78 text-slate-500 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-transparent dark:bg-transparent dark:text-inherit dark:shadow-none dark:hover:border-slate-700 dark:hover:bg-slate-800';

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

const buildCategoryTree = (categories: ContentCategory[]): CategoryTreeRow[] => {
  const categoryIds = new Set(categories.map((category) => category.id));
  const children = new Map<string, ContentCategory[]>();
  const roots: ContentCategory[] = [];

  categories.forEach((category) => {
    if (!category.parentId || !categoryIds.has(category.parentId)) {
      roots.push(category);
      return;
    }
    const siblings = children.get(category.parentId) ?? [];
    siblings.push(category);
    children.set(category.parentId, siblings);
  });

  const sortByName = (items: ContentCategory[]) => items.sort((a, b) => a.name.localeCompare(b.name));
  const rows: CategoryTreeRow[] = [];
  const visited = new Set<string>();
  const walk = (item: ContentCategory, depth: number, parentPath: string) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    const path = parentPath ? `${parentPath} / ${item.name}` : item.name;
    rows.push({ item, depth, path });
    sortByName(children.get(item.id) ?? []).forEach((child) => walk(child, depth + 1, path));
  };

  sortByName(roots).forEach((root) => walk(root, 0, ''));
  sortByName(categories.filter((category) => !visited.has(category.id))).forEach((item) => walk(item, 0, ''));
  return rows;
};

const getSectionTypeLabel = (
  sectionType: HomepageSectionType,
  t: (key: string) => string,
) => {
  switch (sectionType) {
    case 'RECENT_RELEASES':
      return t('contentPanel.layout.sectionTypes.recentReleases');
    case 'FREE_CONTENT':
      return t('contentPanel.layout.sectionTypes.freeContent');
    case 'COLLECTION':
    default:
      return t('contentPanel.layout.sectionTypes.collection');
  }
};

const getCategoryTypeLabel = (type: string, t: (key: string) => string) =>
  type === 'game'
    ? t('contentPanel.categories.typeGameOption')
    : t('contentPanel.categories.typeAssetOption');

export const AdminContentManagementPanel: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [tab, setTab] = React.useState<Tab>('layout');
  const [collections, setCollections] = React.useState<ContentCollection[]>([]);
  const [sections, setSections] = React.useState<HomepageSection[]>([]);
  const [tags, setTags] = React.useState<ContentTag[]>([]);
  const [categories, setCategories] = React.useState<ContentCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyKey, setBusyKey] = React.useState('');
  const [error, setError] = React.useState('');

  const [collectionEditorOpen, setCollectionEditorOpen] = React.useState(false);
  const [editingCollection, setEditingCollection] = React.useState<string | null>(null);
  const [collectionForm, setCollectionForm] = React.useState<ContentCollectionPayload>(createEmptyCollection);
  const [newSectionCollectionId, setNewSectionCollectionId] = React.useState('');
  const [tagForm, setTagForm] = React.useState({ id: '', name: '', nameVi: '', nameEn: '', nameJa: '', slug: '' });
  const [categoryForm, setCategoryForm] = React.useState<CategoryForm>(createEmptyCategory);
  const [tagSearch, setTagSearch] = React.useState('');
  const [categorySearch, setCategorySearch] = React.useState('');
  const [contentTypeOpen, setContentTypeOpen] = React.useState(false);
  const [parentCategoryOpen, setParentCategoryOpen] = React.useState(false);
  const [layoutCollectionOpen, setLayoutCollectionOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [collectionRes, sectionRes, tagRes, categoryRes] = await Promise.all([
        contentApi.getCollections(),
        contentApi.getSections(),
        contentApi.getTags(),
        contentApi.getCategories(),
      ]);
      setCollections(collectionRes.data ?? []);
      setSections(sectionRes.data ?? []);
      setTags(tagRes.data ?? []);
      setCategories(categoryRes.data ?? []);
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.loadData')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { void load(); }, [load]);

  const categoryRows = React.useMemo(() => buildCategoryTree(categories), [categories]);
  const filteredTags = React.useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    return query ? tags.filter((tag) => `${tag.name} ${tag.slug}`.toLowerCase().includes(query)) : tags;
  }, [tagSearch, tags]);
  const filteredCategoryRows = React.useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return query ? categoryRows.filter(({ item, path }) => `${path} ${item.slug} ${item.type}`.toLowerCase().includes(query)) : categoryRows;
  }, [categoryRows, categorySearch]);

  const closeCollectionEditor = () => {
    setCollectionEditorOpen(false);
    setEditingCollection(null);
    setCollectionForm(createEmptyCollection());
  };

  const openCreateCollection = () => {
    setError('');
    setEditingCollection(null);
    setCollectionForm(createEmptyCollection());
    setCollectionEditorOpen(true);
  };

  const editCollection = (item: ContentCollection) => {
    setError('');
    setEditingCollection(item.id);
    setCollectionForm({
      title: item.title,
      slug: item.slug,
      description: item.description ?? '',
      maxItems: item.maxItems,
      active: item.active,
      tagIds: item.tags.map((tag) => tag.id),
      categoryIds: item.categories.map((category) => category.id),
    });
    setCollectionEditorOpen(true);
  };

  const saveCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusyKey('collection-save');
    try {
      if (editingCollection) await contentApi.updateCollection(editingCollection, collectionForm);
      else await contentApi.createCollection(collectionForm);
      closeCollectionEditor();
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.saveCollection')));
    } finally {
      setBusyKey('');
    }
  };

  const deleteCollection = async (item: ContentCollection) => {
    if (!window.confirm(t('contentPanel.collections.deleteConfirm', { title: item.title }))) return;
    setBusyKey(`collection-delete-${item.id}`);
    setError('');
    try {
      await contentApi.deleteCollection(item.id);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.deleteCollection')));
    } finally {
      setBusyKey('');
    }
  };

  const saveSection = async (section: HomepageSection, patch: Partial<HomepageSection> = {}, reload = true) => {
    const next = { ...section, ...patch };
    await contentApi.updateSection(section.id, {
      title: next.title,
      collectionId: next.collectionId,
      displayOrder: next.displayOrder,
      active: next.active,
    });
    if (reload) await load();
  };

  const moveSection = async (index: number, direction: -1 | 1) => {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= sections.length) return;
    const current = sections[index];
    const other = sections[otherIndex];
    setBusyKey('section-move');
    try {
      await Promise.all([
        saveSection(current, { displayOrder: other.displayOrder }, false),
        saveSection(other, { displayOrder: current.displayOrder }, false),
      ]);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.moveSection')));
    } finally {
      setBusyKey('');
    }
  };

  const saveTag = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyKey('tag-save');
    setError('');
    try {
      const payload = { 
        name: tagForm.name.trim(),
        nameVi: tagForm.nameVi.trim() || undefined,
        nameEn: tagForm.nameEn.trim() || undefined,
        nameJa: tagForm.nameJa.trim() || undefined,
        slug: tagForm.slug.trim() || slugify(tagForm.name) 
      };
      if (tagForm.id) await contentApi.updateTag(tagForm.id, payload);
      else await contentApi.createTag(payload);
      setTagForm({ id: '', name: '', nameVi: '', nameEn: '', nameJa: '', slug: '' });
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.saveTag')));
    } finally {
      setBusyKey('');
    }
  };

  const editTag = (item: ContentTag) => {
    setTagForm({
      id: item.id,
      name: item.defaultName ?? item.name,
      nameVi: item.nameVi ?? '',
      nameEn: item.nameEn ?? '',
      nameJa: item.nameJa ?? '',
      slug: item.slug
    });
    window.requestAnimationFrame(() => document.getElementById('tag-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const deleteTag = async (item: ContentTag) => {
    if (!window.confirm(t('contentPanel.tags.deleteConfirm', { name: item.name }))) return;
    setBusyKey(`tag-delete-${item.id}`);
    setError('');
    try {
      await contentApi.deleteTag(item.id);
      if (tagForm.id === item.id) setTagForm({ id: '', name: '', nameVi: '', nameEn: '', nameJa: '', slug: '' });
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.deleteTag')));
    } finally {
      setBusyKey('');
    }
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyKey('category-save');
    setError('');
    try {
      const payload = {
        name: categoryForm.name.trim(),
        nameVi: categoryForm.nameVi.trim() || undefined,
        nameEn: categoryForm.nameEn.trim() || undefined,
        nameJa: categoryForm.nameJa.trim() || undefined,
        slug: categoryForm.slug.trim() || slugify(categoryForm.name),
        description: categoryForm.description.trim(),
        descriptionVi: categoryForm.descriptionVi.trim() || undefined,
        descriptionEn: categoryForm.descriptionEn.trim() || undefined,
        descriptionJa: categoryForm.descriptionJa.trim() || undefined,
        type: categoryForm.type,
        parentId: categoryForm.parentId || undefined,
      };
      if (categoryForm.id) await contentApi.updateCategory(categoryForm.id, payload);
      else await contentApi.createCategory(payload);
      setCategoryForm(createEmptyCategory());
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.saveCategory')));
    } finally {
      setBusyKey('');
    }
  };

  const editCategory = (item: ContentCategory) => {
    setCategoryForm({
      id: item.id,
      name: item.defaultName ?? item.name,
      nameVi: item.nameVi ?? '',
      nameEn: item.nameEn ?? '',
      nameJa: item.nameJa ?? '',
      slug: item.slug,
      description: item.defaultDescription ?? item.description ?? '',
      descriptionVi: item.descriptionVi ?? '',
      descriptionEn: item.descriptionEn ?? '',
      descriptionJa: item.descriptionJa ?? '',
      type: item.type,
      parentId: item.parentId ?? '',
    });
    window.requestAnimationFrame(() => document.getElementById('category-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const deleteCategory = async (item: ContentCategory) => {
    if (!window.confirm(t('contentPanel.categories.deleteConfirm', { name: item.name }))) return;
    setBusyKey(`category-delete-${item.id}`);
    setError('');
    try {
      await contentApi.deleteCategory(item.id);
      if (categoryForm.id === item.id) setCategoryForm(createEmptyCategory());
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, t('contentPanel.errors.deleteCategory')));
    } finally {
      setBusyKey('');
    }
  };

  const tabs: Array<[Tab, string]> = [
    ['layout', t('contentPanel.tabs.layout')],
    ['banners', t('contentPanel.tabs.banners')],
    ['collections', t('contentPanel.tabs.collections')],
    ['tags', t('contentPanel.tabs.tags')],
    ['categories', t('contentPanel.tabs.categories')],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('contentPanel.header.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('contentPanel.header.description')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('contentPanel.header.reloadAria')}
          onClick={() => void load()}
          className={iconButtonClass}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setError('');
            }}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === key
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 dark:text-slate-950'
                : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      {tab === 'banners' && <AdminBannerPanel />}

      {tab === 'layout' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50/95 p-3 text-xs text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/8 dark:text-sky-100">
            {t('contentPanel.layout.systemNotice')}
          </div>

          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`${cardClass} flex flex-col gap-3 p-4 lg:flex-row lg:items-center`}
            >
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0 || busyKey === 'section-move'}
                  onClick={() => void moveSection(index, -1)}
                  className={iconButtonClass}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={
                    index === sections.length - 1 || busyKey === 'section-move'
                  }
                  onClick={() => void moveSection(index, 1)}
                  className={iconButtonClass}
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label={t('contentPanel.layout.sectionNameAria')}
                    defaultValue={section.title}
                    onBlur={(event) => {
                      const title = event.currentTarget.value.trim();
                      if (title && title !== section.title) {
                        void saveSection(section, { title });
                      }
                    }}
                    className="min-w-0 max-w-xs border-b border-transparent bg-transparent text-sm font-bold text-slate-900 outline-none focus:border-sky-500 dark:text-white"
                  />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {getSectionTypeLabel(section.sectionType, t)}
                  </span>
                  {section.system && (
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {t('contentPanel.layout.systemBadge')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {section.collectionSlug
                    ? t('contentPanel.layout.collectionLabel', {
                        slug: section.collectionSlug,
                      })
                    : t('contentPanel.layout.autoContent')}
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-sky-500"
                  checked={section.active}
                  onChange={(event) =>
                    void saveSection(section, {
                      active: event.target.checked,
                    })
                  }
                />
                {t('contentPanel.layout.visible')}
              </label>

              {!section.system && (
                <button
                  type="button"
                  aria-label={t('contentPanel.layout.deleteSectionAria', {
                    title: section.title,
                  })}
                  onClick={() =>
                    void contentApi
                      .deleteSection(section.id)
                      .then(load)
                      .catch((err) =>
                        setError(
                          getErrorMessage(
                            err,
                            t('contentPanel.errors.deleteSection'),
                          ),
                        ),
                      )
                  }
                  className={`${iconButtonClass} text-rose-500 dark:text-rose-400`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}

          <div className={`${cardClass} flex flex-col gap-3 p-4 sm:flex-row`}>
            <div className="flex-1 relative">
              <button
                type="button"
                onClick={() => setLayoutCollectionOpen(!layoutCollectionOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/92 px-3.5 py-2.5 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/90 dark:bg-slate-950/70 dark:text-white"
              >
                <span className="truncate">
                  {newSectionCollectionId
                    ? collections.find((c) => c.id === newSectionCollectionId)?.title || newSectionCollectionId
                    : t('contentPanel.layout.selectCollectionPlaceholder')}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-slate-500 transition-transform duration-200 ${layoutCollectionOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {layoutCollectionOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLayoutCollectionOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800/80 dark:bg-slate-950/95">
                    <button
                      type="button"
                      onClick={() => {
                        setNewSectionCollectionId('');
                        setLayoutCollectionOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                        !newSectionCollectionId
                          ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                          : 'text-slate-700 dark:text-slate-350'
                      }`}
                    >
                      {t('contentPanel.layout.selectCollectionPlaceholder')}
                    </button>
                    {collections
                      .filter(
                        (item) =>
                          item.active &&
                          !sections.some((section) => section.collectionId === item.id),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setNewSectionCollectionId(item.id);
                            setLayoutCollectionOpen(false);
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                            newSectionCollectionId === item.id
                              ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                              : 'text-slate-700 dark:text-slate-350'
                          }`}
                        >
                          {item.title}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={!newSectionCollectionId}
              onClick={() => {
                const collection = collections.find(
                  (item) => item.id === newSectionCollectionId,
                );
                if (!collection) return;
                void contentApi
                  .createSection({
                    title: collection.title,
                    collectionId: collection.id,
                    displayOrder: (sections.at(-1)?.displayOrder ?? 0) + 10,
                    active: true,
                  })
                  .then(() => {
                    setNewSectionCollectionId('');
                    return load();
                  })
                  .catch((err) =>
                    setError(
                      getErrorMessage(err, t('contentPanel.errors.addShelf')),
                    ),
                  );
              }}
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-950"
            >
              <Plus size={15} className="inline" />{' '}
              {t('contentPanel.layout.addShelf')}
            </button>
          </div>
        </div>
      )}

      {tab === 'collections' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/85 bg-white/82 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35 dark:shadow-none">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {t('contentPanel.collections.title')}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('contentPanel.collections.description')}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCollection}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/15 transition hover:bg-sky-400 dark:text-slate-950"
            >
              <Plus size={16} /> {t('contentPanel.collections.create')}
            </button>
          </div>

          {collections.length === 0 ? (
            <EmptyState
              icon={<Layers3 size={22} />}
              title={t('contentPanel.collections.emptyTitle')}
              description={t('contentPanel.collections.emptyDescription')}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {collections.map((item) => (
                <article
                  key={item.id}
                  className={`${cardClass} p-5 transition hover:border-slate-300 dark:hover:border-slate-700`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                          <Layers3 size={16} />
                        </span>
                        <h4 className="truncate font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          {item.active
                            ? t('contentPanel.collections.statusActive')
                            : t('contentPanel.collections.statusHidden')}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">/{item.slug}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={t('contentPanel.collections.editAria', {
                          title: item.title,
                        })}
                        onClick={() => editCollection(item)}
                        className={`${iconButtonClass} text-sky-600 dark:text-sky-400`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={t('contentPanel.collections.deleteAria', {
                          title: item.title,
                        })}
                        disabled={busyKey === `collection-delete-${item.id}`}
                        onClick={() => void deleteCollection(item)}
                        className={`${iconButtonClass} text-rose-500 dark:text-rose-400`}
                      >
                        {busyKey === `collection-delete-${item.id}` ? (
                          <RefreshCw className="animate-spin" size={15} />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/85 p-3 text-center dark:border-slate-800/80 dark:bg-slate-950/35">
                    <Metric
                      label={t('contentPanel.collections.metrics.categories')}
                      value={item.categories.length}
                    />
                    <Metric
                      label={t('contentPanel.collections.metrics.tags')}
                      value={item.tags.length}
                    />
                    <Metric
                      label={t('contentPanel.collections.metrics.maxItems')}
                      value={item.maxItems}
                    />
                  </div>
                  <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
                    {item.categories.map((category) => (
                      <span
                        key={`category-${category.id}`}
                        className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] text-indigo-700 dark:border-indigo-500/15 dark:bg-indigo-500/8 dark:text-indigo-200"
                      >
                        {category.name}
                      </span>
                    ))}
                    {item.tags.map((tag) => (
                      <span
                        key={`tag-${tag.id}`}
                        className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] text-sky-700 dark:border-sky-500/15 dark:bg-sky-500/8 dark:text-sky-200"
                      >
                        #{tag.name}
                      </span>
                    ))}
                    {item.categories.length === 0 && item.tags.length === 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-300">
                        {t('contentPanel.collections.noFilters')}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tags' && (
        <div className="space-y-4">
          <EntityEditorHeader
            icon={<Tags size={17} />}
            title={t('contentPanel.tags.title')}
            description={t('contentPanel.tags.description')}
            search={tagSearch}
            setSearch={setTagSearch}
            searchPlaceholder={t('contentPanel.search.nameOrSlug')}
          />
          <form
            id="tag-editor"
            onSubmit={saveTag}
            className={`${cardClass} border-sky-500/15 p-4`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {tagForm.id
                    ? t('contentPanel.tags.editTitle')
                    : t('contentPanel.tags.createTitle')}
                </h3>
                {tagForm.id && (
                  <p className="mt-0.5 text-[11px] text-sky-600 dark:text-sky-400">
                    {t('contentPanel.tags.editing', { name: tagForm.name })}
                  </p>
                )}
              </div>
              {tagForm.id && (
                <button
                  type="button"
                  onClick={() => setTagForm({ id: '', name: '', nameVi: '', nameEn: '', nameJa: '', slug: '' })}
                  className={iconButtonClass}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500">Tên Tag (Mặc định)</span>
                <input
                  required
                  className={inputClass}
                  placeholder={t('contentPanel.tags.namePlaceholder')}
                  value={tagForm.name}
                  onChange={(event) =>
                    setTagForm({
                      ...tagForm,
                      name: event.target.value,
                      slug: tagForm.id
                        ? tagForm.slug
                        : slugify(event.target.value),
                    })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500">Tên Tag (VI)</span>
                <input
                  className={inputClass}
                  placeholder="Tiếng Việt"
                  value={tagForm.nameVi}
                  onChange={(event) =>
                    setTagForm({ ...tagForm, nameVi: event.target.value })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500">Tên Tag (EN)</span>
                <input
                  className={inputClass}
                  placeholder="Tiếng Anh"
                  value={tagForm.nameEn}
                  onChange={(event) =>
                    setTagForm({ ...tagForm, nameEn: event.target.value })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500">Tên Tag (JA)</span>
                <input
                  className={inputClass}
                  placeholder="Tiếng Nhật"
                  value={tagForm.nameJa}
                  onChange={(event) =>
                    setTagForm({ ...tagForm, nameJa: event.target.value })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500">Slug</span>
                <input
                  required
                  className={inputClass}
                  placeholder={t('contentPanel.tags.slugPlaceholder')}
                  value={tagForm.slug}
                  onChange={(event) =>
                    setTagForm({ ...tagForm, slug: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                disabled={busyKey === 'tag-save'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50 dark:text-slate-950"
              >
                {busyKey === 'tag-save' ? (
                  <RefreshCw className="animate-spin" size={15} />
                ) : (
                  <Check size={15} />
                )}{' '}
                {tagForm.id
                  ? t('contentPanel.tags.updateButton')
                  : t('contentPanel.tags.createButton')}
              </button>
            </div>
          </form>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredTags.map((item) => (
              <div
                key={item.id}
                className={`${cardClass} flex items-center justify-between gap-3 p-3.5 ${
                  tagForm.id === item.id
                    ? 'border-sky-300 bg-sky-50/80 dark:border-sky-500/50 dark:bg-sky-500/5'
                    : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-900 dark:text-white">
                    {item.name}
                  </strong>
                  <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-semibold">
                    {item.nameVi && <span className="rounded bg-sky-500/10 px-1 py-0.5 text-sky-600 dark:text-sky-400">VI: {item.nameVi}</span>}
                    {item.nameEn && <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-emerald-600 dark:text-emerald-400">EN: {item.nameEn}</span>}
                    {item.nameJa && <span className="rounded bg-purple-500/10 px-1 py-0.5 text-purple-600 dark:text-purple-400">JA: {item.nameJa}</span>}
                  </div>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400 mt-1">
                    /{item.slug}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={t('contentPanel.tags.editAria', {
                      name: item.name,
                    })}
                    onClick={() => editTag(item)}
                    className={`${iconButtonClass} text-sky-600 dark:text-sky-400`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('contentPanel.tags.deleteAria', {
                      name: item.name,
                    })}
                    disabled={busyKey === `tag-delete-${item.id}`}
                    onClick={() => void deleteTag(item)}
                    className={`${iconButtonClass} text-rose-500 dark:text-rose-400`}
                  >
                    {busyKey === `tag-delete-${item.id}` ? (
                      <RefreshCw className="animate-spin" size={15} />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="space-y-4">
          <EntityEditorHeader
            icon={<FolderTree size={17} />}
            title={t('contentPanel.categories.title')}
            description={t('contentPanel.categories.description')}
            search={categorySearch}
            setSearch={setCategorySearch}
            searchPlaceholder={t('contentPanel.search.nameOrSlug')}
          />
          <form
            id="category-editor"
            onSubmit={saveCategory}
            className={`${cardClass} border-sky-500/15 p-4`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {categoryForm.id
                    ? t('contentPanel.categories.editTitle')
                    : t('contentPanel.categories.createTitle')}
                </h3>
                {categoryForm.id && (
                  <p className="mt-0.5 text-[11px] text-sky-600 dark:text-sky-400">
                    {t('contentPanel.categories.editing', {
                      name: categoryForm.name,
                    })}
                  </p>
                )}
              </div>
              {categoryForm.id && (
                <button
                  type="button"
                  onClick={() => setCategoryForm(createEmptyCategory())}
                  className={iconButtonClass}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('contentPanel.categories.fields.name')} (Mặc định)
                </span>
                <input
                  required
                  className={inputClass}
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      name: event.target.value,
                      slug: categoryForm.id
                        ? categoryForm.slug
                        : slugify(event.target.value),
                    })
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Tên Category (VI)
                </span>
                <input
                  className={inputClass}
                  placeholder="Tiếng Việt"
                  value={categoryForm.nameVi}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      nameVi: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Tên Category (EN)
                </span>
                <input
                  className={inputClass}
                  placeholder="Tiếng Anh"
                  value={categoryForm.nameEn}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      nameEn: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Tên Category (JA)
                </span>
                <input
                  className={inputClass}
                  placeholder="Tiếng Nhật"
                  value={categoryForm.nameJa}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      nameJa: event.target.value,
                    })
                  }
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('contentPanel.categories.fields.slug')}
                </span>
                <input
                  required
                  className={inputClass}
                  value={categoryForm.slug}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      slug: event.target.value,
                    })
                  }
                />
              </label>
              <div className="flex flex-col gap-1.5 relative">
                <span className="text-[11px] font-semibold text-slate-650 dark:text-slate-400">
                  {t('contentPanel.categories.fields.type')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setContentTypeOpen(!contentTypeOpen);
                    setParentCategoryOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/92 px-3.5 py-2.5 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/90 dark:bg-slate-950/70 dark:text-white"
                >
                  <span className="truncate">
                    {categoryForm.type === 'asset'
                      ? t('contentPanel.categories.typeAssetOption')
                      : t('contentPanel.categories.typeGameOption')}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-500 transition-transform duration-200 ${contentTypeOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {contentTypeOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setContentTypeOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800/80 dark:bg-slate-950/95">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryForm({
                            ...categoryForm,
                            type: 'asset',
                            parentId: '',
                          });
                          setContentTypeOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                          categoryForm.type === 'asset'
                            ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        {t('contentPanel.categories.typeAssetOption')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryForm({
                            ...categoryForm,
                            type: 'game',
                            parentId: '',
                          });
                          setContentTypeOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                          categoryForm.type === 'game'
                            ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-700 dark:text-slate-355'
                        }`}
                      >
                        {t('contentPanel.categories.typeGameOption')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <span className="text-[11px] font-semibold text-slate-650 dark:text-slate-400">
                  {t('contentPanel.categories.fields.parent')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setParentCategoryOpen(!parentCategoryOpen);
                    setContentTypeOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/92 px-3.5 py-2.5 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/90 dark:bg-slate-950/70 dark:text-white"
                >
                  <span className="truncate">
                    {categoryForm.parentId
                      ? (() => {
                          const parentCat = categories.find((c) => c.id === categoryForm.parentId);
                          return parentCat ? parentCat.name : categoryForm.parentId;
                        })()
                      : t('contentPanel.categories.noParent')}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-500 transition-transform duration-200 ${parentCategoryOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {parentCategoryOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setParentCategoryOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800/80 dark:bg-slate-950/95">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryForm({
                            ...categoryForm,
                            parentId: '',
                          });
                          setParentCategoryOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                          !categoryForm.parentId
                            ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        {t('contentPanel.categories.noParent')}
                      </button>
                      {categoryRows
                        .filter(
                          ({ item }) =>
                            item.type === categoryForm.type &&
                            item.id !== categoryForm.id,
                        )
                        .map(({ item, depth }) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCategoryForm({
                                ...categoryForm,
                                parentId: item.id,
                              });
                              setParentCategoryOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/5 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                              categoryForm.parentId === item.id
                                ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 font-bold'
                                : 'text-slate-700 dark:text-slate-350'
                            }`}
                          >
                            {`${'— '.repeat(depth)}${item.name}`}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('contentPanel.categories.fields.description')} (Mặc định)
                </span>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Mô tả Category (VI)
                </span>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Tiếng Việt"
                  value={categoryForm.descriptionVi}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      descriptionVi: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Mô tả Category (EN)
                </span>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Tiếng Anh"
                  value={categoryForm.descriptionEn}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      descriptionEn: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Mô tả Category (JA)
                </span>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Tiếng Nhật"
                  value={categoryForm.descriptionJa}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      descriptionJa: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                disabled={busyKey === 'category-save'}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50 dark:text-slate-950"
              >
                {busyKey === 'category-save' ? (
                  <RefreshCw className="animate-spin" size={15} />
                ) : (
                  <Check size={15} />
                )}{' '}
                {categoryForm.id
                  ? t('contentPanel.categories.updateButton')
                  : t('contentPanel.categories.createButton')}
              </button>
            </div>
          </form>

          {(['game', 'asset'] as const).map((type) => {
            const rows = filteredCategoryRows.filter(({ item }) => item.type === type);
            if (rows.length === 0) return null;
            return (
              <section key={type} className={`${cardClass} overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/35">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {type === 'game'
                        ? t('contentPanel.categories.gameTitle')
                        : t('contentPanel.categories.assetTitle')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('contentPanel.categories.count', { count: rows.length })}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {getCategoryTypeLabel(type, t)}
                  </span>
                </div>
                <div className="divide-y divide-slate-200/80 dark:divide-slate-800/70">
                  {rows.map(({ item, depth, path }) => (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between gap-3 px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/35 ${
                        categoryForm.id === item.id
                          ? 'bg-sky-50/85 dark:bg-sky-500/5'
                          : ''
                      }`}
                    >
                      <div
                        className="relative min-w-0 flex-1"
                        style={{ paddingLeft: `${depth * 24}px` }}
                      >
                        {depth > 0 && (
                          <span
                            className="absolute top-1/2 h-px bg-slate-300 dark:bg-slate-700"
                            style={{
                              left: `${Math.max(0, depth * 24 - 18)}px`,
                              width: '12px',
                            }}
                          />
                        )}
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              depth === 0
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/12 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {depth === 0 ? (
                              <FolderTree size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm text-slate-900 dark:text-white">
                              {item.name}
                            </strong>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {depth > 0
                                ? path
                                : t('contentPanel.categories.rootLabel')}{' '}
                              · /{item.slug}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={t('contentPanel.categories.editAria', {
                            name: item.name,
                          })}
                          onClick={() => editCategory(item)}
                          className={`${iconButtonClass} text-sky-600 dark:text-sky-400`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={t('contentPanel.categories.deleteAria', {
                            name: item.name,
                          })}
                          disabled={busyKey === `category-delete-${item.id}`}
                          onClick={() => void deleteCategory(item)}
                          className={`${iconButtonClass} text-rose-500 dark:text-rose-400`}
                        >
                          {busyKey === `category-delete-${item.id}` ? (
                            <RefreshCw className="animate-spin" size={15} />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {collectionEditorOpen && (
        <CollectionEditorModal
          editing={Boolean(editingCollection)}
          form={collectionForm}
          setForm={setCollectionForm}
          tags={tags}
          categoryRows={categoryRows}
          saving={busyKey === 'collection-save'}
          error={error}
          onClose={closeCollectionEditor}
          onSubmit={saveCollection}
        />
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div>
    <strong className="block text-base text-slate-900 dark:text-white">{value}</strong>
    <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
      {label}
    </span>
  </div>
);

const EmptyState = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/72 px-6 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/25 dark:shadow-none">
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {icon}
    </span>
    <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{description}</p>
  </div>
);

const EntityEditorHeader = ({
  icon,
  title,
  description,
  search,
  setSearch,
  searchPlaceholder,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/85 bg-white/82 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35 dark:shadow-none lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
        {icon}
      </span>
      <div>
        <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
    <label className="relative block w-full lg:w-72">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        size={15}
      />
      <input
        className={`${inputClass} pl-9`}
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </label>
  </div>
);

const CollectionEditorModal = ({ editing, form, setForm, tags, categoryRows, saving, error, onClose, onSubmit }: {
  editing: boolean;
  form: ContentCollectionPayload;
  setForm: React.Dispatch<React.SetStateAction<ContentCollectionPayload>>;
  tags: ContentTag[];
  categoryRows: CategoryTreeRow[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) => {
  const { t } = useTranslation(['admin']);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-slate-950/80 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="dark-depth-card w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_30px_100px_rgba(15,23,42,0.22)] dark:border-slate-700/80 dark:bg-night-850 dark:shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/45 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
              {t('contentPanel.modal.badge')}
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {editing ? t('contentPanel.modal.editTitle') : t('contentPanel.modal.createTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('contentPanel.modal.description')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('dialog.close')}
            onClick={onClose}
            className={`${iconButtonClass} shrink-0`}
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <div className="mx-5 mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 sm:mx-6">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none">
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
                {t('contentPanel.modal.basicInfo')}
              </h4>
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {t('contentPanel.modal.fields.title')}
                  </span>
                  <input
                    required
                    autoFocus
                    className={inputClass}
                    placeholder={t('contentPanel.modal.placeholders.title')}
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                        slug: editing ? current.slug : slugify(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {t('contentPanel.modal.fields.slug')}
                  </span>
                  <input
                    required
                    className={inputClass}
                    placeholder={t('contentPanel.modal.placeholders.slug')}
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {t('contentPanel.modal.fields.description')}
                  </span>
                  <textarea
                    rows={5}
                    className={inputClass}
                    placeholder={t('contentPanel.modal.placeholders.description')}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('contentPanel.modal.fields.maxItems')}
                </span>
                <input
                  className={`${inputClass} mt-2`}
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxItems}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxItems: Number(event.target.value),
                    }))
                  }
                />
                <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-500">
                  {t('contentPanel.modal.maxItemsHint')}
                </p>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none">
                <div>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">
                    {t('contentPanel.modal.activeTitle')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-500">
                    {t('contentPanel.modal.activeDescription')}
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-sky-500"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <div className="grid min-h-0 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SelectionPicker
              title={t('contentPanel.modal.tagsTitle')}
              description={t('contentPanel.modal.tagsDescription')}
              searchPlaceholder={t('contentPanel.selectionPicker.searchTags')}
              items={tags.map((tag) => ({ id: tag.id, name: tag.name, meta: `#${tag.slug}` }))}
              selected={form.tagIds}
              onChange={(tagIds) => setForm((current) => ({ ...current, tagIds }))}
            />
            <SelectionPicker
              title={t('contentPanel.modal.categoriesTitle')}
              description={t('contentPanel.modal.categoriesDescription')}
              searchPlaceholder={t('contentPanel.selectionPicker.searchCategories')}
              items={categoryRows.map(({ item, depth, path }) => ({
                id: item.id,
                name: item.name,
                meta: `${getCategoryTypeLabel(item.type, t)} · ${path}`,
                depth,
              }))}
              selected={form.categoryIds}
              onChange={(categoryIds) => setForm((current) => ({ ...current, categoryIds }))}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/85 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/35 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:shadow-none dark:hover:bg-slate-800"
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50 dark:text-slate-950"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
            {editing ? t('contentPanel.modal.saveChanges') : t('contentPanel.modal.createAction')}
          </button>
        </div>
      </form>
    </div>
  );
};

const SelectionPicker = ({ title, description, searchPlaceholder, items, selected, onChange }: {
  title: string;
  description: string;
  searchPlaceholder: string;
  items: Array<{ id: string; name: string; meta?: string; depth?: number }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { t } = useTranslation(['admin']);
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? items.filter((item) => `${item.name} ${item.meta ?? ''}`.toLowerCase().includes(normalized)) : items;
  }, [items, query]);
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((selectedId) => selectedId !== id) : [...selected, id]);

  return (
    <fieldset className="flex min-h-[360px] flex-col rounded-2xl border border-slate-200 bg-white/90 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-500">
            {description}
          </p>
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
          {t('contentPanel.selectionPicker.selectedCount', { count: selected.length })}
        </span>
      </div>
      <label className="relative mt-3 block">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"
          size={14}
        />
        <input
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 dark:border-slate-800 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-500"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {selectedItems.length > 0 && (
        <div className="mt-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
          {selectedItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => toggle(item.id)}
              className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-[10px] text-sky-700 hover:bg-rose-50 hover:text-rose-600 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
            >
              {item.name}
              <X size={10} />
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 max-h-64 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <label
            key={item.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800/70 ${
              selected.includes(item.id)
                ? 'bg-sky-50 text-sky-900 dark:bg-sky-500/8 dark:text-white'
                : 'text-slate-700 dark:text-slate-300'
            }`}
            style={{ paddingLeft: `${8 + (item.depth ?? 0) * 12}px` }}
          >
            <input
              type="checkbox"
              className="accent-sky-500"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.name}</span>
              {item.meta && (
                <span className="block truncate text-[9px] text-slate-500 dark:text-slate-600">
                  {item.meta}
                </span>
              )}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-600">
            {t('contentPanel.selectionPicker.noResults')}
          </p>
        )}
      </div>
    </fieldset>
  );
};
