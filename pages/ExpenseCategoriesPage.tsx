import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ExpenseCategory } from '../types';
import Modal from '../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';

type SortableKeys = keyof ExpenseCategory;
type SortDirection = 'ascending' | 'descending';

const ExpenseCategoryForm: React.FC<{ category?: ExpenseCategory | null; onSave: (category: Omit<ExpenseCategory, 'id'>) => Promise<void>; onCancel: () => void; }> = ({ category, onSave, onCancel }) => {
    const [name, setName] = useState(category?.name || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(category ? { ...category, name } : { name });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la Categoría</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar</button>
            </div>
        </form>
    );
};

const ExpenseCategoriesPage: React.FC = () => {
    const { expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection }>({ key: 'name', direction: 'ascending' });

    const sortedCategories = useMemo(() => {
        const sortableItems = [...expenseCategories];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [expenseCategories, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleOpenModal = (category: ExpenseCategory | null = null) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCategory(null);
        setIsModalOpen(false);
    };

    const handleSave = async (categoryData: Omit<ExpenseCategory, 'id'>) => {
        try {
            if (editingCategory) {
                await updateExpenseCategory({ ...editingCategory, ...categoryData });
            } else {
                await addExpenseCategory(categoryData as Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at'>);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save category:", error);
            alert(`Error al guardar la categoría: ${error.message}`);
        }
    };

    const handleDeleteClick = (category: ExpenseCategory) => {
        setCategoryToDelete(category);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (categoryToDelete) {
            try {
                await deleteExpenseCategory(categoryToDelete.id);
            } catch (error) {
                console.error("Failed to delete category:", error);
                alert("Error al borrar la categoría.");
            } finally {
                setCategoryToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Tipos de Gasto</h1>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                    <PlusIcon />
                    <span>Nuevo Tipo de Gasto</span>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('name')}>Nombre{getSortIndicator('name')}</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedCategories.map(category => (
                            <tr key={category.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{category.name}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleOpenModal(category)} className="text-yellow-500 hover:text-yellow-700"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(category)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {expenseCategories.length === 0 && <p className="text-center py-10 text-gray-500">No hay tipos de gasto. Añade tu primera categoría.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCategory ? 'Editar Tipo de Gasto' : 'Nuevo Tipo de Gasto'}>
                <ExpenseCategoryForm category={editingCategory} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado"
                message={`¿Estás seguro de que quieres borrar la categoría "${categoryToDelete?.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default ExpenseCategoriesPage;
