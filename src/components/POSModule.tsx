import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Customer, Sale } from '../types';
import { formatCurrency, printHtmlDocument } from '../utils/exportUtils';
import { soundEngine } from '../utils/audioUtils';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  UserCheck, 
  CreditCard, 
  DollarSign, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  Tag, 
  X,
  Receipt,
  Landmark,
  Store,
  Barcode,
  Camera,
  Zap,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const POSModule: React.FC = () => {
  const { 
    products, 
    subGroups, 
    customers, 
    customerCategories, 
    bankAccounts,
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart, 
    processSale, 
    currentShift,
    currentUser,
    storeSettings,
    openStoreSettingsModal
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_card' | 'bank_transfer' | 'credit'>('cash');
  const [bankAccountId, setBankAccountId] = useState<string>(bankAccounts[0]?.id || '');

  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  // Barcode & Camera Scanner State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanToast, setScanToast] = useState<{
    type: 'success' | 'error';
    text: string;
    code?: string;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss scan notification toast
  useEffect(() => {
    if (!scanToast) return;
    const timer = setTimeout(() => {
      setScanToast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [scanToast]);

  // Global F2 keyboard shortcut to focus barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Barcode search & cart insertion engine
  const handleProcessBarcode = useCallback((codeOrQuery: string, multiplier: number = 1): { 
    success: boolean; 
    message: string; 
    productName?: string 
  } => {
    const clean = codeOrQuery.trim();
    if (!clean) return { success: false, message: 'Código vacío' };

    // Check if user or cashier typed multiplier like "3*7791234" or "3x7791234"
    let qty = multiplier;
    let targetCode = clean;
    const multMatch = clean.match(/^(\d+)\s*[*xX]\s*(.+)$/);
    if (multMatch) {
      qty = parseInt(multMatch[1], 10) || 1;
      targetCode = multMatch[2].trim();
    }

    // Look for exact match by barcode or SKU
    let matchedProduct = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === targetCode.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase() === targetCode.toLowerCase())
    );

    // Fallback search ignoring spaces/dashes
    if (!matchedProduct) {
      const sanitized = targetCode.replace(/[\s-]+/g, '').toLowerCase();
      matchedProduct = products.find(p =>
        (p.barcode && p.barcode.replace(/[\s-]+/g, '').toLowerCase() === sanitized) ||
        (p.sku && p.sku.replace(/[\s-]+/g, '').toLowerCase() === sanitized)
      );
    }

    // Fallback: if single word and matches exactly one product name
    if (!matchedProduct && targetCode.length >= 3) {
      const nameMatches = products.filter(p => p.name.toLowerCase().includes(targetCode.toLowerCase()));
      if (nameMatches.length === 1) {
        matchedProduct = nameMatches[0];
      }
    }

    if (!matchedProduct) {
      soundEngine.playErrorBeep();
      setScanToast({
        type: 'error',
        text: `Código no encontrado: "${targetCode}"`,
        code: targetCode
      });
      return {
        success: false,
        message: `No se encontró ningún artículo con código: ${targetCode}`
      };
    }

    // Check stock availability
    if (matchedProduct.stock <= 0) {
      soundEngine.playErrorBeep();
      setScanToast({
        type: 'error',
        text: `Sin stock: "${matchedProduct.name}" (Disponible: 0)`,
        code: targetCode
      });
      return {
        success: false,
        productName: matchedProduct.name,
        message: `Artículo agotado sin stock: ${matchedProduct.name}`
      };
    }

    // Add to cart N times
    for (let i = 0; i < qty; i++) {
      addToCart(matchedProduct);
    }

    soundEngine.playSuccessBeep();
    setScanToast({
      type: 'success',
      text: `+${qty} ${matchedProduct.name} (${formatCurrency(matchedProduct.sellingPrice * qty)})`,
      code: matchedProduct.barcode || matchedProduct.sku
    });

    return {
      success: true,
      productName: matchedProduct.name,
      message: `Agregado al ticket: ${qty}x ${matchedProduct.name}`
    };
  }, [products, addToCart]);

  // Execute manual scan from the input field
  const handleExecuteBarcodeScan = () => {
    if (!barcodeInput.trim()) return;
    handleProcessBarcode(barcodeInput);
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteBarcodeScan();
    }
  };

  // Selected customer & discount computation
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerCategory = selectedCustomer
    ? customerCategories.find(cat => cat.id === selectedCustomer.categoryId)
    : null;
  const discountPercentage = customerCategory ? customerCategory.discountPercentage : 0;

  // Cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = Math.round((subtotal * (discountPercentage / 100)) * 100) / 100;
  const totalAmount = subtotal - discountAmount;

  // Execute sale
  const handleCompleteSale = () => {
    setPosError(null);

    if (cart.length === 0) {
      setPosError('El carrito se encuentra vacío.');
      return;
    }

    const res = processSale(
      selectedCustomerId || undefined,
      paymentMethod,
      (paymentMethod === 'bank_card' || paymentMethod === 'bank_transfer') ? bankAccountId : undefined
    );

    if (!res.success) {
      setPosError(res.error || 'Error al procesar la venta');
      return;
    }

    if (res.sale) {
      setLastSale(res.sale);
      setIsTicketModalOpen(true);
      // Reset customer selector for next sale
      setSelectedCustomerId('');
    }
  };

  // Print Ticket
  const handlePrintTicket = (sale: Sale) => {
    const logoHtml = storeSettings.logoUrl
      ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${storeSettings.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 140px; object-fit: contain; display: inline-block;" /></div>`
      : '';

    const html = `
      <div style="font-family: monospace; font-size: 13px; max-width: 320px; margin: 0 auto; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          ${logoHtml}
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">${storeSettings.name}</h2>
          ${storeSettings.address ? `<p style="margin: 2px 0; font-size: 11px;">${storeSettings.address}</p>` : ''}
          ${storeSettings.phone ? `<p style="margin: 2px 0; font-size: 11px;">Tel: ${storeSettings.phone}</p>` : ''}
          ${storeSettings.taxId ? `<p style="margin: 2px 0; font-size: 11px;">CUIT: ${storeSettings.taxId} &bull; IVA RESPONSABLE</p>` : ''}
          <p style="margin: 4px 0 2px 0; font-size: 10px; font-weight: bold;">${storeSettings.ticketHeader || 'TICKET COMPROBANTE NO FISCAL'}</p>
        </div>

        <div style="margin-bottom: 10px; font-size: 12px;">
          <p style="margin: 2px 0;"><strong>TICKET Nº:</strong> ${sale.ticketNumber}</p>
          <p style="margin: 2px 0;"><strong>FECHA:</strong> ${new Date(sale.date).toLocaleDateString()} ${new Date(sale.date).toLocaleTimeString()}</p>
          <p style="margin: 2px 0;"><strong>CAJERO:</strong> ${sale.cashierName}</p>
          <p style="margin: 2px 0;"><strong>CLIENTE:</strong> ${sale.customerName}</p>
          ${sale.customerTaxId ? `<p style="margin: 2px 0;"><strong>CUIT/DNI:</strong> ${sale.customerTaxId}</p>` : ''}
          <p style="margin: 2px 0;"><strong>FORMA DE PAGO:</strong> ${
            sale.paymentMethod === 'cash' ? 'EFECTIVO' :
            sale.paymentMethod === 'credit' ? 'CUENTA CORRIENTE' :
            sale.paymentMethod === 'bank_card' ? 'TARJETA DE DÉBITO/CRÉDITO' : 'TRANSFERENCIA BANCARIA'
          }</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px dashed #000; border-top: 1px dashed #000; text-align: left;">
              <th style="padding: 4px 0;">CANT &bull; ARTÍCULO</th>
              <th style="padding: 4px 0; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td style="padding: 3px 0;">
                  ${Number(item.quantity).toFixed(2)} x ${item.productName}<br/>
                  <span style="font-size: 10px; color: #555;">P.U: ${formatCurrency(item.unitPrice)}</span>
                </td>
                <td style="padding: 3px 0; text-align: right; vertical-align: top;">
                  ${formatCurrency(item.subtotal)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 1px dashed #000; padding-top: 6px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>Subtotal:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
          </div>
          ${sale.discountAmount && sale.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 3px 0; color: #2e7d32;">
              <span>Descuento Cat. (${sale.discountPercentage}%):</span>
              <span>-${formatCurrency(sale.discountAmount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin: 6px 0; font-size: 16px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0;">
            <span>TOTAL FINAL:</span>
            <span>${formatCurrency(sale.totalAmount)}</span>
          </div>
          <p style="font-size: 10px; text-align: center; margin: 10px 0 0 0;">
            Precios finales sin discriminación de IVA.<br/>
            ${storeSettings.ticketFooter || '¡Gracias por su compra! Vuelva pronto.'}
          </p>
        </div>
      </div>
    `;
    printHtmlDocument(`Ticket_${sale.ticketNumber}`, html);
  };

  // Filtered products catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesSubGroup = selectedSubGroup === 'all' || p.subGroupId === selectedSubGroup;
    return matchesSearch && matchesSubGroup;
  });

  return (
    <div className="space-y-6">
      {/* Turno Alert */}
      {!currentShift && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>Atención:</strong> No tienes un turno de caja abierto en este momento. Las ventas se registrarán en la contabilidad general pero no computarán en tu arqueo por turno.
            </span>
          </div>
        </div>
      )}

      {/* Main POS Interface (Catalog Left 7 cols, Cart Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Catalog & Quick Barcode Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] space-y-3">
            {/* CARGA RÁPIDA POR CÓDIGO DE BARRAS & CÁMARA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Input para pistola USB / Lector óptico o tipeo rápido */}
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-400">
                  <Barcode className="w-4 h-4" />
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Escanear código de barras o ej: 3*779... [F2]"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  className="w-full pl-9 pr-20 py-2.5 bg-[#0A0A0B] border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExecuteBarcodeScan}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    title="Cargar código de barras al carrito"
                  >
                    <span>Cargar</span>
                  </button>
                </div>
              </div>

              {/* Botón Escanear con Cámara */}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-3.5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 active:scale-95 cursor-pointer"
                title="Abrir lector de código de barras con cámara web o del celular"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Escanear con Cámara</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>
            </div>

            {/* Scan Feedback Banner / Toast */}
            {scanToast && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all animate-in fade-in duration-150 ${
                  scanToast.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {scanToast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-semibold truncate">{scanToast.text}</span>
                </div>
                {scanToast.code && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400 shrink-0 ml-2">
                    {scanToast.code}
                  </span>
                )}
              </div>
            )}

            {/* Búsqueda tradicional por nombre/SKU & Filtro de Sub-Grupos */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#27272A]/70">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filtrar catálogo visual por nombre, SKU..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredProducts.length === 1) {
                      addToCart(filteredProducts[0]);
                      soundEngine.playSuccessBeep();
                      setSearchTerm('');
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedSubGroup}
                onChange={e => setSelectedSubGroup(e.target.value)}
                className="px-3 py-1.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos los Sub-Grupos</option>
                {subGroups.map(sg => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={openStoreSettingsModal}
                className="px-3 py-1.5 bg-[#0A0A0B] hover:bg-[#1F1F23] border border-[#27272A] hover:border-emerald-500/40 rounded-xl text-xs text-zinc-300 flex items-center gap-1.5 transition-colors shrink-0"
                title="Configurar Logo y Nombre del Puesto de Venta para los Tickets"
              >
                {storeSettings.logoUrl ? (
                  <img
                    src={storeSettings.logoUrl}
                    alt="Logo"
                    className="w-4 h-4 rounded object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="max-w-[110px] truncate font-medium hidden sm:inline">{storeSettings.name}</span>
              </button>
            </div>
          </div>

          {/* Grid de Productos con clic para agregar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredProducts.map(p => {
              const inStock = p.stock > 0;
              const cartItem = cart.find(ci => ci.product.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => inStock && addToCart(p)}
                  className={`
                    p-3 rounded-xl border text-left flex flex-col justify-between transition-all select-none
                    ${inStock
                      ? 'bg-[#16161A] border-[#27272A] hover:border-emerald-500/60 cursor-pointer active:scale-95'
                      : 'bg-[#16161A]/40 border-zinc-900 opacity-60 cursor-not-allowed'
                    }
                  `}
                >
                  <div>
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black mb-2 border border-zinc-800">
                      <img
                        src={p.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&auto=format&fit=crop&q=80'}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      {cartItem && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-black font-black text-[10px]">
                          x{Number(cartItem.quantity).toFixed(2)}
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-white line-clamp-2 leading-tight">{p.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">SKU: {p.sku}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className={`text-[10px] font-mono ${p.stock <= 5 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {inStock ? `Stock: ${Number(p.stock).toFixed(2)}` : 'Agotado'}
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {formatCurrency(p.sellingPrice)}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full p-8 text-center bg-[#16161A] rounded-xl border border-[#27272A] text-zinc-500 text-xs">
                No hay productos que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-[#16161A] rounded-2xl border border-[#27272A] overflow-hidden shadow-2xl">
          {/* Cart Header */}
          <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Ticket de Venta en Curso ({cart.length})
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Vaciar Carrito</span>
              </button>
            )}
          </div>

          {/* Customer selection with automatic category discount */}
          <div className="p-4 border-b border-[#27272A] bg-[#0A0A0B]/60 space-y-2">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Cliente & Descuento Automático
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Consumidor Final (Sin descuento de categoría)</option>
              {customers.map(c => {
                const cat = customerCategories.find(cat => cat.id === c.categoryId);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {cat ? `[${cat.name} -${cat.discountPercentage}%]` : ''} &bull; Límite: {formatCurrency(c.creditLimit)}
                  </option>
                );
              })}
            </select>

            {selectedCustomer && (
              <div className="p-2.5 rounded-lg bg-[#16161A] border border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Categoría & Beneficio:</span>
                  <span className="text-emerald-400 font-bold">
                    {customerCategory ? `${customerCategory.name} (-${customerCategory.discountPercentage}%)` : 'Sin categoría asignada'}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Límite Crédito Cta. Cte:</span>
                  <span className="text-zinc-200">{formatCurrency(selectedCustomer.creditLimit)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Saldo Adeudado Actual:</span>
                  <span className={selectedCustomer.currentBalance > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {formatCurrency(selectedCustomer.currentBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cart items list */}
          <div className="flex-1 p-4 space-y-2.5 max-h-[300px] overflow-y-auto">
            {cart.map(item => (
              <div key={item.product.id} className="p-2.5 rounded-xl bg-[#0A0A0B] border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex-1 pr-2">
                  <p className="font-bold text-white text-xs truncate">{item.product.name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-700">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, Math.max(0.01, +(item.quantity - 1).toFixed(2)))}
                      className="p-1 text-zinc-400 hover:text-white"
                      title="Disminuir unidad (-1.00)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          updateCartQuantity(item.product.id, +val.toFixed(2));
                        }
                      }}
                      className="w-14 text-center font-mono font-bold text-white text-xs bg-transparent focus:outline-none"
                      title="Ingresar cantidad exacta con dos decimales"
                    />
                    <button
                      onClick={() => updateCartQuantity(item.product.id, Math.min(item.product.stock, +(item.quantity + 1).toFixed(2)))}
                      className="p-1 text-zinc-400 hover:text-white"
                      title="Aumentar unidad (+1.00)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-mono font-bold text-emerald-400 text-xs w-16 text-right">
                    {formatCurrency(item.subtotal)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Haz clic sobre los productos del catálogo para armar el pedido.
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="p-4 border-t border-[#27272A] bg-[#0A0A0B]/40 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Medio de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                      : 'bg-[#16161A] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Efectivo (Caja)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_card')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'bank_card'
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                      : 'bg-[#16161A] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Tarjeta / POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                      : 'bg-[#16161A] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Transferencia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'credit'
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                      : 'bg-[#16161A] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Cta. Corriente (Crédito)</span>
                </button>
              </div>
            </div>

            {(paymentMethod === 'bank_card' || paymentMethod === 'bank_transfer') && (
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase mb-1">Cuenta Bancaria Receptora</label>
                <select
                  value={bankAccountId}
                  onChange={e => setBankAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#16161A] border border-zinc-800 rounded-lg text-xs text-white"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Error banner */}
            {posError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{posError}</span>
              </div>
            )}

            {/* Totales */}
            <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} unidades):</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Descuento Categoría ({discountPercentage}%):</span>
                  <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-zinc-800/60">
                <span>Total a Cobrar:</span>
                <span className="font-mono text-emerald-400 text-lg">{formatCurrency(totalAmount)}</span>
              </div>
              <p className="text-[10px] text-zinc-500 text-right">Precios finales sin discriminación de IVA</p>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              className={`
                w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg
                ${cart.length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 active:scale-95'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }
              `}
            >
              <Receipt className="w-4 h-4" />
              <span>EMITIR VENTA & GENERAR TICKET</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Ticket de Venta Emitido */}
      {isTicketModalOpen && lastSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">¡Venta Registrada con Éxito!</h3>
              </div>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-[#0A0A0B] p-4 rounded-xl border border-zinc-800 font-mono text-xs space-y-2">
                <div className="text-center pb-2 border-b border-zinc-800">
                  {storeSettings.logoUrl && (
                    <div className="flex justify-center mb-1.5">
                      <img
                        src={storeSettings.logoUrl}
                        alt="Logo"
                        className="max-h-10 max-w-[110px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <p className="font-bold text-white text-sm uppercase tracking-tight">{storeSettings.name}</p>
                  {storeSettings.taxId && (
                    <p className="text-[10px] text-zinc-400">CUIT: {storeSettings.taxId}</p>
                  )}
                  <p className="text-[10px] text-zinc-500">{lastSale.ticketNumber}</p>
                </div>

                <div className="space-y-1 text-[11px] text-zinc-300">
                  <p><strong>Fecha:</strong> {new Date(lastSale.date).toLocaleDateString()} {new Date(lastSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Cliente:</strong> {lastSale.customerName}</p>
                  <p><strong>Forma:</strong> {lastSale.paymentMethod.toUpperCase()}</p>
                  <p><strong>Cajero:</strong> {lastSale.cashierName}</p>
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-1 text-xs">
                  {lastSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[170px]">{Number(it.quantity).toFixed(2)}x {it.productName}</span>
                      <span>{formatCurrency(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {lastSale.discountAmount && lastSale.discountAmount > 0 ? (
                  <div className="pt-2 border-t border-zinc-800 flex justify-between text-emerald-400 text-xs">
                    <span>Descuento ({lastSale.discountPercentage}%):</span>
                    <span>-{formatCurrency(lastSale.discountAmount)}</span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-white text-sm">
                  <span>TOTAL FINAL:</span>
                  <span className="text-emerald-400">{formatCurrency(lastSale.totalAmount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintTicket(lastSale)}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ticket</span>
                </button>
                <button
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2.5 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cerrar
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTicketModalOpen(false);
                  openStoreSettingsModal();
                }}
                className="w-full py-1.5 bg-[#0A0A0B] hover:bg-[#121215] text-zinc-400 hover:text-zinc-200 text-[11px] rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>Personalizar Logo o Nombre del Puesto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Escáner con Cámara Web / Celular */}
      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onBarcodeScanned={handleProcessBarcode}
      />
    </div>
  );
};
