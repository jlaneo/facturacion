
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Invoice, InvoiceStatus, Client } from '../types';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { PencilIcon, TrashIcon, DownloadIcon, PlusIcon, MailIcon, TableCellsIcon, PaperAirplaneIcon, CurrencyEuroIcon, RefreshIcon, PlayIcon, DocumentTextIcon } from '../components/icons';
import InvoiceForm from './InvoiceForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { exportToCSV, exportListToPDF, exportSalesInvoicesToPDF } from '../lib/exportUtils';
import { formatCurrency } from '../lib/utils';

type SortableInvoiceKeys = keyof (Invoice & { clientName: string; clientEmail?: string });
type SortDirection = 'ascending' | 'descending';

const statusFilters: { label: string, value: InvoiceStatus | 'Todos' }[] = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Borrador', value: 'Borrador' },
    { label: 'Enviada', value: 'Enviada' },
    { label: 'Pagada', value: 'Pagada' },
    { label: 'Vencida', value: 'Vencida' },
];

const InvoicesPage: React.FC = () => {
    const { invoices, deleteInvoice, clients, settings, updateInvoice, deleteDraftInvoices, generateNextMonthlyInvoice } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'Todos'>('Todos');
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableInvoiceKeys; direction: SortDirection }>({ key: 'invoice_number', direction: 'descending' });

    const sortedInvoices = useMemo(() => {
        const mappedInvoices = invoices.map(invoice => {
            const client = clients.find(c => c.id === invoice.client_id);
            return { ...invoice, clientName: client?.name || 'Cliente desconocido', clientEmail: client?.email };
        });

        const filtered = mappedInvoices.filter(invoice => {
            const searchMatch = (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = statusFilter === 'Todos' || invoice.status === statusFilter;
            return searchMatch && statusMatch;
        });
        
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') comparison = aValue - bValue;
            else comparison = String(aValue).localeCompare(String(bValue));
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return filtered;
    }, [invoices, clients, searchTerm, statusFilter, sortConfig]);

    const requestSort = (key: SortableInvoiceKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableInvoiceKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleDownload = (invoice: Invoice) => {
        const client = clients.find(c => c.id === invoice.client_id);
        if (client) generateInvoicePDF(invoice, client, settings);
    };
    
    const handleSendInvoice = async (invoice: Invoice & { clientName: string; clientEmail?: string }) => {
        if (invoice.status !== 'Borrador') return;
        if (!invoice.clientEmail) { alert('El cliente no tiene email.'); return; }
        const client = clients.find(c => c.id === invoice.client_id);
        if (!client) return;

        const subject = `neoSoporte - Factura nº ${invoice.invoice_number}`;
        const body = `Hola!,\n\nAdjunto factura nº ${invoice.invoice_number} por importe de ${formatCurrency(invoice.total)}.\n\nGracias.`;
        
        await updateInvoice({ ...invoice, status: 'Enviada' });
        generateInvoicePDF(invoice, client, settings);
        window.location.href = `mailto:${invoice.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleMarkAsPaid = async (invoice: Invoice) => {
        await updateInvoice({ ...invoice, status: 'Pagada' });
    };

    const handleEdit = (invoice: Invoice) => { setEditingInvoice(invoice); setIsCreating(true); };
    const handleCreateNew = () => { setEditingInvoice(null); setIsCreating(true); };
    const handleDeleteClick = (id: string) => { setInvoiceToDelete(id); setIsConfirmModalOpen(true); };

    if (isCreating || editingInvoice) {
        return <InvoiceForm existingInvoice={editingInvoice} onDone={() => { setIsCreating(false); setEditingInvoice(null); }} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Facturas Emitidas</h1>
                 <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl flex items-center space-x-2 shadow-lg transition-all active:scale-95">
                        <PlusIcon /> <span>Nueva Factura</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-4 md:space-y-0 md:flex md:items-center md:justify-between border border-gray-100 dark:border-gray-700">
                <div className="flex-1 max-w-md relative">
                    <input
                        type="text"
                        placeholder="Buscar factura o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 border border-gray-200 rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <div className="absolute left-3 top-3 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    {statusFilters.map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === filter.value ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 font-bold">
                            <tr>
                                <th scope="col" className="px-6 py-4 cursor-pointer" onClick={() => requestSort('invoice_number')}>Factura Nº{getSortIndicator('invoice_number')}</th>
                                <th scope="col" className="px-6 py-4 cursor-pointer" onClick={() => requestSort('clientName')}>Cliente{getSortIndicator('clientName')}</th>
                                <th scope="col" className="px-6 py-4 cursor-pointer" onClick={() => requestSort('issue_date')}>Fecha{getSortIndicator('issue_date')}</th>
                                <th scope="col" className="px-6 py-4 cursor-pointer" onClick={() => requestSort('total')}>Total{getSortIndicator('total')}</th>
                                <th scope="col" className="px-6 py-4 cursor-pointer" onClick={() => requestSort('status')}>Estado{getSortIndicator('status')}</th>
                                <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {sortedInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{invoice.invoice_number}</td>
                                    <td className="px-6 py-4 font-medium">{invoice.clientName}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(invoice.issue_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg ${
                                            invoice.status === 'Pagada' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                            invoice.status === 'Borrador' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center space-x-1">
                                            {invoice.status !== 'Pagada' && (
                                                <>
                                                    <button onClick={() => handleMarkAsPaid(invoice)} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Marcar Pagada"><CurrencyEuroIcon className="w-5 h-5"/></button>
                                                    <button onClick={() => handleSendInvoice(invoice)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Enviar"><MailIcon className="w-5 h-5"/></button>
                                                </>
                                            )}
                                            <button onClick={() => handleDownload(invoice)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Descargar"><DownloadIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleEdit(invoice)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteClick(invoice.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {invoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <DocumentTextIcon className="w-16 h-16 opacity-10 mb-4" />
                        <p>No hay facturas que coincidan con los filtros.</p>
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={async () => { await deleteInvoice(invoiceToDelete!); setIsConfirmModalOpen(false); }}
                title="Borrar Factura"
                message="¿Estás seguro de que deseas eliminar permanentemente esta factura? Esta acción no se puede deshacer."
            />
        </div>
    );
};

export default InvoicesPage;
