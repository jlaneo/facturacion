import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Invoice, PurchaseInvoice } from '../types';
import { formatCurrency } from './utils';

// Function to export data to CSV
export const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header], (_, value) => value === null ? '' : value)).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// Function to export data to PDF
export const exportListToPDF = (columns: { header: string, dataKey: string }[], data: any[], filename:string, title: string) => {
    if (data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');
    
    doc.setFontSize(16);
    doc.text(title, 14, 20);

    autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: data.map(row => columns.map(col => row[col.dataKey] ?? '')),
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [38, 41, 46], font: 'helvetica' },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
    });

    doc.save(`${filename}.pdf`);
};

// Function to generate and export an expense report to PDF
export const exportExpensesToPDF = (
    expenses: any[], // Using any[] to accommodate enriched data with category/supplier names
    startDate: string,
    endDate: string,
    settings: CompanySettings
) => {
    if (expenses.length === 0) {
        alert("No hay gastos para exportar en el rango seleccionado.");
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');
    
    const formatDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('es-ES');
    
    // Sort expenses by date
    expenses.sort((a, b) => 
        new Date(a.expense_date.replace(/-/g, '/')).getTime() - 
        new Date(b.expense_date.replace(/-/g, '/')).getTime()
    );


    // Header
    doc.setFontSize(16);
    doc.text('Informe de Gastos', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 26);
    doc.text(`Empresa: ${settings.name}`, 14, 32);

    // Table
    const tableColumns = [
        { header: 'Fecha', dataKey: 'expense_date' },
        { header: 'Descripción', dataKey: 'description' },
        { header: 'Categoría', dataKey: 'categoryName' },
        { header: 'Proveedor', dataKey: 'supplierName' },
        { header: 'Importe', dataKey: 'amount' },
    ];

    const tableRows = expenses.map(exp => ({
        expense_date: formatDate(exp.expense_date),
        description: exp.description,
        categoryName: exp.categoryName,
        supplierName: exp.supplierName,
        amount: formatCurrency(exp.amount),
    }));

    autoTable(doc, {
        head: [tableColumns.map(c => c.header)],
        body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], font: 'helvetica' },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
            4: { halign: 'right' } // Align amount to the right
        }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Gastos:', 14, finalY + 10);
    doc.text(formatCurrency(totalExpenses), doc.internal.pageSize.width - 14, finalY + 10, { align: 'right' });

    doc.save(`informe-gastos-${startDate}-a-${endDate}.pdf`);
};


// Function to generate and export a sales invoice report to PDF
export const exportSalesInvoicesToPDF = (
    invoices: (Invoice & { clientName: string })[],
    startDate: string,
    endDate: string,
    settings: CompanySettings
) => {
    if (invoices.length === 0) {
        alert("No hay facturas emitidas para exportar en el rango seleccionado.");
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');
    
    const formatDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('es-ES');
    
    // Sort invoices by invoice number, then by issue date
    invoices.sort((a, b) => {
        const numCompare = a.invoice_number.localeCompare(b.invoice_number);
        if (numCompare !== 0) return numCompare;
        return new Date(a.issue_date.replace(/-/g, '/')).getTime() - new Date(b.issue_date.replace(/-/g, '/')).getTime();
    });

    // Header
    doc.setFontSize(16);
    doc.text('Informe de Facturas Emitidas', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 26);
    doc.text(`Empresa: ${settings.name}`, 14, 32);

    // Table
    const tableColumns = [
        { header: 'Nº Factura', dataKey: 'invoice_number' },
        { header: 'Cliente', dataKey: 'clientName' },
        { header: 'Fecha', dataKey: 'issue_date' },
        { header: 'Subtotal', dataKey: 'subtotal' },
        { header: 'IVA', dataKey: 'tax' },
        { header: 'Total', dataKey: 'total' },
        { header: 'Estado', dataKey: 'status' },
    ];

    const tableRows = invoices.map(inv => ({
        invoice_number: inv.invoice_number,
        clientName: inv.clientName,
        issue_date: formatDate(inv.issue_date),
        subtotal: formatCurrency(inv.subtotal),
        tax: formatCurrency(inv.tax),
        total: formatCurrency(inv.total),
        status: inv.status,
    }));

    autoTable(doc, {
        head: [tableColumns.map(c => c.header)],
        body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], font: 'helvetica' }, // A professional blue
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
        }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0);
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen del Periodo', 14, finalY + 10);

    autoTable(doc, {
        body: [
            ['Subtotal:', formatCurrency(totalSubtotal)],
            [`IVA (${settings.iva}%):`, formatCurrency(totalTax)],
            ['Total Facturado:', formatCurrency(totalAmount)],
        ],
        startY: finalY + 13,
        theme: 'plain',
        tableWidth: 80,
        margin: { left: doc.internal.pageSize.width - 80 - 14 }, // Align table to the right
        styles: {
            fontSize: 10,
            font: 'helvetica',
        },
        columnStyles: {
            0: { halign: 'right' },
            1: { halign: 'right', fontStyle: 'bold' }
        },
    });

    doc.save(`informe-facturas-emitidas-${startDate}-a-${endDate}.pdf`);
};

