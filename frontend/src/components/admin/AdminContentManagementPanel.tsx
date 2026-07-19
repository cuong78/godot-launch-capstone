import React from 'react';
import { Check, ChevronDown, ChevronUp, Layers3, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AdminBannerPanel } from './AdminBannerPanel';
import {
  contentApi, ContentCategory, ContentCollection, ContentCollectionPayload,
  ContentTag, HomepageSection,
} from '../../api/contentApi';

type Tab = 'layout' | 'banners' | 'collections' | 'tags' | 'categories';
const emptyCollection: ContentCollectionPayload = {
  title: '', slug: '', description: '', maxItems: 10, active: true, tagIds: [], categoryIds: [],
};
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-sky-500';
const cardClass = 'rounded-2xl border border-slate-800 bg-slate-900/70 p-4';

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const AdminContentManagementPanel: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>('layout');
  const [collections, setCollections] = React.useState<ContentCollection[]>([]);
  const [sections, setSections] = React.useState<HomepageSection[]>([]);
  const [tags, setTags] = React.useState<ContentTag[]>([]);
  const [categories, setCategories] = React.useState<ContentCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [editingCollection, setEditingCollection] = React.useState<string | null>(null);
  const [collectionForm, setCollectionForm] = React.useState<ContentCollectionPayload>(emptyCollection);
  const [newSectionCollectionId, setNewSectionCollectionId] = React.useState('');
  const [tagForm, setTagForm] = React.useState({ id: '', name: '', slug: '' });
  const [categoryForm, setCategoryForm] = React.useState({ id: '', name: '', slug: '', description: '', type: 'asset' });

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [collectionRes, sectionRes, tagRes, categoryRes] = await Promise.all([
        contentApi.getCollections(), contentApi.getSections(), contentApi.getTags(), contentApi.getCategories(),
      ]);
      setCollections(collectionRes.data ?? []); setSections(sectionRes.data ?? []);
      setTags(tagRes.data ?? []); setCategories(categoryRes.data ?? []);
    } catch (err: any) { setError(err.response?.data?.message || 'Không thể tải dữ liệu quản lý nội dung.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const saveCollection = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      if (editingCollection) await contentApi.updateCollection(editingCollection, collectionForm);
      else await contentApi.createCollection(collectionForm);
      setEditingCollection(null); setCollectionForm(emptyCollection); await load();
    } catch (err: any) { setError(err.response?.data?.message || 'Không thể lưu collection.'); }
  };
  const editCollection = (item: ContentCollection) => {
    setEditingCollection(item.id); setCollectionForm({ title: item.title, slug: item.slug, description: item.description ?? '',
      maxItems: item.maxItems,
      active: item.active, tagIds: item.tags.map((tag) => tag.id), categoryIds: item.categories.map((category) => category.id) });
  };
  const saveSection = async (section: HomepageSection, patch: Partial<HomepageSection> = {}) => {
    const next = { ...section, ...patch };
    await contentApi.updateSection(section.id, { title: next.title, collectionId: next.collectionId,
      displayOrder: next.displayOrder, active: next.active });
    await load();
  };
  const moveSection = async (index: number, direction: -1 | 1) => {
    const otherIndex = index + direction; if (otherIndex < 0 || otherIndex >= sections.length) return;
    const current = sections[index]; const other = sections[otherIndex];
    await Promise.all([saveSection(current, { displayOrder: other.displayOrder }), saveSection(other, { displayOrder: current.displayOrder })]);
  };
  const saveTag = async (event: React.FormEvent) => {
    event.preventDefault(); const payload = { name: tagForm.name, slug: tagForm.slug || slugify(tagForm.name) };
    if (tagForm.id) await contentApi.updateTag(tagForm.id, payload); else await contentApi.createTag(payload);
    setTagForm({ id: '', name: '', slug: '' }); await load();
  };
  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault(); const payload = { name: categoryForm.name, slug: categoryForm.slug || slugify(categoryForm.name),
      description: categoryForm.description, type: categoryForm.type };
    if (categoryForm.id) await contentApi.updateCategory(categoryForm.id, payload); else await contentApi.createCategory(payload);
    setCategoryForm({ id: '', name: '', slug: '', description: '', type: 'asset' }); await load();
  };

  const tabs: Array<[Tab, string]> = [['layout', 'Homepage Layout'], ['banners', 'Banners'], ['collections', 'Collections'], ['tags', 'Tags'], ['categories', 'Categories']];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-white">Quản lý nội dung storefront</h2><p className="text-xs text-slate-400">Điều khiển banner, shelf hệ thống và collection từ một nơi.</p></div>
      <button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
    </div>
    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-1.5">{tabs.map(([key, label]) =>
      <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}</div>
    {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
    {tab === 'banners' && <AdminBannerPanel />}

    {tab === 'layout' && <div className="space-y-3">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/8 p-3 text-xs text-sky-100">Recent Releases và Free Content là section hệ thống, luôn giới hạn tối đa 6. Admin có thể đổi tên, thứ tự và bật/tắt nhưng không thể xóa hoặc đổi quy tắc.</div>
      {sections.map((section, index) => <div key={section.id} className={`${cardClass} flex flex-col gap-3 lg:flex-row lg:items-center`}>
        <div className="flex gap-1"><button disabled={index === 0} onClick={() => void moveSection(index, -1)} className="p-1.5 text-slate-400 disabled:opacity-20"><ChevronUp size={16}/></button><button disabled={index === sections.length - 1} onClick={() => void moveSection(index, 1)} className="p-1.5 text-slate-400 disabled:opacity-20"><ChevronDown size={16}/></button></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><input aria-label="Tên section" defaultValue={section.title} onBlur={(event) => { const title = event.currentTarget.value.trim(); if (title && title !== section.title) void saveSection(section, { title }); }} className="min-w-0 max-w-xs border-b border-transparent bg-transparent text-sm font-bold text-white outline-none focus:border-sky-500"/><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{section.sectionType}</span>{section.system && <span className="text-[10px] text-sky-400">SYSTEM</span>}</div><p className="text-xs text-slate-500">{section.collectionSlug ? `Collection: ${section.collectionSlug}` : 'Tự động · tối đa 6 sản phẩm'}</p></div>
        <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={section.active} onChange={(e) => void saveSection(section, { active: e.target.checked })}/> Hiển thị</label>
        {!section.system && <button onClick={() => void contentApi.deleteSection(section.id).then(load)} className="p-2 text-rose-400"><Trash2 size={16}/></button>}
      </div>)}
      <div className={`${cardClass} flex flex-col gap-3 sm:flex-row`}><select className={inputClass} value={newSectionCollectionId} onChange={(e) => setNewSectionCollectionId(e.target.value)}><option value="">Chọn collection để thêm shelf</option>{collections.filter((item) => item.active && !sections.some((section) => section.collectionId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button disabled={!newSectionCollectionId} onClick={() => { const collection = collections.find((item) => item.id === newSectionCollectionId); if (!collection) return; void contentApi.createSection({ title: collection.title, collectionId: collection.id, displayOrder: (sections.at(-1)?.displayOrder ?? 0) + 10, active: true }).then(() => { setNewSectionCollectionId(''); return load(); }); }} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"><Plus size={15} className="inline"/> Thêm shelf</button></div>
    </div>}

    {tab === 'collections' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-3">{collections.map((item) => <div key={item.id} className={cardClass}><div className="flex justify-between gap-3"><div><div className="flex items-center gap-2"><Layers3 size={15} className="text-sky-400"/><strong className="text-white">{item.title}</strong>{!item.active && <span className="text-[10px] text-slate-500">Ẩn</span>}</div><p className="mt-1 text-xs text-slate-400">Game + Asset · đủ tất cả tags · mới nhất · tối đa {item.maxItems}</p><div className="mt-2 flex flex-wrap gap-1">{[...item.categories.map((x) => x.name), ...item.tags.map((x) => `#${x.name}`)].map((label) => <span key={label} className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300">{label}</span>)}</div></div><div className="flex"><button onClick={() => editCollection(item)} className="p-2 text-sky-400"><Pencil size={15}/></button><button onClick={() => void contentApi.deleteCollection(item.id).then(load)} className="p-2 text-rose-400"><Trash2 size={15}/></button></div></div></div>)}</div>
      <form onSubmit={saveCollection} className={`${cardClass} space-y-3 self-start`}><h3 className="font-bold text-white">{editingCollection ? 'Sửa collection' : 'Tạo collection'}</h3><input required className={inputClass} placeholder="Tiêu đề" value={collectionForm.title} onChange={(e) => setCollectionForm({ ...collectionForm, title: e.target.value, slug: editingCollection ? collectionForm.slug : slugify(e.target.value) })}/><input required className={inputClass} placeholder="slug" value={collectionForm.slug} onChange={(e) => setCollectionForm({ ...collectionForm, slug: e.target.value })}/><textarea className={inputClass} placeholder="Mô tả" value={collectionForm.description} onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}/><label className="block space-y-1 text-xs text-slate-400"><span>Số sản phẩm tối đa</span><input className={inputClass} type="number" min={1} max={10} value={collectionForm.maxItems} onChange={(e) => setCollectionForm({ ...collectionForm, maxItems: Number(e.target.value) })}/></label><Picker title="Tags · sản phẩm phải có đầy đủ" items={tags} selected={collectionForm.tagIds} onChange={(tagIds) => setCollectionForm({ ...collectionForm, tagIds })}/><Picker title="Categories" items={categories} selected={collectionForm.categoryIds} onChange={(categoryIds) => setCollectionForm({ ...collectionForm, categoryIds })}/><label className="flex gap-2 text-xs text-slate-300"><input type="checkbox" checked={collectionForm.active} onChange={(e) => setCollectionForm({ ...collectionForm, active: e.target.checked })}/> Đang hoạt động</label><div className="flex gap-2"><button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950"><Check size={15} className="inline"/> Lưu</button>{editingCollection && <button type="button" onClick={() => { setEditingCollection(null); setCollectionForm(emptyCollection); }} className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white">Hủy</button>}</div></form>
    </div>}

    {tab === 'tags' && <SimpleManager title="Tag" items={tags} form={tagForm} setForm={setTagForm} onSave={saveTag} onDelete={(id) => void contentApi.deleteTag(id).then(load)}/>} 
    {tab === 'categories' && <div className="space-y-3"><form onSubmit={saveCategory} className={`${cardClass} grid gap-2 md:grid-cols-5`}><input required className={inputClass} placeholder="Tên category" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value, slug: categoryForm.id ? categoryForm.slug : slugify(e.target.value) })}/><input required className={inputClass} placeholder="slug" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}/><input className={inputClass} placeholder="Mô tả" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}/><select className={inputClass} value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}><option value="asset">Asset</option><option value="game">Game</option></select><button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950">Lưu</button></form>{categories.map((item) => <div key={item.id} className={`${cardClass} flex items-center justify-between`}><div><strong className="text-sm text-white">{item.name}</strong><span className="ml-2 text-xs text-slate-500">/{item.slug} · {item.type}</span></div><div><button onClick={() => setCategoryForm({ id: item.id, name: item.name, slug: item.slug, description: item.description ?? '', type: item.type })} className="p-2 text-sky-400"><Pencil size={15}/></button><button onClick={() => void contentApi.deleteCategory(item.id).then(load)} className="p-2 text-rose-400"><Trash2 size={15}/></button></div></div>)}</div>}
  </div>;
};

