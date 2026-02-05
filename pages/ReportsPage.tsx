import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { DownloadIcon, ChartBarIcon } from '../components/icons';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportIncomeExpenseReportPDF, exportVatReportPDF, exportTopClientsReportPDF } from '../lib/exportUtils';

type ReportType = 'income_expense' | 'vat' | 'top_clients_products';

const reportOptions: { id: ReportType; title: string; description: string }[] = [
    {
        id: 'income_expense',
        title: 'Informe de Ingresos y Gastos',
        description: 'Calcula el beneficio bruto comparando ingresos (facturas emitidas) con gastos (facturas de compra y otros gastos).',
    },
    {
        id: 'vat',
        title: 'Informe de IVA Trimestral',
        description: 'Calcula el IVA repercutido (ventas) y soportado (compras/gastos) para determinar el total a ingresar o devolver.',
    },
    {
        id: 'top_clients_products',
        title: 'Informe de Clientes y Productos',
        description: 'Muestra un ranking de los clientes y productos/servicios más rentables según la facturación en el periodo.',
    },
];

const ReportsPage: React.FC = () => {
    const { invoices, purchaseInvoices, expenses, clients, products, settings } = useData();

    const [reportType, setReportType] = useState<ReportType | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        setStartDate(formatDate(firstDay));
        setEndDate(formatDate(lastDay));
    }, []);

    // FIX: Add useEffect to clear reportData when reportType changes.
    // This prevents rendering a new report view with stale data from a previous report,
    // which could have a different data structure and cause a crash.
    useEffect(() => {
        setReportData(null);
    }, [reportType]);

    const handleGenerateReport = () => {
        if (!reportType || !startDate || !endDate) {
            alert('Por favor, selecciona un tipo de informe y un rango de fechas.');
            return;
        }

        setIsLoading(true);
        setReportData(null);

        // Simulate async operation for better UX
        setTimeout(() => {
            const start = new Date(startDate.replace(/-/g, '/'));
            const end = new Date(endDate.replace(/-/g, '/'));
            end.setHours(23, 59, 59, 999);

            if (reportType === 'income_expense') {
                const filteredInvoices = invoices.filter(i => {
                    const iDate = new Date(i.issue_date.replace(/-/g, '/'));
                    return iDate >= start && iDate <= end;
                });
                const filteredPurchases = purchaseInvoices.filter(p => {
                    const pDate = new Date(p.issue_date.replace(/-/g, '/'));
                    return pDate >= start && pDate <= end;
                });
                const filteredExpenses = expenses.filter(e => {
                    const eDate = new Date(e.expense_date.replace(/-/g, '/'));
                    return eDate >= start && eDate <= end;
                });

                const totalIncome = filteredInvoices.reduce((sum, i) => sum + i.subtotal, 0);
                const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.subtotal, 0);
                const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
                const profit = totalIncome - totalPurchases - totalExpenses;

                setReportData({
                    income: totalIncome,
                    purchases: totalPurchases,
                    expenses: totalExpenses,
                    profit: profit
                });
            } else if (reportType === 'vat') {
                const filteredInvoices = invoices.filter(i => {
                    const iDate = new Date(i.issue_date.replace(/-/g, '/'));
                    return iDate >= start && iDate <= end;
                });
                const filteredPurchases = purchaseInvoices.filter(p => {
                    const pDate = new Date(p.issue_date.replace(/-/g, '/'));
                    return pDate >= start && pDate <= end;
                });
                const filteredExpenses = expenses.filter(e => {
                    const eDate = new Date(e.expense_date.replace(/-/g, '/'));
                    return eDate >= start && eDate <= end;
                });

                const salesVat = filteredInvoices.reduce((sum, i) => sum + i.tax, 0);
                const purchaseVat = filteredPurchases.reduce((sum, p) => sum + p.tax, 0);
                const expenseVat = filteredExpenses.reduce((sum, e) => {
                    // Estimate deductible VAT from total amount, assuming standard rate
                    return sum + (e.amount - e.amount / (1 + settings.iva / 100));
                }, 0);
                
                const totalVat = salesVat - (purchaseVat + expenseVat);

                setReportData({
                    salesVat,
                    purchaseVat,
                    expenseVat,
                    totalVat
                });
            } else if (reportType === 'top_clients_products') {
                const filteredInvoices = invoices.filter(i => {
                    const iDate = new Date(i.issue_date.replace(/-/g, '/'));
                    return i.status !== 'Borrador' && iDate >= start && iDate <= end;
                });

                const clientTotals: { [key: string]: number } = {};
                filteredInvoices.forEach(inv => {
                    clientTotals[inv.client_id] = (clientTotals[inv.client_id] || 0) + inv.total;
                });
                const topClients = Object.entries(clientTotals)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([clientId, total]) => ({ name: clients.find(c => c.id === clientId)?.name || 'N/A', total }));

                const productTotals: { [key: string]: number } = {};
                filteredInvoices.forEach(inv => {
                    if (Array.isArray(inv.items)) {
                        inv.items.forEach(item => {
                            if (item && item.description) {
                                productTotals[item.description] = (productTotals[item.description] || 0) + (item.quantity * item.unit_price);
                            }
                        });
                    }
                });
                const topProducts = Object.entries(productTotals)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([name, total]) => ({ name, total }));
                
                setReportData({ topClients, topProducts });
            }

            setIsLoading(false);
        }, 500);
    };

    const handleExportPDF = () => {
        if (!reportData || !reportType) return;
        switch(reportType) {
            case 'income_expense':
                exportIncomeExpenseReportPDF(reportData, startDate, endDate, settings);
                break;
            case 'vat':
                exportVatReportPDF(reportData, startDate, endDate, settings);
                break;
            case 'top_clients_products':
                exportTopClientsReportPDF(reportData, startDate, endDate);
                break;
        }
    }

    const renderReport = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center p-10">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-3 text-lg">Generando informe...</span>
                </div>
            );
        }

        if (!reportData) {
            return <p className="text-center py-10 text-gray-500">Selecciona un tipo de informe y un rango de fechas para empezar.</p>;
        }

        switch (reportType) {
            case 'income_expense':
                const chartData = [
                    { name: 'Ingresos', value: reportData.income, fill: '#22c55e' },
                    { name: 'Compras', value: reportData.purchases, fill: '#ef4444' },
                    { name: 'Gastos', value: reportData.expenses, fill: '#f97316' },
                ];
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                <p className="text-sm text-green-800 dark:text-green-300">Total Ingresos</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.income)}</p>
                            </div>
                            <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">
                                <p className="text-sm text-red-800 dark:text-red-300">Total Compras</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.purchases)}</p>
                            </div>
                            <div className="p-4 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                                <p className="text-sm text-orange-800 dark:text-orange-300">Total Gastos</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.expenses)}</p>
                            </div>
                            <div className={`p-4 rounded-lg ${reportData.profit >= 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-rose-100 dark:bg-rose-900/50'}`}>
                                <p className={`text-sm ${reportData.profit >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-rose-800 dark:text-rose-300'}`}>Beneficio Bruto</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.profit)}</p>
                            </div>
                        </div>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => `${(value as number)/1000}k`} />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                <Bar dataKey="value" fill="#8884d8" name="Importe" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'vat':
                 const resultText = reportData.totalVat >= 0 ? 'TOTAL A INGRESAR' : 'TOTAL A DEVOLVER';
                return (
                     <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                             <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                <p className="text-sm text-green-800 dark:text-green-300">IVA Repercutido (Ventas)</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.salesVat)}</p>
                            </div>
                             <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">
                                <p className="text-sm text-red-800 dark:text-red-300">IVA Soportado (Compras)</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.purchaseVat)}</p>
                            </div>
                             <div className="p-4 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                                <p className="text-sm text-orange-800 dark:text-orange-300">IVA Soportado (Gastos)</p>
                                <p className="text-2xl font-bold">{formatCurrency(reportData.expenseVat)}</p>
                            </div>
                        </div>
                        <div className={`p-6 rounded-lg text-center ${reportData.totalVat >= 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-teal-100 dark:bg-teal-900/50'}`}>
                            <p className={`text-lg font-semibold ${reportData.totalVat >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-teal-800 dark:text-teal-200'}`}>{resultText}</p>
                            <p className="text-4xl font-extrabold tracking-tight">{formatCurrency(Math.abs(reportData.totalVat))}</p>
                        </div>
                    </div>
                );
            case 'top_clients_products':
                // FIX: Add a defensive check to ensure the report data has the expected structure.
                // This prevents the component from crashing if stale data from a different report type is present during a quick state transition.
                if (!reportData?.topClients || !reportData?.topProducts) {
                    return <p className="text-center py-10 text-gray-500">Generando datos del informe...</p>;
                }
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Top 10 Clientes</h3>
                            {reportData.topClients.length > 0 ? (
                                <ul className="divide-y dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
                                    {reportData.topClients.map((client: any, i: number) => (
                                        <li key={i} className="flex justify-between py-2 text-sm">
                                            <span>{i + 1}. {client.name}</span>
                                            <span className="font-semibold">{formatCurrency(client.total)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-5">No se encontraron datos de clientes en este período.</p>
                            )}
                        </div>
                         <div>
                            <h3 className="text-lg font-semibold mb-2">Top 10 Productos/Servicios</h3>
                            {reportData.topProducts.length > 0 ? (
                                <ul className="divide-y dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
                                    {reportData.topProducts.map((product: any, i: number) => (
                                        <li key={i} className="flex justify-between py-2 text-sm">
                                            <span className="truncate pr-4">{i + 1}. {product.name}</span>
                                            <span className="font-semibold">{formatCurrency(product.total)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-5">No se encontraron datos de productos en este período.</p>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Informes</h1>

            {/* Selector de Informes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportOptions.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setReportType(opt.id)}
                        className={`p-4 border rounded-lg text-left transition-all duration-200 ${reportType === opt.id ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'}`}
                    >
                        <h2 className="font-bold text-lg">{opt.title}</h2>
                        <p className={`text-sm ${reportType === opt.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{opt.description}</p>
                    </button>
                ))}
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Desde:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="ml-2 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta:</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="ml-2 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={!reportType || isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <ChartBarIcon />
                    <span>Generar Informe</span>
                </button>
            </div>

            {/* Resultados del Informe */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md min-h-[200px]">
                {reportData && (
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Resultados del Informe</h2>
                        <button
                            onClick={handleExportPDF}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm"
                        >
                            <DownloadIcon />
                            <span>Exportar a PDF</span>
                        </button>
                    </div>
                )}
                {renderReport()}
            </div>
        </div>
    );
};

export default ReportsPage;
