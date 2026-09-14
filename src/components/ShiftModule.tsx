import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shift } from '../types';
import { formatCurrency, printHtmlDocument, exportToExcel } from '../utils/exportUtils';
import { 
  Clock, 
  DollarSign, 
  LogOut, 
  Plus, 
  Printer, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  X,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Lock
} from 'lucide-react';

interface ShiftModuleProps {
  onOpenCloseShiftModal: () => void;
}

export const ShiftModule: React.FC<ShiftModuleProps> = ({ onOpenCloseShiftModal }) => {
  const { 
    currentShift, 
    shifts, 
    openShift, 
    currentUser, 
    cashRegister,
    isAdmin,
    wipeAllDatabaseRecords,
    storeSettings
  } = useApp();

  const [initialCashInput, setInitialCashInput] = useState<number>(cashRegister.balance || 50000);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);

  // Estados para Vaciado Total de BD (Exclusivo Admin en Turno)
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [preserveAdminUser, setPreserveAdminUser] = useState(true);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [isWiping, setIsWiping] = useState(false);

  const handleExecuteWipe = async () => {
    setWipeError(null);
    if (!adminCodeInput.trim()) {
      setWipeError('Debes ingresar el código o contraseña de Administrador.');
      return;
    }
    if (confirmWord.trim().toUpperCase() !== 'BORRAR') {
      setWipeError('Debes escribir la palabra "BORRAR" en mayúsculas para confirmar.');
      return;
    }

    setIsWiping(true);
    const res = await wipeAllDatabaseRecords(adminCodeInput.trim(), preserveAdminUser);
    setIsWiping(false);

    if (!res.success) {
      setWipeError(res.error || 'Ocurrió un error al vaciar las bases de datos.');
    } else {
      setIsWipeModalOpen(false);
      setAdminCodeInput('');
      setConfirmWord('');
      alert('✅ Vaciado exitoso: Todos los registros de las bases de datos han sido eliminados.');
    }
  };

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    openShift(Number(initialCashInput));
    setIsOpenModalOpen(false);
    alert('Turno de caja iniciado con éxito.');
  };

  const handlePrintShiftReport = (s: Shift) => {
    const difference = (s.actualCash ?? s.expectedCash) - s.expectedCash;
    const logoHtml = storeSettings.logoUrl
      ? `<div style="text-align: center; margin-bottom: 6px;"><img src="${storeSettings.logoUrl}" alt="Logo" style="max-height: 50px; max-width: 120px; object-fit: contain; display: inline-block;" /></div>`
      : '';

    const html = `
      <div style="font-family: monospace; font-size: 13px; max-width: 450px; margin: 0 auto; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
          ${logoHtml}
          <h3 style="margin: 0; font-size: 16px; text-transform: uppercase;">${storeSettings.name}</h3>
          ${storeSettings.taxId ? `<p style="margin: 2px 0; font-size: 11px;">CUIT: ${storeSettings.taxId}</p>` : ''}
          <h2 style="margin: 6px 0 2px 0; font-size: 18px;">ARQUEO Y CIERRE DE CAJA</h2>
          <p style="margin: 3px 0;">TURNO ID: ${s.id}</p>
          <p style="margin: 3px 0;">ESTADO: ${s.status.toUpperCase()}</p>
        </div>

        <div style="margin-bottom: 12px; font-size: 12px;">
          <p><strong>Cajero / Operador:</strong> ${s.userName}</p>
          <p><strong>Apertura:</strong> ${new Date(s.openedAt).toLocaleString()}</p>
          <p><strong>Cierre:</strong> ${s.closedAt ? new Date(s.closedAt).toLocaleString() : 'Turno aún abierto'}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #000; text-align: left;">
              <th style="padding: 4px 0;">CONCEPTO</th>
              <th style="padding: 4px 0; text-align: right;">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 3px 0;">Fondo Inicial de Caja</td><td style="text-align: right;">${formatCurrency(s.initialCash)}</td></tr>
            <tr><td style="padding: 3px 0;">+ Ventas en Efectivo</td><td style="text-align: right;">${formatCurrency(s.cashSales)}</td></tr>
            <tr><td style="padding: 3px 0;">- Gastos en Efectivo del Turno</td><td style="text-align: right;">-${formatCurrency(s.cashExpenses)}</td></tr>
            <tr><td style="padding: 3px 0;">- Extracciones de Caja</td><td style="text-align: right;">-${formatCurrency(s.cashWithdrawals)}</td></tr>
            <tr style="border-top: 1px solid #000; font-weight: bold;"><td style="padding: 4px 0;">= Efectivo Teórico Esperado</td><td style="text-align: right;">${formatCurrency(s.expectedCash)}</td></tr>
            <tr style="font-weight: bold;"><td style="padding: 4px 0;">Efectivo Real Contado en Cierre</td><td style="text-align: right;">${s.actualCash !== undefined ? formatCurrency(s.actualCash) : 'Pendiente'}</td></tr>
            <tr style="border-top: 1px solid #000; font-weight: bold; color: ${difference === 0 ? 'black' : difference > 0 ? '#2e7d32' : '#c62828'};">
              <td style="padding: 4px 0;">Diferencia (${difference >= 0 ? 'Sobrante' : 'Faltante'})</td>
              <td style="text-align: right;">${formatCurrency(difference)}</td>
            </tr>
          </tbody>
        </table>

        <div style="border-top: 1px solid #000; padding-top: 8px; font-size: 12px;">
          <p><strong>Otras Formas de Cobro en el Turno:</strong></p>
          <p style="margin: 2px 0;">&bull; Tarjetas / POS: ${formatCurrency(s.cardSales)}</p>
          <p style="margin: 2px 0;">&bull; Transferencias Bancarias: ${formatCurrency(s.transferSales)}</p>
          <p style="margin: 2px 0;">&bull; Crédito en Cuenta Corriente: ${formatCurrency(s.creditSales)}</p>
          <p style="margin: 4px 0; font-weight: bold;">TOTAL RECAUDADO (TODOS LOS MEDIOS): ${formatCurrency(s.cashSales + s.cardSales + s.transferSales + s.creditSales)}</p>
        </div>

        ${s.notes ? `
          <div style="margin-top: 15px; padding: 8px; background: #eee; border: 1px solid #ccc; font-size: 11px;">
            <strong>Observaciones del Cajero:</strong><br/>
            ${s.notes}
          </div>
        ` : ''}
      </div>
    `;
    printHtmlDocument(`Cierre_Turno_${s.id}`, html);
  };

  const handleExportShifts = () => {
    exportToExcel(
      shifts,
      'Historico_Cierres_Caja_Turnos',
      [
        { key: 'userName', header: 'Cajero / Usuario' },
        { key: 'openedAt', header: 'Fecha Apertura', format: v => new Date(v).toLocaleString() },
        { key: 'closedAt', header: 'Fecha Cierre', format: v => v ? new Date(v).toLocaleString() : 'Abierto' },
        { key: 'initialCash', header: 'Fondo Inicial', format: v => formatCurrency(v) },
        { key: 'cashSales', header: 'Ventas Efectivo', format: v => formatCurrency(v) },
        { key: 'cardSales', header: 'Ventas Tarjeta', format: v => formatCurrency(v) },
        { key: 'transferSales', header: 'Ventas Transferencia', format: v => formatCurrency(v) },
        { key: 'creditSales', header: 'Ventas Cta. Cte.', format: v => formatCurrency(v) },
        { key: 'expectedCash', header: 'Efectivo Esperado', format: v => formatCurrency(v) },
        { key: 'actualCash', header: 'Efectivo Real Arqueado', format: v => v !== undefined ? formatCurrency(v) : '-' },
        { key: 'status', header: 'Estado' }
      ]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">8. Módulo de Turnos & Cierres de Caja</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Control individual de turnos por usuario, arqueo de caja con conteo de dinero real y detección de sobrantes/faltantes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentShift ? (
            <button
              onClick={onOpenCloseShiftModal}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/30 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Turno & Efectuar Arqueo</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Nuevo Turno de Caja</span>
            </button>
          )}

          <button
            onClick={handleExportShifts}
            className="p-2 bg-[#1F1F23] hover:bg-[#27272A] text-emerald-400 rounded-xl border border-[#27272A] transition-colors"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Active Shift Card */}
      {currentShift ? (
        <div className="bg-[#16161A] rounded-2xl border border-emerald-500/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Turno Activo: {currentShift.userName}</h3>
                <p className="text-xs text-zinc-400">
                  Iniciado el {new Date(currentShift.openedAt).toLocaleDateString()} a las {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-bold">Efectivo Teórico en Caja</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(currentShift.expectedCash)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#0A0A0B] border border-zinc-800 text-xs">
              <span className="text-zinc-500">Fondo Inicial:</span>
              <p className="font-mono font-bold text-white text-sm mt-1">{formatCurrency(currentShift.initialCash)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0A0B] border border-zinc-800 text-xs">
              <span className="text-zinc-500">Ventas Efectivo:</span>
              <p className="font-mono font-bold text-emerald-400 text-sm mt-1">+{formatCurrency(currentShift.cashSales)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0A0B] border border-zinc-800 text-xs">
              <span className="text-zinc-500">Ventas Tarjeta / POS:</span>
              <p className="font-mono font-bold text-blue-400 text-sm mt-1">{formatCurrency(currentShift.cardSales)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0A0B] border border-zinc-800 text-xs">
              <span className="text-zinc-500">Crédito Cta. Cte:</span>
              <p className="font-mono font-bold text-amber-400 text-sm mt-1">{formatCurrency(currentShift.creditSales)}</p>
            </div>
          </div>

          {/* BOTÓN Y ZONA EXCLUSIVA: ADMINISTRADOR EN TURNO PUEDE VACIAR LAS BASES DE DATOS */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-950/20 p-4 rounded-xl border border-rose-500/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-200">Acción Crítica: Vaciado Total de Bases de Datos</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Exclusivo Admin en Turno
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    Como Administrador con turno activo, puedes ordenar el borrado de todos los registros del sistema. Requiere confirmación con tu código/contraseña.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsWipeModalOpen(true);
                  setWipeError(null);
                  setAdminCodeInput('');
                  setConfirmWord('');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-600/30 shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Borrar Todos los Registros</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#16161A] p-6 rounded-2xl border border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No hay un turno abierto para {currentUser.name}</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Inicia un turno indicando el fondo inicial en efectivo para registrar ventas y efectuar el arqueo al concluir la jornada.
          </p>
          <button
            onClick={() => setIsOpenModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Turno Ahora</span>
          </button>
        </div>
      )}

      {/* Historial de Turnos y Cierres */}
      <div className="bg-[#16161A] rounded-xl border border-[#27272A] overflow-hidden">
        <div className="p-4 border-b border-[#27272A]">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Histórico de Turnos & Cierres ({shifts.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#0F0F12] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A]">
              <tr>
                <th className="p-3.5">Cajero</th>
                <th className="p-3.5">Apertura</th>
                <th className="p-3.5">Cierre</th>
                <th className="p-3.5 text-right">Fondo Inicial</th>
                <th className="p-3.5 text-right">Efectivo Esperado</th>
                <th className="p-3.5 text-right">Efectivo Real</th>
                <th className="p-3.5 text-right">Diferencia</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-center">Informe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {shifts.map(s => {
                const diff = s.actualCash !== undefined ? s.actualCash - s.expectedCash : 0;
                return (
                  <tr key={s.id} className="hover:bg-[#1C1C21] transition-colors">
                    <td className="p-3.5 font-bold text-white">{s.userName}</td>
                    <td className="p-3.5 text-zinc-400">
                      {new Date(s.openedAt).toLocaleDateString()} {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5 text-zinc-400">
                      {s.closedAt ? (
                        `${new Date(s.closedAt).toLocaleDateString()} ${new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      ) : (
                        <span className="text-emerald-400 font-bold">En curso</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono text-zinc-300">{formatCurrency(s.initialCash)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-zinc-200">{formatCurrency(s.expectedCash)}</td>
                    <td className="p-3.5 text-right font-mono text-white">
                      {s.actualCash !== undefined ? formatCurrency(s.actualCash) : '-'}
                    </td>
                    <td className={`p-3.5 text-right font-mono font-bold ${
                      diff === 0 ? 'text-zinc-400' : diff > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {s.actualCash !== undefined ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}` : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {s.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handlePrintShiftReport(s)}
                        className="px-2.5 py-1 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                        title="Imprimir informe de arqueo"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Arqueo</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Iniciar Turno */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Apertura de Turno de Caja</h3>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-zinc-400 mb-2">
                  Iniciando turno para: <strong className="text-white">{currentUser.name}</strong>
                </p>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Fondo Inicial en Efectivo (Caja Chica) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialCashInput}
                  onChange={e => setInitialCashInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm font-mono text-emerald-400"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Confirmar e Iniciar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADVERTENCIA Y CONFIRMACIÓN: BORRADO TOTAL DE BASES DE DATOS */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-rose-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del modal de advertencia */}
            <div className="bg-rose-950/40 p-5 border-b border-rose-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    ⚠️ ADVERTENCIA CRÍTICA: BORRADO TOTAL
                  </h3>
                  <p className="text-xs text-rose-300 mt-1">
                    Vaciado completo de registros en las bases de datos (Supabase y Local)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isWiping && setIsWipeModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Detalle explícito de datos que se eliminarán */}
              <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2 text-rose-200">
                <p className="font-semibold text-rose-100">
                  Esta operación borrará irreversiblemente todos los siguientes registros:
                </p>
                <ul className="list-disc list-inside space-y-1 text-rose-300/90 pl-1 leading-relaxed">
                  <li>Todas las Ventas, Comprobantes y Artículos vendidos</li>
                  <li>Historial de Turnos de Caja y Arqueos</li>
                  <li>Movimientos Financieros y Saldos de Caja / Bancos</li>
                  <li>Catálogo de Productos, Costos, Precios y Stock</li>
                  <li>Clientes, Cuentas Corrientes y Categorías</li>
                  <li>Proveedores, Facturas de Compra y Cuentas por Pagar</li>
                  <li>Sub-Grupos de Artículos y Empleados</li>
                </ul>
              </div>

              {/* Opción de cuenta Admin */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={preserveAdminUser}
                  onChange={e => setPreserveAdminUser(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Conservar mi cuenta de Administrador</span>
                  <span className="text-[11px] text-zinc-400">
                    Mantiene tu usuario "{currentUser?.username}" y elimina usuarios secundarios. Si desmarcas, se purgan también los usuarios para reiniciar el sistema a cero.
                  </span>
                </div>
              </label>

              {/* Requerimiento estricto del código del Administrador */}
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
                  1. Código / Contraseña del Usuario Admin *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Ingresa tu contraseña o código de Admin"
                    value={adminCodeInput}
                    onChange={e => setAdminCodeInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Confirmación adicional por texto */}
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
                  2. Escribe la palabra "BORRAR" para validar *
                </label>
                <input
                  type="text"
                  required
                  placeholder='Escribe BORRAR en mayúsculas'
                  value={confirmWord}
                  onChange={e => setConfirmWord(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 font-mono uppercase"
                />
              </div>

              {wipeError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{wipeError}</span>
                </div>
              )}

              {/* Acciones */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isWiping}
                  onClick={() => setIsWipeModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isWiping || !adminCodeInput.trim() || confirmWord.trim().toUpperCase() !== 'BORRAR'}
                  onClick={handleExecuteWipe}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isWiping ? 'Borrando registros...' : 'Confirmar Borrado Total'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
