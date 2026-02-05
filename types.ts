
export enum Category {
    Maintenance = 'Mantenimiento Informático',
    Licenses = 'Licencias de Software',
    Cloud = 'Servidores Cloud',
}

export interface Client {
    id: string;
    user_id?: string;
    name: string;
    tax_id: string;
    address: string;
    email: string;
    monthly_maintenance_fee?: number;
    is_eu_vat_exempt?: boolean;
}

export interface Supplier {
    id: string;
    user_id?: string;
    name: string;
    tax_id: string;
    address: string;
    email: string;
    phone?: string;
}

export interface Product {
    id: string;
    user_id?: string;
    name: string;
    category: Category;
    unit_price: number;
}

export interface InvoiceItem {
    id: string;
    product_id: string | null;
    description: string;
    category: Category;
    quantity: number;
    unit_price: number;
}

export type InvoiceStatus = 'Borrador' | 'Enviada' | 'Pagada' | 'Vencida';

export interface Invoice {
    id: string;
    user_id?: string;
    invoice_number: string;
    client_id: string;
    issue_date: string;
    due_date: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: InvoiceStatus;
}

export type PurchaseInvoiceStatus = 'Pendiente' | 'Pagada' | 'Vencida';

export interface PurchaseInvoice {
    id: string;
    user_id?: string;
    supplier_id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    subtotal: number;
    tax: number;
    total: number;
    status: PurchaseInvoiceStatus;
}

export interface ExpenseCategory {
    id: string;
    user_id?: string;
    name: string;
    created_at?: string;
}

export interface Expense {
    id: string;
    user_id?: string;
    expense_date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    category_id: string | null;
    supplier_id: string | null;
    created_at?: string;
}

// FIX: Added Frequency type to support recurring invoices
export type Frequency = 'monthly';

// FIX: Added RecurringInvoiceStatus type
export type RecurringInvoiceStatus = 'active' | 'paused';

// FIX: Added RecurringInvoice interface to resolve module errors in page files
export interface RecurringInvoice {
    id: string;
    user_id?: string;
    client_id: string;
    frequency: Frequency;
    start_date: string;
    next_due_date: string;
    items: InvoiceItem[];
    status: RecurringInvoiceStatus;
}

export interface CompanySettings {
    name: string; // Fiscal name
    commercial_name?: string; // Commercial/brand name
    tax_id: string;
    address: string;
    email: string;
    logo?: string; // base64 encoded image
    iva: number;
    template_color?: string; // Color for PDF templates
}
