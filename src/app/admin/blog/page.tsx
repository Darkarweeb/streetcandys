'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/UXHelpers';

// ─── Types ───────────────────────────────────────────────────
interface BlogCategoria {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
}

interface BlogPost {
  id: string;
  blog_category_id: string | null;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  tags: string[];
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  is_featured: boolean;
  view_count: number;
  read_time_minutes: number | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
  blog_categories?: { name: string };
  profiles?: { full_name: string };
}

interface PostForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  blog_category_id: string;
  tags: string;
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  read_time_minutes: string;
  meta_title: string;
  meta_description: string;
  scheduled_at: string;
}

const FORM_INICIAL: PostForm = {
  title: '', slug: '', excerpt: '', content: '', cover_image_url: '',
  blog_category_id: '', tags: '', status: 'draft', is_featured: false,
  read_time_minutes: '', meta_title: '', meta_description: '',
  scheduled_at: '',
};

const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado', scheduled: 'Programado' };
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
};

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>)}
    </tr>
  );
}

// ─── Modal Post ───────────────────────────────────────────────
interface ModalPostProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: PostForm) => Promise<void>;
  initial?: PostForm;
  categorias: BlogCategoria[];
  saving: boolean;
  title: string;
}

function ModalPost({ open, onClose, onSave, initial, categorias, saving, title }: ModalPostProps) {
  const [form, setForm] = useState<PostForm>(initial || FORM_INICIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof PostForm, string>>>({});
  const [tab, setTab] = useState<'contenido' | 'seo'>('contenido');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setForm(initial || FORM_INICIAL); setErrors({}); setTab('contenido'); setTimeout(() => firstRef.current?.focus(), 50); }
  }, [open, initial]);

  const set = (k: keyof PostForm, v: string | boolean) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'title' && !initial) next.slug = slugify(String(v));
    return next;
  });

  const validate = () => {
    const e: Partial<Record<keyof PostForm, string>> = {};
    if (!form.title.trim()) e.title = 'Requerido';
    if (!form.slug.trim()) e.slug = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-sc-forest font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(['contenido', 'seo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-sc-forest text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {t === 'contenido' ? 'Contenido' : 'SEO'}
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); if (validate()) onSave(form); }} className="px-6 py-5 space-y-4">
          {tab === 'contenido' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-sc-forest mb-1">Título *</label>
                  <input ref={firstRef} value={form.title} onChange={e => set('title', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.title ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Título del artículo" />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Slug *</label>
                  <input value={form.slug} onChange={e => set('slug', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.slug ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="slug-del-articulo" />
                  {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Categoría</label>
                  <select value={form.blog_category_id} onChange={e => set('blog_category_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Estado</label>
                  <select value={form.status} onChange={e => set('status', e.target.value as PostForm['status'])}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="scheduled">Programado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
                {form.status === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Fecha de publicación</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={e => set('scheduled_at', e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    />
                    <p className="text-gray-400 text-xs mt-1">El artículo se publicará automáticamente en esta fecha.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Tiempo de lectura (min)</label>
                  <input type="number" value={form.read_time_minutes} onChange={e => set('read_time_minutes', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    placeholder="5" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Etiquetas (separadas por coma)</label>
                  <input value={form.tags} onChange={e => set('tags', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    placeholder="cannabis, salud, bienestar" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-sc-forest mb-1">URL imagen de portada</label>
                  <input value={form.cover_image_url} onChange={e => set('cover_image_url', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    placeholder="https://..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-sc-forest mb-1">Extracto</label>
                  <textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                    rows={2} placeholder="Breve descripción del artículo..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-sc-forest mb-1">Contenido</label>
                  <textarea value={form.content} onChange={e => set('content', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none font-mono"
                    rows={8} placeholder="Contenido del artículo en HTML o Markdown..." />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" />
                <span className="text-sm text-sc-forest">Artículo destacado</span>
              </label>
            </>
          )}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sc-forest mb-1">Meta título</label>
                <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                  placeholder="Título para motores de búsqueda" maxLength={60} />
                <p className="text-gray-400 text-xs mt-1">{form.meta_title.length}/60 caracteres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-sc-forest mb-1">Meta descripción</label>
                <textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                  rows={3} placeholder="Descripción para motores de búsqueda" maxLength={160} />
                <p className="text-gray-400 text-xs mt-1">{form.meta_description.length}/160 caracteres</p>
              </div>
              {(form.meta_title || form.meta_description) && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Vista previa en Google</p>
                  <p className="text-blue-600 text-sm font-medium truncate">{form.meta_title || form.title}</p>
                  <p className="text-green-700 text-xs">streetcandys.com/blog/{form.slug}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{form.meta_description || form.excerpt}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Categoría ──────────────────────────────────────────
interface ModalCatProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: { name: string; slug: string; description: string; is_active: boolean }) => Promise<void>;
  initial?: BlogCategoria;
  saving: boolean;
}

function ModalCategoria({ open, onClose, onSave, initial, saving }: ModalCatProps) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', is_active: true });

  useEffect(() => {
    if (open) setForm(initial ? { name: initial.name, slug: initial.slug, description: initial.description || '', is_active: initial.is_active } : { name: '', slug: '', description: '', is_active: true });
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-sc-forest font-bold text-lg">{initial ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Nombre *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: !initial ? slugify(e.target.value) : f.slug }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" placeholder="Nombre de la categoría" />
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Slug *</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sc-forest/30" placeholder="slug-categoria" />
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none" rows={2} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" />
            <span className="text-sm text-sc-forest">Categoría activa</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.slug}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminBlogPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<'posts' | 'categorias'>('posts');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categorias, setCategorias] = useState<BlogCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [modalPost, setModalPost] = useState(false);
  const [editandoPost, setEditandoPost] = useState<BlogPost | null>(null);
  const [modalCat, setModalCat] = useState(false);
  const [editandoCat, setEditandoCat] = useState<BlogCategoria | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const POR_PAGINA = 15;

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) router.replace('/');
  }, [authLoading, profile, router]);

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase.from('blog_categories').select('*').order('sort_order');
    setCategorias(data || []);
  }, [supabase]);

  const fetchPosts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let query = supabase.from('blog_posts')
        .select('*, blog_categories(name), profiles(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
      if (busqueda.trim()) query = query.ilike('title', `%${busqueda}%`);
      if (filtroStatus) query = query.eq('status', filtroStatus);
      if (filtroCat) query = query.eq('blog_category_id', filtroCat);
      const { data, error: err, count } = await query;
      if (err) throw err;
      setPosts(data || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando posts');
    } finally { setLoading(false); }
  }, [supabase, pagina, busqueda, filtroStatus, filtroCat]);

  const fetchCatList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err, count } = await supabase.from('blog_categories').select('*', { count: 'exact' }).order('sort_order');
      if (err) throw err;
      setCategorias(data || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando categorías');
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchCategorias();
      if (tab === 'posts') fetchPosts();
      else fetchCatList();
    }
  }, [profile, tab, fetchPosts, fetchCatList, fetchCategorias]);

  const showToast = (msg: string) => { toastSuccess(msg); };

  const handleSavePost = async (form: PostForm) => {
    setSaving(true);
    try {
      const payload = {
        title: form.title, slug: form.slug, excerpt: form.excerpt || null,
        content: form.content || null, cover_image_url: form.cover_image_url || null,
        blog_category_id: form.blog_category_id || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: form.status === 'scheduled' ? 'draft' : form.status,
        is_featured: form.is_featured,
        read_time_minutes: form.read_time_minutes ? Number(form.read_time_minutes) : null,
        meta_title: form.meta_title || null, meta_description: form.meta_description || null,
        published_at: form.status === 'published'
          ? new Date().toISOString()
          : form.status === 'scheduled' && form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : null,
        author_id: profile?.id || null,
      };
      if (editandoPost) {
        const { error: err } = await supabase.from('blog_posts').update(payload).eq('id', editandoPost.id);
        if (err) throw err;
        showToast('Artículo actualizado');
      } else {
        const { error: err } = await supabase.from('blog_posts').insert(payload);
        if (err) throw err;
        showToast('Artículo creado');
      }
      setModalPost(false); setEditandoPost(null);
      fetchPosts();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleSaveCat = async (form: { name: string; slug: string; description: string; is_active: boolean }) => {
    setSaving(true);
    try {
      if (editandoCat) {
        const { error: err } = await supabase.from('blog_categories').update(form).eq('id', editandoCat.id);
        if (err) throw err;
        showToast('Categoría actualizada');
      } else {
        const { error: err } = await supabase.from('blog_categories').insert(form);
        if (err) throw err;
        showToast('Categoría creada');
      }
      setModalCat(false); setEditandoCat(null);
      fetchCatList(); fetchCategorias();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleEliminarPost = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar este artículo?',
      message: 'El artículo será eliminado permanentemente. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await supabase.from('blog_posts').delete().eq('id', id);
      toastSuccess('Artículo eliminado'); fetchPosts();
    } catch { toastError('Error al eliminar'); }
  };

  const handleEliminarCat = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar esta categoría?',
      message: 'Los artículos asociados perderán su categoría.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await supabase.from('blog_categories').delete().eq('id', id);
      toastSuccess('Categoría eliminada'); fetchCatList();
    } catch { toastError('Error al eliminar'); }
  };

  const handleBulkArchivar = async () => {
    if (!seleccionados.length) return;
    setSaving(true);
    try {
      await supabase.from('blog_posts').update({ status: 'archived' }).in('id', seleccionados);
      showToast(`${seleccionados.length} artículo(s) archivado(s)`);
      setSeleccionados([]); fetchPosts();
    } catch { showToast('Error en acción masiva'); }
    finally { setSaving(false); }
  };

  const postFormDesde = (p: BlogPost): PostForm => ({
    title: p.title, slug: p.slug, excerpt: p.excerpt || '', content: p.content || '',
    cover_image_url: p.cover_image_url || '', blog_category_id: p.blog_category_id || '',
    tags: p.tags?.join(', ') || '', status: p.status, is_featured: p.is_featured,
    read_time_minutes: p.read_time_minutes ? String(p.read_time_minutes) : '',
    meta_title: p.meta_title || '', meta_description: p.meta_description || '',
    scheduled_at: p.published_at && p.status === 'draft' && new Date(p.published_at) > new Date()
      ? new Date(p.published_at).toISOString().slice(0, 16)
      : '',
  });

  const toggleSeleccion = (id: string) => setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleTodos = () => setSeleccionados(prev => prev.length === posts.length ? [] : posts.map(p => p.id));
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  if (authLoading) return <AdminLayout title="Blog"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout title="Blog" subtitle="Gestión de artículos y categorías">
      {confirmDialog}
      {toast && <div className="fixed top-4 right-4 z-50 bg-sc-forest text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toast}</div>}

      <ModalPost open={modalPost} onClose={() => { setModalPost(false); setEditandoPost(null); }}
        onSave={handleSavePost} initial={editandoPost ? postFormDesde(editandoPost) : undefined}
        categorias={categorias} saving={saving} title={editandoPost ? 'Editar Artículo' : 'Nuevo Artículo'} />

      <ModalCategoria open={modalCat} onClose={() => { setModalCat(false); setEditandoCat(null); }}
        onSave={handleSaveCat} initial={editandoCat || undefined} saving={saving} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {(['posts', 'categorias'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPagina(1); setSeleccionados([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-sc-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'posts' ? 'Artículos' : 'Categorías'}
          </button>
        ))}
      </div>

      {/* Filtros + Acciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        {tab === 'posts' && (
          <>
            <div className="flex-1 min-w-48 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar artículo..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
            </div>
            <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="scheduled">Programado</option>
              <option value="archived">Archivado</option>
            </select>
            <select value={filtroCat} onChange={e => { setFiltroCat(e.target.value); setPagina(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
        <button
          onClick={() => tab === 'posts' ? (setEditandoPost(null), setModalPost(true)) : (setEditandoCat(null), setModalCat(true))}
          className="bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors flex items-center gap-2 ml-auto">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {tab === 'posts' ? 'Nuevo artículo' : 'Nueva categoría'}
        </button>
      </div>

      {tab === 'posts' && seleccionados.length > 0 && (
        <div className="bg-sc-forest/5 border border-sc-forest/20 rounded-xl p-3 mb-4 flex items-center gap-3 animate-slide-up">
          <span className="text-sm font-medium text-sc-forest">{seleccionados.length} seleccionado(s)</span>
          <button onClick={handleBulkArchivar} disabled={saving}
            className="text-sm bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60">
            Archivar seleccionados
          </button>
          <button onClick={() => setSeleccionados([])} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">Cancelar</button>
        </div>
      )}

      {/* Tabla Posts */}
      {tab === 'posts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Tabla de artículos">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={seleccionados.length === posts.length && posts.length > 0}
                      onChange={toggleTodos} className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" aria-label="Seleccionar todos" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Artículo</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Categoría</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-sc-forest">Vistas</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={7} />) :
                  error ? <tr><td colSpan={7} className="px-4 py-12 text-center text-red-500">{error}</td></tr> :
                  posts.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300">
                          <path d="M8 6h32a2 2 0 012 2v32a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M14 16h20M14 24h16M14 32h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <p className="text-gray-500 font-medium">No hay artículos</p>
                        <button onClick={() => setModalPost(true)} className="text-sc-forest text-sm font-medium hover:underline">Crear primer artículo</button>
                      </div>
                    </td></tr>
                  ) : posts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={seleccionados.includes(p.id)} onChange={() => toggleSeleccion(p.id)}
                          className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" aria-label={`Seleccionar ${p.title}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.cover_image_url && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sc-forest line-clamp-1">{p.title}</p>
                            <p className="text-gray-500 text-xs font-mono">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.blog_categories?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.view_count.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditandoPost(p); setModalPost(true); }}
                            className="text-sc-forest hover:bg-sc-forest/10 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">Editar</button>
                          <button onClick={() => handleEliminarPost(p.id)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}</p>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">← Anterior</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla Categorías */}
      {tab === 'categorias' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Tabla de categorías de blog">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Slug</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Descripción</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} cols={5} />) :
                  error ? <tr><td colSpan={5} className="px-4 py-12 text-center text-red-500">{error}</td></tr> :
                  categorias.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-16 text-center">
                      <p className="text-gray-500 font-medium">No hay categorías</p>
                      <button onClick={() => setModalCat(true)} className="text-sc-forest text-sm font-medium hover:underline mt-2 block mx-auto">Crear primera categoría</button>
                    </td></tr>
                  ) : categorias.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-sc-forest">{c.name}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{c.slug}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditandoCat(c); setModalCat(true); }}
                            className="text-sc-forest hover:bg-sc-forest/10 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">Editar</button>
                          <button onClick={() => handleEliminarCat(c.id)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
