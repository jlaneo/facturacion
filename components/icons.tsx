
import React from 'react';

const iconProps = {
    className: "w-6 h-6",
    strokeWidth: 1.5,
    stroke: "currentColor",
    fill: "none",
    viewBox: "0 0 24 24"
};

// FIX: Update all icon components to accept and spread props to allow customization.
export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a.75.75 0 011.06 0l8.955 8.955M3 10.062V21.75a.75.75 0 00.75.75H8.25a.75.75 0 00.75-.75V15a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v6.75a.75.75 0 00.75.75h4.5a.75.75 0 00.75-.75V10.062M15.75 21.75h-7.5" /></svg>
);

export const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
);

export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.458a9.75 9.75 0 00-9-5.192h-1.5a9.75 9.75 0 00-9 5.192a9.337 9.337 0 004.121 1.458A9.38 9.38 0 0015 19.128zM15 12a4.125 4.125 0 11-8.25 0 4.125 4.125 0 018.25 0z" /></svg>
);

export const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
);

export const ShoppingCartIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.837A.75.75 0 0018.5 6H6.518a.75.75 0 00-.74.627L5.18 8.995M6 18h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v9A2.25 2.25 0 006 18z" /></svg>
);

export const ReceiptTaxIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h.008v.008H7.5V16.5zm.375 0a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 007.875 4.5h-3.75A2.25 2.25 0 001.875 6.75v8.25c0 .621.504 1.125 1.125 1.125h.375m9-1.5c.375-.621.625-1.292.625-2.02V9.75c0-.728-.25-1.4-.625-2.02m0 4.04a2.25 2.25 0 01-2.25 2.25h-5.25a2.25 2.25 0 01-2.25-2.25m5.25-10.5h.008v.008H10.5V6.75z" /></svg>
);

export const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
);

export const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export const CurrencyEuroIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export const CalculatorIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25V15zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25V15zM3.375 10.5c0-1.036.84-1.875 1.875-1.875h.375m13.5 0h.375c1.036 0 1.875.84 1.875 1.875v7.5c0 1.036-.84 1.875-1.875-1.875h-13.5c-1.036 0-1.875-.84-1.875-1.875v-7.5zM3.375 9V6.375c0-1.036.84-1.875 1.875-1.875h13.5c1.036 0 1.875.84 1.875 1.875V9" /></svg>
);

export const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.976 5.192M21 3L15.808 6.976" /></svg>
);

export const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.423-1.423L13.5 18.75l1.188-.648a2.25 2.25 0 011.423-1.423L16.25 15l.648 1.188a2.25 2.25 0 011.423 1.423L18.75 18.75l-1.188.648a2.25 2.25 0 01-1.423 1.423z" /></svg>
);


export const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5" /></svg>
);

export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);

export const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
);

export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.036-2.134H8.716c-1.126 0-2.036.954-2.036 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);

export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);

export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
);

export const TableCellsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V6.375m1.125 13.125A1.125 1.125 0 005.25 21h13.5A1.125 1.125 0 0019.875 19.5m-16.5 0V6.375c0-.621.504-1.125 1.125-1.125h15c.621 0 1.125.504 1.125 1.125v13.125m-17.25 0h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V6.375m1.125 13.125v-3.375c0-.621.504-1.125 1.125-1.125h15c.621 0 1.125.504 1.125 1.125v3.375m-17.25 0h17.25m-17.25 0v-6.75c0-.621.504-1.125 1.125-1.125h15c.621 0 1.125.504 1.125 1.125v6.75" /></svg>
);

export const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25-2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
);

export const PaperAirplaneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
);

export const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
);

export const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);

export const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
);

export const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.667 0l-3.181 3.183" /></svg>
);

export const ChevronDoubleLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>
);

export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
);

export const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
);

// FIX: Added missing CheckIcon for use in BillingManagementPage.
export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
);
