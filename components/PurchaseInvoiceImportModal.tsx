
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { PurchaseInvoice, Supplier, PurchaseInvoiceStatus } from '../types';
import { DownloadIcon, SparklesIcon, RefreshIcon, UploadIcon, TableCellsIcon, CheckIcon, XIcon } from './icons';
import { GoogleGenerativeAI } from '@google/generative-ai';

type ImportStep = 'upload' | 'preview' | 'importing' | 'summary';
type ImportMethod = 'file' | 'paste' | 'ai';

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
        // Handle dots as decimal if there's only one and it looks like a decimal
        const dots = (clean.match(/\./g) || []).length;
        if (dots > 1) clean = clean.replace(/\./g, '');
    }

    const amount = parseFloat(clean);
    return isNaN(amount) ? null : amount;
};

const PurchaseInvoiceImportModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { suppliers, addPurchaseInvoice, settings } = useData();
    const [step, setStep] = useState<ImportStep>('upload');
    const [importMethod, setImportMethod] = useState<ImportMethod>('ai');
    const [pastedData, setPastedData] = useState('');
    const [aiText, setAiText] = useState('');
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [importSummary, setImportSummary] = useState({ success: 0, failed: 0 });

    const resetState = () => {
        setStep('upload');
        setImportMethod('ai');
        setPastedData('');
        setAiText('');
        setParsedRows([]);
        setIsAiAnalyzing(false);
        setImportSummary({ success: 0, failed: 0 });
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const suppliersMap = useMemo(() => new Map<string, Supplier>(suppliers.map(s => [(s.name || '').toLowerCase().trim(), s])), [suppliers]);

    const validateRow = (row: any): ParsedRow => {
        const errors: string[] = [];

        let invoice_number = row.invoice_number || row[4] || '';
        let supplier_name = row.supplier_name || row[1] || '';
        let issue_date_str = row.issue_date || row[2] || '';
        let due_date_str = row.due_date || row[3] || '';
        let amount_str = row.total || row.amount || row[8] || row[5] || '';

        // Extract if it's the detailed format [0:File, 1:Supplier, 2:Date, 3:Due, 4:Invoice, ...]
        if (Array.isArray(row) && row.length >= 9) {
            supplier_name = row[1];
            issue_date_str = row[2];
            due_date_str = row[3];
            invoice_number = row[4];
            amount_str = row[8];
        }

        const data = {
            invoice_number: String(invoice_number || '').trim(),
            supplier_name: String(supplier_name || '').trim(),
            issue_date: String(issue_date_str || '').trim(),
            due_date: String(due_date_str || '').trim(),
            amount: String(amount_str || '').trim(),
        };

        if (!data.invoice_number) errors.push('Falta Nº factura.');
        if (!data.supplier_name) errors.push('Falta proveedor.');

        const exactSupplier = suppliersMap.get(data.supplier_name.toLowerCase());
        // FIX: Explicitly type finalSupplier to avoid 'unknown' type inference issues.
        let finalSupplier: Supplier | undefined = exactSupplier;

        if (!finalSupplier) {
            // FIX: Explicitly cast Array.from result to Supplier[] to fix type inference issues where 's' might be treated as '{}'.
            const partialMatch = (Array.from(suppliersMap.values()) as Supplier[]).find((s: Supplier) =>
                s.name.toLowerCase().includes(data.supplier_name.toLowerCase()) ||
                data.supplier_name.toLowerCase().includes(s.name.toLowerCase())
            );
            if (partialMatch) finalSupplier = partialMatch;
            else errors.push(`Proveedor '${data.supplier_name}' no registrado.`);
        }

        const final_issue_date = parseAndFormatDate(data.issue_date);
        if (!final_issue_date) errors.push('Fecha emisión inválida.');

        const final_due_date = parseAndFormatDate(data.due_date) || final_issue_date; // Fallback if missing

        const final_total = parseAmount(data.amount);
        let final_subtotal: number | undefined;
        let final_tax: number | undefined;

        if (final_total === null) {
            errors.push('Importe inválido.');
        } else {
            // Precise split if available in source (row.subtotal), otherwise estimate
            final_subtotal = row.subtotal ? parseAmount(row.subtotal)! : final_total / (1 + settings.iva / 100);
            final_tax = row.tax ? parseAmount(row.tax)! : final_total - final_subtotal;
        }

        return {
            data,
            isValid: errors.length === 0,
            errors,
            supplier_id: finalSupplier?.id,
            final_issue_date: final_issue_date || undefined,
            final_due_date: final_due_date || undefined,
            final_subtotal: final_subtotal ? parseFloat(final_subtotal.toFixed(2)) : undefined,
            final_tax: final_tax ? parseFloat(final_tax.toFixed(2)) : undefined,
            final_total: final_total ? parseFloat(final_total.toFixed(2)) : undefined
        };
    };

    const handleAiAnalyze = async () => {
        if (!aiText.trim()) return;
        setIsAiAnalyzing(true);
        try {
            const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
            const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Extract purchase invoice details from the following raw text. The text could be an email, a copy-paste from a PDF, or a manual list.
            Return ONLY a JSON array of objects, each representing one invoice with these fields:
            - supplier_name: string
            - invoice_number: string
            - issue_date: string (YYYY-MM-DD or DD/MM/YYYY)
            - due_date: string (YYYY-MM-DD or DD/MM/YYYY)
            - subtotal: number (base imponible)
            - tax: number (IVA)
            - total: number
            
            Text to analyze:
            ---
            ${aiText}
            ---`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const json = JSON.parse(text || '[]');
            const results = Array.isArray(json) ? (json as any[]) : [json];
            const validated = results.map(validateRow);
            setParsedRows(validated);
            setStep('preview');
        } catch (error) {
            console.error("AI Analysis error:", error);
            alert("Error al analizar con IA. Inténtalo de nuevo o usa el método manual.");
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    const processManualData = (text: string) => {
        const lines = text.trim().split('\n').map(line => {
            if (line.includes('\t')) return line.split('\t');
            if (line.includes(';')) return line.split(';');
            return line.split(',');
        });

        if (lines.length === 0) return;
        const firstLine = lines[0];
        const looksLikeHeader = firstLine.some(cell => ['factura', 'proveedor', 'fecha', 'vto', 'total'].some(kw => cell.toLowerCase().includes(kw)));
        const dataRows = looksLikeHeader ? lines.slice(1) : lines;

        const validated = dataRows.map(validateRow);
        setParsedRows(validated);
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
            } catch (e) { failed++; }
        }
        setImportSummary({ success, failed });
        setStep('summary');
    };

    const validRowsCount = useMemo(() => parsedRows.filter(r => r.isValid).length, [parsedRows]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Facturas de Compra">
            <div className="space-y-6">
                {step === 'upload' && (
                    <>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                            <button onClick={() => setImportMethod('ai')} className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === 'ai' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                <SparklesIcon className="w-4 h-4" /> <span>Magia IA</span>
                            </button>
                            <button onClick={() => setImportMethod('file')} className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === 'file' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                <UploadIcon className="w-4 h-4" /> <span>Archivo CSV</span>
                            </button>
                            <button onClick={() => setImportMethod('paste')} className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === 'paste' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                <TableCellsIcon className="w-4 h-4" /> <span>Pegar Excel</span>
                            </button>
                        </div>

                        {importMethod === 'ai' && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">Pega el texto de un email o de una factura. Gemini extraerá los datos automáticamente.</p>
                                <textarea
                                    className="w-full h-40 p-4 border rounded-xl dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Estimado cliente, adjuntamos factura 2024-001 de Proveedor SL por un total de 121€ (100€ base)..."
                                    value={aiText}
                                    onChange={e => setAiText(e.target.value)}
                                />
                                <button
                                    onClick={handleAiAnalyze}
                                    disabled={isAiAnalyzing || !aiText.trim()}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 transition-all"
                                >
                                    {isAiAnalyzing ? <RefreshIcon className="animate-spin" /> : <SparklesIcon />}
                                    <span>{isAiAnalyzing ? 'Analizando con IA...' : 'Analizar con Inteligencia Artificial'}</span>
                                </button>
                            </div>
                        )}

                        {importMethod === 'file' && (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 text-center space-y-4">
                                <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
                                <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => processManualData(ev.target?.result as string);
                                        reader.readAsText(file);
                                    }
                                }} />
                                <label htmlFor="file-upload" className="block cursor-pointer bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold py-3 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors">
                                    Seleccionar Archivo .CSV
                                </label>
                                <p className="text-xs text-gray-400">Formato: Nº Factura, Proveedor, Fecha, Vto, Total</p>
                            </div>
                        )}

                        {importMethod === 'paste' && (
                            <div className="space-y-4">
                                <textarea
                                    className="w-full h-40 p-4 border rounded-xl dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                                    placeholder="Copia las celdas de tu Excel y pégalas aquí..."
                                    value={pastedData}
                                    onChange={e => setPastedData(e.target.value)}
                                />
                                <button onClick={() => processManualData(pastedData)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg">
                                    Procesar Celdas
                                </button>
                            </div>
                        )}
                    </>
                )}

                {step === 'preview' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <span className="text-sm font-medium">Previsualización de importación</span>
                            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">{validRowsCount} listos para importar</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto rounded-xl border dark:border-gray-700">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Proveedor</th>
                                        <th className="px-4 py-3">Factura</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {parsedRows.map((row, i) => (
                                        <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!row.isValid ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-4 py-3">
                                                {/* FIX: Wrapped XIcon in a span with title to avoid type errors since XIcon doesn't accept title prop directly. */}
                                                {row.isValid ? <CheckIcon className="w-4 h-4 text-green-500" /> : <span title={row.errors.join(', ')}><XIcon className="w-4 h-4 text-red-500" /></span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold">{row.data.supplier_name}</p>
                                                <p className="text-[10px] text-gray-400">{row.final_issue_date}</p>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{row.data.invoice_number}</td>
                                            <td className="px-4 py-3 text-right font-bold">{row.isValid ? row.final_total?.toFixed(2) + '€' : row.data.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex space-x-3 pt-2">
                            <button onClick={() => setStep('upload')} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">Volver</button>
                            <button onClick={handleImport} disabled={validRowsCount === 0} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all">
                                Confirmar e Importar {validRowsCount} Facturas
                            </button>
                        </div>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <RefreshIcon className="animate-spin w-12 h-12 text-blue-600 mb-4" />
                        <p className="font-bold text-xl">Procesando importación...</p>
                        <p className="text-gray-400 text-sm mt-2 text-center">Estamos registrando tus facturas en el sistema.</p>
                    </div>
                )}

                {step === 'summary' && (
                    <div className="text-center space-y-6 py-4">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <CheckIcon className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">¡Importación Finalizada!</h3>
                            <p className="text-gray-500 mt-2">Se han importado con éxito <span className="font-bold text-green-600">{importSummary.success}</span> facturas.</p>
                            {importSummary.failed > 0 && <p className="text-red-500 text-sm mt-1">Hubo errores en {importSummary.failed} registros.</p>}
                        </div>
                        <button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg">Ver Listado de Facturas</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PurchaseInvoiceImportModal;
