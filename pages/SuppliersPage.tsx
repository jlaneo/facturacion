import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Supplier } from '../types';
import Modal from '../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';

type SortableSupplierKeys = keyof Supplier;
type SortDirection = 'ascending' | 'descending';

const SupplierForm: React.FC<{ supplier?: Supplier | null; onSave: (supplier: Omit<Supplier, 'id'> | Supplier) => Promise<void>; onCancel: () => void; }> = ({ supplier, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        tax_id: supplier?.tax_id || '',
        address: supplier?.address || '',
        email: supplier?.email || '',
        phone: supplier?.phone || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(supplier ? { ...supplier, ...formData } : formData);
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">NIF/CIF</label>
                <input type="text" name="tax_id" value={formData.tax_id} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección Fiscal</label>
                <textarea name="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"></textarea>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar</button>
            </div>
        </form>
    );
};

const SuppliersPage: React.FC = () => {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableSupplierKeys; direction: SortDirection }>({ key: 'name', direction: 'ascending' });

    const sortedSuppliers = useMemo(() => {
        const sortableItems = [...suppliers];
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            const comparison = String(aValue).localeCompare(String(bValue));
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return sortableItems;
    }, [suppliers, sortConfig]);

    const requestSort = (key: SortableSupplierKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableSupplierKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleOpenModal = (supplier: Supplier | null = null) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingSupplier(null);
        setIsModalOpen(false);
    };

    const handleSave = async (supplierData: Omit<Supplier, 'id'> | Supplier) => {
        try {
            if ('id' in supplierData) {
                await updateSupplier(supplierData as Supplier);
            } else {
                await addSupplier(supplierData);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save supplier:", error);
            alert(`Error al guardar el proveedor: ${error.message || 'Ocurrió un error desconocido.'}`);
        }
    };

    const handleDeleteClick = (supplier: Supplier) => {
        setSupplierToDelete(supplier);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (supplierToDelete) {
            try {
                await deleteSupplier(supplierToDelete.id);
            } catch (error) {
                console.error("Failed to delete supplier:", error);
                alert("Error al borrar el proveedor.");
            } finally {
                setSupplierToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Proveedores</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"
                >
                    <PlusIcon />
                    <span>Nuevo Proveedor</span>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('name')}>Nombre{getSortIndicator('name')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('email')}>Email{getSortIndicator('email')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('tax_id')}>NIF/CIF{getSortIndicator('tax_id')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('phone')}>Teléfono{getSortIndicator('phone')}</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSuppliers.map(supplier => (
                            <tr key={supplier.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{supplier.name}</td>
                                <td className="px-6 py-4">{supplier.email}</td>
                                <td className="px-6 py-4">{supplier.tax_id}</td>
                                <td className="px-6 py-4">{supplier.phone || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleOpenModal(supplier)} className="text-yellow-500 hover:text-yellow-700"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(supplier)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {suppliers.length === 0 && <p className="text-center py-10 text-gray-500">No hay proveedores. Añade tu primer proveedor.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSupplier ? 'Editar Proveedor' : 'Añadir Proveedor'}>
                <SupplierForm supplier={editingSupplier} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado de Proveedor"
                message={`¿Estás seguro de que quieres borrar al proveedor "${supplierToDelete?.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default SuppliersPage;
