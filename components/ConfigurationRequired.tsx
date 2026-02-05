import React from 'react';

interface ConfigurationRequiredProps {
    error: string;
}

const codeBlock = `
// Abre el fichero 'config.ts' y añade tus credenciales:

export const SUPABASE_URL = "PON_AQUÍ_TU_URL_DE_SUPABASE";
export const SUPABASE_ANON_KEY = "PON_AQUÍ_TU_CLAVE_ANON_DE_SUPABASE";
`;

const ConfigurationRequired: React.FC<ConfigurationRequiredProps> = ({ error }) => {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-2xl p-8 m-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Error de Configuración</h2>
                <p className="mt-2 text-md text-red-600 dark:text-red-400 font-semibold">{error}</p>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Para que la aplicación funcione, necesitas conectar tu base de datos de Supabase.
                    Por favor, sigue las instrucciones en los comentarios del fichero <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-sm">config.ts</code>.
                </p>
                <div className="mt-6 p-4 bg-gray-50 dark:bg-black dark:bg-opacity-20 rounded-lg text-left">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        <code className="language-typescript">{codeBlock.trim()}</code>
                    </pre>
                </div>
                 <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Después de guardar los cambios en <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-sm">config.ts</code>, recarga la página.
                </p>
            </div>
        </div>
    );
};

export default ConfigurationRequired;
