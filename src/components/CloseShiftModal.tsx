import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, printHtmlDocument } from '../utils/exportUtils';
import { LogOut, DollarSign, AlertTriangle, Printer, CheckCircle, X } from 'lucide-react';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, closeShift, logout } = useApp();

  const [actualCash, setActualCash] = useState<number>(currentShift ? currentShift.expectedCash : 0);
  const [notes, setNotes] = useState<string>('');
  const [closedSummary, setClosedSummary] = useState<any | null>(null);

  if (!isOpen || !currentShift) return null;

  const difference = actualCash - currentShift.expectedCash;

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    const result = closeShift(Number(actualCash), notes);
    if (result) {
      setClosedSummary(result);
    }
  };

  const handlePrint = () => {
    if (!closedSummary) return;
    const diff = closedSummary.actualCash - closedSummary.expectedCash;
    const html = `
      <div style="font-family: monospace; font-size: 13px; max-width: 400px; margin: 0 auto; line-height: 1.4;">
        <h2 style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px;">COMPROBANTE DE CIERRE DE CAJA</h2>
        <p><strong>Cajero:</strong> ${closedSummary.userName}</p>
        <p><strong>Apertura:</strong> ${new Date(closedSummary.openedAt).toLocaleString()}</p>
        <p><strong>Cierre:</strong> ${new Date(closedSummary.closedAt).toLocaleString()}</p>
        <hr style="border: 0; border-top: 1px dashed #000; margin: 10px 0;"/>
        <p>Fondo Inicial: ${formatCurrency(closedSummary.initialCash)}</p>
        <p>Ventas Efectivo: ${formatCurrency(closedSummary.cashSales)}</p>
        <p>Gastos en Efectivo: -${formatCurrency(closedSummary.cashExpenses)}</p>
        <hr style="border: 0; border-top: 1px dashed #000; margin: 10px 0;"/>
        <p><strong>Efectivo Teórico: ${formatCurrency(closedSummary.expectedCash)}</strong></p>
        <p><strong>Efectivo Real Contado: ${formatCurrency(closedSummary.actualCash)}</strong></p>
        <p style="font-size: 15px; font-weight: bold; color: ${diff === 0 ? 'black' : diff > 0 ? '#2e7d32' : '#c62828'};">
          Diferencia: ${diff >= 0 ? '+' : ''}${formatCurrency(diff)} (${diff >= 0 ? 'Sobrante' : 'Faltante'})
        </p>
        ${closedSummary.notes ? `<p><strong>Observaciones:</strong> ${closedSummary.notes}</p>` : ''}
      </div>
    `;
    printHtmlDocument(`Cierre_${closedSummary.id}`, html);
  };

  const handleFinish = (shouldLogout: boolean) => {
    onClose();
    if (shouldLogout) {
      logout();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Arqueo & Cierre de Turno de Caja</span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!closedSummary ? (
          <form onSubmit={handleConfirmClose} className="p-5 space-y-4">
            <div className="p-3 bg-[#0A0A0B] rounded-xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Cajero / Operador:</span>
                <span className="text-white font-bold">{currentShift.userName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Fondo Inicial:</span>
                <span className="font-mono">{formatCurrency(currentShift.initialCash)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>+ Ventas en Efectivo:</span>
                <span className="font-mono">+{formatCurrency(currentShift.cashSales)}</span>
              </div>
              {currentShift.cashExpenses > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>- Gastos de Caja:</span>
                  <span className="font-mono">-{formatCurrency(currentShift.cashExpenses)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold pt-1.5 border-t border-zinc-800">
                <span>Efectivo Teórico Esperado:</span>
                <span className="font-mono text-emerald-400">{formatCurrency(currentShift.expectedCash)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Efectivo Real Contado en el Cajón ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={actualCash}
                onChange={e => setActualCash(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Difference indicator */}
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
              difference === 0
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : difference > 0
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <span>Diferencia de Caja:</span>
              <span className="font-bold text-sm">
                {difference >= 0 ? '+' : ''}{formatCurrency(difference)} ({difference === 0 ? 'Exacto' : difference > 0 ? 'Sobrante' : 'Faltante'})
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Observaciones del Arqueo
              </label>
              <textarea
                rows={2}
                placeholder="Indica motivos de faltante o sobrante si corresponde..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl"
              >
                Confirmar Cierre de Caja
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base">Caja Cerrada Exitosamente</h4>
            <p className="text-xs text-zinc-400">
              El arqueo ha quedado asentado en el historial con fecha y hora del sistema.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante de Arqueo</span>
              </button>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleFinish(false)}
                  className="flex-1 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl font-medium"
                >
                  Continuar en la App
                </button>
                <button
                  onClick={() => handleFinish(true)}
                  className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-xl font-bold"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
