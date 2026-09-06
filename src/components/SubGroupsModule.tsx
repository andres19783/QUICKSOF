import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubGroup } from '../types';
import { FolderTree, Plus, Edit2, Trash2, Percent, Search, X, CheckCircle, Package } from 'lucide-react';

export const SubGroupsModule: React.FC = () => {
  const { subGroups, addSubGroup, updateSubGroup, deleteSubGroup, products, isAdmin } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubGroup, setEditingSubGroup] = useState<SubGroup | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    utilityPercentage: 35,
    description: ''
  });

  const openNewModal = () => {
    setEditingSubGroup(null);
    setFormData({
      name: '',
      utilityPercentage: 35,
      description: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sg: SubGroup) => {
    setEditingSubGroup(sg);
    setFormData({
      name: sg.name,
      utilityPercentage: sg.utilityPercentage,
      description: sg.description || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('El nombre del subgrupo es obligatorio.');
      return;
    }

    if (editingSubGroup) {
      updateSubGroup(editingSubGroup.id, {
        name: formData.name.trim(),
        utilityPercentage: Number(formData.utilityPercentage),
        description: formData.description.trim()
      });
    } else {
      addSubGroup({
        name: formData.name.trim(),
        utilityPercentage: Number(formData.utilityPercentage),
        description: formData.description.trim()
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el subgrupo "${name}"?`)) {
      deleteSubGroup(id);
    }
  };

  const filtered = subGroups.filter(sg =>
    sg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sg.description && sg.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">1. Módulo de Sub-Grupos de Productos</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Define la clasificación de artículos y el porcentaje de utilidad preestablecido para calcular el precio de venta automático.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Sub-Grupo</span>
        </button>
      </div>

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-zinc-400">
          Total de subgrupos: <span className="text-white font-bold">{subGroups.length}</span>
        </div>
      </div>

      {/* Grid of SubGroups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(sg => {
          const linkedProducts = products.filter(p => p.subGroupId === sg.id);
          return (
            <div key={sg.id} className="bg-[#16161A] rounded-xl border border-[#27272A] p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">{sg.name}</h3>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold shrink-0">
                    <Percent className="w-3 h-3" />
                    <span>+{sg.utilityPercentage}% Margen</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mt-2 min-h-[36px]">
                  {sg.description || 'Sin descripción detallada.'}
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{linkedProducts.length} productos vinculados</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(sg)}
                  className="px-3 py-1.5 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modificar</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(sg.id, sg.name)}
                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    title="Eliminar Subgrupo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bg-[#16161A] p-8 text-center rounded-xl border border-[#27272A] text-zinc-400 text-xs">
            No se encontraron subgrupos con el filtro aplicado.
          </div>
        )}
      </div>

      {/* Modal Crear / Modificar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingSubGroup ? 'Modificar Sub-Grupo' : 'Nuevo Sub-Grupo de Productos'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre del Sub-Grupo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Computación, Audio, Repuestos..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Porcentaje de Utilidad Preestablecido (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    required
                    value={formData.utilityPercentage}
                    onChange={e => setFormData({ ...formData, utilityPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Al ingresar facturas o actualizar costos, el precio de venta se calculará automáticamente: <span className="text-emerald-400 font-mono">Costo &times; (1 + {formData.utilityPercentage}%)</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre los tipos de productos en esta categoría..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {editingSubGroup ? 'Guardar Cambios' : 'Registrar Sub-Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
