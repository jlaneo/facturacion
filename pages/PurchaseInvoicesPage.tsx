import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { PurchaseInvoice, PurchaseInvoiceStatus } from '../types';
import Modal from '../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon, UploadIcon, DownloadIcon, CurrencyEuroIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import PurchaseInvoiceImportModal from '../components/PurchaseInvoiceImportModal';
import { exportPurchaseInvoicesToPDF } from '../lib/exportUtils';
import { formatCurrency } from '../lib/utils';

type SortablePurchaseInvoiceKeys = keyof (PurchaseInvoice & { supplierName: string });
type SortDirection = 'ascending' | 'descending';

const PurchaseInvoiceForm: React.FC<{
    invoice?: PurchaseInvoice | null;
    onSave: (invoice: Omit<PurchaseInvoice, 'id'> | PurchaseInvoice) => Promise<void>;
    onCancel: () => void;
}> = ({ invoice, onSave, onCancel }) => {
    const { suppliers, settings } = useData();
    const [formData, setFormData] = useState({
        supplier_id: invoice?.supplier_id || '',
        invoice_number: invoice?.invoice_number || '',
        issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date || new Date().toISOString().split('T')[0],
        subtotal: invoice?.subtotal || 0,
        tax: invoice?.tax || 0,
        total: invoice?.total || 0,
        status: invoice?.status || 'Pendiente',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numberValue = parseFloat(value) || 0;
        setFormData(prev => ({ ...prev, [name]: numberValue }));
    };

    useEffect(() => {
        const subtotal = formData.subtotal;
        const taxRate = settings.iva / 100;
        const calculatedTax = subtotal * taxRate;
        const calculatedTotal = subtotal + calculatedTax;
        setFormData(prev => ({
            ...prev,
            tax: parseFloat(calculatedTax.toFixed(2)),
            total: parseFloat(calculatedTotal.toFixed(2))
        }));
    }, [formData.subtotal, settings.iva]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(invoice ? { ...invoice, ...formData } : formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor</label>
                <select name="supplier_id" value={formData.supplier_id} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="">Selecciona un proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nº Factura</label>
                <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Factura</label>
                    <input type="date" name="issue_date" value={formData.issue_date} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Vencimiento</label>
                    <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
            </div>
             <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Base Imponible (€)</label>
                    <input type="number" name="subtotal" value={formData.subtotal} onChange={handleAmountChange} required min="0" step="0.01" className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IVA ({settings.iva}%)</label>
                    <input type="number" name="tax" value={formData.tax} disabled className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total (€)</label>
                    <input type="number" name="total" value={formData.total} disabled className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                <select name="status" value={formData.status} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagada">Pagada</option>
                    <option value="Vencida">Vencida</option>
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar Factura</button>
            </div>
        </form>
    );
};

const PurchaseInvoicesPage: React.FC = () => {
    const { purchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, suppliers, settings } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortablePurchaseInvoiceKeys; direction: SortDirection }>({ key: 'issue_date', direction: 'descending' });
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');

     useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        
        setReportStartDate(formatDate(firstDay));
        setReportEndDate(formatDate(lastDay));
    }, []);

    const sortedInvoices = useMemo(() => {
        const invoicesWithData = purchaseInvoices.map(inv => ({
            ...inv,
            supplierName: suppliers.find(s => s.id === inv.supplier_id)?.name || 'Proveedor desconocido'
        }));
        
        invoicesWithData.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;

            let comparison = 0;
            if (sortConfig.key === 'issue_date' || sortConfig.key === 'due_date') {
                comparison = new Date(aValue.toString()).getTime() - new Date(bValue.toString()).getTime();
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }
            
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return invoicesWithData;
    }, [purchaseInvoices, suppliers, sortConfig]);

    const requestSort = (key: SortablePurchaseInvoiceKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortablePurchaseInvoiceKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };
    
    const handleOpenModal = (invoice: PurchaseInvoice | null = null) => {
        setEditingInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingInvoice(null);
        setIsModalOpen(false);
    };

    const handleSave = async (invoiceData: Omit<PurchaseInvoice, 'id'> | PurchaseInvoice) => {
        try {
            if ('id' in invoiceData) {
                await updatePurchaseInvoice(invoiceData as PurchaseInvoice);
            } else {
                await addPurchaseInvoice(invoiceData);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save purchase invoice:", error);
            alert(`Error al guardar la factura de compra: ${error.message || 'Ocurrió un error desconocido.'}`);
        }
    };

    const handleDeleteClick = (invoice: PurchaseInvoice) => {
        setInvoiceToDelete(invoice);
        setIsConfirmModalOpen(true);
    };

    const handleMarkAsPaid = async (invoice: PurchaseInvoice) => {
        if (invoice.status === 'Pagada') return;
        try {
            await updatePurchaseInvoice({ ...invoice, status: 'Pagada' });
        } catch (error: any) {
            console.error("Failed to mark invoice as paid:", error);
            alert(`Error al marcar la factura como pagada: ${error.message || "Ocurrió un error desconocido."}`);
        }
    };

    const confirmDelete = async () => {
        if (invoiceToDelete) {
            try {
                await deletePurchaseInvoice(invoiceToDelete.id);
            } catch (error) {
                console.error("Failed to delete purchase invoice:", error);
                alert("Error al borrar la factura de compra.");
            } finally {
                setInvoiceToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    const handleGenerateReport = () => {
        if (!reportStartDate || !reportEndDate) {
            alert('Por favor, selecciona un rango de fechas.');
            return;
        }

        const filtered = sortedInvoices.filter(inv => {
            const invDate = new Date(inv.issue_date.replace(/-/g, '/'));
            const startDate = new Date(reportStartDate.replace(/-/g, '/'));
            const endDate = new Date(reportEndDate.replace(/-/g, '/'));
            endDate.setHours(23, 59, 59, 999);
            
            return invDate >= startDate && invDate <= endDate;
        });

        if (filtered.length === 0) {
            alert('No se encontraron facturas de compra en el rango de fechas seleccionado.');
            return;
        }

        exportPurchaseInvoicesToPDF(filtered, reportStartDate, reportEndDate, settings);
    };

    const getStatusColor = (status: PurchaseInvoiceStatus) => {
        switch (status) {
            case 'Pagada': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Vencida': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Facturas de Compra</h1>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                        <UploadIcon /> <span>Importar</span>
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                        <PlusIcon /> <span>Registrar Factura</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Generar Informe de Compras</h2>
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <label htmlFor="purchaseStartDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Desde:</label>
                        <input
                            type="date"
                            id="purchaseStartDate"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="ml-2 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="purchaseEndDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta:</label>
                        <input
                            type="date"
                            id="purchaseEndDate"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className="ml-2 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"
                    >
                        <DownloadIcon />
                        <span>Generar PDF</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('supplierName')}>Proveedor{getSortIndicator('supplierName')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('invoice_number')}>Nº Factura{getSortIndicator('invoice_number')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('issue_date')}>Fecha Factura{getSortIndicator('issue_date')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('due_date')}>Vencimiento{getSortIndicator('due_date')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('total')}>Total{getSortIndicator('total')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('status')}>Estado{getSortIndicator('status')}</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInvoices.map(invoice => (
                            <tr key={invoice.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.supplierName}</td>
                                <td className="px-6 py-4">{invoice.invoice_number}</td>
                                <td className="px-6 py-4">{new Date(invoice.issue_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}</td>
                                <td className={`px-6 py-4 ${invoice.status === 'Vencida' ? 'text-red-600 font-semibold' : ''}`}>{new Date(invoice.due_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(invoice.total)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end space-x-2">
                                        {invoice.status !== 'Pagada' && (
                                            <button
                                                onClick={() => handleMarkAsPaid(invoice)}
                                                className="text-green-500 hover:text-green-700"
                                                title="Marcar como Pagada"
                                            >
                                                <CurrencyEuroIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={() => handleOpenModal(invoice)} className="text-yellow-500 hover:text-yellow-700" title="Editar"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(invoice)} className="text-red-500 hover:text-red-700" title="Eliminar"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {purchaseInvoices.length === 0 && <p className="text-center py-10 text-gray-500">No hay facturas de compra registradas.</p>}
            </div>

            <PurchaseInvoiceImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingInvoice ? 'Editar Factura de Compra' : 'Registrar Factura de Compra'}>
                <PurchaseInvoiceForm invoice={editingInvoice} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado de Factura"
                message={`¿Estás seguro de que quieres borrar la factura de compra "${invoiceToDelete?.invoice_number}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default PurchaseInvoicesPage;