import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BankAccount, FinancialMovement, ExpenseCategory } from '../types';
import { formatCurrency, exportToExcel } from '../utils/exportUtils';
import { 
  Landmark, 
  DollarSign, 
  ArrowRightLeft, 
  Plus, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Receipt, 
  ShieldAlert, 
  FileSpreadsheet, 
  Search, 
  X,
  AlertCircle,
  Calendar,
  Filter,
  Users,
  RotateCcw,
  CheckCircle2,
  Building2,
  Wallet
} from 'lucide-react';

export const CashBankModule: React.FC = () => {
  const { 
    cashRegister, 
    bankAccounts, 
    financialMovements, 
    employees,
    addBankAccount, 
    recordFinancialMovement, 
    isAdmin 
  } = useApp();

  const [activeModal, setActiveModal] = useState<'bank' | 'transfer' | 'deposit' | 'withdrawal' | 'expense' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- FILTROS PARA AUDITORÍA DE MOVIMIENTOS ---
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterDetailSearch, setFilterDetailSearch] = useState<string>('');

  // New Bank Form
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountType: 'checking' as 'checking' | 'savings',
    cbuOrAlias: '',
    initialBalance: 0
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    originType: 'cash' as 'cash' | 'bank',
    originAccountId: '',
    destinationType: 'bank' as 'cash' | 'bank',
    destinationAccountId: '',
    amount: 0,
    description: 'Transferencia de fondos'
  });

  // Deposit Form
  const [depositForm, setDepositForm] = useState({
    destinationAccountId: '',
    originType: 'cash' as 'cash' | 'external',
    amount: 0,
    reference: '',
    description: 'Depósito en cuenta bancaria'
  });

  // Withdrawal Form (Admin Only)
  const [withdrawalForm, setWithdrawalForm] = useState({
    originType: 'cash' as 'cash' | 'bank',
    originAccountId: '',
    amount: 0,
    description: 'Extracción de fondos autorizada'
  });

  // Expense Form (sueldos, servicios, mantenimiento, comisiones, etc)
  const [expenseForm, setExpenseForm] = useState({
    category: 'servicios' as ExpenseCategory,
    originType: 'cash' as 'cash' | 'bank',
    originAccountId: '',
    amount: 0,
    description: '',
    reference: '',
    employeeId: '',
    employeeName: ''
  });

  // Abrir modales con inicialización
  const openModal = (type: 'bank' | 'transfer' | 'deposit' | 'withdrawal' | 'expense', initialCategory?: ExpenseCategory) => {
    setErrorMessage(null);
    if (type === 'withdrawal' && !isAdmin) {
      alert('Permiso denegado: Las extracciones de fondos solo pueden ser autorizadas por el usuario Administrador.');
      return;
    }

    if (type === 'transfer') {
      setTransferForm({
        originType: 'cash',
        originAccountId: bankAccounts[0]?.id || '',
        destinationType: 'bank',
        destinationAccountId: bankAccounts[0]?.id || '',
        amount: 0,
        description: 'Transferencia interna de tesorería'
      });
    }

    if (type === 'deposit') {
      setDepositForm({
        destinationAccountId: bankAccounts[0]?.id || '',
        originType: 'cash',
        amount: 0,
        reference: `DEP-${Date.now().toString().slice(-4)}`,
        description: 'Depósito de efectivo en cuenta bancaria'
      });
    }

    if (type === 'withdrawal') {
      setWithdrawalForm({
        originType: 'cash',
        originAccountId: bankAccounts[0]?.id || '',
        amount: 0,
        description: 'Extracción autorizada por gerencia'
      });
    }

    if (type === 'expense') {
      const cat = initialCategory || 'sueldos';
      setExpenseForm({
        category: cat,
        originType: 'cash',
        originAccountId: bankAccounts[0]?.id || '',
        amount: 0,
        description: '',
        reference: `GST-${Date.now().toString().slice(-4)}`,
        employeeId: '',
        employeeName: ''
      });
    }

    setActiveModal(type);
  };

  // Cambio de selección de empleado cuando el gasto es de sueldos
  const handleSelectEmployee = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      const roleName = emp.role || emp.position || 'Personal';
      const doc = emp.taxId || emp.document || '-';
      setExpenseForm(prev => ({
        ...prev,
        employeeId: emp.id,
        employeeName: emp.name,
        amount: emp.salary > 0 ? emp.salary : prev.amount,
        description: `Pago de sueldo - ${emp.name} (${roleName} - CUIL/DNI: ${doc})`
      }));
    } else {
      setExpenseForm(prev => ({
        ...prev,
        employeeId: '',
        employeeName: '',
        description: ''
      }));
    }
  };

  // Submits
  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) return;

    addBankAccount(
      {
        bankName: bankForm.bankName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        accountType: bankForm.accountType,
        cbuOrAlias: bankForm.cbuOrAlias.trim()
      },
      Number(bankForm.initialBalance)
    );

    setActiveModal(null);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (transferForm.amount <= 0) {
      setErrorMessage('El importe debe ser mayor a 0');
      return;
    }

    const res = recordFinancialMovement({
      type: 'transfer',
      originType: transferForm.originType,
      originAccountId: transferForm.originType === 'bank' ? transferForm.originAccountId : undefined,
      destinationType: transferForm.destinationType,
      destinationAccountId: transferForm.destinationType === 'bank' ? transferForm.destinationAccountId : undefined,
      amount: Number(transferForm.amount),
      category: 'transferencia',
      description: transferForm.description,
      reference: `TRF-${Date.now().toString().slice(-4)}`
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Error al ejecutar transferencia');
      return;
    }

    alert('Transferencia ejecutada con éxito.');
    setActiveModal(null);
  };

  const handleExecuteDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (depositForm.amount <= 0) {
      setErrorMessage('El importe debe ser mayor a 0');
      return;
    }

    const res = recordFinancialMovement({
      type: 'deposit',
      originType: depositForm.originType as any,
      destinationType: 'bank',
      destinationAccountId: depositForm.destinationAccountId,
      amount: Number(depositForm.amount),
      category: 'deposito',
      description: depositForm.description,
      reference: depositForm.reference
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Error al registrar depósito');
      return;
    }

    alert('Depósito completado con éxito.');
    setActiveModal(null);
  };

  const handleExecuteWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = recordFinancialMovement({
      type: 'withdrawal',
      originType: withdrawalForm.originType,
      originAccountId: withdrawalForm.originType === 'bank' ? withdrawalForm.originAccountId : undefined,
      amount: Number(withdrawalForm.amount),
      category: 'extraccion_admin',
      description: withdrawalForm.description,
      reference: `EXT-ADM-${Date.now().toString().slice(-4)}`
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Error en la extracción');
      return;
    }

    alert('Extracción autorizada y registrada en la contabilidad.');
    setActiveModal(null);
  };

  const handleExecuteExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (expenseForm.amount <= 0) {
      setErrorMessage('El monto del gasto debe ser mayor a 0');
      return;
    }

    // Si es sueldo y no seleccionó empleado, advertir o sugerir
    if (expenseForm.category === 'sueldos' && !expenseForm.employeeId) {
      const confirmWithout = confirm('No has seleccionado un empleado registrado de la nómina para este pago de sueldo. ¿Deseas continuar igualmente?');
      if (!confirmWithout) return;
    }

    const res = recordFinancialMovement({
      type: 'expense',
      originType: expenseForm.originType,
      originAccountId: expenseForm.originType === 'bank' ? expenseForm.originAccountId : undefined,
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      employeeId: expenseForm.category === 'sueldos' && expenseForm.employeeId ? expenseForm.employeeId : undefined,
      employeeName: expenseForm.category === 'sueldos' && expenseForm.employeeName ? expenseForm.employeeName : undefined,
      description: expenseForm.description || `Pago de gasto: ${expenseForm.category.toUpperCase()}`,
      reference: expenseForm.reference
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Error al imputar gasto');
      return;
    }

    alert('Pago de gasto registrado con éxito. Se actualizó el balance de caja/bancos.');
    setActiveModal(null);
  };

  // --- FILTRADO DE MOVIMIENTOS FINANCIEROS ---
  const filteredMovements = useMemo(() => {
    return financialMovements.filter(m => {
      // 1. Fecha Desde
      if (filterStartDate) {
        const movDate = m.date.split('T')[0];
        if (movDate < filterStartDate) return false;
      }

      // 2. Fecha Hasta
      if (filterEndDate) {
        const movDate = m.date.split('T')[0];
        if (movDate > filterEndDate) return false;
      }

      // 3. Rubro y Concepto
      if (filterCategory !== 'all') {
        if ((m.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
          return false;
        }
      }

      // 4. Tipo de Operación
      if (filterType !== 'all') {
        if (m.type !== filterType) return false;
      }

      // 5. Cuenta (Caja o Banco específico)
      if (filterAccount !== 'all') {
        if (filterAccount === 'cash') {
          const touchesCash = m.originType === 'cash' || m.destinationType === 'cash';
          if (!touchesCash) return false;
        } else {
          const bankId = filterAccount;
          const touchesBank = m.originAccountId === bankId || m.destinationAccountId === bankId;
          if (!touchesBank) return false;
        }
      }

      // 6. Detalles (Búsqueda en texto de descripción, comprobante/ref, operador, empleado)
      if (filterDetailSearch.trim()) {
        const query = filterDetailSearch.toLowerCase().trim();
        const inDesc = (m.description || '').toLowerCase().includes(query);
        const inRef = (m.reference || '').toLowerCase().includes(query);
        const inUser = (m.performedByUserName || '').toLowerCase().includes(query);
        const inEmp = (m.employeeName || '').toLowerCase().includes(query);
        const inCat = (m.category || '').toLowerCase().includes(query);
        if (!inDesc && !inRef && !inUser && !inEmp && !inCat) return false;
      }

      return true;
    });
  }, [
    financialMovements,
    filterStartDate,
    filterEndDate,
    filterCategory,
    filterType,
    filterAccount,
    filterDetailSearch
  ]);

  // Totales de movimientos filtrados
  const { totalFilteredIncome, totalFilteredExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredMovements.forEach(m => {
      const isEgress = m.type === 'expense' || m.type === 'withdrawal' || m.type === 'supplier_payment';
      if (isEgress) {
        exp += m.amount;
      } else if (m.type !== 'transfer') {
        inc += m.amount;
      }
    });
    return { totalFilteredIncome: inc, totalFilteredExpense: exp };
  }, [filteredMovements]);

  const hasActiveFilters = Boolean(
    filterStartDate ||
    filterEndDate ||
    filterCategory !== 'all' ||
    filterType !== 'all' ||
    filterAccount !== 'all' ||
    filterDetailSearch.trim()
  );

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCategory('all');
    setFilterType('all');
    setFilterAccount('all');
    setFilterDetailSearch('');
  };

  // Exportar a Excel con los filtros aplicados
  const handleExportMovements = () => {
    exportToExcel(
      filteredMovements,
      'Auditoria_Movimientos_Financieros_Filtrados',
      [
        { key: 'date', header: 'Fecha', format: v => new Date(v).toLocaleString() },
        { key: 'type', header: 'Tipo Operación' },
        { key: 'category', header: 'Rubro / Concepto' },
        { key: 'employeeName', header: 'Empleado Vinculado', format: v => v || '-' },
        { key: 'amount', header: 'Importe', format: v => formatCurrency(v) },
        { key: 'originType', header: 'Cuenta Origen' },
        { key: 'destinationType', header: 'Cuenta Destino', format: v => v || '-' },
        { key: 'performedByUserName', header: 'Operador / Usuario' },
        { key: 'description', header: 'Detalle' },
        { key: 'reference', header: 'Comprobante / Referencia' }
      ]
    );
  };

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">6. Módulo de Caja, Cuentas Bancarias & Gastos</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Control de tesorería, transferencias, depósitos, extracciones (Admin) y pago de gastos vinculados a empleados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openModal('expense', 'sueldos')}
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>Pagar Sueldo a Empleado</span>
          </button>

          <button
            onClick={() => openModal('expense')}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/30 transition-colors flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4" />
            <span>Pagar Gasto General</span>
          </button>

          <button
            onClick={() => openModal('transfer')}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <span>Transferir</span>
          </button>

          <button
            onClick={() => openModal('deposit')}
            className="px-3.5 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-[#27272A] transition-colors flex items-center gap-1.5"
          >
            <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
            <span>Depositar</span>
          </button>

          <button
            onClick={() => openModal('withdrawal')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
              isAdmin
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
            }`}
            title={isAdmin ? 'Extracción de fondos (Admin)' : 'Solo el usuario Admin puede extraer fondos'}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Extracción (Admin)</span>
          </button>

          <button
            onClick={() => openModal('bank')}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cuenta Bancaria</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Caja Principal */}
        <div className="bg-[#16161A] p-5 rounded-2xl border border-[#27272A] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Caja Efectivo Central</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400 mt-3">
              {formatCurrency(cashRegister.balance)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-4 pt-3 border-t border-zinc-800">
            Última actualización: {new Date(cashRegister.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Cuentas Bancarias Total */}
        <div className="bg-[#16161A] p-5 rounded-2xl border border-[#27272A] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total en Cuentas Bancarias</span>
              <Landmark className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-blue-400 mt-3">
              {formatCurrency(totalBankBalance)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-4 pt-3 border-t border-zinc-800">
            {bankAccounts.length} cuentas bancarias registradas
          </p>
        </div>

        {/* Liquidez Global */}
        <div className="bg-[#16161A] p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#16161A] to-emerald-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Disponibilidad Líquida Total</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-3xl font-bold font-mono text-white mt-3">
              {formatCurrency(cashRegister.balance + totalBankBalance)}
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-4 pt-3 border-t border-zinc-800/80">
            Fondos listos para operaciones comerciales y pagos
          </p>
        </div>
      </div>

      {/* Cuentas Bancarias Activas */}
      <div className="bg-[#16161A] rounded-xl border border-[#27272A] p-4">
        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">
          Cuentas Bancarias Activas ({bankAccounts.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {bankAccounts.map(b => (
            <div key={b.id} className="p-3 rounded-xl bg-[#0A0A0B] border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">{b.bankName}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                    {b.accountType === 'checking' || b.accountType === 'corriente' ? 'Cuenta Corriente' : 'Caja de Ahorro'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-1">Nº: {b.accountNumber}</p>
                {b.cbuOrAlias && (
                  <p className="text-[10px] text-zinc-500 font-mono">Alias/CBU: {b.cbuOrAlias}</p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Saldo:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(b.balance)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN: AUDITORÍA DE MOVIMIENTOS FINANCIEROS CON FILTROS COMPLETOS */}
      {/* ========================================================================= */}
      <div className="bg-[#16161A] rounded-2xl border border-[#27272A] overflow-hidden space-y-0">
        {/* Header de la Auditoría */}
        <div className="p-4 md:p-5 border-b border-[#27272A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Auditoría de Movimientos Financieros
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-xs">
                {filteredMovements.length} de {financialMovements.length}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Registro contable detallado con filtros por fechas, rubros, detalle de comprobante, tipo de operación y cuenta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition-colors"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Limpiar Filtros</span>
              </button>
            )}

            <button
              onClick={handleExportMovements}
              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="p-4 bg-[#0F0F12] border-b border-[#27272A] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* 1. Rango de Fechas (Desde / Hasta) - 4 cols */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>Desde Fecha</span>
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>Hasta Fecha</span>
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 2. Rubro y Concepto - 2 cols */}
            <div className="lg:col-span-3">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                <span>Rubro / Concepto</span>
              </label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos los rubros y conceptos</option>
                <option value="ventas">Ventas de Mercadería (Cobros POS)</option>
                <option value="cobro_cliente">Cobranzas a Clientes (Cta Cte)</option>
                <option value="sueldos">Sueldos / Nómina de Personal</option>
                <option value="servicios">Servicios Públicos e Internet</option>
                <option value="mantenimiento">Mantenimiento de Local / Equipos</option>
                <option value="comisiones">Comisiones por Ventas</option>
                <option value="alquiler">Alquileres Comerciales</option>
                <option value="proveedor_factura">Factura de Compra Proveedor</option>
                <option value="pago_proveedor">Pago a Proveedor</option>
                <option value="transferencia">Transferencia Interna</option>
                <option value="deposito">Depósitos Bancarios</option>
                <option value="extraccion_admin">Extracciones de Fondos (Admin)</option>
                <option value="otros">Otros Gastos Generales</option>
              </select>
            </div>

            {/* 3. Tipo de Operación - 2 cols */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                Tipo de Operación
              </label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="sale_income">Cobros por Ventas (POS)</option>
                <option value="customer_payment">Cobros a Clientes (Cta Cte)</option>
                <option value="expense">Gastos / Egresos</option>
                <option value="supplier_payment">Pagos a Proveedor</option>
                <option value="transfer">Transferencias</option>
                <option value="deposit">Depósitos</option>
                <option value="withdrawal">Extracciones</option>
              </select>
            </div>

            {/* 4. Por Cuenta (Caja o Banco) - 3 cols */}
            <div className="lg:col-span-3">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" />
                <span>Por Cuenta</span>
              </label>
              <select
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todas las Cuentas (Caja & Bancos)</option>
                <option value="cash">Caja Efectivo Central</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>
                    Banco: {b.bankName} ({b.accountNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Buscador de Detalles, Comprobante y Empleado */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filtrar por detalles del movimiento, número de comprobante, nombre de empleado u operador..."
              value={filterDetailSearch}
              onChange={e => setFilterDetailSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            {filterDetailSearch && (
              <button
                onClick={() => setFilterDetailSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Resumen numérico de los movimientos filtrados */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-zinc-800/60 font-mono">
            <span className="text-zinc-400 font-sans">
              Registros filtrados: <strong className="text-white font-mono">{filteredMovements.length}</strong>
            </span>

            <div className="flex items-center gap-4">
              <span className="text-emerald-400">
                Ingresos Filtrados: <strong>+{formatCurrency(totalFilteredIncome)}</strong>
              </span>
              <span className="text-red-400">
                Egresos Filtrados: <strong>-{formatCurrency(totalFilteredExpense)}</strong>
              </span>
              <span className="text-zinc-200 border-l border-zinc-700 pl-3">
                Flujo Neto: <strong className={totalFilteredIncome - totalFilteredExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatCurrency(totalFilteredIncome - totalFilteredExpense)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* TABLA DE AUDITORÍA */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
              <tr>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Tipo Operación</th>
                <th className="p-3.5">Rubro / Concepto</th>
                <th className="p-3.5">Cuenta Origen / Destino</th>
                <th className="p-3.5">Detalle / Referencia</th>
                <th className="p-3.5">Operador</th>
                <th className="p-3.5 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredMovements.map(m => {
                const isEgress = m.type === 'expense' || m.type === 'withdrawal' || m.type === 'supplier_payment';
                const isTransfer = m.type === 'transfer';

                // Nombre de banco si aplica
                const originBank = m.originAccountId ? bankAccounts.find(b => b.id === m.originAccountId) : null;
                const destBank = m.destinationAccountId ? bankAccounts.find(b => b.id === m.destinationAccountId) : null;

                const getOperationBadge = () => {
                  switch (m.type) {
                    case 'sale_income':
                      return { text: 'Cobro Venta', badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' };
                    case 'customer_payment':
                      return { text: 'Cobro Cta Cte', badgeClass: 'bg-teal-500/15 text-teal-400 border border-teal-500/30' };
                    case 'supplier_payment':
                      return { text: 'Pago Proveedor', badgeClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' };
                    case 'expense':
                      return { text: 'Gasto / Egreso', badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30' };
                    case 'withdrawal':
                      return { text: 'Extracción Admin', badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' };
                    case 'transfer':
                      return { text: 'Transferencia', badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' };
                    case 'deposit':
                      return { text: 'Depósito', badgeClass: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' };
                    default:
                      return { text: m.type.replace('_', ' '), badgeClass: 'bg-zinc-800 text-zinc-300' };
                  }
                };

                const opBadge = getOperationBadge();

                return (
                  <tr key={m.id} className="hover:bg-[#1C1C21] transition-colors">
                    {/* Fecha */}
                    <td className="p-3.5 text-zinc-400 font-mono whitespace-nowrap">
                      <div>{new Date(m.date).toLocaleDateString()}</div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Tipo Operación */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${opBadge.badgeClass}`}>
                        {opBadge.text}
                      </span>
                    </td>

                    {/* Rubro y Concepto + Empleado vinculado */}
                    <td className="p-3.5">
                      <span className="font-bold text-zinc-200 uppercase text-[10px] block">
                        {m.category === 'ventas' ? 'Ventas de Mercadería' : m.category === 'cobro_cliente' ? 'Cobro Cta Cte Cliente' : m.category || '-'}
                      </span>
                      {m.employeeName && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                          <Users className="w-3 h-3" />
                          <span>{m.employeeName}</span>
                        </span>
                      )}
                    </td>

                    {/* Cuentas involucradas */}
                    <td className="p-3.5 text-[11px]">
                      <div className="space-y-0.5">
                        {m.type === 'sale_income' || m.type === 'customer_payment' ? (
                          <p className="text-zinc-300">
                            <strong className="text-emerald-400">Ingresó a:</strong>{' '}
                            {m.originType === 'cash'
                              ? 'Caja Efectivo Central'
                              : (originBank ? `${originBank.bankName} (${originBank.accountNumber})` : 'Cuenta Bancaria')}
                          </p>
                        ) : isTransfer ? (
                          <>
                            <p className="text-zinc-300">
                              <strong>Origen:</strong> {m.originType === 'cash' ? 'Caja Efectivo' : (originBank ? originBank.bankName : 'Banco')}
                            </p>
                            {m.destinationType && (
                              <p className="text-zinc-400">
                                <strong>Destino:</strong> {m.destinationType === 'cash' ? 'Caja Efectivo' : (destBank ? destBank.bankName : 'Banco')}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-zinc-300">
                              <strong>{isEgress ? 'Egresó de:' : 'Cuenta:'}</strong>{' '}
                              {m.originType === 'cash' ? 'Caja Efectivo Central' : (originBank ? `${originBank.bankName} (${originBank.accountNumber})` : 'Banco')}
                            </p>
                            {m.destinationType && m.destinationType !== m.originType && (
                              <p className="text-zinc-400">
                                <strong>Hacia:</strong> {m.destinationType === 'cash' ? 'Caja Efectivo' : (destBank ? destBank.bankName : 'Banco')}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Detalle y comprobante */}
                    <td className="p-3.5 max-w-xs">
                      <p className="text-zinc-200 font-medium">{m.description}</p>
                      {m.reference && (
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Ref: {m.reference}
                        </p>
                      )}
                    </td>

                    {/* Operador */}
                    <td className="p-3.5 text-zinc-400 whitespace-nowrap">
                      {m.performedByUserName}
                    </td>

                    {/* Importe */}
                    <td className={`p-3.5 text-right font-mono font-bold whitespace-nowrap ${
                      isTransfer ? 'text-blue-400' : isEgress ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {isTransfer ? '' : isEgress ? '-' : '+'}{formatCurrency(m.amount)}
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-xs">
                    No se encontraron movimientos financieros con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR PAGO DE GASTOS (CON VINCULACIÓN DE EMPLEADOS EN SUELDOS) */}
      {/* ========================================================================= */}
      {activeModal === 'expense' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-400" />
                <span>Pago de Gastos de la Empresa</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteExpense} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Rubro del Gasto */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Rubro del Gasto *</label>
                <select
                  required
                  value={expenseForm.category}
                  onChange={e => {
                    const newCat = e.target.value as ExpenseCategory;
                    setExpenseForm(prev => ({
                      ...prev,
                      category: newCat,
                      employeeId: newCat === 'sueldos' ? prev.employeeId : '',
                      employeeName: newCat === 'sueldos' ? prev.employeeName : ''
                    }));
                  }}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="sueldos">Pago de Sueldos / Nómina</option>
                  <option value="servicios">Servicios (Luz, Internet, Agua, Gas)</option>
                  <option value="mantenimiento">Mantenimiento de Local / Equipos</option>
                  <option value="comisiones">Comisiones por Ventas</option>
                  <option value="alquiler">Alquiler Comercial</option>
                  <option value="otros">Otros Gastos Generales</option>
                </select>
              </div>

              {/* VINCULACIÓN CON EMPLEADOS SI EL GASTO ES SUELDOS */}
              {expenseForm.category === 'sueldos' && (
                <div className="p-3 bg-[#0A0A0B] border border-emerald-500/30 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Vincular con Empleado Registrado *</span>
                  </label>
                  
                  <select
                    value={expenseForm.employeeId}
                    onChange={e => handleSelectEmployee(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Seleccionar de la Nómina ({employees.length} empleados) --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} &bull; {emp.role || emp.position || 'Personal'} &bull; Sueldo Base: {formatCurrency(emp.salary)}
                      </option>
                    ))}
                  </select>

                  {expenseForm.employeeId && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between text-zinc-300">
                        <span>Empleado Vinculado:</span>
                        <strong className="text-white">{expenseForm.employeeName}</strong>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Se auto-completó el importe con el sueldo registrado, pero puedes ajustarlo si corresponde a un pago parcial o adelanto.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Importe a Pagar */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Importe a Pagar ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm font-mono text-red-400 font-bold"
                />
              </div>

              {/* Origen de los fondos (Caja o Banco) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Pagar desde *</label>
                <select
                  value={expenseForm.originType}
                  onChange={e => setExpenseForm({ ...expenseForm, originType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="cash">Caja Efectivo (Disponible: {formatCurrency(cashRegister.balance)})</option>
                  <option value="bank">Cuenta Bancaria</option>
                </select>
              </div>

              {expenseForm.originType === 'bank' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Cuenta Bancaria de Débito *</label>
                  <select
                    value={expenseForm.originAccountId}
                    onChange={e => setExpenseForm({ ...expenseForm, originAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Descripción / Detalle *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de sueldo Juan Perez mes en curso..."
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20"
                >
                  Confirmar Pago de Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERENCIA ENTRE CUENTAS */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                <span>Transferencia Interna (Caja & Bancos)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Origen de Fondos *</label>
                <select
                  value={transferForm.originType}
                  onChange={e => setTransferForm({ ...transferForm, originType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="cash">Caja Efectivo</option>
                  <option value="bank">Cuenta Bancaria</option>
                </select>
              </div>

              {transferForm.originType === 'bank' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Banco de Origen</label>
                  <select
                    value={transferForm.originAccountId}
                    onChange={e => setTransferForm({ ...transferForm, originAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Destino de Fondos *</label>
                <select
                  value={transferForm.destinationType}
                  onChange={e => setTransferForm({ ...transferForm, destinationType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="bank">Cuenta Bancaria</option>
                  <option value="cash">Caja Efectivo</option>
                </select>
              </div>

              {transferForm.destinationType === 'bank' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Banco de Destino</label>
                  <select
                    value={transferForm.destinationAccountId}
                    onChange={e => setTransferForm({ ...transferForm, destinationAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Importe ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm font-mono text-white font-bold"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl"
                >
                  Ejecutar Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXTRACCIÓN (ADMIN) */}
      {activeModal === 'withdrawal' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Extracción de Fondos (Facultad Exclusiva Admin)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteWithdrawal} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Extraer desde *</label>
                <select
                  value={withdrawalForm.originType}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, originType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                >
                  <option value="cash">Caja Efectivo</option>
                  <option value="bank">Cuenta Bancaria</option>
                </select>
              </div>

              {withdrawalForm.originType === 'bank' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Cuenta Bancaria</label>
                  <select
                    value={withdrawalForm.originAccountId}
                    onChange={e => setWithdrawalForm({ ...withdrawalForm, originAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Monto a Retirar ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={withdrawalForm.amount}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm font-mono text-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Motivo / Destino del Retiro *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Retiro de utilidades del socio administrador..."
                  value={withdrawalForm.description}
                  onChange={e => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
                >
                  Autorizar Extracción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CUENTA BANCARIA */}
      {activeModal === 'bank' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Registrar Nueva Cuenta Bancaria</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Entidad Bancaria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banco Santander, BBVA, Galicia..."
                  value={bankForm.bankName}
                  onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Nº de Cuenta *</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountNumber}
                    onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Tipo de Cuenta</label>
                  <select
                    value={bankForm.accountType}
                    onChange={e => setBankForm({ ...bankForm, accountType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  >
                    <option value="checking">Cuenta Corriente</option>
                    <option value="savings">Caja de Ahorro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">CBU / CVU o Alias</label>
                <input
                  type="text"
                  placeholder="0720xxxxxxxxxxxxxxxx / alias.empresa"
                  value={bankForm.cbuOrAlias}
                  onChange={e => setBankForm({ ...bankForm, cbuOrAlias: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Saldo Inicial ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={bankForm.initialBalance}
                  onChange={e => setBankForm({ ...bankForm, initialBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-emerald-400"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
