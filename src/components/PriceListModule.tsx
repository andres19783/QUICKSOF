import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, SubGroup, CustomerCategory } from '../types';
import { formatCurrency, formatQuantity, exportToExcel, printHtmlDocument } from '../utils/exportUtils';
import { generatePriceListPdf } from '../utils/priceListPdf';
import {
  FileText,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Printer,
  Search,
  Filter,
  Tag,
  Percent,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownRight,
  Sparkles,
  ExternalLink,
  Store
} from 'lucide-react';

interface PriceListModuleProps {
  onGoToProducts?: () => void;
}

export const PriceListModule: React.FC<PriceListModuleProps> = ({ onGoToProducts }) => {
  const { products, subGroups, customerCategories, isAdmin, storeSettings, openStoreSettingsModal } = useApp();

  // Combine standard base price tier with real customer categories
  const availableCategories: CustomerCategory[] = useMemo(() => {
    const baseCategory: CustomerCategory = {
      id: 'base-general',
      name: 'Consumidor Final (Precio Base)',
      discountPercentage: 0,
      description: 'Tarifa general de venta al público sin descuentos adicionales.'
    };

    if (customerCategories.length > 0) {
      // Check if base general is already there, if not prepend it
      const hasBase = customerCategories.some(c => c.discountPercentage === 0);
      return hasBase ? customerCategories : [baseCategory, ...customerCategories];
    }

    // Default commercial tiers if user hasn't configured categories in CRM yet
    return [
      baseCategory,
      {
        id: 'cat-frecuente',
        name: 'Cliente Frecuente',
        discountPercentage: 5,
        description: 'Descuento del 5% para clientes habituales registrados.'
      },
      {
        id: 'cat-gremio',
        name: 'Gremio / Técnico',
        discountPercentage: 10,
        description: 'Tarifa para talleres, instaladores y técnicos profesionales.'
      },
      {
        id: 'cat-mayorista',
        name: 'Mayorista / Distribuidor',
        discountPercentage: 15,
        description: 'Tarifa para compras por volumen y revendedores.'
      }
    ];
  }, [customerCategories]);

  // State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(availableCategories[0]?.id || 'base-general');
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'catalog' | 'table'>('catalog');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Active Category Details
  const activeCategory = useMemo(() => {
    return availableCategories.find(c => c.id === selectedCategoryId) || availableCategories[0];
  }, [availableCategories, selectedCategoryId]);

  const discountPercentage = activeCategory?.discountPercentage || 0;

  // Selected Subgroup Details
  const activeSubGroup = useMemo(() => {
    if (selectedSubGroupId === 'all') return null;
    return subGroups.find(sg => sg.id === selectedSubGroupId) || null;
  }, [subGroups, selectedSubGroupId]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term));

      const matchesSubGroup = selectedSubGroupId === 'all' || p.subGroupId === selectedSubGroupId;
      const matchesStock = !onlyInStock || p.stock > 0;

      return matchesSearch && matchesSubGroup && matchesStock;
    });
  }, [products, searchTerm, selectedSubGroupId, onlyInStock]);

  // Handler for Direct PDF Generation
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      generatePriceListPdf({
        categoryName: activeCategory ? activeCategory.name : 'Consumidor Final',
        discountPercentage: discountPercentage,
        subGroupName: activeSubGroup ? activeSubGroup.name : 'Todos los Grupos',
        products: filteredProducts,
        companyName: storeSettings.name,
        logoUrl: storeSettings.logoUrl,
        taxId: storeSettings.taxId,
        address: storeSettings.address,
        phone: storeSettings.phone,
        email: storeSettings.email
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler for Print / Browser PDF
  const handlePrintHtml = () => {
    const catName = activeCategory ? activeCategory.name : 'Consumidor Final';
    const groupName = activeSubGroup ? activeSubGroup.name : 'Todos los Grupos';

    const rowsHtml = filteredProducts.map(p => {
      const basePrice = p.sellingPrice;
      const finalPrice = Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
      return `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${p.sku || '-'}</td>
          <td>
            <strong>${p.name}</strong>
            ${p.description ? `<br><small style="color: #666;">${p.description}</small>` : ''}
          </td>
          <td>${p.subGroupName || 'General'}</td>
          <td style="text-align: center;">${formatQuantity(p.stock)} un.</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(basePrice)}</td>
          <td style="text-align: center; color: #059669; font-weight: bold;">${discountPercentage > 0 ? `-${discountPercentage}%` : '0%'}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #059669; font-size: 13px;">${formatCurrency(finalPrice)}</td>
        </tr>
      `;
    }).join('');

    const logoHtml = storeSettings.logoUrl 
      ? `<img src="${storeSettings.logoUrl}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />`
      : '';

    const htmlContent = `
      <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181b; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${logoHtml}
          <div>
            <h1 style="margin: 0; color: #18181b; font-size: 18px; font-weight: 800; text-transform: uppercase;">${storeSettings.name}</h1>
            <h3 style="margin: 2px 0 0 0; color: #059669; font-size: 13px;">LISTA DE PRECIOS - ${catName} (${discountPercentage > 0 ? `Descuento: -${discountPercentage}%` : 'Tarifa Base'})</h3>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #52525b;">${storeSettings.taxId ? `CUIT: ${storeSettings.taxId} | ` : ''}${storeSettings.address || ''}${storeSettings.phone ? ` | Tel: ${storeSettings.phone}` : ''}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #52525b;">Grupo: <strong>${groupName}</strong> | Artículos: <strong>${filteredProducts.length}</strong></p>
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #71717a;">
          <p style="margin: 0;">Fecha: ${new Date().toLocaleDateString('es-AR')}</p>
          <p style="margin: 2px 0 0 0;">Precios sujetos a variación</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 80px;">SKU</th>
            <th>Artículo / Detalle</th>
            <th style="width: 120px;">Grupo</th>
            <th style="width: 70px; text-align: center;">Stock</th>
            <th style="width: 90px; text-align: right;">P. Lista</th>
            <th style="width: 60px; text-align: center;">Desc.</th>
            <th style="width: 100px; text-align: right;">Precio Final</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    printHtmlDocument(`Lista_Precios_${catName}`, htmlContent);
  };

  // Handler for Excel Export
  const handleExportExcel = () => {
    exportToExcel(
      filteredProducts,
      `Lista_Precios_${activeCategory?.name || 'General'}`,
      [
        { key: 'sku', header: 'SKU / Código' },
        { key: 'name', header: 'Artículo' },
        { key: 'subGroupName', header: 'Grupo' },
        { key: 'stock', header: 'Stock Actual', format: v => formatQuantity(v) },
        { key: 'sellingPrice', header: 'Precio Lista Base', format: v => formatCurrency(v) },
        {
          key: 'discount',
          header: 'Descuento %',
          format: () => `${discountPercentage}%`
        },
        {
          key: 'finalPrice',
          header: `Precio Final (${activeCategory?.name || 'Cat'})`,
          format: (_v, p) => formatCurrency(Math.round(p.sellingPrice * (1 - discountPercentage / 100) * 100) / 100)
        }
      ]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#16161A] p-5 rounded-2xl border border-[#27272A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Listas de Precios por Categoría de Cliente</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Calcula automáticamente el valor de venta según la categoría del cliente, filtra por grupo de artículos y genera documentos PDF para imprimir o enviar.
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Logo y Nombre del Puesto */}
          <button
            onClick={openStoreSettingsModal}
            className="px-3 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
            title="Configurar Logo y Datos del Puesto para las Listas y PDF"
          >
            {storeSettings.logoUrl ? (
              <img
                src={storeSettings.logoUrl}
                alt="Logo"
                className="w-4 h-4 rounded object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Store className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden sm:inline max-w-[130px] truncate">{storeSettings.name}</span>
          </button>

          {/* Toggle Vista Catálogo vs Vista Tabla */}
          <div className="flex items-center bg-[#0A0A0B] p-1 rounded-xl border border-[#27272A]">
            <button
              onClick={() => setViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'catalog'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Vista de tarjetas comerciales con fotos"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Catálogo</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Vista en tabla para análisis rápido"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
            title="Exportar a planilla Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Imprimir / Vista Previa */}
          <button
            onClick={handlePrintHtml}
            className="px-3 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
            title="Abrir vista de impresión para enviar a impresora"
          >
            <Printer className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* GENERAR PDF (Principal) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || filteredProducts.length === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            title="Generar y descargar archivo PDF oficial"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Generar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Selectores y Filtros */}
      <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Categoría de Cliente */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Categoría de Cliente</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.discountPercentage > 0 ? `(-${cat.discountPercentage}%)` : '(Precio Base)'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Grupo de Artículos */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Grupo de Artículos</span>
            </label>
            <select
              value={selectedSubGroupId}
              onChange={e => setSelectedSubGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos los Grupos ({products.length} productos)</option>
              {subGroups.map(sg => {
                const count = products.filter(p => p.subGroupId === sg.id).length;
                return (
                  <option key={sg.id} value={sg.id}>
                    {sg.name} ({count} productos)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Búsqueda Rápida */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>Buscar Artículo</span>
            </label>
            <input
              type="text"
              placeholder="Nombre, SKU o código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 4. Filtro de Stock Disponible */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setOnlyInStock(!onlyInStock)}
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                onlyInStock
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0A0A0B] border-[#27272A] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${onlyInStock ? 'text-emerald-400' : 'text-zinc-600'}`} />
                <span>Solo con stock disponible</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${onlyInStock ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                {onlyInStock ? 'Activo' : 'Inactivo'}
              </span>
            </button>
          </div>
        </div>

        {/* Resumen Informativo de la Categoría Activa */}
        <div className="p-3 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Tarifa activa:</span>
            <span className="font-bold text-white">{activeCategory?.name}</span>
            {discountPercentage > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[11px] flex items-center gap-1">
                <Percent className="w-3 h-3" />
                -{discountPercentage}% sobre lista general
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px]">
                Precio de Lista Base (0% dto.)
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
            <span>Grupo: <strong className="text-zinc-200">{activeSubGroup ? activeSubGroup.name : 'Todos'}</strong></span>
            <span>Artículos listados: <strong className="text-emerald-400 font-mono">{filteredProducts.length}</strong></span>
          </div>
        </div>
      </div>

      {/* VISTA 1: CATÁLOGO COMERCIAL (Grid de Tarjetas) */}
      {viewMode === 'catalog' && (
        <div>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(p => {
                const basePrice = p.sellingPrice;
                const finalPrice = Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
                const savings = basePrice - finalPrice;
                const isOutOfStock = p.stock <= 0;

                return (
                  <div
                    key={p.id}
                    className="bg-[#16161A] border border-[#27272A] hover:border-zinc-700 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between group"
                  >
                    {/* Imagen y Badges */}
                    <div className="relative aspect-video bg-[#0A0A0B] overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={e => {
                            // Fallback on broken image
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600 gap-1">
                          <Package className="w-8 h-8 opacity-40" />
                          <span className="text-[10px]">Sin imagen</span>
                        </div>
                      )}

                      {/* Badges superiores */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-mono font-bold text-zinc-300 border border-white/10">
                          {p.sku}
                        </span>
                      </div>

                      {/* Stock badge */}
                      <div className="absolute top-2 right-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm ${
                            isOutOfStock
                              ? 'bg-red-500/80 text-white'
                              : p.stock <= (p.minStock || 5)
                              ? 'bg-amber-500/80 text-black'
                              : 'bg-emerald-500/80 text-black'
                          }`}
                        >
                          {isOutOfStock ? 'Sin stock' : `${formatQuantity(p.stock)} un.`}
                        </span>
                      </div>

                      {/* Discount ribbon if applicable */}
                      {discountPercentage > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black text-[10px] shadow-lg">
                            -{discountPercentage}% OFF
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contenido del Producto */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1">
                          <span>{p.subGroupName || 'General'}</span>
                          {p.barcode && <span>• Cód: {p.barcode}</span>}
                        </div>
                        <h3 className="font-bold text-white text-sm leading-tight line-clamp-2" title={p.name}>
                          {p.name}
                        </h3>
                        {p.description && (
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* Bloque de Precios Comercial */}
                      <div className="pt-3 border-t border-zinc-800/80 space-y-1">
                        {discountPercentage > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-[11px] text-zinc-500">
                              <span>Precio Lista:</span>
                              <span className="line-through font-mono">{formatCurrency(basePrice)}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] font-bold text-zinc-300">Precio {activeCategory.name}:</span>
                              <span className="text-lg font-mono font-bold text-emerald-400">
                                {formatCurrency(finalPrice)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-emerald-500/80 pt-0.5">
                              <span>Ahorro por unidad:</span>
                              <span className="font-mono font-semibold">-{formatCurrency(savings)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-xs text-zinc-400 font-medium">Precio Venta:</span>
                            <span className="text-lg font-mono font-bold text-emerald-400">
                              {formatCurrency(finalPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#16161A] p-12 rounded-2xl border border-[#27272A] text-center space-y-3">
              <Package className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">No se encontraron artículos</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No hay productos que coincidan con la categoría, grupo de artículos o búsqueda seleccionada.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: TABLA DE PRECIOS DETALLADA */}
      {viewMode === 'table' && (
        <div className="bg-[#16161A] rounded-2xl border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0A0A0B] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                <tr>
                  <th className="p-3.5 text-center w-14">Foto</th>
                  <th className="p-3.5">SKU / Cód.</th>
                  <th className="p-3.5">Artículo / Detalle</th>
                  <th className="p-3.5">Grupo</th>
                  <th className="p-3.5 text-center">Stock</th>
                  <th className="p-3.5 text-right">Precio Lista Base</th>
                  <th className="p-3.5 text-center">Descuento Cat.</th>
                  <th className="p-3.5 text-right">Precio Final ({activeCategory?.name})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredProducts.map(p => {
                  const basePrice = p.sellingPrice;
                  const finalPrice = Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
                  const isLow = p.stock <= (p.minStock || 5);

                  return (
                    <tr key={p.id} className="hover:bg-[#1C1C21] transition-colors">
                      <td className="p-2 text-center">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover mx-auto border border-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-zinc-400 font-bold">
                        {p.sku}
                        {p.barcode && <div className="text-[10px] text-zinc-500 font-normal">{p.barcode}</div>}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs">{p.description}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 text-[11px]">
                          {p.subGroupName || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-mono text-xs font-semibold ${
                            p.stock <= 0
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {formatQuantity(p.stock)} un.
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-zinc-400">
                        {formatCurrency(basePrice)}
                      </td>
                      <td className="p-3.5 text-center">
                        {discountPercentage > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                            -{discountPercentage}%
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-mono text-xs">0%</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                        {formatCurrency(finalPrice)}
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 text-xs">
                      No se encontraron artículos con los criterios seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
