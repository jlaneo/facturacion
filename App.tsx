
import React, { useState, useEffect } from 'react';
import { DataProvider } from './context/DataContext';
import InvoicesPage from './pages/InvoicesPage';
import ClientsPage from './pages/ClientsPage';
import ProductsPage from './pages/ProductsPage';
import SettingsPage from './pages/SettingsPage';
import { Sidebar, SidebarItem } from './components/Sidebar';
import { DocumentTextIcon, UsersIcon, CubeIcon, CogIcon, MenuIcon, LogoutIcon, HomeIcon, ShoppingCartIcon, TrendingUpIcon, ReceiptTaxIcon, ChartBarIcon } from './components/icons';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseInvoicesPage from './pages/PurchaseInvoicesPage';
import ExpenseCategoriesPage from './pages/ExpenseCategoriesPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';


type Page = 'dashboard' | 'invoices' | 'clients' | 'products' | 'settings' | 'suppliers' | 'purchaseInvoices' | 'expenseCategories' | 'expenses' | 'reports';

const pageTitles: Record<Page, string> = {
    dashboard: 'Inicio',
    invoices: 'Facturas de Venta',
    clients: 'Clientes',
    suppliers: 'Proveedores',
    purchaseInvoices: 'Facturas de Compra',
    products: 'Productos',
    settings: 'Ajustes',
    expenseCategories: 'Tipos de Gasto',
    expenses: 'Registro de Gastos',
    reports: 'Informes',
};


const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);


    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'invoices': return <InvoicesPage />;
            case 'clients': return <ClientsPage />;
            case 'suppliers': return <SuppliersPage />;
            case 'purchaseInvoices': return <PurchaseInvoicesPage />;
            case 'products': return <ProductsPage />;
            case 'settings': return <SettingsPage />;
            case 'expenseCategories': return <ExpenseCategoriesPage />;
            case 'expenses': return <ExpensesPage />;
            case 'reports': return <ReportsPage />;
            default: return <Dashboard />;
        }
    };
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!session) {
        return <AuthPage />;
    }

    const isVentasActive = ['invoices', 'clients', 'products'].includes(currentPage);
    const isComprasActive = ['suppliers', 'purchaseInvoices'].includes(currentPage);
    const isGastosActive = ['expenseCategories', 'expenses'].includes(currentPage);

    return (
        <DataProvider>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}>
                    <SidebarItem icon={<HomeIcon />} text="Inicio" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
                    
                    <SidebarItem icon={<TrendingUpIcon />} text="Facturación" active={isVentasActive}>
                        <SidebarItem icon={<DocumentTextIcon />} text="Facturas Venta" active={currentPage === 'invoices'} onClick={() => setCurrentPage('invoices')} />
                        <SidebarItem icon={<UsersIcon />} text="Clientes" active={currentPage === 'clients'} onClick={() => setCurrentPage('clients')} />
                        <SidebarItem icon={<CubeIcon />} text="Productos" active={currentPage === 'products'} onClick={() => setCurrentPage('products')} />
                    </SidebarItem>

                    <SidebarItem icon={<ShoppingCartIcon />} text="Compras" active={isComprasActive}>
                        <SidebarItem icon={<UsersIcon />} text="Proveedores" active={currentPage === 'suppliers'} onClick={() => setCurrentPage('suppliers')} />
                        <SidebarItem icon={<DocumentTextIcon />} text="Facturas Compra" active={currentPage === 'purchaseInvoices'} onClick={() => setCurrentPage('purchaseInvoices')} />
                    </SidebarItem>

                    <SidebarItem icon={<ReceiptTaxIcon />} text="Gastos" active={isGastosActive}>
                        <SidebarItem icon={<CubeIcon />} text="Tipo Gasto" active={currentPage === 'expenseCategories'} onClick={() => setCurrentPage('expenseCategories')} />
                        <SidebarItem icon={<DocumentTextIcon />} text="Registro de gastos" active={currentPage === 'expenses'} onClick={() => setCurrentPage('expenses')} />
                    </SidebarItem>
                    
                    <SidebarItem icon={<ChartBarIcon />} text="Informes" active={currentPage === 'reports'} onClick={() => setCurrentPage('reports')} />

                    <SidebarItem icon={<CogIcon />} text="Ajustes" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} />
                    <div className="border-t my-2 dark:border-gray-700"></div>
                    <SidebarItem icon={<LogoutIcon />} text="Cerrar Sesión" onClick={handleLogout} />
                </Sidebar>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 focus:outline-none mr-4">
                                <MenuIcon />
                            </button>
                            <h1 className="text-xl font-semibold">{pageTitles[currentPage]}</h1>
                        </div>
                    </header>
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                        {renderPage()}
                    </main>
                </div>
            </div>
        </DataProvider>
    );
};

export default App;
