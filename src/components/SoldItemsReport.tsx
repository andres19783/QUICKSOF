import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatQuantity, exportToExcel, printHtmlDocument } from '../utils/exportUtils';
import { 
  FileSpreadsheet, 
  Search, 
  Calendar, 
  Printer, 
  Filter, 
  TrendingUp, 
  Package, 
  Truck, 
  FolderTree 
} from 'lucide-react';

export const SoldItemsReport: React.FC = () => {
  const { sales, subGroups, suppliers } = useApp();

  // Date filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Specific filters
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all sale items across filtered sales
  const filteredSales = sales.filter(s => {
    const saleDate = s.date.split('T')[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  // Group sold items by product ID
  interface AggregatedSoldItem {
    productId: string;
    productName: string;
    sku: string;
    subGroupId?: string;
    subGroupName?: string;
    supplierId?: string;
    supplierName?: string;
    quantity: number;
    totalCost: number;
    totalRevenue: number;
    grossProfit: number;
    marginPercentage: number;
  }

  const itemMap = new Map<string, AggregatedSoldItem>();

  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const existing = itemMap.get(item.productId);
      const itemCost = item.totalCost ?? (item.costPrice * item.quantity);
      const itemRev = item.subtotal;

      if (existing) {
        existing.quantity += item.quantity;
        existing.totalCost += itemCost;
        existing.totalRevenue += itemRev;
        existing.grossProfit = existing.totalRevenue - existing.totalCost;
        existing.marginPercentage = existing.totalRevenue > 0
          ? Math.round((existing.grossProfit / existing.totalRevenue) * 1000) / 10
          : 0;
      } else {
        const gross = itemRev - itemCost;
        itemMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          subGroupId: item.subGroupId,
          subGroupName: item.subGroupName,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          quantity: item.quantity,
          totalCost: itemCost,
          totalRevenue: itemRev,
          grossProfit: gross,
          marginPercentage: itemRev > 0 ? Math.round((gross / itemRev) * 1000) / 10 : 0
        });
      }
    });
  });

  const allAggregatedItems = Array.from(itemMap.values());

  // Apply filters
  const filteredItems = allAggregatedItems.filter(item => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubGroup = selectedSubGroup === 'all' || item.subGroupId === selectedSubGroup;
    const matchesSupplier = selectedSupplier === 'all' || item.supplierId === selectedSupplier;

    return matchesSearch && matchesSubGroup && matchesSupplier;
  });

  // Totals
  const totalUnitsSold = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalCostSold = filteredItems.reduce((sum, i) => sum + i.totalCost, 0);
  const totalRevenueSold = filteredItems.reduce((sum, i) => sum + i.totalRevenue, 0);
  const totalGrossProfit = totalRevenueSold - totalCostSold;
  const overallMargin = totalRevenueSold > 0 ? Math.round((totalGrossProfit / totalRevenueSold) * 1000) / 10 : 0;

  // Export to Excel
  const handleExport = () => {
    exportToExcel(
      filteredItems,
      `Reporte_Articulos_Vendidos_${startDate}_al_${endDate}`,
      [
        { key: 'sku', header: 'SKU' },
        { key: 'productName', header: 'Producto' },
        { key: 'subGroupName', header: 'Sub-Grupo' },
        { key: 'supplierName', header: 'Proveedor' },
        { key: 'quantity', header: 'Unidades Vendidas', format: v => formatQuantity(v) },
        { key: 'totalCost', header: 'Costo Total', format: v => formatCurrency(v) },
        { key: 'totalRevenue', header: 'Ingresos Totales', format: v => formatCurrency(v) },
        { key: 'grossProfit', header: 'Utilidad Bruta', format: v => formatCurrency(v) },
        { key: 'marginPercentage', header: 'Margen Comercial (%)', format: v => `${v}%` }
      ]
    );
  };

  // Print Report
  const handlePrint = () => {
    const html = `
      <div class="header">
        <div>
          <h2>Reporte Detallado de Artículos Vendidos</h2>
          <p><strong>Período:</strong> Del ${startDate} al ${endDate}</p>
          <p><strong>Filtros aplicados:</strong> Subgrupo: ${selectedSubGroup === 'all' ? 'Todos' : selectedSubGroup} | Proveedor: ${selectedSupplier === 'all' ? 'Todos' : selectedSupplier}</p>
        </div>
        <div class="text-right">
          <h3>Total Unidades: ${formatQuantity(totalUnitsSold)}</h3>
          <p><strong>Ingresos Totales:</strong> ${formatCurrency(totalRevenueSold)}</p>
          <p><strong>Ganancia Bruta:</strong> ${formatCurrency(totalGrossProfit)} (${overallMargin}%)</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Sub-Grupo</th>
            <th>Proveedor</th>
            <th class="text-right">Unidades</th>
            <th class="text-right">Costo Total</th>
            <th class="text-right">Ingreso Venta</th>
            <th class="text-right">Utilidad Bruta</th>
            <th class="text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          ${filteredItems.map(it => `
            <tr>
              <td>${it.sku}</td>
              <td>${it.productName}</td>
              <td>${it.subGroupName || '-'}</td>
              <td>${it.supplierName || '-'}</td>
              <td class="text-right font-bold">${formatQuantity(it.quantity)}</td>
              <td class="text-right">${formatCurrency(it.totalCost)}</td>
              <td class="text-right font-bold">${formatCurrency(it.totalRevenue)}</td>
              <td class="text-right font-bold" style="color: #2e7d32;">${formatCurrency(it.grossProfit)}</td>
              <td class="text-right">${it.marginPercentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    printHtmlDocument(`Reporte_Vendidos_${startDate}_${endDate}`, html);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">9. Reporte de Artículos Vendidos</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Análisis de rotación de artículos, ingresos y utilidad bruta por fechas, subgrupos y proveedores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Unidades Totales Vendidas</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{formatQuantity(totalUnitsSold)} un.</p>
          <span className="text-[10px] text-zinc-500">{filteredItems.length} artículos diferentes</span>
        </div>

        <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ingresos Totales (Venta)</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{formatCurrency(totalRevenueSold)}</p>
          <span className="text-[10px] text-zinc-500">Facturado en el período</span>
        </div>

        <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Costo de Mercadería Vendida</span>
          <p className="text-2xl font-bold text-zinc-300 font-mono mt-1">{formatCurrency(totalCostSold)}</p>
          <span className="text-[10px] text-zinc-500">Valor de reposición / costo</span>
        </div>

        <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Utilidad Bruta Generada</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{formatCurrency(totalGrossProfit)}</p>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">Margen: {overallMargin}%</span>
        </div>
      </div>

      {/* Filtros Bar */}
      <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filtrar por artículo o SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
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
                <option key={sg.id} value={sg.id}>{sg.name}</option>
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
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0A0A0B] px-2 py-1.5 rounded-xl border border-[#27272A] flex items-center gap-1 text-xs">
              <span className="text-[10px] text-zinc-500">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-[11px] w-full"
              />
            </div>
            <div className="flex-1 bg-[#0A0A0B] px-2 py-1.5 rounded-xl border border-[#27272A] flex items-center gap-1 text-xs">
              <span className="text-[10px] text-zinc-500">A:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-[11px] w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Artículos Vendidos */}
      <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
              <tr>
                <th className="p-3.5">Artículo / SKU</th>
                <th className="p-3.5">Sub-Grupo</th>
                <th className="p-3.5">Proveedor</th>
                <th className="p-3.5 text-center">Cant. Vendida</th>
                <th className="p-3.5 text-right">Costo Total</th>
                <th className="p-3.5 text-right">Total Facturado</th>
                <th className="p-3.5 text-right">Utilidad Bruta</th>
                <th className="p-3.5 text-right">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredItems.map(item => (
                <tr key={item.productId} className="hover:bg-[#1C1C21] transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-white text-xs">{item.productName}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">SKU: {item.sku}</p>
                  </td>
                  <td className="p-3.5">{item.subGroupName || '-'}</td>
                  <td className="p-3.5 text-zinc-400">{item.supplierName || '-'}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-white font-mono font-bold">
                      {formatQuantity(item.quantity)} un.
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono text-zinc-400">
                    {formatCurrency(item.totalCost)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-white">
                    {formatCurrency(item.totalRevenue)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(item.grossProfit)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-400">
                    +{item.marginPercentage}%
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-xs">
                    No hay ventas registradas con los filtros y rango de fechas seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
