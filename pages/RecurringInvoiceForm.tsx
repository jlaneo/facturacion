import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { RecurringInvoice, InvoiceItem, Category, Frequency, RecurringInvoiceStatus } from '../types';
import { TrashIcon, PlusIcon } from '../components/icons';
import { CATEGORIES } from '../constants';

interface RecurringInvoiceFormProps {
    existingInvoice: RecurringInvoice | null;
    onDone: () => void;
}

const RecurringInvoiceForm: React.FC<RecurringInvoiceFormProps> = ({ existingInvoice, onDone }) => {
    const { clients, products, addRecurringInvoice, updateRecurringInvoice } = useData();

    const [formData, setFormData] = useState(() => {
        if (existingInvoice) {
            return {
                client_id: existingInvoice.client_id,
                frequency: existingInvoice.frequency,
                start_date: existingInvoice.start_date,
                next_due_date: existingInvoice.next_due_date,
                items: existingInvoice.items,
                status: existingInvoice.status,
            };
        }
        return {
            client_id: '',
            frequency: 'monthly' as Frequency,
            start_date: new Date().toISOString().split('T')[0],
            next_due_date: new Date().toISOString().split('T')[0],
            items: [{ id: crypto.randomUUID(), product_id: null, description: '', category: Category.Maintenance, quantity: 1, unit_price: 0 }],
            status: 'active' as RecurringInvoiceStatus,
        };
    });

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };
        
        if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            if (product) {
                item.description = product.name;
                item.unit_price = product.unit_price;
                item.category = product.category;
            } else {
                 item.product_id = null;
            }
        }
        newItems[index] = item;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { id: crypto.randomUUID(), product_id: null, description: '', category: Category.Maintenance, quantity: 1, unit_price: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.client_id) {
            alert('Por favor, selecciona un cliente.');
            return;
        }
        if (formData.items.length === 0) {
            alert('La factura debe tener al menos un concepto.');
            return;
        }

        try {
            if (existingInvoice) {
                const updatedInvoice: RecurringInvoice = {
                    ...existingInvoice,
                    ...formData,
                };
                // We no longer overwrite next_due_date based on start_date logic here, 
                // as the user now has an explicit field to control it.
                
                await updateRecurringInvoice(updatedInvoice);
            } else {
                const newRecInvoice: Omit<RecurringInvoice, 'id' | 'user_id'> = {
                    ...formData,
                    // next_due_date is now taken directly from formData
                };
                await addRecurringInvoice(newRecInvoice);
            }
            onDone();
        } catch(error: any) {
            console.error("Failed to save recurring invoice:", error);
            alert(`Error al guardar: ${error.message}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
            <h1 className="text-3xl font-bold">{existingInvoice ? 'Editar' : 'Nueva'} Factura Recurrente</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                    <select
                        value={formData.client_id}
                        onChange={e => setFormData(prev => ({...prev, client_id: e.target.value}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        required
                    >
                        <option value="">Selecciona un cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Inicio</label>
                    <input
                        type="date"
                        value={formData.start_date}
                        onChange={e => setFormData(prev => ({...prev, start_date: e.target.value}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Próxima Generación</label>
                    <input
                        type="date"
                        value={formData.next_due_date}
                        onChange={e => setFormData(prev => ({...prev, next_due_date: e.target.value}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Frecuencia</label>
                    <select
                        value={formData.frequency}
                        onChange={e => setFormData(prev => ({...prev, frequency: e.target.value as Frequency}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="monthly">Mensual</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                 <h2 className="text-lg font-semibold mb-2">Conceptos de la Factura</h2>
                <table className="w-full">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="text-left py-2 pr-2">Producto/Servicio</th>
                            <th className="text-left py-2 pr-2">Descripción</th>
                            <th className="text-left py-2 pr-2">Cant.</th>
                            <th className="text-left py-2 pr-2">Precio</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="py-2 pr-2 w-1/4">
                                    <select value={item.product_id || ''} onChange={e => handleItemChange(index, 'product_id', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                                        <option value="">Concepto Manual</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </td>
                                <td className="py-2 pr-2 w-1/3">
                                    <input type="text" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                                </td>
                                <td className="py-2 pr-2">
                                    <input type="number" min="0" step="any" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-20 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                                </td>
                                <td className="py-2 pr-2">
                                    <input type="number" min="0" step="any" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                                </td>
                                <td className="py-2">
                                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <button type="button" onClick={addItem} className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg flex items-center space-x-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200">
                    <PlusIcon />
                    <span>Añadir Línea</span>
                </button>
            </div>

            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onDone} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar</button>
            </div>
        </form>
    );
};

export default RecurringInvoiceForm;