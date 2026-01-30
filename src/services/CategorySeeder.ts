import { supabaseService } from './supabaseService';

export const CATEGORY_STRUCTURE = [
    {
        name: "Vivienda", type: "expense", children: [
            "Renta", "Hipoteca", "Predial", "Mantenimiento", "Renta otras propiedades"
        ]
    },
    {
        name: "Servicios", type: "expense", children: [
            "Agua", "Luz", "Gas", "Internet", "Cable", "Celular", "Alarma", "Servicio Domestico"
        ]
    },
    {
        name: "Servicios Digitales", type: "expense", children: [
            "Netflix", "Amazon", "Warner", "Disney+", "Spotify", "Apple"
        ]
    },
    {
        name: "Escolares", type: "expense", children: [
            "Colegiatura", "Musica", "Deporte", "Gym", "Utiles", "Uniformes"
        ]
    },
    {
        name: "Automovil", type: "expense", children: [
            "Combustible", "Seguro", "Tenencia", "Mensualidad Auto", "Mantenimiento Auto"
        ]
    },
    {
        name: "Seguros", type: "expense", children: [
            "Medico", "Vida", "Inmobiliarios", "Retiro", "Malapraxis"
        ]
    },
    {
        name: "Gastos Varios", type: "expense", children: [
            "Supermercado", "Restaurantes", "Boletos", "Taxi",
            "Gastos Medicos", "Farmacia", "Diversion",
            "Ropa", "Tintoreria", "Estetica", "Propina"
        ]
    },
    {
        name: "Mascotas", type: "expense", children: [
            "Alimento Mascota", "Veterinario", "Juguetes Mascota", "Estetica Mascota"
        ]
    },
    {
        name: "Cuidado Personal", type: "expense", children: [
            "Gimnasio", "Suplementos", "Barberia", "Spa", "Cosmeticos"
        ]
    },
    {
        name: "Salud", type: "expense", children: [
            "Consultas Medicas", "Medicamentos", "Dentista", "Hospital", "Lentes"
        ]
    },
    {
        name: "Viajes", type: "expense", children: [
            "Vuelos", "Hospedaje", "Tours", "Viaticos", "Maletas"
        ]
    },
    {
        name: "Tecnología", type: "expense", children: [
            "Software", "Hardware", "Reparaciones", "Dominios", "Hosting"
        ]
    },
    {
        name: "Transporte", type: "expense", children: [
            "Uber/Taxi", "Transporte Publico", "Peajes", "Estacionamiento"
        ]
    },
    {
        name: "Familia", type: "expense", children: [
            "Regalos", "Mesada", "Ayuda Familiar"
        ]
    },
    {
        name: "Financiero", type: "expense", children: [
            "Comisiones Bancarias", "Impuestos", "Contador", "Intereses TC"
        ]
    },
    // Income - Refactored to be Top Level Parents as per user request
    { name: "Sueldo", type: "income", children: [] },
    { name: "Honorarios", type: "income", children: [] },
    { name: "Ventas", type: "income", children: [] },
    { name: "Bonos", type: "income", children: [] },
    { name: "Rentas", type: "income", children: [] },
    { name: "Dividendos", type: "income", children: [] },
    { name: "Intereses", type: "income", children: [] },
    { name: "Regalías", type: "income", children: [] },
    { name: "Lotería", type: "income", children: [] },
    { name: "Herencia", type: "income", children: [] },
    { name: "Venta de Activos", type: "income", children: [] },
    { name: "Premio", type: "income", children: [] },
    { name: "Beca", type: "income", children: [] },
    { name: "Pensión", type: "income", children: [] },
    { name: "Apoyo Familiar", type: "income", children: [] },
    { name: "Préstamo", type: "income", children: [] },
    { name: "Devolución Impuestos", type: "income", children: [] },
    { name: "Reembolsos", type: "income", children: [] },
    { name: "Cashback", type: "income", children: [] },
    { name: "Regalos", type: "income", children: [] },
    { name: "Donaciones", type: "income", children: [] },
    { name: "Negocios", type: "income", children: [] },
    { name: "Inversiones", type: "income", children: [] },
    { name: "Trading", type: "income", children: [] },
    { name: "Criptomonedas", type: "income", children: [] },
    // Extended Infinite Queue Pool
    { name: "YouTube/Twitch", type: "income", children: [] },
    { name: "Patreon", type: "income", children: [] },
    { name: "OnlyFans", type: "income", children: [] },
    { name: "Cursos Online", type: "income", children: [] },
    { name: "E-commerce", type: "income", children: [] },
    { name: "Dropshipping", type: "income", children: [] },
    { name: "Afiliados", type: "income", children: [] },
    { name: "Airbnb", type: "income", children: [] },
    { name: "Consultoría", type: "income", children: [] },
    { name: "Coaching", type: "income", children: [] },
    { name: "Clases Particulares", type: "income", children: [] },
    { name: "Reparaciones", type: "income", children: [] },
    { name: "Venta de Garage", type: "income", children: [] },
    { name: "Manutención", type: "income", children: [] },
    { name: "Jubilación", type: "income", children: [] },
    { name: "Seguro de Desempleo", type: "income", children: [] },
    { name: "Liquidación", type: "income", children: [] }
];

export const CategorySeeder = {
    async seedCategories() {
        // Clear functionality if needed? No, let's just append/check.
        // Actually user wants this structure.

        const structure = CATEGORY_STRUCTURE;

        let createdCount = 0;

        for (const parent of structure) {
            // Check if parent exists
            const categories = await supabaseService.getCategories();
            let parentId = categories.find(c => c.name === parent.name && c.type === parent.type)?.id;

            if (!parentId) {
                const newParent = await supabaseService.addCategory(parent.name, parent.type as 'income' | 'expense');
                parentId = newParent.id;
                createdCount++;
            }

            for (const childName of parent.children) {
                // Check if child exists under this parent (optimization: just check name for now or strictly parent?)
                // Since we just fetched categories, we can check. 
                // Note: getCategories returns flat list. subcategories will have parent_id.

                // Re-fetch or strict check not super efficient here but safe.
                // Assuming we want to avoid dupes purely by name validation in UI, but here we force structure.

                // Let's just try to add. If existing logic prevents dupes, we catch error?
                // Better to check.
                const exists = categories.some(c => c.name === childName && c.parent_id === parentId);
                if (!exists) {
                    await supabaseService.addCategory(childName, parent.type as 'income' | 'expense', parentId);
                    createdCount++;
                }
            }
        }

        return createdCount;
    }
};
