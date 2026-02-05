
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabaseClient';
import { Client, Product, Invoice, InvoiceItem, CompanySettings, Supplier, PurchaseInvoice, ExpenseCategory, Expense, RecurringInvoice, RecurringInvoiceStatus, Frequency, Category } from '../types';
import { DEFAULT_COMPANY_SETTINGS } from '../constants';

interface DataContextType {
    clients: Client[];
    addClient: (client: Omit<Client, 'id' | 'user_id'>) => Promise<void>;
    updateClient: (client: Client) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    suppliers: Supplier[];
    addSupplier: (supplier: Omit<Supplier, 'id' | 'user_id'>) => Promise<void>;
    updateSupplier: (supplier: Supplier) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    products: Product[];
    addProduct: (product: Omit<Product, 'id' | 'user_id'>) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    invoices: Invoice[];
    addInvoice: (invoice: Omit<Invoice, 'id' | 'user_id'>) => Promise<Invoice>;
    updateInvoice: (invoice: Invoice) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    deleteDraftInvoices: () => Promise<void>;
    generateNextMonthlyInvoice: (clientId: string, targetMonthDate?: Date) => Promise<{ success: boolean; message: string }>;
    purchaseInvoices: PurchaseInvoice[];
    addPurchaseInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'user_id'>) => Promise<PurchaseInvoice>;
    updatePurchaseInvoice: (invoice: PurchaseInvoice) => Promise<void>;
    deletePurchaseInvoice: (id: string) => Promise<void>;
    expenseCategories: ExpenseCategory[];
    addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
    deleteExpenseCategory: (id: string) => Promise<void>;
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    updateExpense: (expense: Expense) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    recurringInvoices: RecurringInvoice[];
    addRecurringInvoice: (ri: Omit<RecurringInvoice, 'id' | 'user_id'>) => Promise<void>;
    updateRecurringInvoice: (ri: RecurringInvoice) => Promise<void>;
    deleteRecurringInvoice: (id: string) => Promise<void>;
    generatePendingRecurringInvoices: () => Promise<{ success: number; failed: number }>;
    settings: CompanySettings;
    updateSettings: (settings: CompanySettings) => Promise<void>;
    isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
    const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

    const fetchData = useCallback(async () => {
        if (!isConfigured || !supabase) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsLoading(false);
                return;
            }

            const [
                { data: clientsData },
                { data: suppliersData },
                { data: productsData },
                { data: invoicesData },
                { data: purchaseInvoicesData },
                { data: settingsData },
                { data: expenseCategoriesData },
                { data: expensesData },
                { data: recurringInvoicesData }
            ] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('suppliers').select('*'),
                supabase.from('products').select('*'),
                supabase.from('invoices').select('*'),
                supabase.from('purchase_invoices').select('*'),
                supabase.from('settings').select('*').limit(1).single(),
                supabase.from('expense_categories').select('*'),
                supabase.from('expenses').select('*'),
                supabase.from('recurring_invoices').select('*')
            ]);

            setClients(clientsData || []);
            setSuppliers(suppliersData || []);
            setProducts(productsData || []);
            setInvoices(invoicesData || []);
            setPurchaseInvoices(purchaseInvoicesData || []);
            setExpenseCategories(expenseCategoriesData || []);
            setExpenses(expensesData || []);
            setRecurringInvoices(recurringInvoicesData || []);
            if (settingsData) setSettings(settingsData);
        } catch (error: any) {
            console.error("Error fetching data:", error.message || error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isConfigured) {
            setIsLoading(false);
            return;
        }
        fetchData();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') fetchData();
        });
        return () => subscription.unsubscribe();
    }, [fetchData]);

    const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'user_id'>): Promise<Invoice> => {
        if (!supabase) throw new Error("Supabase no configurado");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        let invoice_number_to_use = invoiceData.invoice_number;
        if (!invoice_number_to_use || invoice_number_to_use.trim() === '') {
            const { data: lastInv } = await supabase.from('invoices').select('invoice_number').order('invoice_number', { ascending: false }).limit(1);
            const STARTING_NUMBER = 2552;
            let nextNumber = STARTING_NUMBER;
            if (lastInv && lastInv.length > 0) {
                const lastNumStr = lastInv[0].invoice_number.split('-')[1] || lastInv[0].invoice_number;
                const lastNum = parseInt(lastNumStr, 10);
                nextNumber = isNaN(lastNum) ? STARTING_NUMBER : Math.max(lastNum + 1, STARTING_NUMBER);
            }
            const year = new Date(invoiceData.issue_date.replace(/-/g, '/')).getFullYear();
            invoice_number_to_use = `${year}-${String(nextNumber).padStart(4, '0')}`;
        }
        
        const payload = {
            user_id: user.id,
            invoice_number: invoice_number_to_use,
            client_id: invoiceData.client_id,
            issue_date: invoiceData.issue_date,
            due_date: invoiceData.due_date,
            items: invoiceData.items,
            subtotal: invoiceData.subtotal,
            tax: invoiceData.tax,
            total: invoiceData.total,
            status: invoiceData.status
        };

        const { data, error } = await supabase.from('invoices').insert([payload]).select();
        if (error) throw new Error(error.message);
        if (data) setInvoices(prev => [...prev, data[0]]);
        return data![0];
    };

    const updateInvoice = async (inv: any) => {
        if (!supabase) return;
        const { id } = inv;
        const dbPayload = {
            invoice_number: inv.invoice_number,
            client_id: inv.client_id,
            issue_date: inv.issue_date,
            due_date: inv.due_date,
            items: inv.items,
            subtotal: inv.subtotal,
            tax: inv.tax,
            total: inv.total,
            status: inv.status
        };
        const { data, error } = await supabase.from('invoices').update(dbPayload).eq('id', id).select();
        if (error) throw new Error(error.message);
        if (data) setInvoices(prev => prev.map(i => i.id === id ? data[0] : i));
    };

    const deleteInvoice = async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw new Error(error.message);
        setInvoices(prev => prev.filter(i => i.id !== id));
    };

    const deleteDraftInvoices = async () => {
        if (!supabase) return;
        const { error } = await supabase.from('invoices').delete().eq('status', 'Borrador');
        if (error) throw new Error(error.message);
        setInvoices(prev => prev.filter(i => i.status !== 'Borrador'));
    };

    const addPurchaseInvoice = async (d: any) => { 
        if (supabase) { 
            const { data: { user } } = await supabase.auth.getUser(); 
            const dbPayload = {
                user_id: user?.id,
                supplier_id: d.supplier_id,
                invoice_number: d.invoice_number,
                issue_date: d.issue_date,
                due_date: d.due_date,
                subtotal: d.subtotal,
                tax: d.tax,
                total: d.total,
                status: d.status
            };
            const { data, error } = await supabase.from('purchase_invoices').insert([dbPayload]).select(); 
            if (error) throw new Error(error.message); 
            if (data && data[0]) { 
                setPurchaseInvoices(p => [...p, data[0]]); 
                return data[0]; 
            } 
        } 
        throw new Error("Error en insert"); 
    };

    const updatePurchaseInvoice = async (d: any) => { 
        if (supabase) { 
            const { id } = d;
            const dbPayload = {
                supplier_id: d.supplier_id,
                invoice_number: d.invoice_number,
                issue_date: d.issue_date,
                due_date: d.due_date,
                subtotal: d.subtotal,
                tax: d.tax,
                total: d.total,
                status: d.status
            };
            const { data, error } = await supabase.from('purchase_invoices').update(dbPayload).eq('id', id).select(); 
            if (error) throw new Error(error.message); 
            if (data) setPurchaseInvoices(p => p.map(i => i.id === id ? data[0] : i)); 
        } 
    };

    const deletePurchaseInvoice = async (id: string) => { if (supabase) { const { error } = await supabase.from('purchase_invoices').delete().eq('id', id); if (error) throw new Error(error.message); setPurchaseInvoices(p => p.filter(i => i.id !== id)); } };

    const generateNextMonthlyInvoice = async (clientId: string, targetMonthDate?: Date) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return { success: false, message: "Cliente no encontrado." };

        const clientInvoices = invoices
            .filter(inv => inv.client_id === clientId)
            .sort((a, b) => new Date(b.issue_date.replace(/-/g, '/')).getTime() - new Date(a.issue_date.replace(/-/g, '/')).getTime());
        
        let items: InvoiceItem[] = [];
        let issueDate: string;
        let dueDate: string;
        let subtotal = 0;

        if (clientInvoices.length > 0) {
            const lastInvoice = clientInvoices[0];
            let baseDate = new Date(lastInvoice.issue_date.replace(/-/g, '/'));
            let targetDate = targetMonthDate ? new Date(targetMonthDate) : new Date(baseDate.setMonth(baseDate.getMonth() + 1));
            // Establecer al último día del mes objetivo
            targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            issueDate = targetDate.toISOString().split('T')[0];
            
            const due = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 15);
            dueDate = due.toISOString().split('T')[0];
            
            items = lastInvoice.items.map(it => ({ ...it, id: crypto.randomUUID() }));
            subtotal = lastInvoice.subtotal;
        } else if (client.monthly_maintenance_fee && client.monthly_maintenance_fee > 0) {
            const today = new Date();
            const targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            issueDate = targetDate.toISOString().split('T')[0];
            
            const due = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 15);
            dueDate = due.toISOString().split('T')[0];

            items = [{
                id: crypto.randomUUID(),
                product_id: null,
                description: `Mantenimiento Mensual - ${client.name}`,
                category: Category.Maintenance,
                quantity: 1,
                unit_price: client.monthly_maintenance_fee
            }];
            subtotal = client.monthly_maintenance_fee;
        } else {
            return { success: false, message: "Sin facturas previas ni cuota de mantenimiento configurada." };
        }

        const tax = client.is_eu_vat_exempt ? 0 : subtotal * (settings.iva / 100);
        const total = subtotal + tax;

        try {
            await addInvoice({
                client_id: clientId,
                invoice_number: '', 
                issue_date: issueDate,
                due_date: dueDate,
                items,
                subtotal,
                tax,
                total,
                status: 'Borrador'
            });
            return { success: true, message: `Borrador generado con éxito para ${client.name}.` };
        } catch (error: any) {
            return { success: false, message: "Error al generar: " + error.message };
        }
    };

    const addClient = async (d: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { data, error } = await supabase.from('clients').insert([{ ...d, user_id: user?.id }]).select(); if (error) throw new Error(error.message); if (data) setClients(p => [...p, ...data]); } };
    const updateClient = async (d: any) => { if (supabase) { const { id, user_id, ...rest } = d; const { data, error } = await supabase.from('clients').update(rest).eq('id', id).select(); if (error) throw new Error(error.message); if (data) setClients(p => p.map(c => c.id === id ? data[0] : c)); } };
    const deleteClient = async (id: string) => { if (supabase) { const { error } = await supabase.from('clients').delete().eq('id', id); if (error) throw new Error(error.message); setClients(p => p.filter(c => c.id !== id)); } };
    const addSupplier = async (d: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { data, error } = await supabase.from('suppliers').insert([{ ...d, user_id: user?.id }]).select(); if (error) throw new Error(error.message); if (data) setSuppliers(p => [...p, ...data]); } };
    const updateSupplier = async (d: any) => { if (supabase) { const { id, user_id, ...rest } = d; const { data, error } = await supabase.from('suppliers').update(rest).eq('id', id).select(); if (error) throw new Error(error.message); if (data) setSuppliers(p => p.map(s => s.id === id ? data[0] : s)); } };
    const deleteSupplier = async (id: string) => { if (supabase) { const { error } = await supabase.from('suppliers').delete().eq('id', id); if (error) throw new Error(error.message); setSuppliers(p => p.filter(s => s.id !== id)); } };
    const addProduct = async (d: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { data, error } = await supabase.from('products').insert([{ ...d, user_id: user?.id }]).select(); if (error) throw new Error(error.message); if (data) setProducts(p => [...p, ...data]); } };
    const updateProduct = async (d: any) => { if (supabase) { const { id, user_id, ...rest } = d; const { data, error } = await supabase.from('products').update(rest).eq('id', id).select(); if (error) throw new Error(error.message); if (data) setProducts(p => p.map(it => it.id === id ? data[0] : it)); } };
    const deleteProduct = async (id: string) => { if (supabase) { const { error } = await supabase.from('products').delete().eq('id', id); if (error) throw new Error(error.message); setProducts(p => p.filter(it => it.id !== id)); } };
    const addExpenseCategory = async (d: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { data, error } = await supabase.from('expense_categories').insert([{ ...d, user_id: user?.id }]).select(); if (error) throw new Error(error.message); if (data) setExpenseCategories(p => [...p, ...data]); } };
    const updateExpenseCategory = async (d: any) => { if (supabase) { const { id, user_id, ...rest } = d; const { data, error } = await supabase.from('expense_categories').update(rest).eq('id', id).select(); if (error) throw new Error(error.message); if (data) setExpenseCategories(p => p.map(c => c.id === id ? data[0] : c)); } };
    const deleteExpenseCategory = async (id: string) => { if (supabase) { const { error } = await supabase.from('expense_categories').delete().eq('id', id); if (error) throw new Error(error.message); setExpenseCategories(p => p.filter(c => c.id !== id)); } };
    const addExpense = async (d: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { data, error } = await supabase.from('expenses').insert([{ ...d, user_id: user?.id }]).select(); if (error) throw new Error(error.message); if (data) setExpenses(p => [...p, ...data]); } };
    const updateExpense = async (d: any) => { if (supabase) { const { id, user_id, ...rest } = d; const { data, error } = await supabase.from('expenses').update(rest).eq('id', id).select(); if (error) throw new Error(error.message); if (data) setExpenses(p => p.map(e => e.id === id ? data[0] : e)); } };
    const deleteExpense = async (id: string) => { if (supabase) { const { error } = await supabase.from('expenses').delete().eq('id', id); if (error) throw new Error(error.message); setExpenses(p => p.filter(e => e.id !== id)); } };
    const addRecurringInvoice = async (d: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { data, error } = await supabase.from('recurring_invoices').insert([{ ...d, user_id: user?.id }]).select(); if (error) throw new Error(error.message); if (data) setRecurringInvoices(p => [...p, ...data]); } };
    const updateRecurringInvoice = async (d: any) => { if (supabase) { const { id, user_id, ...rest } = d; const { data, error } = await supabase.from('recurring_invoices').update(rest).eq('id', id).select(); if (error) throw new Error(error.message); if (data) setRecurringInvoices(p => p.map(r => r.id === id ? data[0] : r)); } };
    const deleteRecurringInvoice = async (id: string) => { if (supabase) { const { error } = await supabase.from('recurring_invoices').delete().eq('id', id); if (error) throw new Error(error.message); setRecurringInvoices(p => p.filter(r => r.id !== id)); } };

    const generatePendingRecurringInvoices = async () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const pending = recurringInvoices.filter(ri => ri.status === 'active' && new Date(ri.next_due_date.replace(/-/g, '/')) <= today);
        let s = 0, f = 0;
        for (const ri of pending) {
            try {
                const subtotal = ri.items.reduce((acc: number, it: any) => acc + (it.quantity * it.unit_price), 0);
                const client = clients.find(c => c.id === ri.client_id);
                const tax = client?.is_eu_vat_exempt ? 0 : subtotal * (settings.iva / 100);
                await addInvoice({
                    client_id: ri.client_id,
                    issue_date: today.toISOString().split('T')[0],
                    due_date: new Date(new Date().setDate(today.getDate() + 30)).toISOString().split('T')[0],
                    items: ri.items.map((it: any) => ({ ...it, id: crypto.randomUUID() })),
                    status: 'Borrador',
                    invoice_number: '', 
                    subtotal, tax, total: subtotal + tax
                });
                const nextDate = new Date(ri.next_due_date.replace(/-/g, '/'));
                nextDate.setMonth(nextDate.getMonth() + 1);
                await updateRecurringInvoice({ ...ri, next_due_date: nextDate.toISOString().split('T')[0] });
                s++;
            } catch { f++; }
        }
        return { success: s, failed: f };
    };

    const updateSettings = async (s: any) => { if (supabase) { const { data: { user } } = await supabase.auth.getUser(); const { error } = await supabase.from('settings').update(s).eq('user_id', user?.id); if (error) throw new Error(error.message); setSettings(s); } };

    return (
        <DataContext.Provider value={{
            clients, addClient, updateClient, deleteClient,
            suppliers, addSupplier, updateSupplier, deleteSupplier,
            products, addProduct, updateProduct, deleteProduct,
            invoices, addInvoice, updateInvoice, deleteInvoice, deleteDraftInvoices, generateNextMonthlyInvoice,
            purchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice,
            expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
            expenses, addExpense, updateExpense, deleteExpense,
            recurringInvoices, addRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice, generatePendingRecurringInvoices,
            settings, updateSettings, isLoading
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};
