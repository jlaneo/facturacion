/**
 * Formats a number into a Spanish Euro currency string.
 * e.g., 1234.56 => "1.234,56 €"
 * @param value The number to format.
 * @returns The formatted currency string.
 */
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};
