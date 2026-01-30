import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { transactions, country } = body;

        // Mock AI Logic (Simulating Gemini/OpenAI response)
        // In a real app, we would call the actual API here using 'transactions' data.

        const adviceList = [
            "Tus gastos en 'Comida' subieron un 20% respecto al mes pasado. Considera cocinar en casa.",
            "Has mantenido tus servicios bajo control. ¡Bien hecho!",
            "Podrías ahorrar $500 MXN si cancelas esa suscripción que no usas.",
            "Detectamos un cargo duplicado en 'Spotify'. Revísalo.",
            "Tu fondo de emergencia está bajo. Intenta destinar 5% de tus ingresos este mes."
        ];

        // Randomly select one advice
        const randomAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];

        return NextResponse.json({
            advice: randomAdvice,
            sentiment: 'neutral',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return NextResponse.json({ error: 'Error processing AI request' }, { status: 500 });
    }
}
