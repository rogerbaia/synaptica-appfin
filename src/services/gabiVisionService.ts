
export interface ExtractedTicketData {
    store_name?: string;
    branch_name?: string;
    total_amount?: number;
    ticket_number?: string;
    rfc?: string;
    date?: string;
    url?: string;
    currency?: string;
    items_summary?: string;
    confidence?: string;
    [key: string]: any; // Allow custom fields defined by user rules
}

export const gabiVisionService = {
    /**
     * Analyzes a ticket image using Gemini Flash 1.5
     * @param base64Image The image in base64 format (without prefix data:image/...)
     * @param mimeType e.g. "image/jpeg"
     */
    analyzeTicket: async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<ExtractedTicketData> => {
        const savedKey = localStorage.getItem('synaptica_gemini_key');
        if (!savedKey) {
            throw new Error("No API Key configured");
        }

        // 1. Discover Model (Flash preferred)
        let modelToUse = 'gemini-1.5-flash';
        try {
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${savedKey}`);
            if (listResp.ok) {
                const listData = await listResp.json();
                const models = listData.models || [];
                // Prefer Flash for speed and vision capabilities
                const flash = models.find((m: any) => m.name.toLowerCase().includes('flash') && m.name.toLowerCase().includes('gemini'));
                if (flash) modelToUse = flash.name.replace('models/', '');
            }
        } catch (e) {
            console.warn("Model discovery failed, using default", e);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${savedKey}`;

        const payload = {
            contents: [{
                parts: [
                    {
                        text: `
                        You are an AI Ticket Scanner for a Mexican Invoicing App.
                        Analyze the attached receipt image and extract the following data in strict JSON format:
                        {
                            "store_name": "Brand Name only (e.g. 'HEB', 'McDonalds', 'Walmart'). DO NOT include 'Sucursal' or location here.",
                            "branch_name": "Specific Branch Location (e.g. 'Madero', 'San Pedro', 'Autocobro'). IF 'Autocobro' appears with store name, put 'Autocobro' HERE.",
                            "total_amount": 123.45 (number),
                            "ticket_number": "The specific ID (Folio/Transaccion). LOOK HARD. Often below barcodes or labeled as 'Ticket', 'Folio', 'Tran'.",
                            "rfc": "RFC of the store (usually 12-13 chars)",
                            "date": "YYYY-MM-DD",
                            "url": " The SPECIFIC URL where I can generate the invoice. Look for 'sitio web', 'factura en'.",
                            "currency": "MXN" or "USD",
                            "items_summary": "Short summary of what was bought",
                            "confidence": "high" or "low"
                        }
                        
                        If you cannot find a field, return null.
                        If you find multiple numbers, prioritize the one explicitly labeled as "Folio", "Ticket ID", "Trasaccion".
                        For "HEB", the ticket number is often the long "R#" or "Ticket" number.
                        Do not include markdown code blocks, just raw JSON.
                        `
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("Límite de uso de IA alcanzado. Por favor, espera 1 minuto antes de intentar de nuevo.");
            }
            const err = await response.text();
            throw new Error(`Gemini Vision Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("No analysis result returned");

        // Clean Markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const result = JSON.parse(jsonStr) as ExtractedTicketData;

            // Auto-Cleaning: Remove 'www.' from URL if present to avoid DNS issues (e.g. HEB)
            if (result.url) {
                result.url = result.url.replace('www.', '');
                if (!result.url.startsWith('http')) {
                    result.url = 'https://' + result.url;
                }
            }

            // [FIX] Date Offset Bug: Force noon to avoid Midnight UTC rolling back to previous day in local time
            if (result.date && /^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
                result.date = result.date + "T12:00:00";
            }

            // [FIX] Folio Length Guard: Discard any ticket_number > 10 chars (likely barcodes)
            if (result.ticket_number && result.ticket_number.replace(/\D/g, '').length > 10) {
                console.warn("Discarding long ticket number (likely barcode):", result.ticket_number);
                result.ticket_number = undefined; // Return null so user sees empty field instead of wrong data
            }

            return result;
        } catch (e) {
            console.error("JSON Parse Error", text);
            throw new Error("Failed to parse AI response");
        }
    }
    ,

    /**
     * Extracts a specific field from a cropped image segment.
     * Uses a focused prompt to avoid hallucination or extra text.
     */
    extractSpecificField: async (base64Crop: string, field: 'ticket_number' | 'total_amount' | 'date', mimeType: string = 'image/jpeg'): Promise<string | number | null> => {
        const savedKey = localStorage.getItem('synaptica_gemini_key');
        if (!savedKey) throw new Error("No API Key");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${savedKey}`;

        let prompt = "";
        if (field === 'ticket_number') {
            prompt = `Analyze this image crop.
            
            YOUR TASK:
            1. Transcribe ALL text found in the crop.
            2. SPLIT the text into separate tokens (by spaces).
            3. EVALUATE each token independently:
            
            PRIORITY RANKING:
            - GOLD 🥇: Short standalone number (4-10 digits). (e.g. "769508").
            - TRASH 🗑️: Long number (12+ digits). (e.g. Barcode "1076..."). IT IS WRONG.
            - TRASH 🗑️: Complex slashed codes (e.g. 675/75/...). IT IS WRONG.
            
            ACTION:
            - YOU MUST RETURN THE GOLD CANDIDATE.
            - If you see a short number and a long number, THE SHORT ONE WINS. ALWAYS.
            - Ignore physical position. LENGTH determines priority.
            
            
            OUTPUT:
            Return ONLY the clean short string.`;
        } else if (field === 'total_amount') {
            prompt = `Analyze this image crop. It contains the TOTAL AMOUNT.
            
            YOUR TASK:
            1. Find the largest monetary value.
            2. Return ONLY the number (e.g. 123.45).`;
        } else if (field === 'date') {
            prompt = `Analyze this image crop. Return the main DATE found.
            
            Format: YYYY-MM-DD.
            
            IMPORTANT:
            - If text uses words (e.g. "DEC 14"), use them to determine Month.
            - If numeric (e.g. 12/14/2025), detect format:
              - If first number > 12, it's DD/MM.
              - If store is US-based (like HEB, Costco, Walmart) or looks like US format, prefer MM/DD.
            - Return standard YYYY-MM-DD.`;
        }

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Crop.replace(/^data:image\/\w+;base64,/, '') } }
                ]
            }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) return null;

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (!text) return null;

            if (field === 'total_amount') {
                const num = parseFloat(text.replace(/[^0-9.]/g, '')); // Clean non-numeric
                return isNaN(num) ? null : num;
            }

            return text;
        } catch (e) {
            console.error("Focused extraction failed", e);
            return null;
        }
    }
};
