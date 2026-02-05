import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Product, Category } from '../types';
import Modal from '../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon, TableCellsIcon, DownloadIcon } from '../components/icons';
import { CATEGORIES } from '../constants';
import ConfirmationModal from '../components/ConfirmationModal';
import { exportToCSV, exportListToPDF } from '../lib/exportUtils';
import { formatCurrency } from '../lib/utils';

type SortableProductKeys = keyof Product;
type SortDirection = 'ascending' | 'descending';

const ProductForm: React.FC<{ product?: Product | null; onSave: (product: Omit<Product, 'id'> | Product) => Promise<void>; onCancel: () => void; }> = ({ product, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        category: product?.category || Category.Maintenance,
        unit_price: product?.unit_price || 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'unit_price' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(product ? { ...product, ...formData } : formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                <select name="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio Unitario (€)</label>
                <input type="number" name="unit_price" value={formData.unit_price} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar</button>
            </div>
        </form>
    );
};


const ProductsPage: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableProductKeys; direction: SortDirection }>({ key: 'name', direction: 'ascending' });

    const sortedProducts = useMemo(() => {
        const sortableItems = [...products];
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return sortableItems;
    }, [products, sortConfig]);

    const requestSort = (key: SortableProductKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableProductKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleOpenModal = (product: Product | null = null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingProduct(null);
        setIsModalOpen(false);
    };

    const handleSave = async (productData: Omit<Product, 'id'> | Product) => {
        try {
            if ('id' in productData) {
                await updateProduct(productData as Product);
            } else {
                await addProduct(productData);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save product:", error);
            const message = error?.message && typeof error.message === 'string'
                ? error.message
                : 'Ocurrió un error desconocido. Revisa la consola para más detalles.';
            alert(`Error al guardar el producto: ${message}`);
        }
    };
    
    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (productToDelete) {
            try {
                await deleteProduct(productToDelete.id);
            } catch (error) {
                console.error("Failed to delete product:", error);
                alert("Error al borrar el producto.");
            } finally {
                setProductToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    const handleExportCSV = () => {
        const dataToExport = sortedProducts.map(({ id, user_id, ...rest }) => ({
            ...rest,
            unit_price: rest.unit_price.toFixed(2)
        }));
        exportToCSV(dataToExport, 'productos-y-servicios');
    };

    const handleExportPDF = () => {
        const columns = [
            { header: 'Nombre', dataKey: 'name' },
            { header: 'Categoría', dataKey: 'category' },
            { header: 'Precio Unitario', dataKey: 'unit_price' },
        ];
         const data = sortedProducts.map(p => ({
            ...p,
            unit_price: formatCurrency(p.unit_price)
        }));
        exportListToPDF(columns, data, 'listado-productos', 'Listado de Productos y Servicios');
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Productos y Servicios</h1>
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
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('name')}>Nombre{getSortIndicator('name')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('category')}>Categoría{getSortIndicator('category')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('unit_price')}>Precio Unitario{getSortIndicator('unit_price')}</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProducts.map(product => (
                            <tr key={product.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{product.name}</td>
                                <td className="px-6 py-4">{product.category}</td>
                                <td className="px-6 py-4">{formatCurrency(product.unit_price)}</td>
                                <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleOpenModal(product)} className="text-yellow-500 hover:text-yellow-700"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(product)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && <p className="text-center py-10 text-gray-500">No hay productos. Añade tu primer producto.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Editar Producto' : 'Añadir Producto'}>
                <ProductForm product={editingProduct} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado de Producto"
                message={`¿Estás seguro de que quieres borrar el producto "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default ProductsPage;