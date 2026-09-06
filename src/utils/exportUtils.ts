// Utilidades de exportación a Excel (CSV con UTF-8 BOM compatible 100% con Microsoft Excel y Google Sheets)
// e impresión / PDF directo

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: { key: keyof T | string; header: string; format?: (value: any, row: T) => string }[]
) {
  if (!data || !data.length) {
    alert('No hay datos para exportar con los filtros seleccionados.');
    return;
  }

  const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(';');
  const rows = data.map(row => {
    return columns
      .map(c => {
        let val = (row as any)[c.key];
        if (c.format) {
          val = c.format(val, row);
        } else if (val === null || val === undefined) {
          val = '';
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(';');
  });

  // \uFEFF añade BOM UTF-8 para que Excel reconozca tildes y caracteres en español correctamente
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printHtmlDocument(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para imprimir o generar PDF.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111;
          margin: 20px;
          background: #fff;
          font-size: 13px;
        }
        h1, h2, h3 { margin-bottom: 6px; }
        .header { border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
        th { background-color: #f4f4f5; font-weight: 600; text-transform: uppercase; font-size: 11px; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; background: #eee; }
        .footer { margin-top: 30px; font-size: 11px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print {
          body { margin: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <div class="footer">Documento emitido por AI QuickStock - Sistema de Gestión Contable, Inventario & CRM</div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatQuantity(qty: number | undefined | null): string {
  if (qty === undefined || qty === null || isNaN(qty)) return '0.00';
  return Number(qty).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
