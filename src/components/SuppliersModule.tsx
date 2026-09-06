import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier, SupplierInvoiceItem, SupplierMovement } from '../types';
import { formatCurrency, exportToExcel, printHtmlDocument } from '../utils/exportUtils';
import { 
  Truck, 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Calendar, 
  X, 
  CheckCircle,
  AlertCircle,
  ArrowDownLeft,
  Filter,
  Sparkles
} from 'lucide-react';
import { AIInvoiceModal } from './AIInvoiceModal';

export const SuppliersModule: React.FC = () => {
  const { 
    suppliers, 
    supplierInvoices, 
    supplierMovements, 
    products, 
    bankAccounts,
    addSupplier, 
    updateSupplier, 
    deleteSupplier, 
    recordSupplierInvoice, 
    recordSupplierPayment,
    isAdmin 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'invoices' | 'movements' | 'reports'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filters for reports
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isAiInvoiceModalOpen, setIsAiInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  const [detailMovementModal, setDetailMovementModal] = useState<SupplierMovement | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState<{
    invoiceNumber: string;
    supplierId: string;
    date: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'credit';
    bankAccountId: string;
    notes: string;
    items: SupplierInvoiceItem[];
  }>({
    invoiceNumber: '',
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'credit',
    bankAccountId: '',
    notes: '',
    items: []
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'bank',
    bankAccountId: '',
    notes: ''
  });

  // Open Supplier Modal
  const openNewSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      taxId: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      taxId: sup.taxId,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      notes: sup.notes || ''
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.taxId.trim()) {
      alert('Nombre y CUIT/Tax ID son obligatorios.');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierForm);
    } else {
      addSupplier(supplierForm);
    }
    setIsSupplierModalOpen(false);
  };

  // Invoice creation helpers
  const openNewInvoiceModal = () => {
    if (suppliers.length === 0) {
      alert('Primero debes registrar al menos un proveedor.');
      return;
    }
    setInvoiceForm({
      invoiceNumber: `FC-${Date.now().toString().slice(-6)}`,
      supplierId: suppliers[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'credit',
      bankAccountId: bankAccounts[0]?.id || '',
      notes: 'Factura de reposición de mercadería',
      items: [
        {
          productId: products[0]?.id || '',
          productName: products[0]?.name || '',
          quantity: 5,
          unitCost: products[0]?.costPrice || 1000,
          subtotal: 5 * (products[0]?.costPrice || 1000)
        }
      ]
    });
    setIsInvoiceModalOpen(true);
  };

  const addInvoiceRow = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setInvoiceForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: firstProd.id,
          productName: firstProd.name,
          quantity: 1,
          unitCost: firstProd.costPrice,
          subtotal: Math.round(1 * firstProd.costPrice * 100) / 100
        }
      ]
    }));
  };

  const updateInvoiceRow = (index: number, field: keyof SupplierInvoiceItem, value: any) => {
    setInvoiceForm(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const p = products.find(prod => prod.id === value);
        if (p) {
          item.productName = p.name;
          item.unitCost = p.costPrice;
        }
      }

      item.subtotal = Math.round(Number(item.quantity || 0) * Number(item.unitCost || 0) * 100) / 100;
      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const removeInvoiceRow = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.items.length) {
      alert('Debes agregar al menos un artículo a la factura de compra.');
      return;
    }

    const supplier = suppliers.find(s => s.id === invoiceForm.supplierId);
    if (!supplier) return;

    const totalAmount = invoiceForm.items.reduce((sum, item) => sum + item.subtotal, 0);

    recordSupplierInvoice({
      invoiceNumber: invoiceForm.invoiceNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date(invoiceForm.date).toISOString(),
      totalAmount,
      paymentMethod: invoiceForm.paymentMethod,
      bankAccountId: invoiceForm.paymentMethod === 'bank_transfer' ? invoiceForm.bankAccountId : undefined,
      paymentStatus: invoiceForm.paymentMethod === 'credit' ? 'pending' : 'paid',
      notes: invoiceForm.notes,
      items: invoiceForm.items
    });

    alert('Factura de compra registrada con éxito. Se actualizó el stock, el costo y el proveedor en los productos vinculados.');
    setIsInvoiceModalOpen(false);
  };

  // Payment to Supplier
  const openPaymentModal = (sup: Supplier) => {
    setSelectedSupplierForPayment(sup);
    setPaymentForm({
      amount: Math.abs(sup.currentBalance),
      paymentMethod: 'cash',
      bankAccountId: bankAccounts[0]?.id || '',
      notes: `Pago a cuenta corriente de ${sup.name}`
    });
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment || paymentForm.amount <= 0) return;

    recordSupplierPayment(
      selectedSupplierForPayment.id,
      Number(paymentForm.amount),
      paymentForm.paymentMethod,
      paymentForm.paymentMethod === 'bank' ? paymentForm.bankAccountId : undefined,
      paymentForm.notes
    );

    alert('Pago registrado correctamente en la cuenta corriente.');
    setIsPaymentModalOpen(false);
  };

  // Print movement details
  const handlePrintMovementDetail = (mov: SupplierMovement) => {
    const sup = suppliers.find(s => s.id === mov.supplierId);
    const html = `
      <div class="header">
        <div>
          <h2>Comprobante de Movimiento en Cuenta Corriente</h2>
          <p><strong>Proveedor:</strong> ${sup?.name || 'Proveedor'} &bull; <strong>CUIT:</strong> ${sup?.taxId || '-'}</p>
          <p><strong>Fecha:</strong> ${new Date(mov.date).toLocaleDateString()} ${new Date(mov.date).toLocaleTimeString()}</p>
        </div>
        <div class="text-right">
          <h3>Ref: ${mov.reference}</h3>
          <span class="badge font-bold">${mov.type === 'invoice' ? 'FACTURA DE COMPRA' : 'PAGO A PROVEEDOR'}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Concepto / Referencia</th>
            <th>Tipo</th>
            <th class="text-right">Monto</th>
            <th class="text-right">Saldo Tras Operación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${mov.reference} - ${mov.notes || 'Operación regular'}</td>
            <td>${mov.type === 'invoice' ? 'Ingreso de Deuda' : 'Cancelación de Saldo'}</td>
            <td class="text-right font-bold">${formatCurrency(mov.amount)}</td>
            <td class="text-right font-bold">${formatCurrency(mov.balanceAfter)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top: 30px; padding: 15px; background: #fafafa; border: 1px solid #eee;">
        <strong>Observaciones:</strong>
        <p>${mov.notes || 'Ninguna observación asentada.'}</p>
      </div>
    `;
    printHtmlDocument(`Detalle_Movimiento_${mov.reference}`, html);
  };

  // Export Excel
  const handleExportSuppliers = () => {
    exportToExcel(
      suppliers,
      'Cuentas_Corrientes_Proveedores',
      [
        { key: 'name', header: 'Razón Social' },
        { key: 'taxId', header: 'CUIT / Tax ID' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'email', header: 'Email' },
        { key: 'currentBalance', header: 'Saldo Actual (Acreedor/Deudor)', format: v => formatCurrency(v) },
        { key: 'address', header: 'Dirección' }
      ]
    );
  };

  const handleExportInvoices = () => {
    exportToExcel(
      filteredInvoices,
      'Reporte_Mensual_Compras_Proveedores',
      [
        { key: 'invoiceNumber', header: 'Número de Factura' },
        { key: 'supplierName', header: 'Proveedor' },
        { key: 'date', header: 'Fecha', format: v => new Date(v).toLocaleDateString() },
        { key: 'paymentMethod', header: 'Medio de Pago' },
        { key: 'totalAmount', header: 'Total Facturado', format: v => formatCurrency(v) },
        { key: 'paymentStatus', header: 'Estado' }
      ]
    );
  };

  // Filtered lists
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.taxId.includes(searchTerm)
  );

  const filteredInvoices = supplierInvoices.filter(inv => {
    const invDate = inv.date.split('T')[0];
    const matchesDate = invDate >= startDate && invDate <= endDate;
    const matchesSearch =
      inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const filteredMovements = supplierMovements.filter(m => {
    const mDate = m.date.split('T')[0];
    return mDate >= startDate && mDate <= endDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">3. Módulo de Proveedores, Compras & Cta. Cte.</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ingreso de facturas con actualización automática de proveedor y costos en productos, reportes mensuales y cuenta corriente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAiInvoiceModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Cargar Factura con IA (Gemini)</span>
          </button>

          <button
            onClick={openNewInvoiceModal}
            className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-white font-semibold text-xs rounded-xl border border-zinc-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Factura Manual</span>
          </button>

          <button
            onClick={openNewSupplierModal}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Cuentas Corrientes Proveedores ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'invoices'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Facturas de Compra ({supplierInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'movements'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Movimientos & Auditoría ({supplierMovements.length})
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, CUIT o factura..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Date range filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0A0A0B] px-2.5 py-1.5 rounded-xl border border-[#27272A] text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] text-zinc-500">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#0A0A0B] px-2.5 py-1.5 rounded-xl border border-[#27272A] text-xs">
            <span className="text-[10px] text-zinc-500">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          <button
            onClick={activeTab === 'invoices' ? handleExportInvoices : handleExportSuppliers}
            className="p-2 bg-[#1F1F23] hover:bg-[#27272A] text-emerald-400 rounded-xl border border-[#27272A] transition-colors"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: LISTADO DE PROVEEDORES & CUENTA CORRIENTE */}
      {activeTab === 'list' && (
        <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                <tr>
                  <th className="p-3.5">Proveedor / Razón Social</th>
                  <th className="p-3.5">CUIT / Tax ID</th>
                  <th className="p-3.5">Contacto</th>
                  <th className="p-3.5 text-right">Saldo Cuenta Corriente</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredSuppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-[#1C1C21] transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-white text-xs">{sup.name}</p>
                      <p className="text-[10px] text-zinc-400">{sup.address}</p>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-300">{sup.taxId}</td>
                    <td className="p-3.5 text-zinc-300">
                      <p>{sup.phone}</p>
                      <p className="text-[10px] text-zinc-400">{sup.email}</p>
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {sup.currentBalance < 0 ? (
                        <span className="text-red-400 font-bold">
                          Debe: {formatCurrency(Math.abs(sup.currentBalance))}
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          Al día: {formatCurrency(sup.currentBalance)}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {sup.currentBalance < 0 && (
                          <button
                            onClick={() => openPaymentModal(sup)}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Pagar</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditSupplierModal(sup)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar al proveedor ${sup.name}?`)) deleteSupplier(sup.id);
                            }}
                            className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FACTURAS DE COMPRA */}
      {activeTab === 'invoices' && (
        <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                <tr>
                  <th className="p-3.5">Nº Factura</th>
                  <th className="p-3.5">Proveedor</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Condición de Pago</th>
                  <th className="p-3.5 text-right">Total Factura</th>
                  <th className="p-3.5 text-center">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-[#1C1C21] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                    <td className="p-3.5">{inv.supplierName}</td>
                    <td className="p-3.5">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-zinc-800 text-zinc-300">
                        {inv.paymentMethod === 'credit' ? 'Cuenta Corriente' : inv.paymentMethod === 'cash' ? 'Efectivo' : 'Banco'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="p-3.5 text-center text-zinc-400 font-mono">
                      {inv.items.length} artículos
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MOVIMIENTOS & DETALLES */}
      {activeTab === 'movements' && (
        <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Tipo Movimiento</th>
                  <th className="p-3.5">Referencia</th>
                  <th className="p-3.5 text-right">Importe</th>
                  <th className="p-3.5 text-right">Saldo Resultante</th>
                  <th className="p-3.5 text-center">Detalle / Imprimir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredMovements.map(mov => (
                  <tr key={mov.id} className="hover:bg-[#1C1C21] transition-colors">
                    <td className="p-3.5 text-zinc-400">
                      {new Date(mov.date).toLocaleDateString()} {new Date(mov.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mov.type === 'invoice' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {mov.type === 'invoice' ? 'Compra a Crédito' : 'Pago Realizado'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-200">{mov.reference}</td>
                    <td className="p-3.5 text-right font-mono font-bold">
                      {formatCurrency(mov.amount)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-zinc-400">
                      {formatCurrency(mov.balanceAfter)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handlePrintMovementDetail(mov)}
                        className="px-2.5 py-1 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                        title="Imprimir o generar PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Imprimir / PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ingresar Factura de Compra */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Registrar Factura de Compra (Recepción de Stock)</span>
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Nº Factura *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNumber}
                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Proveedor *</label>
                  <select
                    required
                    value={invoiceForm.supplierId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    value={invoiceForm.date}
                    onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Condición de Pago</label>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={e => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    <option value="credit">Cuenta Corriente (A pagar a plazo)</option>
                    <option value="cash">Efectivo (Sale de Caja)</option>
                    <option value="bank_transfer">Transferencia Bancaria</option>
                  </select>
                </div>

                {invoiceForm.paymentMethod === 'bank_transfer' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Cuenta Bancaria</label>
                    <select
                      value={invoiceForm.bankAccountId}
                      onChange={e => setInvoiceForm({ ...invoiceForm, bankAccountId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} - Cta {b.accountNumber}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Items de la factura */}
              <div className="pt-3 border-t border-[#27272A]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Artículos a Incorporar al Inventario
                  </h4>
                  <button
                    type="button"
                    onClick={addInvoiceRow}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium"
                  >
                    + Agregar Artículo
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {invoiceForm.items.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-[#0A0A0B] border border-zinc-800 text-xs">
                      <div className="flex-1 min-w-[180px]">
                        <select
                          value={item.productId}
                          onChange={e => updateInvoiceRow(idx, 'productId', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 text-white"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Cant."
                          value={item.quantity}
                          onChange={e => updateInvoiceRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 font-mono text-center text-white"
                          title="Cantidad con hasta dos decimales (ej. 1.50, 25.00)"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Costo U."
                          value={item.unitCost}
                          onChange={e => updateInvoiceRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 font-mono text-right"
                        />
                      </div>

                      <div className="w-28 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(item.subtotal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeInvoiceRow(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-[#0A0A0B] rounded-xl flex items-center justify-between font-bold">
                  <span className="text-zinc-400 text-xs">Total Factura:</span>
                  <span className="text-emerald-400 font-mono text-base">
                    {formatCurrency(invoiceForm.items.reduce((sum, item) => sum + item.subtotal, 0))}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Confirmar e Ingresar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Proveedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingSupplier ? 'Modificar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">CUIT / Tax ID *</label>
                <input
                  type="text"
                  required
                  placeholder="30-xxxxxxxx-x"
                  value={supplierForm.taxId}
                  onChange={e => setSupplierForm({ ...supplierForm, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Dirección Comercial</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Realizar Pago a Proveedor */}
      {isPaymentModalOpen && selectedSupplierForPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Pago a Proveedor: {selectedSupplierForPayment.name}</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="p-5 space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-xs text-red-400">Deuda actual en cuenta corriente:</span>
                <p className="text-xl font-bold font-mono text-red-400">
                  {formatCurrency(Math.abs(selectedSupplierForPayment.currentBalance))}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Monto a Abonar ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm font-mono text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Forma de Pago *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="cash">Efectivo (Sale de Caja Efectivo)</option>
                  <option value="bank">Transferencia Bancaria</option>
                </select>
              </div>

              {paymentForm.paymentMethod === 'bank' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Cuenta Bancaria de Origen *</label>
                  <select
                    value={paymentForm.bankAccountId}
                    onChange={e => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Carga Inteligente de Facturas con IA Gemini */}
      <AIInvoiceModal
        isOpen={isAiInvoiceModalOpen}
        onClose={() => setIsAiInvoiceModalOpen(false)}
      />
    </div>
  );
};