// Function to generate and export a purchase invoice report to PDF
export const exportPurchaseInvoicesToPDF = (
    invoices: (PurchaseInvoice & { supplierName: string })[],
    startDate: string,
    endDate: string,
    settings: CompanySettings
) => {
    if (invoices.length === 0) {
        alert("No hay facturas de compra para exportar en el rango seleccionado.");
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');
    
    const formatDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('es-ES');
    
    // Sort invoices by invoice number, then by issue date
    invoices.sort((a, b) => {
        const numCompare = a.invoice_number.localeCompare(b.invoice_number);
        if (numCompare !== 0) return numCompare;
        return new Date(a.issue_date.replace(/-/g, '/')).getTime() - new Date(b.issue_date.replace(/-/g, '/')).getTime();
    });

    // Header
    doc.setFontSize(16);
    doc.text('Informe de Facturas Recibidas', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 26);
    doc.text(`Empresa: ${settings.name}`, 14, 32);

    // Table
    const tableColumns = [
        { header: 'Nº Factura', dataKey: 'invoice_number' },
        { header: 'Proveedor', dataKey: 'supplierName' },
        { header: 'Fecha', dataKey: 'issue_date' },
        { header: 'Subtotal', dataKey: 'subtotal' },
        { header: 'IVA', dataKey: 'tax' },
        { header: 'Total', dataKey: 'total' },
        { header: 'Estado', dataKey: 'status' },
    ];

    const tableRows = invoices.map(inv => ({
        invoice_number: inv.invoice_number,
        supplierName: inv.supplierName,
        issue_date: formatDate(inv.issue_date),
        subtotal: formatCurrency(inv.subtotal),
        tax: formatCurrency(inv.tax),
        total: formatCurrency(inv.total),
        status: inv.status,
    }));

    autoTable(doc, {
        head: [tableColumns.map(c => c.header)],
        body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60], font: 'helvetica' }, // A professional red/orange
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
        }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0);
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen del Periodo', 14, finalY + 10);

     autoTable(doc, {
        body: [
            ['Subtotal:', formatCurrency(totalSubtotal)],
            [`IVA Soportado:`, formatCurrency(totalTax)],
            ['Total Compras:', formatCurrency(totalAmount)],
        ],
        startY: finalY + 13,
        theme: 'plain',
        tableWidth: 80,
        margin: { left: doc.internal.pageSize.width - 80 - 14 },
        styles: {
            fontSize: 10,
            font: 'helvetica',
        },
        columnStyles: {
            0: { halign: 'right' },
            1: { halign: 'right', fontStyle: 'bold' }
        },
    });

    doc.save(`informe-facturas-recibidas-${startDate}-a-${endDate}.pdf`);
};

// --- NEW REPORT FUNCTIONS ---

