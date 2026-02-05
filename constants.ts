import { Category, CompanySettings } from './types';

export const CATEGORIES: Category[] = [
    Category.Maintenance,
    Category.Licenses,
    Category.Cloud,
];

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
    name: 'José Luis Arias Serrano',
    // FIX: Changed 'commercialName' to 'commercial_name' to match the 'CompanySettings' type.
    commercial_name: 'neoSoporte',
    tax_id: '52136358G',
    address: 'Dr. Espina, 41, 28019 Madrid, España',
    email: 'info@neosoporte.com',
    iva: 21,
    template_color: '#3b82f6',
};