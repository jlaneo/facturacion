
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { CompanySettings } from '../types';

const SettingsPage: React.FC = () => {
    const { settings, updateSettings } = useData();
    const [formData, setFormData] = useState<CompanySettings>(settings);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'iva' ? parseFloat(value) : value
        }));
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 1MB limit
                alert("El archivo es demasiado grande. El límite es de 1MB.");
                e.target.value = ''; // Reset the file input
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.onerror = () => {
                console.error("Error al leer el archivo.");
                alert("Hubo un error al cargar el logo. Inténtalo de nuevo.");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, logo: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        try {
            await updateSettings(formData);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error: any) {
            console.error("Failed to save settings:", error);
            let errorMessage = 'Ocurrió un error desconocido. Revisa la consola para más detalles.';
            if (error && typeof error.message === 'string' && error.message) {
                errorMessage = error.message;
            }
            alert(`Error al guardar los ajustes: ${errorMessage}`);
            setSaveStatus('idle');
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Ajustes</h1>
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-semibold border-b pb-4 dark:border-gray-700">Información de la Empresa</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Comercial</label>
                    <input type="text" name="commercial_name" value={formData.commercial_name || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Fiscal (tu nombre completo)</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">NIF/CIF</label>
                    <input type="text" name="tax_id" value={formData.tax_id} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección Fiscal</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} required rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"></textarea>
                </div>
                
                <h2 className="text-xl font-semibold border-b pt-4 pb-4 dark:border-gray-700">Ajustes Financieros</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de IVA (%)</label>
                    <input type="number" name="iva" value={formData.iva} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>

                <h2 className="text-xl font-semibold border-b pt-4 pb-4 dark:border-gray-700">Logotipo de la Empresa</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cargar Logotipo</label>
                    <div className="mt-2 flex items-center space-x-6">
                        {formData.logo ? (
                            <img src={formData.logo} alt="Logotipo actual" className="h-20 w-20 object-contain rounded-md bg-gray-100 dark:bg-gray-700 p-1 border dark:border-gray-600" />
                        ) : (
                            <div className="h-20 w-20 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-md border dark:border-gray-600">
                                <span className="text-xs text-center text-gray-500">Sin Logotipo</span>
                            </div>
                        )}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="logo-upload" className="cursor-pointer bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm">
                                Seleccionar Archivo
                            </label>
                            <input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} className="hidden" />
                            {formData.logo && (
                                <button type="button" onClick={handleRemoveLogo} className="text-red-600 hover:text-red-700 text-sm font-medium">
                                    Eliminar logotipo
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sube el logo de tu empresa (max 1MB). Se usará como marca de agua en los PDF. Recomendado: .png con fondo transparente.</p>
                </div>

                <h2 className="text-xl font-semibold border-b pt-4 pb-4 dark:border-gray-700">Personalización de Facturas</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color Principal de la Plantilla</label>
                    <div className="mt-1 flex items-center space-x-3">
                        <input 
                            type="color" 
                            name="template_color" 
                            value={formData.template_color || '#3b82f6'} 
                            onChange={handleChange} 
                            className="p-1 h-10 w-10 block bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-pointer rounded-lg"
                        />
                         <input 
                            type="text" 
                            name="template_color"
                            value={formData.template_color || '#3b82f6'} 
                            onChange={handleChange} 
                            placeholder="#3b82f6"
                            className="block w-full max-w-xs p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" 
                        />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Este color se usará en los encabezados de tus facturas en PDF.</p>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-36" disabled={saveStatus === 'saving'}>
                        {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? '¡Guardado!' : 'Guardar Ajustes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
