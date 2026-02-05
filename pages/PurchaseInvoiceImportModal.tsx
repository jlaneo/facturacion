
import React, { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import { useData } from '../context/DataContext';
import { PurchaseInvoice, Supplier, PurchaseInvoiceStatus } from '../types';
import { DownloadIcon, RefreshIcon, UploadIcon, TableCellsIcon, CheckIcon, XIcon } from '../components/icons';

type ImportStep = 'upload' | 'preview' | 'importing' | 'summary';
type ImportMethod = 'file' | 'paste';

interface ParsedRow {
    data: {
        invoice_number: string;
        supplier_name: string;
        issue_date: string;
        due_date: string;
        amount: string; 
    };
    isValid: boolean;
    errors: string[];
    supplier_id?: string;
    final_issue_date?: string;
    final_due_date?: string;
    final_subtotal?: number;
    final_tax?: number;
    final_total?: number;
}

const parseAndFormatDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    // DD/MM/YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
        let [, day, month, year] = dmyMatch;
        if (year.length === 2) year = '20' + year;
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const date = new Date(isoDate);
        if (!isNaN(date.getTime())) return isoDate;
    }
    // YYYY-MM-DD
    const ymdMatch = cleanStr.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (ymdMatch) {
         const date = new Date(cleanStr.replace(/-/g, '/'));
         if (!isNaN(date.getTime())) return cleanStr;
    }
    return null;
};

const parseAmount = (amountStr: any): number | null => {
    if (amountStr === null || amountStr === undefined) return null;
    if (typeof amountStr === 'number') return amountStr;
    let clean = amountStr.toString().replace(/[€$£\s]/g, '').trim();
    if (clean.includes(',')) {
        clean = clean.replace(/\./g, ''); 
        clean = clean.replace(',', '.');  
    } else {
        const dots = (clean.match(/\./g) || []).length;
        if (dots > 1) clean = clean.replace(/\./g, '');
    }
    const amount = parseFloat(clean);
    return isNaN(amount) ? null : amount;
};

const PurchaseInvoiceImportModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { suppliers, addPurchaseInvoice, settings } = useData();
    const [step, setStep] = useState<ImportStep>('upload');
    const [importMethod, setImportMethod] = useState<ImportMethod>('paste');
    const [pastedData, setPastedData] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [importSummary, setImportSummary] = useState({ success: 0, failed: 0 });

    const resetState = () => {
        setStep('upload');
        setImportMethod('paste');
        setPastedData('');
        setParsedRows([]);
        setImportSummary({ success: 0, failed: 0 });
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const suppliersMap = useMemo(() => new Map<string, Supplier>(suppliers.map(s => [(s.name || '').toLowerCase().trim(), s])), [suppliers]);

    const validateRow = (rowCells: any[]): ParsedRow => {
        const errors: string[] = [];
        let issue_date_str = "";
        let amount_str = "";
        let invoice_number = "";
        let supplier_name = "";

        if (rowCells.length >= 4) {
            rowCells.forEach((cell, idx) => {
                const val = String(cell || "").trim();
                if (!val) return;
                if (parseAndFormatDate(val)) { issue_date_str = val; } 
                else if (val.match(/^-?\d+([.,]\d+)?$/) || val.includes(',')) {
                    if (!amount_str || val.includes(',') || val.length < 10) amount_str = val;
                }
            });
            invoice_number = String(rowCells[0] || "").trim();
            supplier_name = String(rowCells[1] || "").trim();
            if (!issue_date_str) issue_date_str = String(rowCells[2] || "").trim();
            if (!amount_str) amount_str = String(rowCells[3] || "").trim();
        }

        const data = { invoice_number, supplier_name, issue_date: issue_date_str, due_date: "", amount: amount_str };
        if (!data.invoice_number) errors.push('Falta Nº factura.');
        if (!data.supplier_name) errors.push('Falta proveedor.');
        
        const cleanSearch = data.supplier_name.toLowerCase();
        const foundSupplier = (Array.from(suppliersMap.values()) as Supplier[]).find((s: Supplier) => 
            s.name.toLowerCase().includes(cleanSearch) || cleanSearch.includes(s.name.toLowerCase())
        );
        if (!foundSupplier) errors.push(`Proveedor '${data.supplier_name}' no registrado.`);

        const final_issue_date = parseAndFormatDate(data.issue_date);
        if (!final_issue_date) errors.push('Fecha emisión inválida.');
        
        let final_due_date = "";
        if (final_issue_date) {
            const d = new Date(final_issue_date.replace(/-/g, '/'));
            d.setMonth(d.getMonth() + 1);
            final_due_date = d.toISOString().split('T')[0];
        }

        const final_total = parseAmount(data.amount);
        let final_subtotal: number | undefined;
        let final_tax: number | undefined;
        if (final_total === null) { errors.push('Importe inválido.'); } 
        else {
            final_subtotal = final_total / (1 + settings.iva / 100);
            final_tax = final_total - final_subtotal;
        }
        
        return {
            data: { ...data, due_date: final_due_date },
            isValid: errors.length === 0,
            errors,
            supplier_id: foundSupplier?.id,
            final_issue_date: final_issue_date || undefined,
            final_due_date: final_due_date || undefined,
            final_subtotal: final_subtotal ? parseFloat(final_subtotal.toFixed(2)) : undefined,
            final_tax: final_tax ? parseFloat(final_tax.toFixed(2)) : undefined,
            final_total: final_total ? parseFloat(final_total.toFixed(2)) : undefined
        };
    };

    const processManualData = (text: string) => {
        if (!text.trim()) return;
        const lines = text.trim().split('\n').map(line => line.includes('\t') ? line.split('\t') : (line.includes(';') ? line.split(';') : line.split(',')));
        const firstLine = lines[0];
        const looksLikeHeader = firstLine.some(cell => ['factura', 'proveedor', 'fecha', 'total'].some(kw => String(cell).toLowerCase().includes(kw)));
        const dataRows = looksLikeHeader ? lines.slice(1) : lines;
        setParsedRows(dataRows.map(validateRow));
        setStep('preview');
    };

    const handleImport = async () => {
        setStep('importing');
        let success = 0, failed = 0;
        const validRows = parsedRows.filter(r => r.isValid);
        for (const row of validRows) {
            try {
                await addPurchaseInvoice({
                    supplier_id: row.supplier_id!,
                    invoice_number: row.data.invoice_number,
                    issue_date: row.final_issue_date!,
                    due_date: row.final_due_date!,
                    subtotal: row.final_subtotal!,
                    tax: row.final_tax!,
                    total: row.final_total!,
                    status: 'Pendiente'
                });
                success++;
            } catch { failed++; }
        }
        setImportSummary({ success, failed });
        setStep('summary');
    };

    const validRowsCount = useMemo(() => parsedRows.filter(r => r.isValid).length, [parsedRows]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Facturas de Compra" maxWidth="max-w-7xl">
            <div className="space-y-6">
                {step === 'upload' && (
                    <>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                             <button onClick={() => setImportMethod('paste')} className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-bold rounded-lg transition-all ${importMethod === 'paste' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                <TableCellsIcon className="w-5 h-5" /> <span>Pegar de Excel</span>
                            </button>
                            <button onClick={() => setImportMethod('file')} className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-bold rounded-lg transition-all ${importMethod === 'file' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                <UploadIcon className="w-5 h-5" /> <span>Archivo CSV</span>
                            </button>
                        </div>
                        {importMethod === 'paste' && (
                            <div className="space-y-4">
                                <textarea className="w-full h-64 p-4 border rounded-xl dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="F2026-120  Proveedor S.A.  15/01/2026  407,03" value={pastedData} onChange={e => setPastedData(e.target.value)} />
                                <button onClick={() => processManualData(pastedData)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg">Procesar Filas Detectadas</button>
                            </div>
                        )}
                        {importMethod === 'file' && (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 text-center space-y-4">
                                <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
                                <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if(file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => processManualData(ev.target?.result as string);
                                        reader.readAsText(file);
                                    }
                                }} />
                                <label htmlFor="file-upload" className="block cursor-pointer bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold py-3 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors">
                                    Seleccionar Archivo .CSV
                                </label>
                                <p className="text-xs text-gray-400">Formato: Nº Factura, Proveedor, Fecha, Total</p>
                            </div>
                        )}
                    </>
                )}
                {step === 'preview' && (
                    <div className="space-y-6">
                        <div className="overflow-hidden border dark:border-gray-700 rounded-2xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase font-black text-xs">
                                    <tr>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4">Proveedor Detectado</th>
                                        <th className="px-6 py-4">Nº Factura</th>
                                        <th className="px-6 py-4">Vto. (+1 mes)</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {parsedRows.map((row, i) => (
                                        <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${!row.isValid ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                {/* FIX: Wrapped XIcon in a span with a title to resolve the missing title property type error. */}
                                                {row.isValid ? <CheckIcon className="w-6 h-6 text-green-500 mx-auto" /> : <span title={row.errors.join(', ')}><XIcon className="w-5 h-5 text-red-500 mx-auto" /></span>}
                                            </td>
                                            <td className="px-6 py-4 font-bold">{row.data.supplier_name || '---'}</td>
                                            <td className="px-6 py-4 font-mono">{row.data.invoice_number || '---'}</td>
                                            <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">{row.final_due_date}</td>
                                            <td className="px-6 py-4 text-right font-black text-lg">{row.isValid ? row.final_total?.toFixed(2) + '€' : row.data.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex space-x-4">
                            <button onClick={() => setStep('upload')} className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-xl transition-all">Atrás / Limpiar</button>
                            <button onClick={handleImport} disabled={validRowsCount === 0} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl disabled:opacity-50 transition-all text-lg">Confirmar e Importar {validRowsCount} Facturas</button>
                        </div>
                    </div>
                )}
                {step === 'importing' && <div className="flex flex-col items-center justify-center py-32 space-y-4"><RefreshIcon className="animate-spin w-16 h-16 text-blue-600" /><p className="font-black text-2xl text-gray-800 dark:text-white">Registrando facturas...</p></div>}
                {step === 'summary' && (
                    <div className="text-center space-y-8 py-12">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600"><CheckIcon className="w-12 h-12" /></div>
                        <div><h3 className="text-4xl font-black text-gray-900 dark:text-white">¡Importación Finalizada!</h3><p className="text-gray-500 mt-2 text-xl">Se han procesado <span className="font-bold text-green-600">{importSummary.success}</span> facturas correctamente.</p></div>
                        <button onClick={handleClose} className="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg text-xl">Ir al Listado de Facturas</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PurchaseInvoiceImportModal;
