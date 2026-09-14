import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatCurrency, formatQuantity, exportToExcel } from '../utils/exportUtils';
import { PriceListModule } from './PriceListModule';
import { ProductImagePicker } from './ProductImagePicker';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
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
  Filter,
  Tag,
  Upload,
  Globe,
  Link2,
  Barcode,
  Camera
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

  const [activeTab, setActiveTab] = useState<'inventory' | 'price-lists'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isBarcodeCameraOpen, setIsBarcodeCameraOpen] = useState(false);

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

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const deletedName = productToDelete.name;
    const ok = deleteProduct(productToDelete.id);
    if (ok) {
      setSuccessNotification(`El artículo "${deletedName}" fue eliminado correctamente del catálogo.`);
      setTimeout(() => {
        setSuccessNotification(null);
      }, 4500);
      setProductToDelete(null);
      if (editingProduct?.id === productToDelete.id) {
        setIsModalOpen(false);
        setEditingProduct(null);
      }
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
      {/* Sub-Navigation Tabs: Inventario vs Lista de Precios */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16161A]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventario & Catálogo General</span>
          <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-mono">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('price-lists')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'price-lists'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16161A]'
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>Listas de Precios por Categoría</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-400 font-mono font-bold">
            PDF / Catálogo
          </span>
        </button>
      </div>

      {activeTab === 'price-lists' ? (
        <PriceListModule onGoToProducts={() => setActiveTab('inventory')} />
      ) : (
        <>
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
                onClick={() => setActiveTab('price-lists')}
                className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
                title="Ver y exportar listas de precios por categoría"
              >
                <Tag className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Listas de Precios</span>
              </button>

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

      {/* Banner de Notificación de Éxito */}
      {successNotification && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotification}</span>
          </div>
          <button 
            onClick={() => setSuccessNotification(null)} 
            className="text-zinc-400 hover:text-white transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                        {isAdmin ? (
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                            title="Eliminar Artículo (Solo Administrador)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-zinc-600 opacity-40 cursor-not-allowed"
                            title="Solo el Administrador puede eliminar artículos del catálogo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Imagen del Producto
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      Desde tu ordenador o buscando en internet
                    </span>
                  </div>

                  <div className="p-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl flex flex-col sm:flex-row items-center gap-3">
                    {/* Miniatura / Preview */}
                    <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                      {formData.imageUrl ? (
                        <img
                          src={formData.imageUrl}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsImagePickerOpen(true)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                          title="Seleccionar foto desde tu ordenador o catálogo de internet"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Buscar en Internet / PC</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsImagePickerOpen(true)}
                          className="px-3 py-1.5 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors flex items-center gap-1.5"
                          title="Subir archivo desde el ordenador"
                        >
                          <Upload className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Subir de mi Ordenador</span>
                        </button>

                        {formData.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                            className="px-2.5 py-1.5 text-red-400 hover:text-red-300 text-xs rounded-xl hover:bg-red-500/10 transition-colors"
                            title="Quitar imagen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* URL rápida opcional */}
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="O pega directamente un enlace web (URL)..."
                          value={formData.imageUrl}
                          onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                          className="w-full px-2.5 py-1 bg-[#121215] border border-zinc-800 rounded-lg text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
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

              <div className="pt-4 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  {isAdmin && editingProduct && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(editingProduct)}
                      className="w-full sm:w-auto px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-xl border border-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                      title="Eliminar este artículo del catálogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Artículo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selector de Imagen Modal (PC / Internet / URL) */}
      {isImagePickerOpen && (
        <ProductImagePicker
          currentImageUrl={formData.imageUrl}
          productName={formData.name}
          onSelectImage={url => setFormData({ ...formData, imageUrl: url })}
          onClose={() => setIsImagePickerOpen(false)}
        />
      )}

      {/* Modal Confirmación de Eliminación (Solo Admin) */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-red-500/30 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#27272A] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Eliminar Artículo del Catálogo</h3>
                <p className="text-xs text-zinc-400">Acción reservada exclusivamente para el Administrador</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                ¿Confirmas que deseas eliminar de forma definitiva este producto? Esta acción no se puede deshacer.
              </p>

              <div className="p-3.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-mono text-[11px]">{productToDelete.sku}</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                    {productToDelete.subGroupName || 'General'}
                  </span>
                </div>
                <div className="font-bold text-white text-sm">{productToDelete.name}</div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-zinc-400 text-[11px]">
                  <span>Stock actual: <strong className="text-zinc-200">{formatQuantity(productToDelete.stock)} un.</strong></span>
                  <span>P. Venta: <strong className="text-emerald-400 font-mono">{formatCurrency(productToDelete.sellingPrice)}</strong></span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>El artículo será dado de baja del catálogo y de la grilla de ventas. Los registros históricos de ventas anteriores no se verán alterados.</span>
              </div>
            </div>

            <div className="p-4 bg-[#1F1F23]/50 border-t border-[#27272A] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Artículo</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
