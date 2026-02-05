
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Client } from '../types';
import Modal from '../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon, TableCellsIcon, DownloadIcon, RefreshIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import { exportToCSV, exportListToPDF } from '../lib/exportUtils';
import { formatCurrency } from '../lib/utils';

type SortableClientKeys = keyof Client;
type SortDirection = 'ascending' | 'descending';

const ClientForm: React.FC<{ client?: Client | null; onSave: (client: Omit<Client, 'id'> | Client) => Promise<void>; onCancel: () => void; }> = ({ client, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: client?.name || '',
        tax_id: client?.tax_id || '',
        address: client?.address || '',
        email: client?.email || '',
        monthly_maintenance_fee: client?.monthly_maintenance_fee || 0,
        is_eu_vat_exempt: client?.is_eu_vat_exempt || false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked 
            : (name === 'monthly_maintenance_fee' ? parseFloat(value) || 0 : value);
            
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(client ? { ...client, ...formData } : formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre o Razón Social</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuota de Mantenimiento Mensual (€)</label>
                <input type="number" name="monthly_maintenance_fee" value={formData.monthly_maintenance_fee} onChange={handleChange} min="0" step="0.01" className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">NIF/CIF</label>
                <input type="text" name="tax_id" value={formData.tax_id} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección Fiscal</label>
                <textarea name="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"></textarea>
            </div>
            <div className="flex items-center">
                <input
                    id="is_eu_vat_exempt"
                    name="is_eu_vat_exempt"
                    type="checkbox"
                    checked={formData.is_eu_vat_exempt}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                />
                <label htmlFor="is_eu_vat_exempt" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Cliente Intracomunitario (Exento de IVA)
                </label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar</button>
            </div>
        </form>
    );
};

const ClientsPage: React.FC = () => {
    const { clients, addClient, updateClient, deleteClient, generateNextMonthlyInvoice } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableClientKeys; direction: SortDirection }>({ key: 'name', direction: 'ascending' });
    const [processingId, setProcessingId] = useState<string | null>(null);

    const sortedClients = useMemo(() => {
        const sortableItems = [...clients];
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return sortableItems;
    }, [clients, sortConfig]);

    const requestSort = (key: SortableClientKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableClientKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleOpenModal = (client: Client | null = null) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingClient(null);
        setIsModalOpen(false);
    };

    const handleSave = async (clientData: Omit<Client, 'id'> | Client) => {
        try {
            if ('id' in clientData) {
                await updateClient(clientData as Client);
            } else {
                await addClient(clientData);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save client:", error);
            alert(`Error al guardar el cliente: ${error.message || 'Ocurrió un error.'}`);
        }
    };

    const handleDeleteClick = (client: Client) => {
        setClientToDelete(client);
        setIsConfirmModalOpen(true);
    };

    const handleGenerateMonthly = async (client: Client) => {
        setProcessingId(client.id);
        try {
            const result = await generateNextMonthlyInvoice(client.id);
            if (result.success) {
                // Opcional: Podrías usar un toast aquí en vez de un alert
                console.log(result.message);
            } else {
                alert(result.message);
            }
        } catch (err: any) {
            alert("Ocurrió un error inesperado al generar la factura.");
        } finally {
            setProcessingId(null);
        }
    };

    const confirmDelete = async () => {
        if (clientToDelete) {
            try {
                await deleteClient(clientToDelete.id);
            } catch (error) {
                console.error("Failed to delete client:", error);
                alert("Error al borrar el cliente.");
            } finally {
                setClientToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    const handleExportCSV = () => {
        const dataToExport = sortedClients.map(({ id, user_id, ...rest }) => rest);
        exportToCSV(dataToExport, 'clientes');
    };

    const handleExportPDF = () => {
        const columns = [
            { header: 'Nombre', dataKey: 'name' },
            { header: 'Email', dataKey: 'email' },
            { header: 'NIF/CIF', dataKey: 'tax_id' },
            { header: 'Dirección', dataKey: 'address' },
            { header: 'Cuota Mantenimiento', dataKey: 'monthly_maintenance_fee' },
        ];
         const data = sortedClients.map(client => ({
            ...client,
            monthly_maintenance_fee: formatCurrency(client.monthly_maintenance_fee || 0)
        }));
        exportListToPDF(columns, data, 'listado-clientes', 'Listado de Clientes');
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Clientes</h1>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button onClick={handleExportCSV} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm">
                        <TableCellsIcon /> <span>CSV</span>
                    </button>
                    <button onClick={handleExportPDF} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm">
                        <DownloadIcon /> <span>PDF</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"
                    >
                        <PlusIcon />
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('name')}>Nombre{getSortIndicator('name')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('email')}>Email{getSortIndicator('email')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('tax_id')}>NIF/CIF{getSortIndicator('tax_id')}</th>
                             <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('is_eu_vat_exempt')}>Intracom.{getSortIndicator('is_eu_vat_exempt')}</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedClients.map(client => (
                            <tr key={client.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{client.name}</td>
                                <td className="px-6 py-4">{client.email}</td>
                                <td className="px-6 py-4">{client.tax_id}</td>
                                <td className="px-6 py-4">
                                    {client.is_eu_vat_exempt && (
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                            Sí
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end items-center space-x-2">
                                        <button 
                                            onClick={() => handleGenerateMonthly(client)} 
                                            disabled={processingId === client.id}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 transition-all uppercase tracking-tighter"
                                            title="Generar borrador basado en la última factura o cuota de mantenimiento"
                                        >
                                            {processingId === client.id ? <RefreshIcon className="animate-spin mr-1.5 h-4 w-4" /> : <RefreshIcon className="mr-1.5 h-4 w-4" />}
                                            FACTURAR MES
                                        </button>
                                        <button onClick={() => handleOpenModal(client)} className="text-yellow-500 hover:text-yellow-700 p-2" title="Editar"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(client)} className="text-red-500 hover:text-red-700 p-2" title="Eliminar"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {clients.length === 0 && <p className="text-center py-10 text-gray-500">No hay clientes. Añade tu primer cliente.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClient ? 'Editar Cliente' : 'Añadir Cliente'}>
                <ClientForm client={editingClient} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado de Cliente"
                message={`¿Estás seguro de que quieres borrar al cliente "${clientToDelete?.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default ClientsPage;
