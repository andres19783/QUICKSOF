import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Building2, 
  Tag, 
  Package, 
  Percent, 
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { formatCurrency } from '../utils/exportUtils';
import { Product, Supplier } from '../types';
import { generateUniqueId } from '../utils/idUtils';

interface ExtractedInvoiceData {
  supplier?: {
    name?: string;
    taxId?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  invoiceNumber?: string;
  date?: string;
  paymentMethod?: 'cash' | 'credit' | 'bank_transfer';
  items?: Array<{
    description: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxPercent?: number;
    netUnitCost: number;
    subtotal: number;
  }>;
  totalAmount?: number;
}

interface AIInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIInvoiceModal: React.FC<AIInvoiceModalProps> = ({ isOpen, onClose }) => {
  const { 
    suppliers, 
    addSupplier, 
    products, 
    addProduct, 
    subGroups, 
    bankAccounts, 
    recordSupplierInvoice 
  } = useApp();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);

  // Status tracking during invoice commitment
  const [isProcessingDb, setIsProcessingDb] = useState(false);
  const [processSuccessMessage, setProcessSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen (JPG, PNG, WEBP).');
      return;
    }

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setExtractedData(null);
      setAnalysisError(null);
      setProcessSuccessMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiAnalysis = async () => {
    if (!imagePreview) {
      alert('Sube una imagen de factura primero.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setProcessSuccessMessage(null);

    try {
      const response = await fetch('/api/invoice/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType
        })
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Error al procesar la imagen con Gemini');
      }

      setExtractedData(resJson.data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Ocurrió un error al contactar el servicio de Inteligencia Artificial.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndSaveToDb = async () => {
    if (!extractedData) return;

    setIsProcessingDb(true);
    setAnalysisError(null);

    try {
      // 1. GESTIÓN DE PROVEEDOR EN BASE DE DATOS REAL
      const rawSupplier = extractedData.supplier || {};
      const supName = (rawSupplier.name || 'Proveedor Factura IA').trim();
      const supTaxId = (rawSupplier.taxId || `CUIT-${Date.now().toString().slice(-6)}`).trim();

      // Consultar si el proveedor ya existe en la BD
      let targetSupplier = suppliers.find(s => 
        (supTaxId && s.taxId.toLowerCase() === supTaxId.toLowerCase()) ||
        s.name.toLowerCase() === supName.toLowerCase()
      );

      if (!targetSupplier) {
        // No existe: Insertar automáticamente en la base de datos de proveedores
        const createdSupplier = addSupplier({
          name: supName,
          taxId: supTaxId,
          phone: rawSupplier.phone || '',
          email: rawSupplier.email || '',
          address: rawSupplier.address || '',
          notes: 'Creado automáticamente mediante IA desde Factura de Compra'
        });
        targetSupplier = createdSupplier;
      }

      // 2. PROCESAMIENTO DE ÍTEMS, DESCUENTOS, IVA Y COINCIDENCIA CON ARTÍCULOS REALES
      const invoiceItems = extractedData.items || [];
      if (invoiceItems.length === 0) {
        throw new Error('La IA no detectó ítems en la factura procesada.');
      }

      const defaultSubGroup = subGroups[0] || {
        id: 'sub-general',
        name: 'General',
        utilityPercentage: 35
      };

      const finalInvoiceItems: any[] = [];

      for (const item of invoiceItems) {
        // Cálculo del costo unitario neto individual aplicando descuentos e IVA
        const quantity = Number(item.quantity) || 1;
        const grossUnitPrice = Number(item.unitPrice) || 0;
        const discountPct = Number(item.discountPercent) || 0;
        const taxPct = Number(item.taxPercent) || 0;

        let computedNetUnitCost = Number(item.netUnitCost);
        if (!computedNetUnitCost || isNaN(computedNetUnitCost)) {
          // Calcular: Precio bruto - Descuento + IVA
          const afterDiscount = grossUnitPrice * (1 - discountPct / 100);
          computedNetUnitCost = afterDiscount * (1 + taxPct / 100);
        }
        computedNetUnitCost = Math.round(computedNetUnitCost * 100) / 100;
        const itemSubtotal = Math.round(quantity * computedNetUnitCost * 100) / 100;

        // COINCIDENCIA CON PRODUCTOS EXISTENTES EN BD
        let matchedProduct: Product | undefined = products.find(p => 
          p.name.toLowerCase().trim() === item.description.toLowerCase().trim() ||
          (item.sku && p.sku.toLowerCase() === item.sku.toLowerCase())
        );

        // Si no hay coincidencia exacta, consultar a la IA para fuzzy matching contra la tabla real
        if (!matchedProduct && products.length > 0) {
          try {
            const matchRes = await fetch('/api/invoice/match-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceItemName: item.description,
                existingProducts: products.slice(0, 50)
              })
            });
            const matchData = await matchRes.json();
            if (matchData.matchedProductId) {
              matchedProduct = products.find(p => p.id === matchData.matchedProductId);
            }
          } catch (e) {
            console.log('Fuzzy match skipped:', e);
          }
        }

        let finalProductId = '';
        let finalProductName = item.description;

        if (matchedProduct) {
          // El producto existe: usamos su ID para la factura y actualizará stock y costo
          finalProductId = matchedProduct.id;
          finalProductName = matchedProduct.name;
        } else {
          // Si el artículo no coincide con ninguno existente, generarlo e insertarlo automáticamente en la BD
          const generatedSku = item.sku || `ART-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;
          const sellingMargin = defaultSubGroup.utilityPercentage || 35;
          const calculatedSellingPrice = Math.round(computedNetUnitCost * (1 + sellingMargin / 100) * 100) / 100;

          const createdProduct = addProduct({
            name: item.description,
            sku: generatedSku,
            subGroupId: defaultSubGroup.id,
            subGroupName: defaultSubGroup.name,
            supplierId: targetSupplier.id,
            supplierName: targetSupplier.name,
            costPrice: computedNetUnitCost,
            sellingPrice: calculatedSellingPrice,
            stock: 0, // El stock se incrementará al asentar la factura
            minStock: 5,
            description: `Auto-creado desde Factura IA (${extractedData.invoiceNumber || 'S/N'})`
          });

          finalProductId = createdProduct.id;
        }

        finalInvoiceItems.push({
          productId: finalProductId,
          productName: finalProductName,
          quantity,
          unitCost: computedNetUnitCost,
          subtotal: itemSubtotal
        });
      }

      // 3. REGISTRAR FACTURA DE COMPRA EN BASE DE DATOS
      const totalAmount = finalInvoiceItems.reduce((acc, it) => acc + it.subtotal, 0);
      const invoiceNumber = (extractedData.invoiceNumber || `FAC-${Date.now().toString().slice(-6)}`).trim();
      const invoiceDate = extractedData.date ? new Date(extractedData.date).toISOString() : new Date().toISOString();
      const paymentMethod = extractedData.paymentMethod || 'credit';

      recordSupplierInvoice({
        invoiceNumber,
        supplierId: targetSupplier.id,
        supplierName: targetSupplier.name,
        date: invoiceDate,
        totalAmount,
        paymentMethod,
        bankAccountId: paymentMethod === 'bank_transfer' ? bankAccounts[0]?.id : undefined,
        paymentStatus: paymentMethod === 'credit' ? 'pending' : 'paid',
        notes: `Procesada e ingresada automáticamente por Gemini AI desde imagen real.`,
        items: finalInvoiceItems
      });

      setProcessSuccessMessage(`¡Factura ${invoiceNumber} registrada exitosamente en la base de datos! Proveedor y productos vinculados.`);
      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Error al asentar la factura en la base de datos.');
    } finally {
      setIsProcessingDb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto font-sans text-sm">
      <div className="bg-[#121215] border border-zinc-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-[#16161A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Procesamiento Inteligente de Facturas (IA Gemini)
              </h3>
              <p className="text-xs text-zinc-400">
                Extracción automática de datos reales, alta de proveedor, cálculo neto de ítems e inserción en base de datos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {processSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-sm flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs uppercase tracking-wider">Operación Completada</p>
                <p className="text-xs text-emerald-300 mt-0.5">{processSuccessMessage}</p>
              </div>
            </div>
          )}

          {analysisError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 text-xs flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-white uppercase tracking-wider">Error de Procesamiento</p>
                <p className="text-rose-300 mt-0.5">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Upload Area & Image Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                1. Subir Imagen Real de Factura o Ticket
              </label>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  imagePreview 
                    ? 'border-emerald-500/50 bg-emerald-950/10' 
                    : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-white">Haz clic o arrastra tu imagen aquí</p>
                <p className="text-[11px] text-zinc-500 mt-1">Soporta JPG, PNG, WEBP (Facturas A, B, C, Tickets de compra)</p>
              </div>

              {imagePreview && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analizando con Gemini IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extraer Datos con Inteligencia Artificial</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setExtractedData(null);
                    }}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* Visualizer of the uploaded invoice */}
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-3 flex flex-col items-center justify-center min-h-[200px] max-h-[300px] overflow-hidden">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Factura subida"
                  className="max-h-[280px] w-auto object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-center text-zinc-600 p-6">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Vista previa de la factura</p>
                </div>
              )}
            </div>
          </div>

          {/* Results table if extracted */}
          {extractedData && (
            <div className="space-y-4 pt-4 border-t border-zinc-800 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  2. Datos Extraídos por la IA (Listos para sincronizar a Base de Datos)
                </h4>
              </div>

              {/* Extracted Supplier Banner */}
              <div className="bg-[#18181C] p-4 rounded-xl border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px] uppercase font-semibold">Proveedor Detectado</span>
                  <span className="font-bold text-white text-sm">{extractedData.supplier?.name || 'S/N'}</span>
                  <span className="block text-zinc-400 font-mono text-[11px]">CUIT/Tax ID: {extractedData.supplier?.taxId || 'No especificado'}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[11px] uppercase font-semibold">Factura & Fecha</span>
                  <span className="font-bold text-white font-mono">{extractedData.invoiceNumber || 'Sin número'}</span>
                  <span className="block text-zinc-400 text-[11px]">{extractedData.date || 'Fecha actual'}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[11px] uppercase font-semibold">Monto Total Facturado</span>
                  <span className="font-black text-emerald-400 text-base font-mono">
                    {formatCurrency(extractedData.totalAmount || 0)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-[#18181C] rounded-xl border border-zinc-800 overflow-hidden">
                <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-white uppercase tracking-wider">
                    Artículos Desglosados con Descuentos e Impuestos ({extractedData.items?.length || 0})
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-800">
                        <th className="p-3">Descripción Artículo</th>
                        <th className="p-3 text-center">Cant.</th>
                        <th className="p-3 text-right">Precio Bruto</th>
                        <th className="p-3 text-center">% Desc.</th>
                        <th className="p-3 text-center">% IVA</th>
                        <th className="p-3 text-right">Costo Neto Final</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-sans">
                      {extractedData.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-zinc-800/40">
                          <td className="p-3 text-white font-medium">
                            {item.description}
                            {item.sku && <span className="block text-[10px] text-zinc-500 font-mono">SKU: {item.sku}</span>}
                          </td>
                          <td className="p-3 text-center font-mono">{item.quantity}</td>
                          <td className="p-3 text-right font-mono text-zinc-400">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-3 text-center font-mono text-amber-400">{item.discountPercent ? `${item.discountPercent}%` : '-'}</td>
                          <td className="p-3 text-center font-mono text-blue-400">{item.taxPercent ? `${item.taxPercent}%` : '-'}</td>
                          <td className="p-3 text-right font-mono text-emerald-400 font-bold">{formatCurrency(item.netUnitCost)}</td>
                          <td className="p-3 text-right font-mono text-white font-bold">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action save to database */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-zinc-300">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Inserción Directa en Base de Datos Real
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Si el proveedor no existe, se creará automáticamente. Los artículos que no coincidan serán creados en el catálogo y se actualizará el stock y costo.
                  </p>
                </div>

                <button
                  onClick={handleConfirmAndSaveToDb}
                  disabled={isProcessingDb}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {isProcessingDb ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar e Insertar en Base de Datos</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#16161A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
