
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Client, CompanySettings } from '../types';
import { formatCurrency } from './utils';

// FIX: Replaced `interface extends jsPDF` with a type intersection (`&`) to correctly inherit jsPDF properties.
// This provides type safety for the `lastAutoTable` property.
type jsPDFWithAutoTable = jsPDF & {
  lastAutoTable: {
    finalY: number;
  };
};

export const generateInvoicePDF = (invoice: Invoice, client: Client, settings: CompanySettings) => {
    // FIX: Force A4 format, Portrait orientation, and enable compression (zlib) to reduce file size for AutoFirma.
    const doc = new jsPDF({ 
        orientation: 'portrait', 
        unit: 'mm', 
        format: 'a4',
        compress: true 
    }) as jsPDFWithAutoTable;

    // Using Helvetica as a clean substitute for Calibri, which is not a standard PDF font. Base font size is 11.
    doc.setFont('helvetica');
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const templateColor = settings.template_color || '#26292e'; // Default to dark gray if not set
    let y = 20;

    // Watermark positioned further down, closer to the bottom edge.
    if (settings.logo) {
        try {
            const logoData = settings.logo;
            const formatMatch = logoData.match(/^data:image\/(png|jpeg|jpg);base64,/);
            const format = formatMatch ? formatMatch[1].toUpperCase() : 'PNG';
            
            const imgProps = doc.getImageProperties(logoData);
            // Adjust watermark width for Portrait mode (smaller page width)
            const watermarkWidth = pageWidth * 0.6; 
            const watermarkHeight = (imgProps.height * watermarkWidth) / imgProps.width;
            const watermarkX = (pageWidth - watermarkWidth) / 2;
            
            // Position watermark in the lower third of the page
            const watermarkCenterY = pageHeight - 100;
            const watermarkY = watermarkCenterY - (watermarkHeight / 2);
            
            // Set transparency for the watermark
            // Using 'any' to bypass potential strict TypeScript errors with jsPDF plugins/GState
            const GState = (doc as any).GState;
            if (GState) {
                 doc.setGState(new GState({opacity: 0.1}));
            }
            
            doc.addImage(logoData, format, watermarkX, watermarkY, watermarkWidth, watermarkHeight, undefined, 'FAST');
            
            // Reset transparency
            if (GState) {
                doc.setGState(new GState({opacity: 1}));
            }
        } catch(e) {
            console.error("Error adding watermark logo to PDF:", e);
            // Continue PDF generation even if watermark fails
        }
    }

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(templateColor);
    doc.text(settings.commercial_name || settings.name, 20, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0); // Reset color to black
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    if (settings.commercial_name) {
        doc.text(settings.name, 20, y);
        y += 5;
    }

    doc.text(settings.address, 20, y);
    y += 5;
    doc.text(`NIF: ${settings.tax_id}`, 20, y);
    y += 5;
    doc.text(settings.email, 20, y);

    // Invoice Info - Adjusted X position for Portrait
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(templateColor);
    doc.text(`FACTURA`, pageWidth - 20, 20, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset color to black
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº: ${invoice.invoice_number}`, pageWidth - 20, 27, { align: 'right' });
    doc.text(`Fecha: ${new Date(invoice.issue_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}`, pageWidth - 20, 33, { align: 'right' });
    doc.text(`Vencimiento: ${new Date(invoice.due_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}`, pageWidth - 20, 39, { align: 'right' });

    // Separator Line
    y += 10;
    doc.setDrawColor(224, 224, 224); // Use a neutral light gray for the separator
    doc.setLineWidth(0.2);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    // Bill To
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 20, y, { align: 'left' });
    y += 1; // Adjust space before the table

    const clientDataBody = [
        [''], // Blank row for spacing
        [client.name],
        [client.address],
        [`NIF: ${client.tax_id}`],
        [client.email]
    ];
    
    autoTable(doc, {
        body: clientDataBody,
        startY: y,
        theme: 'plain',
        tableWidth: 95,
        margin: { left: 20 },
        styles: {
            halign: 'left',
            fontSize: 11,
            font: 'helvetica',
            cellPadding: { top: 0, right: 0, bottom: 1, left: 0 },
        },
        didParseCell: (data) => {
            // Target the row with the client's name. It's the second row (index 1).
            if (data.section === 'body' && data.row.index === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
            }
        }
    });
    
    y = doc.lastAutoTable.finalY;

    // Table
    const tableColumn = ["Concepto", "Cant.", "Precio", "Total"];
    const tableRows = (invoice.items || []).map(item => [
        item.description,
        item.quantity,
        formatCurrency(item.unit_price),
        formatCurrency(item.quantity * item.unit_price)
    ]);
    
    // Add a blank row for spacing between header and body
    tableRows.unshift(['', '', '', '']);

    // Call autoTable as a function, passing the doc instance
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: y + 10,
        theme: 'plain', // Use 'plain' theme to remove all borders
        headStyles: { 
            fillColor: templateColor,
            textColor: '#ffffff',
            font: 'helvetica'
        },
        styles: { fontSize: 10, font: 'helvetica', cellPadding: 1.5 }, // Set table font size
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                if (data.row.index === 0) {
                    // This is our spacer row, make it invisible
                    data.cell.styles.fillColor = '#ffffff';
                    data.cell.styles.lineWidth = 0;
                    data.cell.styles.minCellHeight = 2;
                } else if (data.row.index % 2 !== 0) { // Odd rows: 1st, 3rd, 5th product...
                    data.cell.styles.fillColor = '#f2f2f2'; // Apply light gray background
                } else { // Even rows: 2nd, 4th, 6th product...
                    data.cell.styles.fillColor = '#ffffff'; // Apply white background
                }
            }
        },
    });

    // Access the `lastAutoTable` property which is now on the doc object
    let finalY = doc.lastAutoTable.finalY;

    // Totals Table
    const totalsData = [
        ['Subtotal:', formatCurrency(invoice.subtotal)],
        [`IVA (${settings.iva}%):`, formatCurrency(invoice.tax)],
        ['Total:', formatCurrency(invoice.total)]
    ];
    
    // Define the desired bottom position for the totals block.
    const bottomPosition = pageHeight - 65;

    // Determine the Y position for the totals.
    // If there's enough space after the table, place totals at the bottom.
    // Otherwise, place them right after the table to avoid overlap.
    const totalsTableY = (finalY + 30 < bottomPosition) ? bottomPosition : finalY + 10;

    autoTable(doc, {
        body: totalsData,
        startY: totalsTableY,
        theme: 'plain',
        tableWidth: 80,
        margin: { left: pageWidth - 80 - 20 }, // Align table to the right
        styles: {
            overflow: 'linebreak',
            fontSize: 10,
            font: 'helvetica',
            cellPadding: { top: 1, right: 0, bottom: 1, left: 0 },
        },
        columnStyles: {
            0: { halign: 'right', fontStyle: 'normal' },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
        },
        didParseCell: (data) => {
            if (data.row.index === 2) { // The 'Total' row
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
                // Add a top border to visually separate the total
                data.cell.styles.borderWidth = { top: 0.2 };
                data.cell.styles.borderColor = [44, 62, 80]; // A dark grey color
                data.cell.styles.cellPadding = { top: 3, right: 0, bottom: 1, left: 0 };
            }
        }
    });
    
    // Footer
    const bankInfoBoxY = pageHeight - 20;
    const bankInfoBoxHeight = 8;
    
    // First line of footer (company info)
    doc.setFontSize(8); // Reduced font size slightly for Portrait
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100); // Dark grey text
    const footerText1 = 'José Luis Arias Serrano - C.I.F.: 52136358G - Dr. Espina, 41 Madrid - 659 18 06 27';
    doc.text(footerText1, pageWidth / 2, bankInfoBoxY - 4, { align: 'center' });

    // Second line of footer (bank info)
    const bankInfoText = 'Transferencia/Ingreso a Banco de Santander IBAN ES54 0049 4663 71 2395035090';
    
    // Draw background
    doc.setFillColor(240, 240, 240); // Light gray fill
    doc.rect(0, bankInfoBoxY, pageWidth, bankInfoBoxHeight, 'F');
    
    // Draw text
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0); // Black text
    // Vertically centering the text in the box
    const textY = bankInfoBoxY + (bankInfoBoxHeight / 2) + 2; // Adjust for vertical alignment
    doc.text(bankInfoText, pageWidth / 2, textY, { align: 'center' });

    // Generate filename following "Nº de Factura_Cliente" format
    
    // Sanitize components to ensure valid filename
    const safeInvoiceNum = invoice.invoice_number.replace(/[\/\\:*?"<>|]/g, '-');
    const safeClientName = client.name.replace(/[\/\\:*?"<>|]/g, ''); 
    
    const fileName = `${safeInvoiceNum}_${safeClientName}.pdf`;

    doc.save(fileName);
};
