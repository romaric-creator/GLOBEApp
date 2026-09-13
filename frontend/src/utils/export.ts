import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Données') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  columns: { header: string; dataKey: string }[],
  data: Record<string, unknown>[],
  filename: string,
  title: string,
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exporte le ${new Date().toLocaleDateString('fr-FR')}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => String(row[c.dataKey] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [28, 28, 28] },
  });

  doc.save(`${filename}.pdf`);
}
