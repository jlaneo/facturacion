import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Invoice, InvoiceItem, Category, InvoiceStatus } from '../types';
import { TrashIcon, PlusIcon } from '../components/icons';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../lib/utils';

interface InvoiceFormProps {
    existingInvoice: Invoice | null;
    onDone: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ existingInvoice, onDone }) => {
    const { clients, products, addInvoice, updateInvoice, settings } = useData();
    
    const [invoiceData, setInvoiceData] = useState(() => {
        if (existingInvoice) {
            return {
                invoice_number: existingInvoice.invoice_number,
                client_id: existingInvoice.client_id,
                issue_date: existingInvoice.issue_date,
                due_date: existingInvoice.due_date,
                items: existingInvoice.items || [],
                status: existingInvoice.status,
            };
        }

        const today = new Date();
        let issueDate: Date;

        if (today.getDate() <= 15) {
            // Day 1-15: issue date is last day of previous month.
            issueDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else {
            // Day 16-end: issue date is last day of current month.
            issueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        
        // Due date is always 15th of the next month.
        const dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 15);

        return {
            invoice_number: '',
            client_id: '',
            issue_date: issueDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            items: [{ id: new Date().toISOString(), product_id: null, description: '', category: Category.Maintenance, quantity: 1, unit_price: 0 }],
            status: 'Borrador' as InvoiceStatus,
        };
    });

    const selectedClient = clients.find(c => c.id === invoiceData.client_id);

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...invoiceData.items];
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
        setInvoiceData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setInvoiceData(prev => ({
            ...prev,
            items: [...prev.items, { id: new Date().toISOString(), product_id: null, description: '', category: Category.Maintenance, quantity: 1, unit_price: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setInvoiceData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };
    
    const { subtotal, tax, total } = React.useMemo(() => {
        const sub = (invoiceData.items || []).reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
        // Check if the selected client is exempt from EU VAT
        const isVatExempt = selectedClient?.is_eu_vat_exempt;
        const taxAmount = isVatExempt ? 0 : sub * (settings.iva / 100);
        return { subtotal: sub, tax: taxAmount, total: sub + taxAmount };
    }, [invoiceData.items, settings.iva, selectedClient]);


    const handleSubmit = async (download = false) => {
        if (!invoiceData.client_id) {
            alert('Por favor, selecciona un cliente.');
            return;
        }

        try {
            if (existingInvoice) {
                const updatedInvoice: Invoice = {
                    ...existingInvoice,
                    ...invoiceData,
                    subtotal,
                    tax,
                    total,
                };
                await updateInvoice(updatedInvoice);
                 if (download) {
                    const client = clients.find(c => c.id === updatedInvoice.client_id);
                    if(client) generateInvoicePDF(updatedInvoice, client, settings);
                }
            } else {
                const newInvoiceData = { ...invoiceData, subtotal, tax, total };
                const newInvoice = await addInvoice(newInvoiceData as Omit<Invoice, 'id' | 'user_id'>);
                if (download) {
                    const client = clients.find(c => c.id === newInvoice.client_id);
                    if(client) generateInvoicePDF(newInvoice, client, settings);
                }
            }
            onDone();
        } catch(error: any) {
            console.error("Failed to save invoice:", error);
            const message = error?.message && typeof error.message === 'string'
                ? error.message
                : 'Ocurrió un error al guardar. Revisa la consola para más detalles.';
            alert(`Error al guardar la factura: ${message}`);
        }
    };

    const addMaintenanceFee = () => {
        if (!selectedClient || !selectedClient.monthly_maintenance_fee) return;

        const maintenanceExists = invoiceData.items.some(item => 
            (item.description || '').toLowerCase().includes('mantenimiento mensual')
        );

        if (maintenanceExists) {
            alert('La cuota de mantenimiento mensual ya ha sido añadida a esta factura.');
            return;
        }

        const maintenanceItem: InvoiceItem = {
            id: new Date().toISOString(),
            product_id: null,
            description: `Mantenimiento Mensual - ${selectedClient.name}`,
            category: Category.Maintenance,
            quantity: 1,
            unit_price: selectedClient.monthly_maintenance_fee,
        };

        setInvoiceData(prev => ({
            ...prev,
            items: [...prev.items, maintenanceItem]
        }));
    };


    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{existingInvoice ? 'Editar Factura' : 'Nueva Factura'}</h1>
            </div>

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Factura (opcional)</label>
                    <input
                        type="text"
                        value={invoiceData.invoice_number}
                        onChange={e => setInvoiceData(prev => ({...prev, invoice_number: e.target.value}))}
                        placeholder="Dejar en blanco para autogenerar"
                        disabled={!!existingInvoice}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                    <select
                        value={invoiceData.client_id}
                        onChange={e => setInvoiceData(prev => ({...prev, client_id: e.target.value}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Selecciona un cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {selectedClient && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <p>{selectedClient.address}</p>
                            <p>NIF: {selectedClient.tax_id}</p>
                             {selectedClient.is_eu_vat_exempt && (
                                <p className="mt-1 p-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md text-center">
                                    Cliente Intracomunitario (0% IVA)
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Emisión</label>
                    <input
                        type="date"
                        value={invoiceData.issue_date}
                        onChange={e => setInvoiceData(prev => ({...prev, issue_date: e.target.value}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Vencimiento</label>
                    <input
                        type="date"
                        value={invoiceData.due_date}
                        onChange={e => setInvoiceData(prev => ({...prev, due_date: e.target.value}))}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="text-left py-2 pr-2">Producto/Servicio</th>
                            <th className="text-left py-2 pr-2">Descripción</th>
                            <th className="text-left py-2 pr-2">Cant.</th>
                            <th className="text-left py-2 pr-2">Precio</th>
                            <th className="text-left py-2 pr-2">Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoiceData.items || []).map((item, index) => (
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
                                <td className="py-2 pr-2 font-semibold">{formatCurrency(item.quantity * item.unit_price)}</td>
                                <td className="py-2">
                                    <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="flex items-center space-x-4">
                <button onClick={addItem} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg flex items-center space-x-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200">
                    <PlusIcon />
                    <span>Añadir Línea</span>
                </button>
                {selectedClient && selectedClient.monthly_maintenance_fee && selectedClient.monthly_maintenance_fee > 0 && (
                     <button onClick={addMaintenanceFee} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                        <PlusIcon />
                        <span>Añadir Cuota Mantenimiento</span>
                    </button>
                )}
            </div>
            
            {/* Totals & Status */}
            <div className="flex justify-between items-start flex-wrap mt-6 gap-6">
                <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                    <select
                        value={invoiceData.status}
                        onChange={e => setInvoiceData(prev => ({...prev, status: e.target.value as InvoiceStatus}))}
                        className="mt-1 block p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option>Borrador</option>
                        <option>Enviada</option>
                        <option>Pagada</option>
                        { existingInvoice && <option>Vencida</option> }
                    </select>
                </div>

                <div className="w-full sm:w-auto sm:max-w-sm ml-auto">
                    <table className="w-full text-right">
                        <tbody>
                            <tr>
                                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Subtotal</td>
                                <td className="py-2 pl-4 font-semibold text-gray-800 dark:text-gray-200 w-32">{formatCurrency(subtotal)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">IVA ({selectedClient?.is_eu_vat_exempt ? 0 : settings.iva}%)</td>
                                <td className="py-2 pl-4 font-semibold text-gray-800 dark:text-gray-200 w-32">{formatCurrency(tax)}</td>
                            </tr>
                            <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                                <td className="pt-3 pr-4 text-lg font-bold text-gray-900 dark:text-white">Total</td>
                                <td className="pt-3 pl-4 text-xl font-bold text-gray-900 dark:text-white w-32">{formatCurrency(total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onDone} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="button" onClick={() => handleSubmit(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Guardar Factura</button>
                <button type="button" onClick={() => handleSubmit(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Guardar y Descargar</button>
            </div>

        </div>
    );
};

export default InvoiceForm;