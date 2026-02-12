export interface CategorySuggestion {
    id: string;
    name: string;
    type: 'income' | 'expense';
    popularityScore: number; // 0 to 100 representing percentage of users using it
    isDefault: boolean;
}

// Mock database of categories with "AI" calculated popularity scores
// Mock database of categories, aligned with our specific CATEGORY_STRUCTURE
const MOCK_CATEGORY_DB: CategorySuggestion[] = [
    // Expenses - Subcategories (Need > 15 to show refill behavior)
    { id: '1', name: 'Supermercado', type: 'expense', popularityScore: 98, isDefault: true },
    { id: '2', name: 'Combustible', type: 'expense', popularityScore: 97, isDefault: true },
    { id: '3', name: 'Renta', type: 'expense', popularityScore: 95, isDefault: true },
    { id: '4', name: 'Luz', type: 'expense', popularityScore: 94, isDefault: true },
    { id: '5', name: 'Internet', type: 'expense', popularityScore: 93, isDefault: true },
    { id: '6', name: 'Celular', type: 'expense', popularityScore: 92, isDefault: true },
    { id: '7', name: 'Netflix', type: 'expense', popularityScore: 90, isDefault: true },
    { id: '8', name: 'Farmacia', type: 'expense', popularityScore: 89, isDefault: true },
    { id: '9', name: 'Spotify', type: 'expense', popularityScore: 88, isDefault: true },
    { id: '10', name: 'Mensualidad Auto', type: 'expense', popularityScore: 87, isDefault: false },
    { id: '11', name: 'Colegiatura', type: 'expense', popularityScore: 86, isDefault: true },
    { id: '12', name: 'Agua', type: 'expense', popularityScore: 85, isDefault: true },
    { id: '13', name: 'Gas', type: 'expense', popularityScore: 84, isDefault: true },
    { id: '14', name: 'Restaurantes', type: 'expense', popularityScore: 83, isDefault: true },
    { id: '15', name: 'Amazon', type: 'expense', popularityScore: 82, isDefault: true },
    { id: '16', name: 'Mantenimiento Auto', type: 'expense', popularityScore: 81, isDefault: true },
    { id: '17', name: 'Seguro', type: 'expense', popularityScore: 80, isDefault: true },
    { id: '18', name: 'Veterinario', type: 'expense', popularityScore: 79, isDefault: true },
    { id: '19', name: 'Alimento Mascota', type: 'expense', popularityScore: 78, isDefault: true },
    { id: '20', name: 'Gimnasio', type: 'expense', popularityScore: 77, isDefault: true },
    { id: '21', name: 'Ropa', type: 'expense', popularityScore: 76, isDefault: true },
    { id: '22', name: 'Uber', type: 'expense', popularityScore: 75, isDefault: true },
    { id: '23', name: 'Disney+', type: 'expense', popularityScore: 74, isDefault: true },
    { id: '24', name: 'Cine', type: 'expense', popularityScore: 73, isDefault: true },

    // Add Parents for "Categories" tab suggestions
    { id: '100', name: 'Vivienda', type: 'expense', popularityScore: 99, isDefault: true },
    { id: '101', name: 'Servicios', type: 'expense', popularityScore: 96, isDefault: true },
    { id: '102', name: 'Automovil', type: 'expense', popularityScore: 94, isDefault: true },
    { id: '103', name: 'Escolares', type: 'expense', popularityScore: 90, isDefault: true },
    { id: '104', name: 'Servicios Digitales', type: 'expense', popularityScore: 89, isDefault: true },
    { id: '105', name: 'Gastos Varios', type: 'expense', popularityScore: 88, isDefault: true },
    { id: '106', name: 'Seguros', type: 'expense', popularityScore: 85, isDefault: true },
    { id: '107', name: 'Mascotas', type: 'expense', popularityScore: 80, isDefault: true },
    { id: '108', name: 'Cuidado Personal', type: 'expense', popularityScore: 75, isDefault: true },
    { id: '109', name: 'Salud', type: 'expense', popularityScore: 74, isDefault: true },
    { id: '110', name: 'Viajes', type: 'expense', popularityScore: 72, isDefault: true },
    { id: '111', name: 'Tecnología', type: 'expense', popularityScore: 70, isDefault: true },
    { id: '112', name: 'Transporte', type: 'expense', popularityScore: 68, isDefault: true },
    { id: '113', name: 'Familia', type: 'expense', popularityScore: 65, isDefault: true },
    { id: '114', name: 'Financiero', type: 'expense', popularityScore: 60, isDefault: true },

    // Income - Subcategories (Examples for the new parents)
    { id: '250', name: 'Nomina Principal', type: 'income', popularityScore: 90, isDefault: true },
    { id: '251', name: 'Freelance Octubre', type: 'income', popularityScore: 80, isDefault: true },
    { id: '252', name: 'Coca Cola', type: 'income', popularityScore: 70, isDefault: true },
    { id: '253', name: 'Apple', type: 'income', popularityScore: 70, isDefault: true },
    { id: '254', name: 'Aguinaldo', type: 'income', popularityScore: 95, isDefault: true },
    { id: '255', name: 'Utilidades', type: 'income', popularityScore: 85, isDefault: true },
    { id: '256', name: 'Devolución SAT', type: 'income', popularityScore: 82, isDefault: true },

    // Income - Parents (Now "Sueldo", "Dividendos", etc. are parents)
    { id: '300', name: 'Sueldo', type: 'income', popularityScore: 99, isDefault: true },
    { id: '301', name: 'Honorarios', type: 'income', popularityScore: 90, isDefault: true },
    { id: '302', name: 'Ventas', type: 'income', popularityScore: 85, isDefault: true },
    { id: '303', name: 'Bonos', type: 'income', popularityScore: 80, isDefault: true },
    { id: '304', name: 'Rentas', type: 'income', popularityScore: 75, isDefault: true },
    { id: '305', name: 'Dividendos', type: 'income', popularityScore: 70, isDefault: true },
    { id: '306', name: 'Intereses', type: 'income', popularityScore: 65, isDefault: true },
    { id: '307', name: 'Regalías', type: 'income', popularityScore: 60, isDefault: true },
    { id: '308', name: 'Negocios', type: 'income', popularityScore: 75, isDefault: true },
    { id: '309', name: 'Inversiones', type: 'income', popularityScore: 50, isDefault: true },
    { id: '310', name: 'Préstamo', type: 'income', popularityScore: 60, isDefault: true },
    { id: '311', name: 'Regalos', type: 'income', popularityScore: 90, isDefault: true },
    { id: '312', name: 'Reembolsos', type: 'income', popularityScore: 85, isDefault: true },
    { id: '313', name: 'Beca', type: 'income', popularityScore: 40, isDefault: true },
    { id: '314', name: 'Pensión', type: 'income', popularityScore: 55, isDefault: true },
    { id: '315', name: 'Criptomonedas', type: 'income', popularityScore: 45, isDefault: true },
    { id: '316', name: 'Lotería', type: 'income', popularityScore: 15, isDefault: false },
    { id: '317', name: 'Herencia', type: 'income', popularityScore: 10, isDefault: false },
    // Extended Pool
    { id: '318', name: 'YouTube/Twitch', type: 'income', popularityScore: 45, isDefault: false },
    { id: '319', name: 'Freelance', type: 'income', popularityScore: 60, isDefault: true },
    { id: '320', name: 'Airbnb', type: 'income', popularityScore: 55, isDefault: true },
    { id: '321', name: 'E-commerce', type: 'income', popularityScore: 50, isDefault: true },
    { id: '322', name: 'Consultoría', type: 'income', popularityScore: 65, isDefault: true },
    { id: '323', name: 'Clases Particulares', type: 'income', popularityScore: 40, isDefault: true },
    { id: '324', name: 'Coaching', type: 'income', popularityScore: 35, isDefault: true },
    { id: '325', name: 'Manutención', type: 'income', popularityScore: 30, isDefault: true },
    { id: '326', name: 'Jubilación', type: 'income', popularityScore: 70, isDefault: true },
    { id: '327', name: 'Venta de Garage', type: 'income', popularityScore: 25, isDefault: false },
    { id: '328', name: 'Afiliados', type: 'income', popularityScore: 45, isDefault: false },
    { id: '329', name: 'Liquidación', type: 'income', popularityScore: 20, isDefault: false },
    { id: '330', name: 'Patreon', type: 'income', popularityScore: 30, isDefault: false },
    { id: '331', name: 'Cursos Online', type: 'income', popularityScore: 48, isDefault: false },
];

export const aiCategoryService = {
    /**
     * Simulates an AI analysis to return a refined list of categories.
     * It filters out default categories with low popularity (< 10%)
     * and suggests new categories with high popularity (> 50%).
     */
    getSmartCategories: async (type: 'income' | 'expense'): Promise<CategorySuggestion[]> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // AI Logic: 
        // 1. Keep defaults unless popularity is VERY low (< 10%).
        // 2. Add non-defaults if popularity is HIGH (> 50%).

        return MOCK_CATEGORY_DB.filter(cat => {
            if (cat.type !== type) return false;

            if (cat.isDefault) {
                // Remove if unpopular (e.g. Hipoteca with 5%)
                return cat.popularityScore >= 10;
            } else {
                // Add if popular (e.g. Mensualidad Auto with 70%)
                return cat.popularityScore >= 50;
            }
        }).sort((a, b) => b.popularityScore - a.popularityScore);
    }
};
