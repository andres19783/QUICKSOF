import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Customer, Sale } from '../types';
import { formatCurrency, printHtmlDocument } from '../utils/exportUtils';
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
  Landmark
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
    currentUser
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_card' | 'bank_transfer' | 'credit'>('cash');
  const [bankAccountId, setBankAccountId] = useState<string>(bankAccounts[0]?.id || '');

  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

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
    const html = `
      <div style="font-family: monospace; font-size: 13px; max-width: 320px; margin: 0 auto; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 18px;">AI QUICKSTOCK STORE</h2>
          <p style="margin: 3px 0;">SISTEMA DE GESTIÓN CONTABLE, INVENTARIOS & CRM</p>
          <p style="margin: 3px 0;">CUIT: 30-71928391-4 &bull; IVA RESPONSABLE</p>
          <p style="margin: 3px 0;">TICKET COMPROBANTE NO FISCAL</p>
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
            Precios finales finales sin discriminación de IVA.<br/>
            ¡Gracias por su compra!
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
        {/* Left: Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#16161A] p-4 rounded-xl border border-[#27272A] space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Escanear código de barras o buscar producto..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedSubGroup}
                onChange={e => setSelectedSubGroup(e.target.value)}
                className="px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos los Sub-Grupos</option>
                {subGroups.map(sg => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>
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
                  <p className="font-bold text-white text-sm">AI QUICKSTOCK STORE</p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
