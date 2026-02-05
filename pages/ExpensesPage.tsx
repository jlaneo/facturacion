import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Expense, CompanySettings } from '../types';
import Modal from '../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon, DownloadIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import { exportExpensesToPDF } from '../lib/exportUtils';
import { formatCurrency } from '../lib/utils';


type ExpenseWithDetails = Expense & { categoryName: string; supplierName: string };
type SortableExpenseKeys = keyof ExpenseWithDetails;
type SortDirection = 'ascending' | 'descending';

const ExpenseForm: React.FC<{
    expense?: Expense | null;
    onSave: (expense: Omit<Expense, 'id'> | Expense) => Promise<void>;
    onCancel: () => void;
}> = ({ expense, onSave, onCancel }) => {
    const { suppliers, expenseCategories } = useData();
    const [formData, setFormData] = useState({
        expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
        description: expense?.description || '',
        amount: expense?.amount || 0,
        category_id: expense?.category_id || null,
        supplier_id: expense?.supplier_id || null,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let finalValue: string | number | null = name === 'amount' ? parseFloat(value) || 0 : value;
        if ((name === 'category_id' || name === 'supplier_id') && value === '') {
            finalValue = null;
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(expense ? { ...expense, ...formData } : formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                <input type="text" name="description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha del Gasto</label>
                    <input type="date" name="expense_date" value={formData.expense_date} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Importe (€)</label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                    <select name="category_id" value={formData.category_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="">Sin categoría</option>
                        {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor</label>
                    <select name="supplier_id" value={formData.supplier_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="">Sin proveedor</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar Gasto</button>
            </div>
        </form>
    );
};


const ExpensesPage: React.FC = () => {
    const { expenses, addExpense, updateExpense, deleteExpense, suppliers, expenseCategories, settings } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableExpenseKeys; direction: SortDirection }>({ key: 'expense_date', direction: 'descending' });
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
    
    const sortedExpenses = useMemo(() => {
        const expensesWithDetails: ExpenseWithDetails[] = expenses.map(exp => ({
            ...exp,
            categoryName: expenseCategories.find(c => c.id === exp.category_id)?.name || '-',
            supplierName: suppliers.find(s => s.id === exp.supplier_id)?.name || '-'
        }));

        expensesWithDetails.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            let comparison = 0;
            if (sortConfig.key === 'expense_date') {
                 comparison = new Date(aValue.toString()).getTime() - new Date(bValue.toString()).getTime();
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
        return expensesWithDetails;
    }, [expenses, suppliers, expenseCategories, sortConfig]);

    const requestSort = (key: SortableExpenseKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableExpenseKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleOpenModal = (expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingExpense(null);
        setIsModalOpen(false);
    };

    const handleSave = async (expenseData: Omit<Expense, 'id' | 'user_id' | 'created_at'> | Expense) => {
        try {
            if ('id' in expenseData) {
                await updateExpense(expenseData as Expense);
            } else {
                await addExpense(expenseData);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save expense:", error);
            const message = error?.message && typeof error.message === 'string'
                ? error.message
                : 'Ocurrió un error desconocido. Revisa la consola para más detalles.';
            alert(`Error al guardar el gasto: ${message}`);
        }
    };

    const handleDeleteClick = (expense: Expense) => {
        setExpenseToDelete(expense);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (expenseToDelete) {
            try {
                await deleteExpense(expenseToDelete.id);
            } catch (error) {
                console.error("Failed to delete expense:", error);
                alert("Error al borrar el gasto.");
            } finally {
                setExpenseToDelete(null);
                setIsConfirmModalOpen(false);
            }
        }
    };

    const handleGenerateReport = () => {
        if (!reportStartDate || !reportEndDate) {
            alert('Por favor, selecciona un rango de fechas.');
            return;
        }

        const filtered = sortedExpenses.filter(exp => {
            const expDate = new Date(exp.expense_date.replace(/-/g, '/'));
            const startDate = new Date(reportStartDate.replace(/-/g, '/'));
            const endDate = new Date(reportEndDate.replace(/-/g, '/'));
            endDate.setHours(23, 59, 59, 999); // Include the whole end day
            
            return expDate >= startDate && expDate <= endDate;
        });

        if (filtered.length === 0) {
            alert('No se encontraron gastos en el rango de fechas seleccionado.');
            return;
        }

        exportExpensesToPDF(filtered, reportStartDate, reportEndDate, settings);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Registro de Gastos</h1>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                    <PlusIcon /> <span>Registrar Gasto</span>
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Generar Informe de Gastos</h2>
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Desde:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="ml-2 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta:</label>
                        <input
                            type="date"
                            id="endDate"
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
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('expense_date')}>Fecha{getSortIndicator('expense_date')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('description')}>Descripción{getSortIndicator('description')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('categoryName')}>Categoría{getSortIndicator('categoryName')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('supplierName')}>Proveedor{getSortIndicator('supplierName')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('amount')}>Importe{getSortIndicator('amount')}</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedExpenses.map(expense => (
                            <tr key={expense.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{new Date(expense.expense_date.replace(/-/g, '/')).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{expense.description}</td>
                                <td className="px-6 py-4">{expense.categoryName}</td>
                                <td className="px-6 py-4">{expense.supplierName}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(expense.amount)}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleOpenModal(expense)} className="text-yellow-500 hover:text-yellow-700"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteClick(expense)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {expenses.length === 0 && <p className="text-center py-10 text-gray-500">No hay gastos registrados.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingExpense ? 'Editar Gasto' : 'Registrar Gasto'}>
                <ExpenseForm expense={editingExpense} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar Borrado de Gasto"
                message={`¿Estás seguro de que quieres borrar el gasto "${expenseToDelete?.description}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default ExpensesPage;