import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { RecurringInvoice, RecurringInvoiceStatus, Invoice } from '../types';
import { PencilIcon, TrashIcon, PlusIcon, PlayIcon, RefreshIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import RecurringInvoiceForm from './RecurringInvoiceForm';
import { formatCurrency } from '../lib/utils';

type RecurringInvoiceWithClient = RecurringInvoice & { 
    clientName: string;
    total: number;
};
type SortableRecurringInvoiceKeys = keyof RecurringInvoiceWithClient;
type SortDirection = 'ascending' | 'descending';

const RecurringInvoicesPage: React.FC = () => {
    const { recurringInvoices, deleteRecurringInvoice, updateRecurringInvoice, addInvoice, generatePendingRecurringInvoices, clients, settings } = useData();
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<RecurringInvoice | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortableRecurringInvoiceKeys; direction: SortDirection }>({ key: 'next_due_date', direction: 'ascending' });

    const sortedRecurringInvoices = useMemo(() => {
        const invoicesWithClientData: RecurringInvoiceWithClient[] = recurringInvoices.map(ri => {
            const client = clients.find(c => c.id === ri.client_id);
            const riItems = ri.items || [];
            const subtotal = riItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
            const isVatExempt = client?.is_eu_vat_exempt;
            const tax = isVatExempt ? 0 : subtotal * (settings.iva / 100);
            const total = subtotal + tax;

            return { 
                ...ri, 
                clientName: client?.name || 'Cliente desconocido',
                total 
            };
        });

        invoicesWithClientData.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            let comparison = 0;
            if (sortConfig.key === 'next_due_date' || sortConfig.key === 'start_date') {
                comparison = new Date(aValue.toString().replace(/-/g, '/')).getTime() - new Date(bValue.toString().replace(/-/g, '/')).getTime();
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return invoicesWithClientData;
    }, [recurringInvoices, clients, sortConfig, settings.iva]);

    const pendingCount = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return recurringInvoices.filter(ri => ri.status === 'active' && new Date(ri.next_due_date.replace(/-/g, '/')) <= today).length;
    }, [recurringInvoices]);

    const requestSort = (key: SortableRecurringInvoiceKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableRecurringInvoiceKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleCreateNew = () => { setEditingInvoice(null); setIsFormVisible(true); };
    const handleEdit = (invoice: RecurringInvoice) => { setEditingInvoice(invoice); setIsFormVisible(true); };
    const handleDeleteClick = (id: string) => { setInvoiceToDelete(id); setIsConfirmModalOpen(true); };
    
    const handleToggleStatus = async (invoice: RecurringInvoice) => {
        const newStatus: RecurringInvoiceStatus = invoice.status === 'active' ? 'paused' : 'active';
        await updateRecurringInvoice({ ...invoice, status: newStatus });
    };

    const confirmDelete = async () => {
        if (invoiceToDelete) {
            try {
                await deleteRecurringInvoice(invoiceToDelete);
            } finally {
                setInvoiceToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    const handleBatchGenerate = async () => {
        if (pendingCount === 0 || isBatchProcessing) return;
        if (!confirm(`¿Generar ${pendingCount} borradores automáticamente?`)) return;
        setIsBatchProcessing(true);
        try {
            const result = await generatePendingRecurringInvoices();
            alert(`Proceso completado: ${result.success} facturas generadas correctamente y ${result.failed} errores.`);
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleGenerateNow = async (invoice: RecurringInvoiceWithClient) => {
        if (!confirm(`¿Generar borrador para "${invoice.clientName}" ahora?`)) return;
        try {
            const today = new Date();
            const riItems = invoice.items || [];
            const subtotal = riItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
            const client = clients.find(c => c.id === invoice.client_id);
            const tax = client?.is_eu_vat_exempt ? 0 : subtotal * (settings.iva / 100);

            await addInvoice({
                client_id: invoice.client_id,
                issue_date: today.toISOString().split('T')[0],
                due_date: new Date(new Date().setDate(today.getDate() + 30)).toISOString().split('T')[0],
                items: riItems.map(it => ({ ...it, id: crypto.randomUUID() })),
                status: 'Borrador',
                invoice_number: '', 
                subtotal, tax, total: subtotal + tax
            });

            const nextDate = new Date(invoice.next_due_date.replace(/-/g, '/'));
            nextDate.setMonth(nextDate.getMonth() + 1);
            await updateRecurringInvoice({ ...invoice, next_due_date: nextDate.toISOString().split('T')[0] });

            alert(`Borrador generado con éxito.`);
        } catch (error: any) {
            alert(`Error al generar: ${error.message}`);
        }
    };

    if (isFormVisible) return <RecurringInvoiceForm existingInvoice={editingInvoice} onDone={() => setIsFormVisible(false)} />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Facturas Recurrentes</h1>
                <div className="flex gap-2">
                    {pendingCount > 0 && (
                        <button 
                            onClick={handleBatchGenerate} 
                            disabled={isBatchProcessing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 disabled:bg-gray-400 shadow-lg transition-all"
                        >
                            {isBatchProcessing ? <RefreshIcon className="animate-spin" /> : <RefreshIcon />}
                            <span>Procesar Pendientes ({pendingCount})</span>
                        </button>
                    )}
                    <button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-md">
                        <PlusIcon /> <span>Nueva Factura Recurrente</span>
                    </button>
                </div>
            </div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-sm text-gray-600 dark:text-gray-300 border-l-4 border-indigo-500">
                <p>Las facturas recurrentes activas se generarán automáticamente como un <strong>borrador</strong> en la fecha indicada.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('clientName')}>Cliente{getSortIndicator('clientName')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('next_due_date')}>Próxima Generación{getSortIndicator('next_due_date')}</th>
                            <th scope="col" className="px-6 py-3">Frecuencia</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('total')}>Total{getSortIndicator('total')}</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRecurringInvoices.map(invoice => (
                            <tr key={invoice.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.clientName}</td>
                                <td className="px-6 py-4">{new Date(invoice.next_due_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4 capitalize">{invoice.frequency === 'monthly' ? 'Mensual' : invoice.frequency}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(invoice.total)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${invoice.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {invoice.status === 'active' ? 'Activa' : 'Pausada'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end items-center space-x-4">
                                        <button onClick={() => handleGenerateNow(invoice)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Generar borrador ahora">
                                            <PlayIcon />
                                        </button>
                                        <button onClick={() => handleToggleStatus(invoice)} className="text-sm font-medium text-blue-600 hover:underline">
                                            {invoice.status === 'active' ? 'Pausar' : 'Reanudar'}
                                        </button>
                                        <button onClick={() => handleEdit(invoice)} className="text-yellow-500 hover:text-yellow-700"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(invoice.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {recurringInvoices.length === 0 && <p className="text-center py-10 text-gray-500">No hay facturas recurrentes configuradas.</p>}
            </div>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado"
                message="¿Estás seguro de que quieres borrar esta factura recurrente? Las facturas ya generadas no se verán afectadas."
            />
        </div>
    );
};

export default RecurringInvoicesPage;