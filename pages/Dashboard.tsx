
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Invoice } from '../types';
import { DocumentTextIcon, UsersIcon, CubeIcon, ClockIcon, MailIcon, RefreshIcon, TrendingUpIcon, SparklesIcon, ShoppingCartIcon, ReceiptTaxIcon, CurrencyEuroIcon, ChevronDownIcon } from '../components/icons';
import { formatCurrency } from '../lib/utils';

// --- Helper Components ---

// Generic card for dashboard sections
const DashboardCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode; }> = ({ title, icon, children, className = '', actions }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md ${className}`}>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
                <div className="text-blue-500">{icon}</div>
                <h2 className="text-xl font-semibold ml-3 text-gray-800 dark:text-white">{title}</h2>
            </div>
            {actions && <div>{actions}</div>}
        </div>
        <div>{children}</div>
    </div>
);

// StatCard for main KPIs with multiple values
const MultiStatCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    stats: Array<{ label: string; value: string; colorClass: string; }>;
}> = ({ title, icon, stats }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full">
        <div className="flex items-center mb-4">
            <div className="text-blue-500">{React.cloneElement(icon as React.ReactElement<any>, { className: "w-7 h-7" })}</div>
            <h3 className="text-lg font-semibold ml-3 text-gray-800 dark:text-white">{title}</h3>
        </div>
        <div className="space-y-4">
            {stats.map(stat => (
                <div key={stat.label}>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</p>
                </div>
            ))}
        </div>
    </div>
);

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only render label if the slice is big enough (greater than 5%)
    if (percent < 0.05) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold font-sans pointer-events-none shadow-sm">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-lg text-sm">
                <p className="font-bold text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-700 pb-1">{label}</p>
                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-500 dark:text-gray-400 capitalize">{entry.name}:</span>
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};


const Dashboard: React.FC = () => {
    const { invoices, clients, products, settings, purchaseInvoices, expenses } = useData();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // --- Calculate Available Years ---
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear()); // Always include current year

        const extractYear = (dateStr: string) => {
            if (!dateStr) return;
            const year = new Date(dateStr.replace(/-/g, '/')).getFullYear();
            if (!isNaN(year)) years.add(year);
        };

        invoices.forEach(inv => extractYear(inv.issue_date));
        purchaseInvoices.forEach(inv => extractYear(inv.issue_date));
        expenses.forEach(exp => extractYear(exp.expense_date));

        return Array.from(years).sort((a, b) => b - a); // Descending order
    }, [invoices, purchaseInvoices, expenses]);


    // --- Memoized Data Calculations for Selected Year ---
    const invoicesThisYear = useMemo(() => invoices.filter(inv => new Date(inv.issue_date.replace(/-/g, '/')).getFullYear() === selectedYear), [invoices, selectedYear]);
    const purchasesThisYear = useMemo(() => purchaseInvoices.filter(p => new Date(p.issue_date.replace(/-/g, '/')).getFullYear() === selectedYear), [purchaseInvoices, selectedYear]);
    const expensesThisYear = useMemo(() => expenses.filter(e => new Date(e.expense_date.replace(/-/g, '/')).getFullYear() === selectedYear), [expenses, selectedYear]);

    const paidInvoices = useMemo(() => invoicesThisYear.filter(inv => inv.status === 'Pagada'), [invoicesThisYear]);
    
    // Totales Cobrado y Pagado (Año)
    const totalRevenue = useMemo(() => paidInvoices.reduce((sum, inv) => sum + inv.total, 0), [paidInvoices]);
    const totalPaidPurchases = useMemo(() => purchasesThisYear.filter(inv => inv.status === 'Pagada').reduce((sum, inv) => sum + inv.total, 0), [purchasesThisYear]);
    
    // Totales Pendientes (Año)
    const pendingAmount = useMemo(() => invoicesThisYear.filter(inv => inv.status === 'Enviada' || inv.status === 'Vencida').reduce((sum, inv) => sum + inv.total, 0), [invoicesThisYear]);
    const totalPendingPurchases = useMemo(() => purchasesThisYear.filter(inv => inv.status === 'Pendiente' || inv.status === 'Vencida').reduce((sum, inv) => sum + inv.total, 0), [purchasesThisYear]);

    // Resumen Anual (Base Imponible)
    const totalSalesYearSubtotal = useMemo(() => invoicesThisYear.reduce((sum, inv) => sum + inv.subtotal, 0), [invoicesThisYear]);
    const totalPurchasesYearSubtotal = useMemo(() => purchasesThisYear.reduce((sum, p) => sum + p.subtotal, 0), [purchasesThisYear]);
    const totalExpensesYear = useMemo(() => expensesThisYear.reduce((sum, exp) => sum + exp.amount, 0), [expensesThisYear]);

    // Beneficio Neto (Año)
    const netProfit = useMemo(() => totalSalesYearSubtotal - totalPurchasesYearSubtotal - totalExpensesYear, [totalSalesYearSubtotal, totalPurchasesYearSubtotal, totalExpensesYear]);

    // --- Other Calculations (Strictly Current Year) ---
    const overdueInvoices = useMemo(() => invoicesThisYear.filter(inv => inv.status === 'Vencida').map(inv => {
        const client = clients.find(c => c.id === inv.client_id);
        return { ...inv, clientName: client?.name || 'N/A', clientEmail: client?.email };
    }).sort((a, b) => b.invoice_number.localeCompare(a.invoice_number)), [invoicesThisYear, clients]);

    // --- Chart Data Calculations (Strictly Jan-Dec of Selected Year) ---
    const monthlyFinancialData = useMemo(() => {
        // Initialize an array for 12 months
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(selectedYear, i, 1);
            const monthName = date.toLocaleString('es-ES', { month: 'short' });
            return {
                name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                sales: 0,
                purchases: 0,
                expenses: 0
            };
        });

        // Helper to get month index from date string (0-11)
        const getMonthIndex = (dateStr: string) => {
            const d = new Date(dateStr.replace(/-/g, '/'));
            return d.getMonth();
        };

        // Populate Sales (from invoicesThisYear)
        invoicesThisYear.forEach(invoice => {
            const idx = getMonthIndex(invoice.issue_date);
            if (idx >= 0 && idx < 12) {
                months[idx].sales += invoice.total;
            }
        });

        // Populate Purchases (from purchasesThisYear)
        purchasesThisYear.forEach(invoice => {
            const idx = getMonthIndex(invoice.issue_date);
            if (idx >= 0 && idx < 12) {
                months[idx].purchases += invoice.total;
            }
        });

        // Populate Expenses (from expensesThisYear)
        expensesThisYear.forEach(expense => {
            const idx = getMonthIndex(expense.expense_date);
            if (idx >= 0 && idx < 12) {
                months[idx].expenses += expense.amount;
            }
        });

        return months;
    }, [invoicesThisYear, purchasesThisYear, expensesThisYear, selectedYear]);

    
    const paymentStatusData = useMemo(() => [
        { name: 'Cobrado', value: totalRevenue },
        { name: 'Pendiente', value: pendingAmount },
    ], [totalRevenue, pendingAmount]);
    
    // --- Top 5 Calculations (based on year) ---
    const topClients = useMemo(() => {
        const clientTotals: { [key: string]: number } = {};
        paidInvoices.forEach(inv => {
            clientTotals[inv.client_id] = (clientTotals[inv.client_id] || 0) + inv.total;
        });
        return Object.entries(clientTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([clientId, total]) => ({
                name: clients.find(c => c.id === clientId)?.name || 'Cliente desconocido',
                total
            }));
    }, [paidInvoices, clients]);

    const topProducts = useMemo(() => {
        const productTotals: { [key: string]: { total: number, count: number } } = {};
        paidInvoices.forEach(inv => {
            if (Array.isArray(inv.items)) {
                inv.items.forEach(item => {
                    if (item && item.description) {
                        const key = item.description;
                        if (!productTotals[key]) productTotals[key] = { total: 0, count: 0 };
                        productTotals[key].total += item.unit_price * item.quantity;
                        productTotals[key].count += item.quantity;
                    }
                });
            }
        });
        return Object.entries(productTotals)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 5)
            .map(([name, data]) => ({ name, ...data }));
    }, [paidInvoices]);


    // --- Event Handlers ---
    const handleSendReminder = (invoice: Invoice & { clientName: string, clientEmail?: string }) => {
        if (!invoice.clientEmail) {
            alert('El cliente no tiene un email configurado.'); return;
        }
        const subject = `Recordatorio de Pago: Factura ${invoice.invoice_number}`;
        const body = `Estimado/a ${invoice.clientName},\n\nLe escribimos para recordarle que la factura N° ${invoice.invoice_number} por un importe de ${formatCurrency(invoice.total)} venció el ${new Date(invoice.due_date).toLocaleDateString('es-ES')}.\n\nAgradeceríamos que realizara el pago a la brevedad posible.\n\nSaludos cordiales,\n${settings.name}`;
        window.location.href = `mailto:${invoice.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const pieColors = ['#10b981', '#f59e0b']; // Green (Paid) and Amber (Pending)

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
                    <div className="relative">
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 text-blue-800 dark:text-white text-xl font-bold py-1 pl-4 pr-10 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-800 dark:text-white">
                            <ChevronDownIcon className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Stat Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MultiStatCard 
                    title="Cobros y Pagos" 
                    icon={<CurrencyEuroIcon />}
                    stats={[
                        { label: 'Total Cobrado', value: formatCurrency(totalRevenue), colorClass: 'text-green-600 dark:text-green-400'},
                        { label: 'Total Pagado', value: formatCurrency(totalPaidPurchases), colorClass: 'text-red-600 dark:text-red-400'}
                    ]}
                />
                 <MultiStatCard 
                    title="Pendientes" 
                    icon={<ClockIcon />}
                    stats={[
                        { label: 'A Cobrar (Clientes)', value: formatCurrency(pendingAmount), colorClass: 'text-amber-600 dark:text-amber-400'},
                        { label: 'A Pagar (Prov.)', value: formatCurrency(totalPendingPurchases), colorClass: 'text-orange-600 dark:text-orange-400'}
                    ]}
                />
                <MultiStatCard 
                    title="Resumen Anual (Base)" 
                    icon={<DocumentTextIcon />}
                    stats={[
                        { label: 'Ventas', value: formatCurrency(totalSalesYearSubtotal), colorClass: 'text-green-600 dark:text-green-400'},
                        { label: 'Compras y Gastos', value: formatCurrency(totalPurchasesYearSubtotal + totalExpensesYear), colorClass: 'text-red-600 dark:text-red-400'},
                    ]}
                />
                <div className={`p-6 rounded-lg shadow-md flex flex-col justify-center ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-orange-50 dark:bg-orange-900/30'}`}>
                    <div className="flex items-center mb-2">
                        <div className={netProfit >= 0 ? 'text-green-600 dark:text-green-300' : 'text-orange-600 dark:text-orange-300'}>
                            <TrendingUpIcon className="w-6 h-6"/>
                        </div>
                        <h2 className="text-lg font-semibold ml-3 text-gray-800 dark:text-gray-100">Beneficio Neto</h2>
                    </div>
                    <p className={`text-3xl lg:text-4xl font-extrabold text-center py-4 ${netProfit >= 0 ? 'text-green-700 dark:text-green-200' : 'text-orange-700 dark:text-orange-200'}`}>
                        {formatCurrency(netProfit)}
                    </p>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">(Ventas - Compras - Gastos)</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <DashboardCard title="Top 5 Clientes" icon={<UsersIcon />}>
                    {topClients.length > 0 ? (
                       <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            {topClients.map((client, i) => (
                                <li key={i} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-1 last:border-0">
                                    <span>{i+1}. {client.name}</span>
                                    <span className="font-semibold">{formatCurrency(client.total)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-500 py-5">No hay suficientes datos de clientes este año.</p>}
                </DashboardCard>
                <DashboardCard title="Top 5 Productos" icon={<CubeIcon />}>
                    {topProducts.length > 0 ? (
                         <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            {topProducts.map((prod, i) => (
                                <li key={i} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-1 last:border-0">
                                    <span className="truncate pr-4">{i+1}. {prod.name}</span>
                                    <span className="font-semibold">{formatCurrency(prod.total)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-500 py-5">No hay suficientes datos de productos este año.</p>}
                </DashboardCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <DashboardCard title={`Resumen Financiero (${selectedYear})`} icon={<DocumentTextIcon />}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart 
                                data={monthlyFinancialData}
                                margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                                barSize={20}
                                barGap={6}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    height={36} 
                                    iconType="circle"
                                    wrapperStyle={{ top: -10, right: 0, fontSize: '12px', fontWeight: 500 }}
                                />
                                <Bar dataKey="sales" fill="#10b981" name="Ingresos" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="purchases" fill="#f43f5e" name="Compras" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="expenses" fill="#f59e0b" name="Gastos" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </DashboardCard>
                    <DashboardCard title={`Facturas Vencidas (${selectedYear})`} icon={<ClockIcon />}>
                         {overdueInvoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <tbody>
                                        {overdueInvoices.slice(0, 5).map(invoice => (
                                            <tr key={invoice.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</td>
                                                <td className="px-3 py-3 truncate max-w-[120px]" title={invoice.clientName}>{invoice.clientName}</td>
                                                <td className="px-3 py-3 text-red-600 font-medium">{new Date(invoice.due_date).toLocaleDateString('es-ES')}</td>
                                                <td className="px-3 py-3 text-right">{formatCurrency(invoice.total)}</td>
                                                <td className="px-3 py-3 text-right">
                                                    <button onClick={() => handleSendReminder(invoice)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Enviar Recordatorio por Email">
                                                        <MailIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-center text-gray-500 py-5">¡Genial! No tienes facturas de este año vencidas.</p>}
                    </DashboardCard>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <DashboardCard title={`Seguimiento de Pagos (${selectedYear})`} icon={<CurrencyEuroIcon />}>
                         <div className="h-[300px] w-full flex flex-col items-center justify-center">
                            {paymentStatusData.some(d => d.value > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentStatusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            outerRadius={100}
                                            innerRadius={50}
                                            fill="#8884d8"
                                            dataKey="value"
                                            paddingAngle={2}
                                        >
                                            {paymentStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <CurrencyEuroIcon className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                                    <p>No hay datos de pagos registrados este año.</p>
                                </div>
                            )}
                        </div>
                    </DashboardCard>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