// Income & Expense Report PDF
export const exportIncomeExpenseReportPDF = (
    reportData: { income: number; purchases: number; expenses: number; profit: number },
    startDate: string,
    endDate: string,
    settings: CompanySettings
) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    const formatDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('es-ES');

    doc.setFontSize(18);
    doc.text('Informe de Ingresos y Gastos', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 30);
    doc.text(`Empresa: ${settings.name}`, 14, 36);

    autoTable(doc, {
        startY: 50,
        theme: 'grid',
        head: [['Concepto', 'Importe']],
        body: [
            ['Total Ingresos (Base Imponible)', formatCurrency(reportData.income)],
            ['Total Compras (Base Imponible)', formatCurrency(reportData.purchases)],
            ['Total Otros Gastos', formatCurrency(reportData.expenses)],
        ],
        foot: [['Beneficio Bruto', formatCurrency(reportData.profit)]],
        headStyles: { fillColor: '#2c3e50', font: 'helvetica' },
        footStyles: { fillColor: '#34495e', fontStyle: 'bold', font: 'helvetica' },
        styles: { font: 'helvetica' },
        columnStyles: { 1: { halign: 'right' } }
    });

    doc.save(`informe-ingresos-y-gastos-${startDate}-a-${endDate}.pdf`);
};

// VAT Report PDF
export const exportVatReportPDF = (
    reportData: { salesVat: number; purchaseVat: number; expenseVat: number; totalVat: number },
    startDate: string,
    endDate: string,
    settings: CompanySettings
) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    const formatDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('es-ES');

    doc.setFontSize(18);
    doc.text('Informe de IVA', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 30);
    doc.text(`Empresa: ${settings.name}`, 14, 36);

    const resultText = reportData.totalVat >= 0 ? 'IVA a Ingresar' : 'IVA a Devolver';
    
    autoTable(doc, {
        startY: 50,
        theme: 'grid',
        head: [['Concepto', 'Importe']],
        body: [
            ['(+) IVA Repercutido (Ventas)', formatCurrency(reportData.salesVat)],
            ['(-) IVA Soportado (Compras)', formatCurrency(reportData.purchaseVat)],
            ['(-) IVA Soportado (Otros Gastos)', formatCurrency(reportData.expenseVat)],
        ],
        foot: [[resultText, formatCurrency(Math.abs(reportData.totalVat))]],
        headStyles: { fillColor: '#16a085', font: 'helvetica' },
        footStyles: { fillColor: '#1abc9c', fontStyle: 'bold', font: 'helvetica' },
        styles: { font: 'helvetica' },
        columnStyles: { 1: { halign: 'right' } }
    });
    
    doc.save(`informe-iva-${startDate}-a-${endDate}.pdf`);
};

// Top Clients & Products Report PDF
export const exportTopClientsReportPDF = (
    reportData: { topClients: { name: string; total: number }[], topProducts: { name: string; total: number }[] },
    startDate: string,
    endDate: string
) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    const formatDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('es-ES');

    doc.setFontSize(18);
    doc.text('Informe de Clientes y Productos', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 30);

    doc.setFontSize(14);
    doc.text('Top 10 Clientes por Facturación', 14, 45);
    autoTable(doc, {
        startY: 50,
        head: [['#', 'Cliente', 'Total Facturado']],
        body: reportData.topClients.map((c, i) => [i + 1, c.name, formatCurrency(c.total)]),
        theme: 'striped',
        headStyles: { fillColor: '#2980b9', font: 'helvetica' },
        styles: { font: 'helvetica' },
        columnStyles: { 2: { halign: 'right' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.text('Top 10 Productos/Servicios por Facturación', 14, finalY + 15);
    autoTable(doc, {
        startY: finalY + 20,
        head: [['#', 'Producto/Servicio', 'Total Facturado']],
        body: reportData.topProducts.map((p, i) => [i + 1, p.name, formatCurrency(p.total)]),
        theme: 'striped',
        headStyles: { fillColor: '#8e44ad', font: 'helvetica' },
        styles: { font: 'helvetica' },
        columnStyles: { 2: { halign: 'right' } }
    });

    doc.save(`informe-top-clientes-productos-${startDate}-a-${endDate}.pdf`);
};