import React, { ReactNode, useState, useEffect } from 'react';
import { XIcon, ChevronDownIcon } from './icons';

interface SidebarProps {
    children: ReactNode;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, isOpen, setIsOpen }) => {
    return (
        <>
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-800 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:-ml-72'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">neoSoporte</h1>
                    <button onClick={() => setIsOpen(false)} className="md:hidden">
                        <XIcon/>
                    </button>
                </div>
                <nav className="mt-5">
                    {children}
                </nav>
            </aside>
            {isOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 md:hidden" onClick={() => setIsOpen(false)}></div>}
        </>
    );
};

interface SidebarItemProps {
    icon: ReactNode;
    text: string;
    active?: boolean;
    onClick?: () => void;
    children?: ReactNode;
    // FIX: Add className to props to allow style overrides for sub-menu items.
    className?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon, text, active, onClick, children, className }) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(active || false);

    useEffect(() => {
        if (active) {
            setIsSubmenuOpen(true);
        }
    }, [active]);
    
    const hasSubmenu = React.Children.count(children) > 0;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (hasSubmenu) {
            setIsSubmenuOpen(!isSubmenuOpen);
        }
        if (onClick) {
            onClick();
        }
    };


    return (
        <div className="mx-2 my-1">
            <a
                href="#"
                onClick={handleClick}
                // FIX: Apply the passed className to the underlying element.
                className={`flex items-center justify-between px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200 ${active && !hasSubmenu ? 'bg-gray-200 dark:bg-gray-700' : ''} ${active && hasSubmenu ? 'font-bold' : ''} ${className || ''}`}
            >
                <div className="flex items-center">
                    {icon}
                    <span className="mx-4 font-medium">{text}</span>
                </div>
                 {hasSubmenu && (
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                )}
            </a>
            {hasSubmenu && (
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSubmenuOpen ? 'max-h-screen' : 'max-h-0'}`}>
                    <div className="pl-8 pt-2 space-y-1">
                         {React.Children.map(children, child =>
                            // FIX: Use a generic type guard and provide a fallback for className to fix type errors.
                            React.isValidElement<SidebarItemProps>(child) ? React.cloneElement(child, { 
                                ...child.props, 
                                // Override styles for submenu items for a cleaner look
                                className: `${child.props.className || ''} !py-1 !my-0 text-sm` 
                            }) : child
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
