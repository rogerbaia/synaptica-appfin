export interface ColorTheme {
    id: string;
    name: string;
    colors: string[];
    primary: string;
    secondary: string;
    description: string;
    premium: boolean;
}

export const COLOR_THEMES: ColorTheme[] = [

    {
        id: 'zafiro_ejecutivo',
        name: 'Zafiro Ejecutivo',
        colors: ['#385D8D', '#2A476B'], // Original Classic Colors
        primary: '#385D8D',
        secondary: '#2A476B',
        description: 'El diseño clásico, sobrio y profesional.',
        premium: true
    },
    {
        id: 'esmeralda_finanzas',
        name: 'Esmeralda Finanzas',
        colors: ['#10b981', '#064e3b'], // Emerald 500 -> Emerald 900
        primary: '#059669',
        secondary: '#064e3b',
        description: 'Crecimiento, estabilidad y prosperidad.',
        premium: true
    },
    {
        id: 'amatista_creativa',
        name: 'Amatista Creativa',
        colors: ['#8b5cf6', '#4c1d95'], // Violet 500 -> Violet 900
        primary: '#7c3aed',
        secondary: '#5b21b6',
        description: 'Innovación y elegancia moderna.',
        premium: true
    },
    {
        id: 'horizonte_ambar',
        name: 'Horizonte Ámbar',
        colors: ['#f59e0b', '#b45309'], // Amber 500 -> Amber 700
        primary: '#d97706',
        secondary: '#92400e',
        description: 'Calidez, energía y visión.',
        premium: true
    },
    {
        id: 'rubi_dinamico',
        name: 'Rubí Dinámico',
        colors: ['#f43f5e', '#881337'], // Rose 500 -> Rose 900
        primary: '#be123c',
        secondary: '#881337',
        description: 'Pasión y dinamismo audaz.',
        premium: true
    },
    {
        id: 'obsidiana_premium',
        name: 'Obsidiana Premium',
        colors: ['#1e293b', '#64748b'], // Slate 800 -> Slate 500
        primary: '#0f172a',
        secondary: '#334155',
        description: 'El lujo de lo esencial. Ultra oscuro.',
        premium: true
    },
    {
        id: 'perla_minimalista',
        name: 'Perla Minimalista',
        colors: ['#94a3b8', '#e2e8f0'], // Slate 400 -> Slate 200
        primary: '#64748b',
        secondary: '#94a3b8',
        description: 'Claridad, pureza y minimalismo.',
        premium: true
    },
    {
        id: 'oceano_profundo',
        name: 'Océano Profundo',
        colors: ['#06b6d4', '#0e7490'], // Cyan 500 -> Cyan 700
        primary: '#0891b2',
        secondary: '#155e75',
        description: 'Frescura tecnológica y fluidez.',
        premium: true
    },

];
