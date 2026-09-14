import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, SubGroup, CustomerCategory } from '../types';
import { formatCurrency, formatQuantity } from './exportUtils';

export interface PriceListPdfOptions {
  categoryName: string;
  discountPercentage: number;
  subGroupName: string;
  products: Product[];
  companyName?: string;
  logoUrl?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export function generatePriceListPdf(options: PriceListPdfOptions) {
  const {
    categoryName,
    discountPercentage,
    subGroupName,
    products,
    companyName = 'AI QuickStock',
    logoUrl,
    taxId,
    address,
    phone,
    email
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currentDate = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Header Banner
  doc.setFillColor(22, 22, 26);
  doc.rect(0, 0, 210, 36, 'F');

  // Accent Line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 36, 210, 2, 'F');

  let textStartX = 14;
  // If logo exists and is base64
  if (logoUrl && logoUrl.startsWith('data:image/')) {
    try {
      const format = logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoUrl, format, 14, 5, 26, 26);
      textStartX = 45;
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), textStartX, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text('LISTA OFICIAL DE PRECIOS POR CATEGORÍA', textStartX, 19);

  const contactLine = [
    taxId ? `CUIT: ${taxId}` : '',
    address || '',
    phone ? `Tel: ${phone}` : '',
    email ? `Email: ${email}` : ''
  ].filter(Boolean).slice(0, 2).join(' | ');

  if (contactLine) {
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 150);
    doc.text(contactLine, textStartX, 25);
  }

  // Date top right
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);
  doc.text(`Emisión: ${currentDate}`, 196, 13, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(161, 161, 170);
  doc.text(`Validez: Precios sujetos a cambio`, 196, 19, { align: 'right' });
  if (taxId) {
    doc.text(`IVA Responsable Inscripto`, 196, 25, { align: 'right' });
  }

  // Metadata Panel
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(14, 42, 182, 18, 2, 2, 'F');

  doc.setTextColor(24, 24, 27);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Categoría de Cliente: ${categoryName}`, 18, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  const discountLabel = discountPercentage > 0 
    ? `Descuento automático aplicado: -${discountPercentage}% s/precio lista`
    : 'Precio de Lista Base General (0% descuento)';
  doc.text(discountLabel, 18, 55);

  // Filter Group on right side of panel
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text(`Grupo: ${subGroupName}`, 192, 49, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Artículos: ${products.length}`, 192, 55, { align: 'right' });

  // Prepare table data
  const tableRows = products.map((p, index) => {
    const basePrice = p.sellingPrice;
    const discount = discountPercentage;
    const finalPrice = Math.round(basePrice * (1 - discount / 100) * 100) / 100;

    return [
      p.sku || `#${index + 1}`,
      p.name,
      p.subGroupName || 'General',
      `${formatQuantity(p.stock)} un.`,
      formatCurrency(basePrice),
      discount > 0 ? `-${discount}%` : '0%',
      formatCurrency(finalPrice)
    ];
  });

  autoTable(doc, {
    startY: 64,
    head: [['SKU / Cód.', 'Descripción del Artículo', 'Grupo', 'Stock', 'P. Lista', 'Desc.', 'Precio Final']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [39, 39, 42],
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 27, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } // emerald-600
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageCurrent = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(161, 161, 170);
      doc.text(
        `Página ${pageCurrent} de ${pageCount} - Generado por ${companyName}`,
        105,
        290,
        { align: 'center' }
      );
    }
  });

  // Save the PDF file directly to downloads
  const cleanCategory = categoryName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDate = new Date().toISOString().split('T')[0];
  doc.save(`Lista_Precios_${cleanCategory}_${cleanDate}.pdf`);
}
