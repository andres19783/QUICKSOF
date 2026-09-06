import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, exportToExcel, printHtmlDocument } from '../utils/exportUtils';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const BalanceReport: React.FC = () => {
  const { sales, financialMovements } = useApp();

  // Date range
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // 1. Filtered Sales within dates
  const periodSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  // Calculate Total Sales Revenue & Cost of Goods Sold
  let totalSalesRevenue = 0;
  let totalCostOfGoodsSold = 0;

  periodSales.forEach(sale => {
    totalSalesRevenue += sale.totalAmount;
    sale.items.forEach(item => {
      totalCostOfGoodsSold += item.totalCost ?? (item.costPrice * item.quantity);
    });
  });

  // Gross Profit
  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const grossMarginPercentage = totalSalesRevenue > 0
    ? Math.round((grossProfit / totalSalesRevenue) * 1000) / 10
    : 0;

  // 2. Filtered Operational Expenses within dates
  const periodExpenses = financialMovements.filter(m => {
    const d = m.date.split('T')[0];
    return (m.type === 'expense') && d >= startDate && d <= endDate;
  });

  // Group expenses by category
  const expenseCategoriesMap: { [key: string]: number } = {
    sueldos: 0,
    servicios: 0,
    mantenimiento: 0,
    comisiones: 0,
    alquiler: 0,
    otros: 0
  };

  let totalExpenses = 0;
  periodExpenses.forEach(exp => {
    const cat = exp.category || 'otros';
    expenseCategoriesMap[cat] = (expenseCategoriesMap[cat] || 0) + exp.amount;
    totalExpenses += exp.amount;
  });

  // 3. Net Margin / Net Profit
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercentage = totalSalesRevenue > 0
    ? Math.round((netProfit / totalSalesRevenue) * 1000) / 10
    : 0;

  // Export to Excel
  const handleExportExcel = () => {
    const reportData = [
      { Concepto: '1. Ingresos Brutos por Ventas', Importe: totalSalesRevenue, Porcentaje: '100%' },
      { Concepto: '2. Costo de Mercadería Vendida (CMV)', Importe: -totalCostOfGoodsSold, Porcentaje: `${totalSalesRevenue ? Math.round((totalCostOfGoodsSold / totalSalesRevenue) * 100) : 0}%` },
      { Concepto: '3. UTILIDAD BRUTA (Margen Bruto)', Importe: grossProfit, Porcentaje: `${grossMarginPercentage}%` },
      { Concepto: '--- GASTOS OPERATIVOS ---', Importe: 0, Porcentaje: '' },
      { Concepto: 'Gastos de Sueldos y Cargas Sociales', Importe: -expenseCategoriesMap.sueldos, Porcentaje: '' },
      { Concepto: 'Gastos de Servicios Básicos', Importe: -expenseCategoriesMap.servicios, Porcentaje: '' },
      { Concepto: 'Gastos de Mantenimiento', Importe: -expenseCategoriesMap.mantenimiento, Porcentaje: '' },
      { Concepto: 'Comisiones de Ventas', Importe: -expenseCategoriesMap.comisiones, Porcentaje: '' },
      { Concepto: 'Alquiler Comercial', Importe: -expenseCategoriesMap.alquiler, Porcentaje: '' },
      { Concepto: 'Otros Gastos Generales', Importe: -expenseCategoriesMap.otros, Porcentaje: '' },
      { Concepto: 'Total Gastos Operativos', Importe: -totalExpenses, Porcentaje: `${totalSalesRevenue ? Math.round((totalExpenses / totalSalesRevenue) * 100) : 0}%` },
      { Concepto: '=== MARGEN NETO / UTILIDAD NETA DEL EJERCICIO ===', Importe: netProfit, Porcentaje: `${netMarginPercentage}%` }
    ];

    exportToExcel(
      reportData,
      `Balance_Margen_Neto_${startDate}_a_${endDate}`,
      [
        { key: 'Concepto', header: 'Concepto Contable' },
        { key: 'Importe', header: 'Importe Monetario', format: v => (v === 0 ? '-' : formatCurrency(v)) },
        { key: 'Porcentaje', header: 'Porcentaje (%)' }
      ]
    );
  };

  // Print Financial Statement
  const handlePrintStatement = () => {
    const html = `
      <div class="header">
        <div>
          <h2>ESTADO DE RESULTADOS & BALANCE NETO</h2>
          <p><strong>Razón Social:</strong> NEXOCONTA S.A. &bull; CUIT: 30-71928391-4</p>
          <p><strong>Período Contable:</strong> Del ${startDate} al ${endDate}</p>
        </div>
        <div class="text-right">
          <h3>Margen Neto Final: ${formatCurrency(netProfit)}</h3>
          <p><strong>Rendimiento Neto sobre Ventas:</strong> ${netMarginPercentage}%</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Concepto / Estructura de Resultados</th>
            <th class="text-right">Importe Parcial</th>
            <th class="text-right">Subtotal / Total</th>
            <th class="text-right">% s/ Ventas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>(+) Ventas Totales Facturadas</strong></td>
            <td class="text-right">-</td>
            <td class="text-right font-bold">${formatCurrency(totalSalesRevenue)}</td>
            <td class="text-right">100.0%</td>
          </tr>
          <tr>
            <td>(-) Costo de Mercadería Vendida (CMV)</td>
            <td class="text-right">-${formatCurrency(totalCostOfGoodsSold)}</td>
            <td class="text-right">-</td>
            <td class="text-right">${totalSalesRevenue ? Math.round((totalCostOfGoodsSold / totalSalesRevenue) * 100) : 0}%</td>
          </tr>
          <tr style="background: #f5f5f5; font-weight: bold;">
            <td>(=) UTILIDAD BRUTA / MARGEN COMERCIAL</td>
            <td class="text-right">-</td>
            <td class="text-right" style="color: #2e7d32;">${formatCurrency(grossProfit)}</td>
            <td class="text-right">${grossMarginPercentage}%</td>
          </tr>
          <tr><td colspan="4" style="background: #fafafa; font-size: 11px; text-transform: uppercase;"><strong>(-) Gastos Operacionales del Período</strong></td></tr>
          <tr>
            <td style="padding-left: 20px;">&bull; Sueldos y Nómina</td>
            <td class="text-right">-${formatCurrency(expenseCategoriesMap.sueldos)}</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">&bull; Servicios Públicos e Internet</td>
            <td class="text-right">-${formatCurrency(expenseCategoriesMap.servicios)}</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">&bull; Mantenimiento de Instalaciones</td>
            <td class="text-right">-${formatCurrency(expenseCategoriesMap.mantenimiento)}</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">&bull; Comisiones Comerciales</td>
            <td class="text-right">-${formatCurrency(expenseCategoriesMap.comisiones)}</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">&bull; Alquileres Comerciales</td>
            <td class="text-right">-${formatCurrency(expenseCategoriesMap.alquiler)}</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">&bull; Otros Gastos Generales</td>
            <td class="text-right">-${formatCurrency(expenseCategoriesMap.otros)}</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
          </tr>
          <tr style="font-weight: bold;">
            <td>Total Gastos de la Empresa</td>
            <td class="text-right">-</td>
            <td class="text-right" style="color: #c62828;">-${formatCurrency(totalExpenses)}</td>
            <td class="text-right">${totalSalesRevenue ? Math.round((totalExpenses / totalSalesRevenue) * 100) : 0}%</td>
          </tr>
          <tr style="background: #eee; font-size: 14px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            <td>(=) MARGEN NETO / RESULTADO FINAL DEL PERÍODO</td>
            <td class="text-right">-</td>
            <td class="text-right" style="color: ${netProfit >= 0 ? '#2e7d32' : '#c62828'};">
              ${formatCurrency(netProfit)}
            </td>
            <td class="text-right">${netMarginPercentage}%</td>
          </tr>
        </tbody>
      </table>
    `;
    printHtmlDocument(`Balance_Neto_${startDate}_${endDate}`, html);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">10. Balance Financiero & Margen Neto</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Estado de resultados integral: Ventas menos costos menos gastos de la empresa, determinando el margen neto real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handlePrintStatement}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Balance</span>
          </button>
        </div>
      </div>

      {/* Rango de Fechas Selector */}
      <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Período del Balance Contable:</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0A0A0B] px-3 py-1.5 rounded-xl border border-[#27272A] text-xs">
            <span className="text-zinc-500 text-[10px] uppercase font-bold">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          <span className="text-zinc-600">&rarr;</span>

          <div className="flex items-center gap-2 bg-[#0A0A0B] px-3 py-1.5 rounded-xl border border-[#27272A] text-xs">
            <span className="text-zinc-500 text-[10px] uppercase font-bold">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Waterfall Financial Equation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Ventas */}
        <div className="bg-[#16161A] p-5 rounded-2xl border border-[#27272A] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">1. Ventas Totales</span>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              {formatCurrency(totalSalesRevenue)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800">
            {periodSales.length} operaciones concretadas
          </p>
        </div>

        {/* 2. Menos Costo de Mercaderia */}
        <div className="bg-[#16161A] p-5 rounded-2xl border border-[#27272A] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">2. Costo Mercadería (CMV)</span>
            <div className="text-2xl font-bold font-mono text-red-400 mt-2">
              -{formatCurrency(totalCostOfGoodsSold)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800">
            Utilidad Bruta: {formatCurrency(grossProfit)} ({grossMarginPercentage}%)
          </p>
        </div>

        {/* 3. Menos Gastos Empresa */}
        <div className="bg-[#16161A] p-5 rounded-2xl border border-[#27272A] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">3. Gastos de la Empresa</span>
            <div className="text-2xl font-bold font-mono text-red-400 mt-2">
              -{formatCurrency(totalExpenses)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800">
            {periodExpenses.length} egresos (sueldos, servicios, etc.)
          </p>
        </div>

        {/* 4. Margen Neto */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          netProfit >= 0
            ? 'bg-gradient-to-br from-[#16161A] to-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
            : 'bg-gradient-to-br from-[#16161A] to-red-950/30 border-red-500/50'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                4. Margen Neto Real
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-3xl font-bold font-mono mt-2 ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(netProfit)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-300 mt-3 pt-2 border-t border-zinc-800/80 font-mono font-bold">
            Rentabilidad Neta: {netMarginPercentage}% s/ ventas
          </p>
        </div>
      </div>

      {/* Detalle Cuadro Contable del Balance */}
      <div className="bg-[#16161A] rounded-xl border border-[#27272A] p-5 space-y-6">
        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
          Estructura del Estado de Resultados (P&L)
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {/* Ingresos */}
          <div className="p-3 bg-[#0A0A0B] rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-sans font-bold text-white text-sm">(+) Total Ingresos por Ventas Facturadas</span>
            <span className="font-bold text-base text-white">{formatCurrency(totalSalesRevenue)}</span>
          </div>

          {/* Costo Mercadería */}
          <div className="p-3 bg-[#0A0A0B] rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-sans text-zinc-300">(-) Costo Total de Mercadería Vendida (CMV reposición)</span>
            <span className="text-red-400 font-bold">-{formatCurrency(totalCostOfGoodsSold)}</span>
          </div>

          {/* Utilidad Bruta */}
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-700 flex items-center justify-between">
            <span className="font-sans font-bold text-zinc-100">(=) Margen Comercial Bruto</span>
            <span className="font-bold text-emerald-400 text-sm">{formatCurrency(grossProfit)} ({grossMarginPercentage}%)</span>
          </div>

          {/* Desglose Gastos */}
          <div className="p-4 bg-[#0A0A0B] rounded-xl border border-zinc-800 space-y-2">
            <p className="font-sans font-bold text-zinc-400 text-[11px] uppercase tracking-wider mb-2">
              (-) Detalle de Gastos Operativos Imputados en el Período:
            </p>
            <div className="flex justify-between text-zinc-400">
              <span className="font-sans">&bull; Sueldos y Honorarios:</span>
              <span className="text-red-400">-{formatCurrency(expenseCategoriesMap.sueldos)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="font-sans">&bull; Servicios Públicos, Electricidad & Conectividad:</span>
              <span className="text-red-400">-{formatCurrency(expenseCategoriesMap.servicios)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="font-sans">&bull; Mantenimiento Edilicio y Equipamiento:</span>
              <span className="text-red-400">-{formatCurrency(expenseCategoriesMap.mantenimiento)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="font-sans">&bull; Comisiones Comerciales:</span>
              <span className="text-red-400">-{formatCurrency(expenseCategoriesMap.comisiones)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="font-sans">&bull; Alquileres de Inmuebles:</span>
              <span className="text-red-400">-{formatCurrency(expenseCategoriesMap.alquiler)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="font-sans">&bull; Otros Gastos Generales:</span>
              <span className="text-red-400">-{formatCurrency(expenseCategoriesMap.otros)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-zinc-200">
              <span className="font-sans">Total Egresos Operativos:</span>
              <span className="text-red-400">-{formatCurrency(totalExpenses)}</span>
            </div>
          </div>

          {/* Resultado Neto */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-sans font-bold text-white text-base">(=) MARGEN NETO / UTILIDAD NETA FINAL</span>
              <p className="font-sans text-[11px] text-zinc-400">
                Ganancia real neta luego de cubrir costo de mercadería y gastos de operación.
              </p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(netProfit)}
              </span>
              <p className="text-xs text-zinc-400 font-mono font-bold mt-0.5">
                {netMarginPercentage}% sobre facturación
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
