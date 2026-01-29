export interface Transaction {
    id: string;
    date: string;
    amount: number;
    description: string;
    category: string;
    paymentReceived?: boolean; // For incomes
}

export interface FinancialData {
    incomes: Transaction[];
    expenses: Transaction[];
}

export const mockFinancialData: FinancialData = {
    incomes: [
        { id: '1', date: '2024-12-01', amount: 5000, description: 'Salario', category: 'Salario', paymentReceived: true },
        { id: '2', date: '2024-12-15', amount: 3000, description: 'Freelance', category: 'Extra', paymentReceived: true },
        { id: '3', date: '2025-01-01', amount: 5200, description: 'Salario Enero', category: 'Salario', paymentReceived: true },
        { id: '4', date: '2025-01-10', amount: 1500, description: 'Venta', category: 'Ventas', paymentReceived: false },
    ],
    expenses: [
        { id: '1', date: '2024-12-05', amount: 1200, description: 'Alquiler', category: 'Vivienda' },
        { id: '2', date: '2024-12-10', amount: 500, description: 'Supermercado', category: 'Alimentación' },
        { id: '3', date: '2024-12-20', amount: 300, description: 'Internet', category: 'Servicios' },
        { id: '4', date: '2025-01-02', amount: 1200, description: 'Alquiler Enero', category: 'Vivienda' },
        { id: '5', date: '2025-01-05', amount: 600, description: 'Cena', category: 'Alimentación' },
        { id: '6', date: '2025-01-08', amount: 400, description: 'Gasolina', category: 'Transporte' },
    ]
};
