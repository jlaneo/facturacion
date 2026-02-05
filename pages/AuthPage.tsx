import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_COMPANY_SETTINGS } from '../constants';

const AuthPage: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('jlarias@outlook.com');
    const [password, setPassword] = useState('remolder');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isSignUp && password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                // Sign Up
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                // Supabase sends a confirmation email by default
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                     setMessage("Usuario ya existente. Intenta iniciar sesión.");
                } else {
                     setMessage("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.");
                }
            } else {
                // Login
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error: any) {
            setError(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <div className="text-center">
                    {/* FIX: Changed 'commercialName' to 'commercial_name' to match the 'CompanySettings' type. */}
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{DEFAULT_COMPANY_SETTINGS.commercial_name || 'neoSoporte'}</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {isSignUp ? 'Crea una cuenta para empezar' : 'Inicia sesión para gestionar tus facturas'}
                    </p>
                </div>
                <form className="space-y-6" onSubmit={handleAuthAction}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    {isSignUp && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Confirmar Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    {message && <p className="text-sm text-green-500 text-center">{message}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? (isSignUp ? 'Registrando...' : 'Iniciando sesión...') : (isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión')}
                        </button>
                    </div>
                </form>
                 <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }} className="ml-1 font-medium text-blue-600 hover:underline dark:text-blue-500">
                        {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;