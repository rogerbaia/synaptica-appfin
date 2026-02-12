"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseService } from '@/services/supabaseService';
import { aiCategoryService, CategorySuggestion } from '@/services/aiCategoryService';
import { Tags, Plus, Trash2, AlertCircle, ChevronRight, ChevronDown, FolderPlus, Folder, RefreshCw } from 'lucide-react';
import PoweredByGabi from '@/components/Gabi/PoweredByGabi';
import { useAuth } from '@/context/AuthContext';
import { CategorySeeder, CATEGORY_STRUCTURE } from '@/services/CategorySeeder';

interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
    parent_id?: string | null;
    children?: Category[];
}

export default function CategoriesPage() {
    const { t } = useLanguage();
    const { user } = useAuth();

    const [categories, setCategories] = useState<Category[]>([]);
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    const [newCatName, setNewCatName] = useState('');
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [userSuggestionTab, setUserSuggestionTab] = useState<'main' | 'sub'>('sub'); // Default to sub as requested

    const [loading, setLoading] = useState(true);


    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);

    useEffect(() => {
        if (user) loadCategories();
    }, [user]);

    useEffect(() => {
        // Load AI suggestions when tab changes
        aiCategoryService.getSmartCategories(activeTab).then(setSuggestions);
    }, [activeTab]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getCategories();
            // Organize into tree
            const tree: Category[] = [];
            const map = new Map<string, Category>();

            // First pass: map and roots
            data.forEach(item => {
                const cat = { ...item, children: [] } as Category;
                map.set(item.id, cat);
                if (!item.parent_id) {
                    tree.push(cat);
                }
            });

            // Second pass: associate children
            data.forEach(item => {
                if (item.parent_id) {
                    const parent = map.get(item.parent_id);
                    if (parent) {
                        parent.children?.push(map.get(item.id)!);
                    }
                }
            });

            setCategories(tree);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedCategories(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleAddSuggestion = async (name: string) => {
        try {
            // Check if parent exists in our current structure
            // NOTE: Since suggestions are just mock data, we guess the parent structure
            // BUT for manual AI seeding, we might need a smarter way or just dump it as root unless we matched it.

            // Smart Logic: Try to find if this suggestion BELONGS to a known parent in our definition
            // And if that parent EXISTS in DB, add to it.
            // If parent definition exists but NOT in DB, create parent, then add.

            let parentDef = CATEGORY_STRUCTURE.find(p => p.children.includes(name) && p.type === activeTab);

            // Special Case: If name IS a parent
            if (!parentDef) {
                parentDef = CATEGORY_STRUCTURE.find(p => p.name === name && p.type === activeTab);
            }

            if (parentDef) {
                // If the suggestion is a child of a known structure
                const currentCats = await supabaseService.getCategories();
                let parentId = currentCats.find(c => c.name === parentDef!.name && c.type === activeTab)?.id;

                if (!parentId) {
                    // Create parent first
                    const newParent = await supabaseService.addCategory(parentDef.name, activeTab);
                    parentId = newParent.id;
                }

                // Only add if it's not the parent itself we just added
                if (parentDef.name !== name) {
                    await supabaseService.addCategory(name, activeTab, parentId);
                }

            } else {
                // Fallback: add as root
                await supabaseService.addCategory(name, activeTab);
            }

            loadCategories();
        } catch (err) {
            console.error("Error adding suggestion", err);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        // Simple validation
        // NOTE: In tree view, dupes are clearer, but client check is trickier with tree.
        // Let's rely on DB or basic list check if we tracked flat list, but for now skip complex check.

        try {
            await supabaseService.addCategory(newCatName, activeTab, selectedParentId || undefined);
            setNewCatName('');
            loadCategories();
            if (selectedParentId) {
                // Auto expand if adding child
                if (!expandedCategories.includes(selectedParentId)) {
                    setExpandedCategories(prev => [...prev, selectedParentId]);
                }
            }
        } catch (err: any) {
            console.error("Error adding category", err);
            setError(err.message || 'Error saving category');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('msg_confirm_delete'))) return;
        try {
            await supabaseService.deleteCategory(id);
            loadCategories();
        } catch (err) {
            console.error("Error deleting", err);
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await CategorySeeder.seedCategories();
            await loadCategories();
        } catch (err) {
            console.error("Error seeding", err);
            alert("Error al crear categorías por defecto. Asegúrate de haber ejecutado el SQL de migración.");
        } finally {
            setSeeding(false);
        }
    };

    const currentTree = categories.filter(c => c.type === activeTab);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <Tags size={32} />
                        {t('menu_categories')}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">Organiza y clasifica tus transacciones</p>
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Helper / Form Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[var(--card-bg)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
                        <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">{t('modal_add_cat_title')}</h3>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => {
                                    setActiveTab('income');
                                    setSelectedParentId(null);
                                    setUserSuggestionTab('main'); // Defaults to 'Categorías' for Income
                                }}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${activeTab === 'income' ? 'bg-[var(--success-color)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--gray-color)]'}`}
                            >
                                {t('title_cat_income')}
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('expense');
                                    setSelectedParentId(null);
                                    setUserSuggestionTab('sub'); // Defaults to 'Subcategorías' for Expense 
                                }}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${activeTab === 'expense' ? 'bg-[var(--danger-color)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--gray-color)]'}`}
                            >
                                {t('title_cat_expense')}
                            </button>
                        </div>

                        <form onSubmit={handleAdd} className="flex flex-col gap-3">
                            {selectedParentId && (
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                    <span>Agregando subcategoría a: <b>{categories.find(c => c.id === selectedParentId)?.name || 'Parent'}</b></span>
                                    <button type="button" onClick={() => setSelectedParentId(null)} className="hover:text-red-500">✕</button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    list="category-suggestions"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder={selectedParentId ? "Nombre de subcategoría..." : "Nombre de categoría principal..."}
                                    className="flex-1 p-2 border border-[var(--border-color)] rounded-lg bg-[var(--light-color)] text-[var(--text-color)] focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                />
                                <datalist id="category-suggestions">
                                    {CATEGORY_STRUCTURE
                                        .filter(c => c.type === activeTab)
                                        .flatMap(c => [c.name, ...c.children])
                                        .sort() // Optional: Sort alphabetically for better UX
                                        .map((name, idx) => (
                                            <option key={`${name}-${idx}`} value={name} />
                                        ))}
                                </datalist>
                                <button
                                    type="submit"
                                    className="p-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-blue-700 transition"
                                    disabled={!newCatName}
                                >
                                    <Plus size={24} />
                                </button>
                            </div>
                        </form>
                        {error && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle size={14} /> {error}</p>}
                    </div>

                    {/* AI Suggestions Panel */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <span className="text-xl">✨</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Sugerencias Inteligentes</h4>
                                <div className="flex flex-col">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400">Basado en usuarios como tú</p>
                                    <PoweredByGabi size="xs" className="mt-0.5 opacity-80" />
                                </div>
                            </div>
                        </div>

                        {/* Sub-tabs for Suggestions */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setUserSuggestionTab('main')}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${userSuggestionTab === 'main' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                            >
                                Categorías
                            </button>
                            <button
                                onClick={() => setUserSuggestionTab('sub')}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${userSuggestionTab === 'sub' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                            >
                                Subcategorías
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userSuggestionTab === 'main' ? 'Carpetas principales:' : 'Subcategorías específicas:'}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {suggestions
                                    // 1. Filter out if name matches ANY category (parent or child) existing in DB
                                    .filter(s => {
                                        const flatNames = categories.flatMap(c => [c.name, ...(c.children?.map(ch => ch.name) || [])]);
                                        if (flatNames.some(fn => fn.toLowerCase() === s.name.toLowerCase())) return false;

                                        // 2. Filter by Tab Type (Parent vs Child)
                                        const isParent = CATEGORY_STRUCTURE.some(p => p.name === s.name && p.type === activeTab);
                                        const isChild = CATEGORY_STRUCTURE.some(p => p.type === activeTab && p.children.includes(s.name));

                                        if (userSuggestionTab === 'main') return isParent;
                                        if (userSuggestionTab === 'sub') return isChild;

                                        return false;
                                    })
                                    // 3. Slice to requested quantity (8 for Main, 15 for Sub)
                                    // This creates the "refill" queue effect: as items are added and filtered out, new ones from the tail appear.
                                    .slice(0, userSuggestionTab === 'main' ? 8 : 15)
                                    .map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleAddSuggestion(s.name)}
                                            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-300 transition-all shadow-sm flex items-center gap-1"
                                        >
                                            <Plus size={14} />
                                            {s.name}
                                            <span className="text-[10px] opacity-60 ml-1">{s.popularityScore}%</span>
                                        </button>
                                    ))}
                                {suggestions.filter(s => {
                                    // Quick check to see if EMPTY
                                    const flatNames = categories.flatMap(c => [c.name, ...(c.children?.map(ch => ch.name) || [])]);
                                    if (flatNames.some(fn => fn.toLowerCase() === s.name.toLowerCase())) return false;
                                    if (userSuggestionTab === 'main') return CATEGORY_STRUCTURE.some(p => p.name === s.name && p.type === activeTab);
                                    if (userSuggestionTab === 'sub') return CATEGORY_STRUCTURE.some(p => p.type === activeTab && p.children.includes(s.name));
                                    return false;
                                }).length === 0 && (
                                        <span className="text-xs text-gray-400 italic">No hay más sugerencias disponibles.</span>
                                    )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 relative">
                        <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2">Tip</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
                            Usa las carpetas para agrupar gastos. Por ejemplo "Vivienda" puede contener "Renta" y "Servicios".
                        </p>
                        <div className="flex justify-end">
                            <PoweredByGabi size="xs" />
                        </div>
                    </div>
                </div>

                {/* List Section (Trees) */}
                <div className="bg-white dark:bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-[var(--text-color)]">
                            {activeTab === 'income' ? t('title_cat_income') : t('title_cat_expense')}
                        </h3>
                        {/* New Buttons Location: Restore first (with alert), then Delete */}
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    if (confirm("Se cargarán todas las categorías del sistema. ¿Deseas continuar?")) {
                                        await handleSeed();
                                    }
                                }}
                                disabled={seeding}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                            >
                                <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
                                {seeding ? 'Restaurando...' : 'Restaurar Todo'}
                            </button>

                            {currentTree.length > 0 && (
                                <button
                                    onClick={async () => {
                                        if (confirm("¿Estás seguro? Se eliminarán todas las categorías que tienes actualmente.")) {
                                            setLoading(true);
                                            try {
                                                await supabaseService.deleteAllCategories();
                                                await loadCategories();
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error al eliminar categorías. Puede que existan transacciones vinculadas.");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                                >
                                    <Trash2 size={14} />
                                    Eliminar Todo
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {loading ? (
                            <div className="text-center p-8 text-[var(--gray-color)]">Cargando...</div>
                        ) : currentTree.length === 0 ? (
                            <div className="text-center p-8 text-[var(--gray-color)]">
                                <Folder className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                <p className="mb-4">No hay categorías.</p>
                                <button
                                    onClick={handleSeed}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md"
                                >
                                    📥 Cargar Categorías Sugeridas
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {currentTree.map(cat => (
                                    <div key={cat.id} className="rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-gray-700 overflow-hidden">
                                        {/* Parent Row */}
                                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                                            <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                                                {cat.children && cat.children.length > 0 ? (
                                                    expandedCategories.includes(cat.id) ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />
                                                ) : <div className="w-[18px]" />}

                                                <Folder size={18} className="text-[var(--primary-color)]" />
                                                <span className="text-[var(--text-color)] font-medium">{cat.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">({cat.children?.length || 0})</span>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedParentId(cat.id);
                                                        setNewCatName('');
                                                    }}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                                    title="Agregar Subcategoría"
                                                >
                                                    <FolderPlus size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Children */}
                                        {expandedCategories.includes(cat.id) && cat.children && (
                                            <div className="bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700">
                                                {cat.children.map(child => (
                                                    <div key={child.id} className="flex items-center justify-between p-2 pl-10 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group/child">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 dark:bg-indigo-700" />
                                                            <span className="text-sm text-[var(--text-color)]">{child.name}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDelete(child.id)}
                                                            className="p-1 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-100 transition-opacity"
                                                            title="Eliminar Subcategoría"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {cat.children.length === 0 && (
                                                    <div className="p-3 pl-10 text-xs text-gray-400 italic">
                                                        Sin subcategorías
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div >
    );
}
