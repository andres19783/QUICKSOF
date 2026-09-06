import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/exportUtils';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  ShoppingCart,
  Landmark
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { 
    products, 
    sales, 
    customers, 
    suppliers, 
    cashRegister, 
    bankAccounts, 
    financialMovements,
    currentShift
  } = useApp();

  // Metrics calculations
  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.balance, 0);
  const totalLiquidity = cashRegister.balance + totalBankBalance;

  // Valor total del inventario (al costo)
  const totalInventoryCost = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
  const totalInventoryUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 5));

  // Cuentas por cobrar (deuda de clientes)
  const totalReceivables = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const indebtedCustomersCount = customers.filter(c => c.currentBalance > 0).length;

  // Cuentas por pagar (deuda con proveedores - balance negativo)
  const totalPayables = suppliers.reduce((sum, s) => sum + (s.currentBalance < 0 ? Math.abs(s.currentBalance) : 0), 0);

  // Ventas y Ganancia bruta global
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalSalesCost = sales.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = totalSalesRevenue - totalSalesCost;

  // Gastos totales (sueldos, servicios, etc.)
  const totalExpenses = financialMovements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);

  const netProfit = grossProfit - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Shift Warning if inactive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Panel de Control & Resumen Gerencial</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión contable en tiempo real, inventarios con subgrupos, CRM y flujo de fondos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Abrir Punto de Venta</span>
          </button>
          <button
            onClick={() => onNavigate('balance')}
            className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 font-semibold text-xs rounded-xl border border-[#27272A] transition-colors"
          >
            Ver Balance General
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Utilidad Bruta */}
        <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Margen Bruto de Ventas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatCurrency(grossProfit)}
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{sales.length} ventas procesadas</span>
          </p>
        </div>

        {/* Valor de Inventario */}
        <div 
          onClick={() => onNavigate('products')}
          className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valor de Inventario</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatCurrency(totalInventoryCost)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            {totalInventoryUnits.toLocaleString()} unidades en stock ({products.length} productos)
          </p>
        </div>

        {/* Cuentas por Cobrar */}
        <div 
          onClick={() => onNavigate('customers')}
          className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cuentas por Cobrar</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {formatCurrency(totalReceivables)}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
            {indebtedCustomersCount} clientes con saldo en cuenta corriente
          </p>
        </div>

        {/* Liquidez Total (Caja + Bancos) */}
        <div 
          onClick={() => onNavigate('cashbank')}
          className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Disponibilidad Líquida</span>
            <Landmark className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatCurrency(totalLiquidity)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            Caja: {formatCurrency(cashRegister.balance)} | Bancos: {formatCurrency(totalBankBalance)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent sales & Quick Catalog Highlights (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Artículos con Stock Crítico / Reabastecimiento */}
          <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Control de Stock Crítico ({lowStockProducts.length})
                </h2>
              </div>
              <button 
                onClick={() => onNavigate('products')} 
                className="text-xs text-emerald-400 hover:underline font-medium"
              >
                Ver catálogo completo &rarr;
              </button>
            </div>
            <div className="divide-y divide-[#27272A]">
              {lowStockProducts.slice(0, 5).map(prod => (
                <div key={prod.id} className="p-3.5 flex items-center justify-between hover:bg-[#1C1C21] transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src={prod.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&auto=format&fit=crop&q=80'} 
                      alt={prod.name}
                      className="w-10 h-10 rounded-lg object-cover bg-black border border-zinc-800"
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{prod.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        SKU: {prod.sku} &bull; Subgrupo: {prod.subGroupName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                      Stock: {prod.stock} (Mín: {prod.minStock || 5})
                    </span>
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">
                      P. Venta: {formatCurrency(prod.sellingPrice)}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-400">
                  Todos los artículos cuentan con stock óptimo por encima del mínimo.
                </div>
              )}
            </div>
          </div>

          {/* Últimas Ventas */}
          <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                Últimas Ventas Emitidas (POS)
              </h2>
              <button 
                onClick={() => onNavigate('solditems')} 
                className="text-xs text-emerald-400 hover:underline font-medium"
              >
                Reporte de ventas &rarr;
              </button>
            </div>
            <div className="divide-y divide-[#27272A]">
              {sales.slice(0, 5).map(sale => (
                <div key={sale.id} className="p-3.5 flex items-center justify-between hover:bg-[#1C1C21] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{sale.ticketNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                        {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'credit' ? 'Cuenta Corriente' : 'Banco'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Cliente: {sale.customerName} &bull; {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400 font-mono">
                      {formatCurrency(sale.totalAmount)}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Cajero: {sale.cashierName}
                    </p>
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-400">
                  No hay ventas registradas todavía.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side summary widgets (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cuentas Bancarias y Saldos */}
          <div className="bg-[#16161A] rounded-xl border border-[#27272A] p-4">
            <div className="flex items-center justify-between mb-3 border-b border-[#27272A] pb-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Estado de Cuentas Financieras
              </h3>
              <button onClick={() => onNavigate('cashbank')} className="text-[11px] text-emerald-400 hover:underline">
                Gestionar
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1C1C21] border border-zinc-800/80">
                <div>
                  <p className="text-xs font-bold text-white">Caja Efectivo Central</p>
                  <p className="text-[10px] text-zinc-400">Mostrador local</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatCurrency(cashRegister.balance)}
                </span>
              </div>

              {bankAccounts.map(b => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-[#1C1C21] border border-zinc-800/80">
                  <div>
                    <p className="text-xs font-bold text-white">{b.bankName}</p>
                    <p className="text-[10px] text-zinc-400">Cta {b.accountNumber}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {formatCurrency(b.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen Deudas a Proveedores */}
          <div className="bg-[#16161A] rounded-xl border border-[#27272A] p-4">
            <div className="flex items-center justify-between mb-3 border-b border-[#27272A] pb-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Cuentas por Pagar (Proveedores)
              </h3>
              <button onClick={() => onNavigate('suppliers')} className="text-[11px] text-emerald-400 hover:underline">
                Ver facturas
              </button>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-3">
              <p className="text-[10px] text-red-400 uppercase font-bold">Total a cancelar</p>
              <p className="text-xl font-bold font-mono text-red-400 mt-0.5">
                {formatCurrency(totalPayables)}
              </p>
            </div>
            <div className="space-y-2">
              {suppliers.filter(s => s.currentBalance < 0).map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-300 truncate max-w-[150px]">{s.name}</span>
                  <span className="font-mono text-red-400 font-bold">
                    {formatCurrency(Math.abs(s.currentBalance))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
