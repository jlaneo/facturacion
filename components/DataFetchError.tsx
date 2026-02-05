import React, { useState } from 'react';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabase_schema';

interface DataFetchErrorProps {
    error: any;
    onRetry: () => void;
}

const DataFetchError: React.FC<DataFetchErrorProps> = ({ error, onRetry }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    let title = "Error al Cargar los Datos";
    let mainMessage = "No se pudo conectar con la base de datos.";
    let details = error?.message || 'No hay detalles del error.';
    let solution = null;

    const errorMessage = error?.message?.toLowerCase() || '';

    const handleCopy = () => {
        navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL.trim())
            .then(() => {
                setCopyStatus('copied');
                setTimeout(() => setCopyStatus('idle'), 2000);
            })
            .catch(err => {
                console.error('Failed to copy SQL script:', err);
                alert('No se pudo copiar el script. Por favor, cópialo manualmente.');
            });
    };

    if (errorMessage.includes('could not find the table') || (errorMessage.includes('relation') && errorMessage.includes('does not exist'))) {
        title = "Tablas no encontradas en la Base de Datos";
        const missingTableNameMatch = errorMessage.match(/table 'public\.(\w+)'|relation "public\.(\w+)"|"(\w+)"/);
        const missingTableName = missingTableNameMatch ? (missingTableNameMatch[1] || missingTableNameMatch[2] || missingTableNameMatch[3]) : 'desconocida';
        mainMessage = `La tabla necesaria '${missingTableName}' no existe en tu base de datos de Supabase. Esto indica que la base de datos no ha sido configurada.`;
        solution = (
             <div className="mt-6 text-left text-gray-600 dark:text-gray-300 space-y-2">
                <p><strong>Solución Rápida:</strong></p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                    <li>Ve a tu proyecto en <a href="https://app.supabase.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Supabase</a>.</li>
                    <li>Navega a la sección <strong>SQL Editor</strong>.</li>
                    <li>Copia el script completo que aparece a continuación y pégalo en el editor.</li>
                    <li>Haz clic en el botón <strong>"RUN"</strong> para crear todas las tablas y configurar la base de datos.</li>
                </ol>
                <div className="mt-4 relative p-4 bg-gray-50 dark:bg-black dark:bg-opacity-20 rounded-lg">
                     <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-1 px-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm"
                    >
                        {copyStatus === 'copied' ? '¡Copiado!' : 'Copiar Script'}
                    </button>
                    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-60 overflow-auto">
                        <code className="language-sql">{SUPABASE_SCHEMA_SQL.trim()}</code>
                    </pre>
                </div>
            </div>
        );
    } else if (errorMessage.includes('violates row-level security policy')) {
        title = "Error de Seguridad de Fila (RLS)";
        mainMessage = "La operación fue bloqueada por las políticas de seguridad de tu base de datos.";
        solution = (
            <div className="mt-6 text-left text-gray-600 dark:text-gray-300 space-y-2">
                <p><strong>Causa probable:</strong> Una tabla tiene activada la "Row Level Security" (RLS) en Supabase, pero no tiene políticas definidas que permitan la operación que se intentó (leer, insertar, etc.).</p>
                <p><strong>Solución:</strong></p>
                <ol className="list-decimal list-inside space-y-1 pl-4">
                     <li>Si acabas de crear las tablas, es posible que las políticas RLS no se hayan aplicado correctamente. Intenta ejecutar de nuevo el script de creación de tablas para asegurarte de que todas las políticas están en su lugar.</li>
                    <li>Si el problema persiste, ve a tu panel de control de Supabase, navega a <strong>Authentication</strong> &rarr; <strong>Policies</strong> y verifica que existan políticas para todas las tablas que permitan a los usuarios autenticados gestionar sus propios datos (usando la condición <code>auth.uid() = user_id</code>).</li>
                </ol>
                 <p className="mt-2">Si necesitas más información, consulta la <a href="https://supabase.com/docs/guides/auth/row-level-security" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">documentación oficial de RLS de Supabase</a>.</p>
            </div>
        )
    }

    return (
         <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-3xl p-8 m-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <p className="mt-2 text-md text-red-600 dark:text-red-400 font-semibold">{mainMessage}</p>
                </div>
                {solution ? (
                    solution
                ) : (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-black dark:bg-opacity-20 rounded-lg text-left">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Detalles del Error:</h3>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                            {details}
                        </p>
                    </div>
                )}
                 <div className="mt-6 text-center">
                    <button
                        onClick={onRetry}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Reintentar después de aplicar la solución
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataFetchError;
