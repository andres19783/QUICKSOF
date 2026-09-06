import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, CustomerCategory, CustomerMovement } from '../types';
import { formatCurrency, exportToExcel, printHtmlDocument } from '../utils/exportUtils';
import { 
  UserCircle, 
  Plus, 
  Search, 
  CreditCard, 
  Printer, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Calendar, 
  X, 
  ShieldAlert, 
  Tag, 
  Clock,
  CheckCircle2,
  Percent
} from 'lucide-react';

export const CustomersModule: React.FC = () => {
  const { 
    customers, 
    customerCategories, 
    customerMovements, 
    sales,
    bankAccounts,
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    addCustomerCategory,
    updateCustomerCategory,
    deleteCustomerCategory,
    recordCustomerPayment,
    isAdmin 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'customers' | 'categories' | 'movements' | 'history'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filters for reports
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);

  // Customer Form
  const [customerForm, setCustomerForm] = useState({
    name: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    categoryId: '',
    creditLimit: 50000,
    notes: ''
  });

  // Category Form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    discountPercentage: 10,
    description: ''
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'bank',
    bankAccountId: '',
    notes: ''
  });

  // Customer Modal Handlers
  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setCustomerModalError(null);
    setCustomerForm({
      name: '',
      taxId: '',
      phone: '',
      email: '',
      address: '',
      categoryId: customerCategories[0]?.id || '',
      creditLimit: 50000,
      notes: ''
    });
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerModalError(null);
    setCustomerForm({
      name: c.name,
      taxId: c.taxId,
      phone: c.phone,
      email: c.email,
      address: c.address,
      categoryId: c.categoryId,
      creditLimit: c.creditLimit,
      notes: c.notes || ''
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerModalError(null);

    if (!customerForm.name.trim() || !customerForm.taxId.trim()) {
      setCustomerModalError('Nombre y CUIT/DNI son obligatorios.');
      return;
    }

    if (editingCustomer) {
      const res = updateCustomer(editingCustomer.id, {
        name: customerForm.name.trim(),
        taxId: customerForm.taxId.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
        categoryId: customerForm.categoryId,
        creditLimit: Number(customerForm.creditLimit),
        notes: customerForm.notes.trim()
      });

      if (!res.success) {
        setCustomerModalError(res.error || 'Error al actualizar el cliente');
        return;
      }
    } else {
      addCustomer({
        name: customerForm.name.trim(),
        taxId: customerForm.taxId.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
        categoryId: customerForm.categoryId,
        creditLimit: Number(customerForm.creditLimit),
        notes: customerForm.notes.trim()
      });
    }

    setIsCustomerModalOpen(false);
  };

  // Category Modal Handlers
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      discountPercentage: 10,
      description: ''
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CustomerCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      discountPercentage: cat.discountPercentage,
      description: cat.description || ''
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    if (editingCategory) {
      updateCustomerCategory(editingCategory.id, {
        name: categoryForm.name.trim(),
        discountPercentage: Number(categoryForm.discountPercentage),
        description: categoryForm.description.trim()
      });
    } else {
      addCustomerCategory({
        name: categoryForm.name.trim(),
        discountPercentage: Number(categoryForm.discountPercentage),
        description: categoryForm.description.trim()
      });
    }
    setIsCategoryModalOpen(false);
  };

  // Payment Handler
  const openPaymentModal = (c: Customer) => {
    setSelectedCustomerForPayment(c);
    setPaymentForm({
      amount: c.currentBalance,
      paymentMethod: 'cash',
      bankAccountId: bankAccounts[0]?.id || '',
      notes: `Cobro a cuenta corriente de ${c.name}`
    });
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPayment || paymentForm.amount <= 0) return;

    recordCustomerPayment(
      selectedCustomerForPayment.id,
      Number(paymentForm.amount),
      paymentForm.paymentMethod,
      paymentForm.paymentMethod === 'bank' ? paymentForm.bankAccountId : undefined,
      paymentForm.notes
    );

    alert('Cobranza registrada correctamente.');
    setIsPaymentModalOpen(false);
  };

  // Print Movement Detail
  const handlePrintMovement = (mov: CustomerMovement) => {
    const cust = customers.find(c => c.id === mov.customerId);
    const html = `
      <div class="header">
        <div>
          <h2>Recibo / Detalle de Movimiento en Cuenta Corriente</h2>
          <p><strong>Cliente:</strong> ${cust?.name || 'Cliente'} &bull; <strong>CUIT/DNI:</strong> ${cust?.taxId || '-'}</p>
          <p><strong>Fecha y Hora:</strong> ${new Date(mov.date).toLocaleDateString()} ${new Date(mov.date).toLocaleTimeString()}</p>
        </div>
        <div class="text-right">
          <h3>Comprobante: ${mov.reference}</h3>
          <span class="badge font-bold">${mov.type === 'sale' ? 'VENTA A CRÉDITO' : 'COBRANZA / PAGO RECIBIDO'}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Tipo de Operación</th>
            <th class="text-right">Monto</th>
            <th class="text-right">Saldo en Cuenta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${mov.reference} - ${mov.notes || 'Operación registrada'}</td>
            <td>${mov.type === 'sale' ? 'Cargo en cuenta (Deuda)' : 'Abono / Pago recibido'}</td>
            <td class="text-right font-bold">${formatCurrency(mov.amount)}</td>
            <td class="text-right font-bold">${formatCurrency(mov.balanceAfter)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top: 30px; padding: 15px; background: #fafafa; border: 1px solid #eee;">
        <strong>Detalle adicional:</strong>
        <p>${mov.notes || 'Sin anotaciones adicionales.'}</p>
      </div>
    `;
    printHtmlDocument(`Movimiento_Cliente_${mov.reference}`, html);
  };

  // Exports
  const handleExportCustomers = () => {
    exportToExcel(
      customers,
      'Cuentas_Corrientes_Clientes_CRM',
      [
        { key: 'name', header: 'Nombre del Cliente' },
        { key: 'taxId', header: 'CUIT / DNI' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'email', header: 'Email' },
        { key: 'creditLimit', header: 'Límite de Crédito', format: v => formatCurrency(v) },
        { key: 'currentBalance', header: 'Saldo Adeudado Actual', format: v => formatCurrency(v) }
      ]
    );
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.taxId.includes(searchTerm)
  );

  const filteredMovements = customerMovements.filter(m => {
    const mDate = m.date.split('T')[0];
    return mDate >= startDate && mDate <= endDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">5. Módulo CRM Clientes & Crédito en Cta. Cte.</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión de clientes, categorías con descuento automático en POS, control estricto de límite de crédito y cuenta corriente.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openNewCategoryModal}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
          >
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>Categorías & Descuentos</span>
          </button>

          <button
            onClick={openNewCustomerModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'customers'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Clientes & Saldos ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Categorías de Descuento ({customerCategories.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'movements'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Movimientos de Cta. Cte. ({customerMovements.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Historial de Compras ({sales.length})
        </button>
      </div>

      {/* Regla visible de límites */}
      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Control de Crédito:</strong> El límite de crédito en cuenta corriente solo puede ser modificado por el usuario <span className="text-emerald-400 font-bold">Administrador</span>. Al vender en el POS, el sistema valida que no se supere el saldo otorgado.
          </span>
        </div>
        <button
          onClick={handleExportCustomers}
          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium shrink-0"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* TAB 1: LISTADO DE CLIENTES */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o CUIT/DNI..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                  <tr>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Categoría & Descuento</th>
                    <th className="p-3.5">Contacto</th>
                    <th className="p-3.5 text-right">Límite de Crédito</th>
                    <th className="p-3.5 text-right">Saldo Adeudado</th>
                    <th className="p-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {filteredCustomers.map(c => {
                    const cat = customerCategories.find(cat => cat.id === c.categoryId);
                    const isNearLimit = c.currentBalance >= (c.creditLimit * 0.8);
                    return (
                      <tr key={c.id} className="hover:bg-[#1C1C21] transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-white text-xs">{c.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">CUIT/DNI: {c.taxId}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                            {cat ? `${cat.name} (-${cat.discountPercentage}%)` : 'General (0%)'}
                          </span>
                        </td>
                        <td className="p-3.5 text-zinc-400">
                          <p>{c.phone || '-'}</p>
                          <p className="text-[10px]">{c.email || '-'}</p>
                        </td>
                        <td className="p-3.5 text-right font-mono text-zinc-300">
                          {formatCurrency(c.creditLimit)}
                        </td>
                        <td className="p-3.5 text-right font-mono">
                          {c.currentBalance > 0 ? (
                            <span className={`font-bold ${isNearLimit ? 'text-red-400' : 'text-amber-400'}`}>
                              {formatCurrency(c.currentBalance)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">$0 (Sin deuda)</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {c.currentBalance > 0 && (
                              <button
                                onClick={() => openPaymentModal(c)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Cobrar</span>
                              </button>
                            )}
                            <button
                              onClick={() => openEditCustomerModal(c)}
                              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar al cliente ${c.name}?`)) deleteCustomer(c.id);
                                }}
                                className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIAS CON DESCUENTO AUTOMATICO */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {customerCategories.map(cat => {
              const members = customers.filter(c => c.categoryId === cat.id);
              return (
                <div key={cat.id} className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                        -{cat.discountPercentage}% Descuento
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 min-h-[36px]">
                      {cat.description || 'Descuento automático aplicado a cada ticket en POS.'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-2">
                      {members.length} clientes en esta categoría
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-2">
                    <button
                      onClick={() => openEditCategoryModal(cat)}
                      className="px-2.5 py-1 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs rounded-lg"
                    >
                      Editar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar la categoría ${cat.name}?`)) deleteCustomerCategory(cat.id);
                        }}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MOVIMIENTOS & AUDITORIA */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#16161A] px-2.5 py-1.5 rounded-xl border border-[#27272A] text-xs">
              <span className="text-[10px] text-zinc-500">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-[#16161A] px-2.5 py-1.5 rounded-xl border border-[#27272A] text-xs">
              <span className="text-[10px] text-zinc-500">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                  <tr>
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Operación</th>
                    <th className="p-3.5">Referencia</th>
                    <th className="p-3.5 text-right">Monto</th>
                    <th className="p-3.5 text-right">Saldo Posterior</th>
                    <th className="p-3.5 text-center">Imprimir / PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-[#1C1C21] transition-colors">
                      <td className="p-3.5 text-zinc-400">
                        {new Date(m.date).toLocaleDateString()} {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type === 'sale' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {m.type === 'sale' ? 'Venta a Crédito' : 'Cobranza Recibida'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-200">{m.reference}</td>
                      <td className="p-3.5 text-right font-mono font-bold">
                        {formatCurrency(m.amount)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-zinc-400">
                        {formatCurrency(m.balanceAfter)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handlePrintMovement(m)}
                          className="px-2.5 py-1 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Imprimir</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIAL DE COMPRAS */}
      {activeTab === 'history' && (
        <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
                <tr>
                  <th className="p-3.5">Ticket</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Medio de Pago</th>
                  <th className="p-3.5 text-right">Descuento Cat.</th>
                  <th className="p-3.5 text-right">Total Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-[#1C1C21] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">{s.ticketNumber}</td>
                    <td className="p-3.5">{s.customerName}</td>
                    <td className="p-3.5">{new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3.5 uppercase text-[10px] font-mono">
                      {s.paymentMethod === 'credit' ? 'Cuenta Corriente' : s.paymentMethod === 'cash' ? 'Efectivo' : 'Banco'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-amber-400">
                      {s.discountPercentage ? `-${s.discountPercentage}% (${formatCurrency(s.discountAmount || 0)})` : '$0'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(s.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar / Modificar Cliente */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingCustomer ? 'Modificar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3">
              {customerModalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  {customerModalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">CUIT / DNI *</label>
                <input
                  type="text"
                  required
                  value={customerForm.taxId}
                  onChange={e => setCustomerForm({ ...customerForm, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Categoría</label>
                  <select
                    value={customerForm.categoryId}
                    onChange={e => setCustomerForm({ ...customerForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {customerCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} (-{cat.discountPercentage}%)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-300 uppercase">Límite Crédito ($)</label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={customerForm.creditLimit}
                    onChange={e => setCustomerForm({ ...customerForm, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingCategory ? 'Modificar Categoría' : 'Nueva Categoría de Clientes'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Nombre Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mayorista, VIP, Regular..."
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Descuento Automático en POS (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={categoryForm.discountPercentage}
                  onChange={e => setCategoryForm({ ...categoryForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cobranza */}
      {isPaymentModalOpen && selectedCustomerForPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                Cobranza de Cuenta Corriente: {selectedCustomerForPayment.name}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="p-5 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="text-xs text-amber-400">Saldo pendiente de cobro:</span>
                <p className="text-xl font-bold font-mono text-amber-400">
                  {formatCurrency(selectedCustomerForPayment.currentBalance)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Monto Percibido ($) *</label>
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
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Medio de Cobro</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="cash">Efectivo (Ingresa a Caja Registradora)</option>
                  <option value="bank">Transferencia Bancaria (Ingresa a Banco)</option>
                </select>
              </div>

              {paymentForm.paymentMethod === 'bank' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Cuenta Bancaria de Destino</label>
                  <select
                    value={paymentForm.bankAccountId}
                    onChange={e => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
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
                  Registrar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