const Picker = ({ title, items, selected, onChange }: { title: string; items: Array<{ id: string; name: string }>; selected: string[]; onChange: (ids: string[]) => void }) => <fieldset className="rounded-xl border border-slate-800 p-2"><legend className="px-1 text-[10px] uppercase text-slate-500">{title}</legend><div className="max-h-28 space-y-1 overflow-y-auto">{items.map((item) => <label key={item.id} className="flex gap-2 text-xs text-slate-300"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onChange(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}/>{item.name}</label>)}</div></fieldset>;

const SimpleManager = ({ title, items, form, setForm, onSave, onDelete }: any) => <div className="space-y-3"><form onSubmit={onSave} className={`${cardClass} grid gap-2 md:grid-cols-[1fr_1fr_auto]`}><input required className={inputClass} placeholder={`Tên ${title}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })}/><input required className={inputClass} placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}/><button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950">Lưu</button></form>{items.map((item: ContentTag) => <div key={item.id} className={`${cardClass} flex items-center justify-between`}><div><strong className="text-sm text-white">{item.name}</strong><span className="ml-2 text-xs text-slate-500">/{item.slug}</span></div><div><button onClick={() => setForm({ id: item.id, name: item.name, slug: item.slug })} className="p-2 text-sky-400"><Pencil size={15}/></button><button onClick={() => onDelete(item.id)} className="p-2 text-rose-400"><Trash2 size={15}/></button></div></div>)}</div>;
