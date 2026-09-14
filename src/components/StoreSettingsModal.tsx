import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StoreSettings } from '../types';
import {
  Store,
  Upload,
  Globe,
  Trash2,
  X,
  Check,
  Receipt,
  FileText,
  Building,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';

const PRESET_LOGOS = [
  {
    name: 'Supermercado / Market',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80'
  },
  {
    name: 'Cafetería / Bakery',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80'
  },
  {
    name: 'Ferretería / Taller',
    url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=300&auto=format&fit=crop&q=80'
  },
  {
    name: 'Boutique / Moda',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&auto=format&fit=crop&q=80'
  }
];

export const StoreSettingsModal: React.FC = () => {
  const { storeSettings, updateStoreSettings, isStoreSettingsModalOpen, setIsStoreSettingsModalOpen } = useApp();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [activePreviewTab, setActivePreviewTab] = useState<'ticket' | 'statement'>('ticket');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isStoreSettingsModalOpen) return null;

  // Optimize and process logo from computer
  const handleProcessLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WEBP).');
      return;
    }

    setIsProcessingLogo(true);
    const reader = new FileReader();

    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar suavemente a un tamaño óptimo para comprobantes y tickets (max 400x400)
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.9);
          setFormData(prev => ({ ...prev, logoUrl: compressedDataUrl }));
        } else {
          setFormData(prev => ({ ...prev, logoUrl: e.target?.result as string }));
        }
        setIsProcessingLogo(false);
      };

      img.onerror = () => {
        setIsProcessingLogo(false);
        alert('No se pudo procesar la imagen seleccionada.');
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessingLogo(false);
      alert('Error al leer el archivo desde el ordenador.');
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('El nombre del puesto de venta no puede estar vacío.');
      return;
    }

    updateStoreSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsStoreSettingsModalOpen(false);
    }, 900);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restablecer la configuración predeterminada del puesto de venta?')) {
      const defaults: StoreSettings = {
        name: 'AI QuickStock Store',
        logoUrl: '',
        taxId: '30-71928391-4',
        address: 'Av. Comercial 1234',
        phone: '+54 9 11 4567-8900',
        email: 'ventas@quickstock.com',
        ticketHeader: 'TICKET COMPROBANTE NO FISCAL',
        ticketFooter: '¡Muchas gracias por su compra! Vuelva pronto.'
      };
      setFormData(defaults);
      updateStoreSettings(defaults);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#16161A] border border-[#27272A] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[#27272A] bg-[#121215] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Configuración del Puesto de Venta & Comprobantes</h3>
              <p className="text-xs text-zinc-400">
                Personaliza el nombre, logo y datos fiscales para Tickets de venta y Resumen de cuenta
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsStoreSettingsModalOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column (Left - 7 cols) */}
          <form id="store-settings-form" onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
            {/* Nombre del Puesto */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Nombre del Puesto de Venta / Comercio *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Kiosco Central, Distribuidora Express, etc."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Aparecerá en el encabezado principal de cada ticket y comprobante impreso.
              </p>
            </div>

            {/* Logo del Puesto */}
            <div className="p-4 bg-[#0A0A0B] border border-[#27272A] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Logo del Puesto de Venta
                </label>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar logo</span>
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessLogoFile(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Visual Preview Box */}
                <div className="w-24 h-24 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-inner">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Puesto"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <Store className="w-8 h-8 stroke-1" />
                      <span className="text-[9px] mt-1 text-center font-medium">Sin Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload & Options */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isProcessingLogo ? 'Procesando...' : 'Subir de mi Ordenador'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="url"
                      placeholder="O escribe una URL directa de imagen..."
                      value={formData.logoUrl || ''}
                      onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#121215] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Formatos recomendados: PNG o JPG con fondo transparente o blanco.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 font-semibold block mb-1.5">
                  O prueba con imágenes de muestra:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PRESET_LOGOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: preset.url })}
                      className="px-2 py-1 rounded bg-[#16161A] hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 truncate text-left transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Datos Fiscales y Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  CUIT / Identificación Fiscal
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="30-71928391-4"
                    value={formData.taxId || ''}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="+54 9 11 4567-8900"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Dirección Comercial
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Av. Comercial 1234, Local 2"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Email de Contacto
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    placeholder="contacto@comercio.com"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Mensajes Personalizados de Ticket */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Leyenda Superior de Ticket
                </label>
                <input
                  type="text"
                  placeholder="TICKET COMPROBANTE NO FISCAL - IVA RESPONSABLE"
                  value={formData.ticketHeader || ''}
                  onChange={e => setFormData({ ...formData, ticketHeader: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Pie / Despedida del Ticket
                </label>
                <input
                  type="text"
                  placeholder="¡Muchas gracias por su compra! Vuelva pronto."
                  value={formData.ticketFooter || ''}
                  onChange={e => setFormData({ ...formData, ticketFooter: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </form>

          {/* Live Preview Column (Right - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vista Previa en Vivo</span>
              </span>

              {/* Preview Toggle */}
              <div className="flex p-0.5 bg-[#0A0A0B] rounded-lg border border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('ticket')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    activePreviewTab === 'ticket'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Receipt className="w-3 h-3" />
                  <span>Ticket POS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('statement')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    activePreviewTab === 'statement'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Resumen Cta.</span>
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex-1 bg-white text-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-300 overflow-y-auto max-h-[480px]">
              {/* TICKET PREVIEW */}
              {activePreviewTab === 'ticket' && (
                <div className="font-mono text-xs max-w-[260px] mx-auto text-center space-y-2 leading-tight">
                  {/* Logo if configured */}
                  {formData.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="max-h-12 max-w-[120px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <h4 className="font-bold text-sm text-zinc-900 uppercase tracking-tight">
                    {formData.name || 'NOMBRE DEL COMERCIO'}
                  </h4>

                  {formData.address && <p className="text-[10px] text-zinc-600">{formData.address}</p>}
                  {formData.phone && <p className="text-[10px] text-zinc-600">Tel: {formData.phone}</p>}
                  {formData.taxId && <p className="text-[10px] text-zinc-600">CUIT: {formData.taxId}</p>}

                  <p className="text-[9px] text-zinc-500 border-b border-dashed border-zinc-400 pb-1.5">
                    {formData.ticketHeader || 'TICKET COMPROBANTE NO FISCAL'}
                  </p>

                  <div className="text-left text-[10px] space-y-0.5 pt-1 text-zinc-700">
                    <p><strong>TICKET Nº:</strong> TKT-2026-004819</p>
                    <p><strong>FECHA:</strong> 14/09/2026 10:30</p>
                    <p><strong>CLIENTE:</strong> Consumidor Final</p>
                    <p><strong>PAGO:</strong> EFECTIVO</p>
                  </div>

                  {/* Sample items */}
                  <div className="border-t border-b border-dashed border-zinc-400 py-1.5 my-1.5 text-left text-[10px]">
                    <div className="flex justify-between font-bold pb-1 border-b border-zinc-200">
                      <span>CANT &bull; ARTÍCULO</span>
                      <span>TOTAL</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span>1.00 x Yerba Mate 1kg</span>
                      <span>$ 2.450,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2.00 x Azúcar 1kg</span>
                      <span>$ 1.800,00</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-xs py-1 border-b border-dashed border-zinc-400">
                    <span>TOTAL FINAL:</span>
                    <span>$ 4.250,00</span>
                  </div>

                  <p className="text-[9px] text-zinc-500 pt-1">
                    {formData.ticketFooter || '¡Muchas gracias por su compra!'}
                  </p>
                </div>
              )}

              {/* STATEMENT PREVIEW */}
              {activePreviewTab === 'statement' && (
                <div className="text-xs space-y-3">
                  {/* Official Header */}
                  <div className="flex items-start justify-between border-b-2 border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      {formData.logoUrl && (
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="w-10 h-10 object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 leading-tight">
                          {formData.name || 'NOMBRE DEL COMERCIO'}
                        </h4>
                        <p className="text-[10px] text-zinc-600">
                          {formData.taxId ? `CUIT: ${formData.taxId}` : 'Gestión Contable & Comercial'}
                        </p>
                        <p className="text-[9px] text-zinc-500">
                          {[formData.address, formData.phone].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-[10px] font-bold">
                        RESUMEN DE CUENTA
                      </span>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Emisión: 14/09/2026</p>
                    </div>
                  </div>

                  {/* Customer Block Sample */}
                  <div className="p-2 bg-zinc-50 rounded border border-zinc-200 text-[10px] grid grid-cols-2 gap-1 text-zinc-700">
                    <p><strong>Cliente:</strong> Distribuidora Norte S.R.L.</p>
                    <p><strong>CUIT/DNI:</strong> 30-65432198-2</p>
                    <p><strong>Categoría:</strong> Mayorista (-15%)</p>
                    <p><strong>Límite Crédito:</strong> $ 500.000,00</p>
                  </div>

                  {/* Sample Table */}
                  <div className="border border-zinc-200 rounded overflow-hidden text-[9px]">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-100 font-bold border-b border-zinc-200">
                        <tr>
                          <th className="p-1">Fecha</th>
                          <th className="p-1">Operación</th>
                          <th className="p-1 text-right">Monto</th>
                          <th className="p-1 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr>
                          <td className="p-1 text-zinc-500">10/09/2026</td>
                          <td className="p-1">Venta Ticket TKT-001201</td>
                          <td className="p-1 text-right font-medium">$ 85.000,00</td>
                          <td className="p-1 text-right font-bold text-red-600">$ 85.000,00</td>
                        </tr>
                        <tr>
                          <td className="p-1 text-zinc-500">12/09/2026</td>
                          <td className="p-1">Pago Recibo COB-000450</td>
                          <td className="p-1 text-right font-medium text-emerald-600">-$ 50.000,00</td>
                          <td className="p-1 text-right font-bold text-amber-600">$ 35.000,00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2 bg-zinc-100 rounded text-[10px] flex justify-between font-bold">
                    <span>SALDO PENDIENTE ACTUAL:</span>
                    <span className="text-amber-700 font-mono">$ 35.000,00</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#121215] border-t border-[#27272A] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            title="Restablecer valores originales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStoreSettingsModalOpen(false)}
              className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="store-settings-form"
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg ${
                saveSuccess
                  ? 'bg-emerald-400 text-black shadow-emerald-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{saveSuccess ? '¡Guardado con Éxito!' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
