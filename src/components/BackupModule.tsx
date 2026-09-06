import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Download, 
  Database, 
  CheckCircle2, 
  FileSpreadsheet, 
  AlertCircle,
  Archive,
  Layers,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { supabaseUrl } from '../lib/supabase';

export const BackupModule: React.FC = () => {
  const { 
    isAdmin,
    users,
    products,
    subGroups,
    suppliers,
    supplierInvoices,
    supplierMovements,
    customers,
    customerCategories,
    customerMovements,
    employees,
    cashRegister,
    bankAccounts,
    financialMovements,
    shifts,
    sales,
    isOnlineDb
  } = useApp();

  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const tablesMetadata = [
    {
      name: 'Usuarios del Sistema',
      tableName: 'users',
      count: users.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'username', header: 'Usuario' },
        { key: 'name', header: 'Nombre' },
        { key: 'role', header: 'Rol' },
        { key: 'email', header: 'Email' }
      ],
      data: users
    },
    {
      name: 'Sub-Grupos y Márgenes',
      tableName: 'sub_groups',
      count: subGroups.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Nombre' },
        { key: 'utilityPercentage', header: 'Margen Utilidad %' },
        { key: 'description', header: 'Descripción' }
      ],
      data: subGroups
    },
    {
      name: 'Productos e Inventario',
      tableName: 'products',
      count: products.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'sku', header: 'SKU / Código' },
        { key: 'name', header: 'Nombre Producto' },
        { key: 'subGroupName', header: 'SubGrupo' },
        { key: 'supplierName', header: 'Proveedor' },
        { key: 'costPrice', header: 'Precio Costo' },
        { key: 'sellingPrice', header: 'Precio Venta' },
        { key: 'stock', header: 'Stock Actual' },
        { key: 'minStock', header: 'Stock Mínimo' }
      ],
      data: products
    },
    {
      name: 'Proveedores & Cuentas Corrientes',
      tableName: 'suppliers',
      count: suppliers.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Razón Social' },
        { key: 'taxId', header: 'CUIT/Tax ID' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'email', header: 'Email' },
        { key: 'address', header: 'Dirección' },
        { key: 'currentBalance', header: 'Saldo Actual' }
      ],
      data: suppliers
    },
    {
      name: 'Facturas de Compra a Proveedores',
      tableName: 'supplier_invoices',
      count: supplierInvoices.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'invoiceNumber', header: 'N° Factura' },
        { key: 'supplierName', header: 'Proveedor' },
        { key: 'date', header: 'Fecha' },
        { key: 'paymentMethod', header: 'Medio de Pago' },
        { key: 'totalAmount', header: 'Total Factura' },
        { key: 'paymentStatus', header: 'Estado' }
      ],
      data: supplierInvoices
    },
    {
      name: 'Movimientos Cta. Cte. Proveedores',
      tableName: 'supplier_movements',
      count: supplierMovements.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'supplierId', header: 'ID Proveedor' },
        { key: 'date', header: 'Fecha' },
        { key: 'type', header: 'Tipo' },
        { key: 'amount', header: 'Monto' },
        { key: 'balanceAfter', header: 'Saldo Posterior' },
        { key: 'reference', header: 'Comprobante' }
      ],
      data: supplierMovements
    },
    {
      name: 'Clientes & CRM',
      tableName: 'customers',
      count: customers.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Nombre Cliente' },
        { key: 'taxId', header: 'Documento / CUIT' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'email', header: 'Email' },
        { key: 'creditLimit', header: 'Límite Crédito' },
        { key: 'currentBalance', header: 'Saldo Deuda' }
      ],
      data: customers
    },
    {
      name: 'Categorías de Clientes',
      tableName: 'customer_categories',
      count: customerCategories.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Nombre Categoría' },
        { key: 'discountPercentage', header: '% Descuento' }
      ],
      data: customerCategories
    },
    {
      name: 'Movimientos Cta. Cte. Clientes',
      tableName: 'customer_movements',
      count: customerMovements.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'customerId', header: 'ID Cliente' },
        { key: 'date', header: 'Fecha' },
        { key: 'type', header: 'Tipo' },
        { key: 'amount', header: 'Monto' },
        { key: 'balanceAfter', header: 'Saldo' },
        { key: 'reference', header: 'Referencia' }
      ],
      data: customerMovements
    },
    {
      name: 'Nómina de Empleados',
      tableName: 'employees',
      count: employees.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Nombre Empleado' },
        { key: 'document', header: 'Documento' },
        { key: 'position', header: 'Cargo' },
        { key: 'department', header: 'Departamento' },
        { key: 'salary', header: 'Salario' },
        { key: 'hireDate', header: 'Fecha Ingreso' }
      ],
      data: employees
    },
    {
      name: 'Cuentas Bancarias',
      tableName: 'bank_accounts',
      count: bankAccounts.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'bankName', header: 'Banco' },
        { key: 'accountNumber', header: 'N° Cuenta' },
        { key: 'accountType', header: 'Tipo' },
        { key: 'balance', header: 'Saldo' }
      ],
      data: bankAccounts
    },
    {
      name: 'Movimientos Financieros (Caja/Bancos)',
      tableName: 'financial_movements',
      count: financialMovements.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'date', header: 'Fecha' },
        { key: 'type', header: 'Tipo' },
        { key: 'originType', header: 'Origen' },
        { key: 'amount', header: 'Monto' },
        { key: 'category', header: 'Categoría' },
        { key: 'description', header: 'Descripción' },
        { key: 'performedByUserName', header: 'Usuario' }
      ],
      data: financialMovements
    },
    {
      name: 'Turnos y Arqueos de Caja',
      tableName: 'shifts',
      count: shifts.length,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'userName', header: 'Cajero' },
        { key: 'openedAt', header: 'Apertura' },
        { key: 'closedAt', header: 'Cierre' },
        { key: 'initialCash', header: 'Efectivo Inicial' },
        { key: 'expectedCash', header: 'Efectivo Esperado' },
        { key: 'actualCash', header: 'Efectivo Real' },
        { key: 'status', header: 'Estado' }
      ],
      data: shifts
    },
    {
      name: 'Ventas y Comprobantes POS',
      tableName: 'sales',
      count: sales.length,
      columns: [
        { key: 'id', header: 'ID Venta' },
        { key: 'receiptNumber', header: 'Ticket' },
        { key: 'date', header: 'Fecha' },
        { key: 'customerName', header: 'Cliente' },
        { key: 'total', header: 'Total Venta' },
        { key: 'totalCost', header: 'Costo Total' },
        { key: 'grossProfit', header: 'Utilidad Bruta' },
        { key: 'paymentMethod', header: 'Medio de Pago' },
        { key: 'userName', header: 'Vendedor' },
        { key: 'status', header: 'Estado' }
      ],
      data: sales
    }
  ];

  const exportSingleTable = (table: typeof tablesMetadata[0]) => {
    if (table.data.length === 0) {
      alert(`La tabla ${table.name} está vacía actualmente.`);
      return;
    }
    exportToExcel(table.data, `BACKUP_${table.tableName.toUpperCase()}`, table.columns);
  };

  const exportAllTablesSequentially = async () => {
    setIsExportingAll(true);
    setDownloadStatus('Iniciando exportación de todas las tablas en formato CSV...');

    let exportedCount = 0;
    for (const table of tablesMetadata) {
      if (table.data && table.data.length > 0) {
        exportToExcel(table.data, `BACKUP_${table.tableName.toUpperCase()}`, table.columns);
        exportedCount++;
        // Small pause between triggers to prevent browser download block
        await new Promise(res => setTimeout(res, 500));
      }
    }

    setIsExportingAll(false);
    setDownloadStatus(`Se exportaron exitosamente ${exportedCount} archivos CSV con toda la información de la base de datos.`);
    setTimeout(() => setDownloadStatus(null), 6000);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Acceso Restringido: Solo Administrador</h2>
        <p className="text-sm text-zinc-400">
          El módulo de Respaldo y Copias de Seguridad de la Base de Datos requiere permisos de usuario Administrador General.
        </p>
      </div>
    );
  }

  const totalRecords = tablesMetadata.reduce((acc, t) => acc + t.count, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Archive className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Módulo de Respaldo (Backup) Completo</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Exporta y descarga toda la información real de todas las tablas de la base de datos en formato CSV estándar compatible con Excel y Google Sheets.
          </p>
        </div>

        <button
          onClick={exportAllTablesSequentially}
          disabled={isExportingAll}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          {isExportingAll ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generando Backups...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Descargar Backup Completo (Todas las Tablas)</span>
            </>
          )}
        </button>
      </div>

      {/* Info Status Banner */}
      {downloadStatus && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{downloadStatus}</span>
        </div>
      )}

      {/* System & DB Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#16161A] border border-[#27272A] rounded-2xl">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Base de Datos</span>
          </div>
          <p className="text-sm font-bold text-white font-mono">Supabase PostgreSQL</p>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">{supabaseUrl}</p>
        </div>

        <div className="p-4 bg-[#16161A] border border-[#27272A] rounded-2xl">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Tablas del Esquema</span>
          </div>
          <p className="text-2xl font-black text-white">{tablesMetadata.length} Tablas</p>
          <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">100% Cubiertas para Exportación</p>
        </div>

        <div className="p-4 bg-[#16161A] border border-[#27272A] rounded-2xl">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Registros Totales</span>
          </div>
          <p className="text-2xl font-black text-white">{totalRecords} Filas</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Listas para descarga local</p>
        </div>
      </div>

      {/* Tables Breakdown Grid */}
      <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">
            Exportación Individual por Tabla
          </h3>
          <span className="text-xs text-zinc-400">
            Formato CSV UTF-8 (compatible con Excel / Calc / Sheets)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tablesMetadata.map((t, idx) => (
            <div 
              key={idx}
              className="p-3.5 bg-[#18181C] border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs font-bold text-white truncate">{t.name}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                  <span className="text-zinc-500">Tabla:</span>
                  <span className="text-emerald-400 font-semibold">{t.tableName}</span>
                  <span>&bull;</span>
                  <span>{t.count} registro{t.count !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <button
                onClick={() => exportSingleTable(t)}
                disabled={t.count === 0}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                title={`Descargar CSV de ${t.name}`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
