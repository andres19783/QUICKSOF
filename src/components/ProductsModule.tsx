import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatCurrency, formatQuantity, exportToExcel } from '../utils/exportUtils';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  FileSpreadsheet, 
  Image as ImageIcon,
  X,
  CheckCircle,
  Truck,
  Percent,
  Filter
} from 'lucide-react';

export const ProductsModule: React.FC = () => {
  const { 
    products, 
    subGroups, 
    suppliers, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    isAdmin 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    subGroupId: '',
    supplierId: '',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minStock: 5,
    imageUrl: '',
    description: ''
  });

  const openNewModal = () => {
    setEditingProduct(null);
    setErrorMessage(null);
    const defaultSub = subGroups[0]?.id || '';
    const defaultUtility = subGroups[0]?.utilityPercentage || 35;
    const defaultCost = 1000;
    const defaultSelling = Math.round(defaultCost * (1 + defaultUtility / 100));

    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      barcode: '',
      subGroupId: defaultSub,
      supplierId: suppliers[0]?.id || '',
      costPrice: defaultCost,
      sellingPrice: defaultSelling,
      stock: 10,
      minStock: 5,
      imageUrl: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setErrorMessage(null);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      subGroupId: p.subGroupId,
      supplierId: p.supplierId || '',
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stock: p.stock,
      minStock: p.minStock || 5,
      imageUrl: p.imageUrl || '',
      description: p.description || ''
    });
    setIsModalOpen(true);
  };

  // Al cambiar de subgrupo o precio de costo en el formulario, calcular precio de venta sugerido
  const handleSubGroupChange = (newSubId: string) => {
    const sub = subGroups.find(sg => sg.id === newSubId);
    const utility = sub ? sub.utilityPercentage : 35;
    const newSelling = Math.round(formData.costPrice * (1 + utility / 100) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      subGroupId: newSubId,
      sellingPrice: newSelling
    }));
  };

  const handleCostPriceChange = (newCost: number) => {
    const sub = subGroups.find(sg => sg.id === formData.subGroupId);
    const utility = sub ? sub.utilityPercentage : 35;
    const newSelling = Math.round(newCost * (1 + utility / 100) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      costPrice: newCost,
      sellingPrice: newSelling
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim() || !formData.sku.trim()) {
      setErrorMessage('Nombre y SKU son campos obligatorios.');
      return;
    }

    if (editingProduct) {
      const res = updateProduct(editingProduct.id, {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        subGroupId: formData.subGroupId,
        supplierId: formData.supplierId || undefined,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        imageUrl: formData.imageUrl.trim(),
        description: formData.description.trim()
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al actualizar el producto');
        return;
      }
    } else {
      addProduct({
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        subGroupId: formData.subGroupId,
        supplierId: formData.supplierId || undefined,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80',
        description: formData.description.trim()
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el artículo "${name}"? Esta acción no se puede deshacer.`)) {
      deleteProduct(id);
    }
  };

  const handleExport = () => {
    exportToExcel(
      filteredProducts,
      'Inventario_Productos',
      [
        { key: 'sku', header: 'SKU' },
        { key: 'name', header: 'Nombre del Producto' },
        { key: 'subGroupName', header: 'Sub-Grupo' },
        { key: 'supplierName', header: 'Proveedor Registrado' },
        { key: 'costPrice', header: 'Precio de Costo', format: v => formatCurrency(v) },
        { key: 'sellingPrice', header: 'Precio de Venta Final', format: v => formatCurrency(v) },
        { key: 'stock', header: 'Stock Actual', format: v => formatQuantity(v) },
        { key: 'minStock', header: 'Stock Mínimo', format: v => formatQuantity(v) }
      ]
    );
  };

  // Filtrado múltiple
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));

    const matchesSubGroup = selectedSubGroup === 'all' || p.subGroupId === selectedSubGroup;
    const matchesSupplier = selectedSupplier === 'all' || p.supplierId === selectedSupplier;
    const matchesLowStock = !showLowStockOnly || p.stock <= (p.minStock || 5);

    return matchesSearch && matchesSubGroup && matchesSupplier && matchesLowStock;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">2. Módulo de Productos & Control de Stock</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión completa con imágenes, márgenes automáticos por subgrupo, vinculación automática de proveedores y protección de stock.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
            title="Descargar tabla en formato Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Subgrupo */}
          <div>
            <select
              value={selectedSubGroup}
              onChange={e => setSelectedSubGroup(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos los Sub-Grupos</option>
              {subGroups.map(sg => (
                <option key={sg.id} value={sg.id}>{sg.name} (+{sg.utilityPercentage}%)</option>
              ))}
            </select>
          </div>

          {/* Proveedor */}
          <div>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos los Proveedores</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>

          {/* Switch Stock Crítico */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={e => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-700 focus:ring-emerald-500"
              />
              <span className={showLowStockOnly ? 'text-amber-400 font-bold' : ''}>
                Solo Stock Crítico (≤ Mínimo)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Regla de negocio visible */}
      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Seguridad de Stock:</strong> El precio de venta se calcula automáticamente según el margen del subgrupo. El stock solo puede ser disminuido manualmente por el usuario <span className="text-emerald-400 font-bold">Administrador</span>.
          </span>
        </div>
        <span className="text-zinc-500 font-mono hidden md:inline">
          Mostrando {filteredProducts.length} de {products.length} artículos
        </span>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
              <tr>
                <th className="p-3.5">Artículo / Imagen</th>
                <th className="p-3.5">Sub-Grupo & Margen</th>
                <th className="p-3.5">Proveedor Asignado</th>
                <th className="p-3.5 text-right">P. Costo</th>
                <th className="p-3.5 text-right">P. Venta Final</th>
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredProducts.map(p => {
                const sub = subGroups.find(sg => sg.id === p.subGroupId);
                const isLow = p.stock <= (p.minStock || 5);
                return (
                  <tr key={p.id} className="hover:bg-[#1C1C21] transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=120&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-cover bg-black border border-zinc-800 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-white text-xs">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-zinc-400">
                            <span>SKU: {p.sku}</span>
                            {p.barcode && <span>&bull; Código: {p.barcode}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-medium text-zinc-200 block">{p.subGroupName || 'General'}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        +{sub ? sub.utilityPercentage : 35}% utilidad
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Truck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[160px]">{p.supplierName || 'Sin proveedor asignado'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-zinc-400">
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full font-mono font-bold text-xs ${
                        isLow
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {formatQuantity(p.stock)} un.
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                          title="Modificar Producto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                            title="Eliminar Producto (Solo Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-xs">
                    No se encontraron artículos con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingProduct ? `Editar Artículo: ${editingProduct.name}` : 'Registrar Nuevo Producto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Teclado Mecánico RGB Switch Red..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: TEC-001"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Código de Barras (EAN / UPC)
                  </label>
                  <input
                    type="text"
                    placeholder="779123456789"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Subgrupo selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Sub-Grupo de Producto *
                  </label>
                  <select
                    required
                    value={formData.subGroupId}
                    onChange={e => handleSubGroupChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Seleccione un subgrupo</option>
                    {subGroups.map(sg => (
                      <option key={sg.id} value={sg.id}>
                        {sg.name} (+{sg.utilityPercentage}% margen)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proveedor selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Proveedor Habitual
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Sin asignar o se asignará por factura)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Precio de Costo ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={e => handleCostPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Precio de Venta Final ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Calculado automáticamente con el % de utilidad del subgrupo.</p>
                </div>

                {/* Stock actual con restricción admin */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Stock Disponible *
                    </label>
                    {!isAdmin && editingProduct && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 font-medium">
                        <ShieldAlert className="w-3 h-3" /> Solo Admin disminuye
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Stock Mínimo de Alerta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minStock}
                    onChange={e => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    URL de la Imagen del Producto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                    {formData.imageUrl && (
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-9 h-9 rounded-lg object-cover border border-zinc-700 shrink-0"
                      />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Descripción / Ficha Técnica
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-[#27272A] flex justify-end gap-3">
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
                  {editingProduct ? 'Actualizar Artículo' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
