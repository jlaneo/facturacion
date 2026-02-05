
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../lib/utils';
import { RefreshIcon, PlayIcon, CheckIcon, ClockIcon } from '../components/icons';

const BillingManagementPage: React.FC = () => {
    const { clients, invoices, generateNextMonthlyInvoice } = useData();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processLog, setProcessLog] = useState<{name: string, status: 'pending' | 'success' | 'error', message: string}[]>([]);

    // Obtenemos el mes pasado (vencido) para facturar
    const lastMonthDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    }, []);

    const monthLabel = lastMonthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // Filtrar clientes con cuota de mantenimiento
    const maintenanceClients = useMemo(() => {
        return clients.filter(c => (c.monthly_maintenance_fee || 0) > 0);
    }, [clients]);

    // Comprobar si ya tienen factura para el mes pasado
    const billingStatus = useMemo(() => {
        const statusMap: Record<string, { exists: boolean, invoiceNumber?: string }> = {};
        
        maintenanceClients.forEach(client => {
            const hasInvoice = invoices.find(inv => {
                const invDate = new Date(inv.issue_date.replace(/-/g, '/'));
                return inv.client_id === client.id && 
                       invDate.getMonth() === lastMonthDate.getMonth() && 
                       invDate.getFullYear() === lastMonthDate.getFullYear();
            });
            
            statusMap[client.id] = {
                exists: !!hasInvoice,
                invoiceNumber: hasInvoice?.invoice_number
            };
        });
        
        return statusMap;
    }, [maintenanceClients, invoices, lastMonthDate]);

    const pendingClients = maintenanceClients.filter(c => !billingStatus[c.id].exists);

    const handleProcessBatch = async () => {
        if (pendingClients.length === 0) return;
        if (!confirm(`¿Generar ${pendingClients.length} borradores de factura para el periodo ${monthLabel}?`)) return;

        setIsProcessing(true);
        setProcessLog([]);
        
        for (const client of pendingClients) {
            try {
                const result = await generateNextMonthlyInvoice(client.id, lastMonthDate);
                setProcessLog(prev => [...prev, {
                    name: client.name,
                    status: result.success ? 'success' : 'error',
                    message: result.message
                }]);
            } catch (error: any) {
                setProcessLog(prev => [...prev, {
                    name: client.name,
                    status: 'error',
                    message: error.message || 'Error desconocido'
                }]);
            }
        }
        
        setIsProcessing(false);
    };

    const handleSingleProcess = async (clientId: string) => {
        setIsProcessing(true);
        const client = clients.find(c => c.id === clientId);
        if (client) {
            const result = await generateNextMonthlyInvoice(clientId, lastMonthDate);
            alert(result.message);
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-xl text-white">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Emisión de Mes Vencido</h2>
                        <p className="text-blue-100 opacity-90">Periodo a facturar: <span className="font-bold uppercase">{monthLabel}</span></p>
                    </div>
                    <button 
                        onClick={handleProcessBatch}
                        disabled={isProcessing || pendingClients.length === 0}
                        className="bg-white text-indigo-700 hover:bg-blue-50 font-bold py-3 px-8 rounded-xl flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                    >
                        {isProcessing ? <RefreshIcon className="animate-spin" /> : <PlayIcon />}
                        <span>Generar {pendingClients.length} Facturas Pendientes</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                        <p className="text-sm text-blue-100">Total Clientes Mensuales</p>
                        <p className="text-3xl font-bold">{maintenanceClients.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                        <p className="text-sm text-blue-100">Ya Facturados</p>
                        <p className="text-3xl font-bold">{maintenanceClients.length - pendingClients.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                        <p className="text-sm text-blue-100">Pendientes de Facturar</p>
                        <p className="text-3xl font-bold">{pendingClients.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white px-2">Estado por Cliente</h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Cuota</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {maintenanceClients.map(client => {
                                    const status = billingStatus[client.id];
                                    return (
                                        <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{client.name}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatCurrency(client.monthly_maintenance_fee || 0)}</td>
                                            <td className="px-6 py-4">
                                                {status.exists ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckIcon className="w-3 h-3 mr-1" /> Facturada ({status.invoiceNumber})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <ClockIcon className="w-3 h-3 mr-1" /> Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!status.exists && (
                                                    <button 
                                                        onClick={() => handleSingleProcess(client.id)}
                                                        disabled={isProcessing}
                                                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold text-sm"
                                                    >
                                                        Generar ahora
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white px-2">Registro del Proceso</h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700 min-h-[400px]">
                        {processLog.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-sm text-center">
                                <RefreshIcon className="w-8 h-8 mb-2 opacity-20" />
                                <p>Inicia el proceso para ver los resultados aquí.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {processLog.map((log, i) => (
                                    <div key={i} className={`p-3 rounded-lg text-sm border ${log.status === 'success' ? 'bg-green-50 border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'}`}>
                                        <div className="flex justify-between font-bold">
                                            <span>{log.name}</span>
                                            <span>{log.status === 'success' ? '✓' : '✗'}</span>
                                        </div>
                                        <p className="text-xs opacity-80 mt-1">{log.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingManagementPage;
