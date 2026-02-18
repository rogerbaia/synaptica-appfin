import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseService } from '@/services/supabaseService';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export type GabiState = 'idle' | 'listening' | 'processing' | 'speaking';

export const useGabi = () => {
    const [state, setState] = useState<GabiState>('idle');
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [clientName, setClientName] = useState<string | null>(null);

    // --- CONVERSATION STATE (Voice Wizard) ---
    type ConversationMode = 'CFDI_WIZARD' | 'TRANSACTION_WIZARD' | null;
    type CFDIStep = 'ASK_CLIENT' | 'CONFIRM_DATA' | 'ASK_AMOUNT' | 'ASK_CONCEPT' | 'FINAL_CONFIRM' | 'RETRY_CHECK'
        | 'ASK_DESCRIPTION'; // Added for Transaction Wizard

    const [conversation, setConversation] = useState<{
        mode: ConversationMode;
        step: CFDIStep;
        data: {
            clientName?: string;
            amount?: number;
            concept?: string;
            type?: 'income' | 'expense'; // Added for Transaction Wizard
            lastInvoice?: any;
            previousStep?: CFDIStep; // For retry logic
        };
    }>({ mode: null, step: 'ASK_CLIENT', data: {} });

    // --- UI REQUESTS (New v7.6) ---
    const [transactionRequest, setTransactionRequest] = useState<{
        type: 'income' | 'expense';
        amount: number;
        description: string;
        category?: string;
    } | null>(null);

    // Ref to access state inside stale closures (SpeechRecognition callbacks)
    const conversationRef = useRef(conversation);

    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);

    // Track if we are expecting a response to auto-restart mic
    const expectingResponse = useRef(false);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);
    const transcriptRef = useRef('');

    // Load Nickname on Mount
    useEffect(() => {
        supabaseService.getUserMetadata().then(meta => {
            if (meta?.nickname) setClientName(meta.nickname);
        });

        // Initialize Speech Synthesis
        if (typeof window !== 'undefined') {
            synthesisRef.current = window.speechSynthesis;
        }

        console.log("Gabi Hook v7.7 Loaded - Native Speech Plugin");

        // Setup Native Listeners
        SpeechRecognition.removeAllListeners();

        SpeechRecognition.addListener('partialResults', (data: any) => {
            if (data.matches && data.matches.length > 0) {
                const text = data.matches[0];
                setTranscript(text);
                transcriptRef.current = text;
            }
        });

        // Some devices don't fire partialResults efficiently, so we also check 'listeningState'
        // effectively, main results come from the promise resolution of start(), 
        // OR we might need to rely on partials if the promise doesn't return intermediate.
        // Actually, the plugin usually returns the final array in the start() promise.

        return () => {
            SpeechRecognition.removeAllListeners();
        };

    }, []);

    // Ref to hold the latest version of processCommand to avoid stale closures
    const processCommandRef = useRef<(cmd: string) => Promise<void>>(async () => { });

    // Update ref when function changes (if it depends on closure, though here we define it inside too... wait)
    // Actually `processCommand` is defined BELOW. We need to keep this pattern.
    // The previous code had `processCommandRef.current = processCommand` but processCommand was defined AFTER.
    // Wait, in previous code `processCommand` called `processCommandRef`. 
    // Actually, `processCommand` logic was inside the hook.
    // Let's modify `startListening` to handle the flow.

    useEffect(() => {
        // Update ref for the closure used by the native result handler if we move logic there
    }, [clientName]);

    // Define processCommand first so we can use it? No, standard function hosting.
    // But we need to update the ref.

    // ... we will update `processCommandRef` at the end of the hook or in an effect.

    // Forward declare startListening so speak can use it?
    // Actually, we can use a ref for startListening if we want to avoid circular deps, or just rely on hoisting if not using useCallback for startListening?
    // Better: Define startListening first or use a ref.
    // Issue: speak uses startListening, startListening uses setState/processCommand.
    // Let's use a ref for startListening to break the cycle in useCallback dependencies.
    const startListeningRef = useRef<() => Promise<void>>(async () => { });

    const speak = useCallback((text: string) => {
        if (!synthesisRef.current) return;

        // Cancel any pending speech
        synthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-MX';

        // Try to find a female Mexican voice or fallback
        const voices = synthesisRef.current.getVoices();
        const mexicanVoice = voices.find(v => v.lang === 'es-MX' && v.name.includes('Sabina')); // Common Chrome voice
        if (mexicanVoice) utterance.voice = mexicanVoice;

        setState('speaking');
        setResponse(text);

        utterance.onend = () => {
            setState('idle');
            // Auto-Listen Logic with small delay to prevent "already started" errors
            if (expectingResponse.current) {
                setTimeout(() => {
                    console.log("Auto-listening triggered via Ref...");
                    startListeningRef.current(); // Use Ref to avoid stale closure
                }, 300);
            }
        };

        const handleError = () => {
            setState('idle');
            expectingResponse.current = false;
        };
        utterance.onerror = handleError;

        synthesisRef.current.speak(utterance);
    }, []);

    // Enhanced Speak with Auto-Listen Option
    const speakWithAutoListen = useCallback((text: string, shouldListen: boolean = false) => {
        expectingResponse.current = shouldListen;
        speak(text);
    }, [speak]); // Safe dependency

    const matchIntent = (text: string, patterns: RegExp[]): boolean => {
        return patterns.some(pattern => pattern.test(text));
    };

    // --- CFDI WIZARD LOGIC ---
    const handleCFDIFlow = async (command: string) => {
        const { step, data } = conversationRef.current;
        const lower = command.toLowerCase();

        // Universal Cancel
        if (lower.includes('cancelar') || lower.includes('olvídalo') || lower.includes('salir')) {
            setConversation({ mode: null, step: 'ASK_CLIENT', data: {} });
            speakWithAutoListen("Cancelado. ¿En qué más puedo ayudarte?", false);
            return;
        }

        // --- RETRY CHECK LOGIC ---
        if (step === 'RETRY_CHECK') {
            if (lower.includes('sí') || lower.includes('si') || lower.includes('claro') || lower.includes('por favor')) {
                // Restore previous step and listen again
                const prevStep = data.previousStep || 'ASK_CLIENT';

                // Re-prompt based on step (simplified re-prompt)
                let prompt = "Te escucho...";
                if (prevStep === 'ASK_CLIENT') prompt = "¿A nombre de quién titulo la factura?";
                if (prevStep === 'ASK_AMOUNT') prompt = "¿Cuál es el monto?";
                if (prevStep === 'ASK_CONCEPT') prompt = "¿Cuál es el concepto?";

                speakWithAutoListen(prompt, true);
                setConversation({ ...conversation, step: prevStep });
            } else {
                // User said NO
                setConversation({ mode: null, step: 'ASK_CLIENT', data: {} });
                speakWithAutoListen("Entendido. Estaré aquí si necesitas algo más.", false);
            }
            return;
        }

        if (step === 'ASK_CLIENT') {
            // User answers with Client Name
            let name = command.replace(/a nombre de|para|del cliente|cliente/gi, '').trim();
            // Capitalize
            name = name.charAt(0).toUpperCase() + name.slice(1);

            // Search existing history
            speakWithAutoListen("Buscando historial...", false);
            let lastInvoice = null;
            try {
                lastInvoice = await supabaseService.getLastInvoice(name);
            } catch (err) {
                console.error("Error fetching invoice history:", err);
                // Continue as if new client
            }

            if (lastInvoice) {
                // Found history -> Prompt Quick Confirmation
                const desc = lastInvoice.description || "un concepto previo";
                const amt = lastInvoice.amount;

                speakWithAutoListen(`La última vez registraste un ingreso de $${amt} por ${desc}. ¿Son los mismos datos?`, true);
                setConversation({
                    mode: 'CFDI_WIZARD',
                    step: 'CONFIRM_DATA',
                    data: { ...data, clientName: name, lastInvoice }
                });
            } else {
                // No history -> Ask for Amount
                speakWithAutoListen(`Entendido, ${name}. ¿De cuánto es el monto a facturar?`, true);
                setConversation({
                    mode: 'CFDI_WIZARD',
                    step: 'ASK_AMOUNT',
                    data: { ...data, clientName: name }
                });
            }
            return;
        }

        if (step === 'CONFIRM_DATA') {
            // Expecting YES or NO
            if (lower.includes('sí') || lower.includes('si') || lower.includes('correcto') || lower.includes('mismo')) {
                // Reuse Data
                const { lastInvoice } = data;
                setConversation({
                    mode: 'CFDI_WIZARD',
                    step: 'FINAL_CONFIRM',
                    data: {
                        ...data,
                        amount: lastInvoice.amount,
                        concept: lastInvoice.description.split('-')[1]?.trim() || lastInvoice.description // Try to extract concept
                    }
                });
                speakWithAutoListen(`Perfecto. ¿Deseas timbrar esta factura por $${lastInvoice.amount}?`, true);
            } else {
                // No -> Manual Flow
                speakWithAutoListen("De acuerdo. ¿Cuál es el monto de esta nueva factura?", true);
                setConversation({
                    mode: 'CFDI_WIZARD',
                    step: 'ASK_AMOUNT',
                    data: { ...data }
                });
            }
            return;
        }

        if (step === 'ASK_AMOUNT') {
            // Parse Amount
            const nums = lower.match(/\d+/);
            if (nums) {
                const amount = parseFloat(nums[0]);
                speakWithAutoListen(`$${amount}. ¿Cuál es el concepto o descripción del servicio?`, true);
                setConversation({
                    mode: 'CFDI_WIZARD',
                    step: 'ASK_CONCEPT',
                    data: { ...data, amount }
                });
            } else {
                speakWithAutoListen("No entendí el monto. Por favor dime solo el número, por ejemplo: 500.", true);
            }
            return;
        }

        if (step === 'ASK_CONCEPT') {
            // Take whole phrase as concept
            const concept = command.charAt(0).toUpperCase() + command.slice(1);
            speakWithAutoListen(`Todo listo. Resumen: Factura a ${data.clientName} por $${data.amount} concepto ${concept}. ¿Deseas timbrarla?`, true);
            setConversation({
                mode: 'CFDI_WIZARD',
                step: 'FINAL_CONFIRM',
                data: { ...data, concept }
            });
            return;
        }

        if (step === 'FINAL_CONFIRM') {
            if (lower.includes('sí') || lower.includes('si') || lower.includes('timbra') || lower.includes('dale')) {
                // EXECUTE STAMPING (Mock or Service)
                await supabaseService.savePreCFDI({
                    clientName: data.clientName!,
                    amount: data.amount!,
                    concept: data.concept!
                });

                // TODO: Here call actual Stamping Service if integrated
                speakWithAutoListen("¡Timbrado exitoso! He enviado la factura y el XML al cliente.", false);
            } else {
                // Save as PRE-COMPROBANTE
                await supabaseService.savePreCFDI({
                    clientName: data.clientName!,
                    amount: data.amount!,
                    concept: data.concept!
                });
                speakWithAutoListen("Entendido. La he guardado como Pre-Comprobante para que la revises después.", false);
            }
            // Reset
            setConversation({ mode: null, step: 'ASK_CLIENT', data: {} });
            return;
        }
    };

    const processCommand = async (command: string) => {
        setState('processing');
        let lowerCmd = command.toLowerCase()
            .replace(/^(borah|gaby|gabi|gary|davi|david|hola|oye|dime|por favor)/g, '')
            .replace(/gaby|gabi|gary/g, '')
            .trim();

        // Intelligent Suffixing: If we find "quién es" or "qué es", take from there
        const questionMatch = lowerCmd.match(/(qui[eé]n es|qu[eé] es|c[oó]mo se|cu[aá]l es).*/);
        if (questionMatch) {
            lowerCmd = questionMatch[0];
        }

        // --- FORCE RESET IF INTENT IS CLEARLY TRANSACTION ---
        // This prevents getting stuck in CFDI Wizard if user changes mind
        if (/(registrar|nuevo|gasto|ingreso|compra|pago)/i.test(lowerCmd) && !lowerCmd.includes('factura')) {
            if (conversationRef.current.mode === 'CFDI_WIZARD') {
                console.log("Breaking out of CFDI Wizard for Transaction Intent");
                setConversation({ mode: null, step: 'ASK_CLIENT', data: {} });
                // Update ref immediately for this execution
                conversationRef.current = { mode: null, step: 'ASK_CLIENT', data: {} };
            }
        }

        console.log("Procesando comando:", lowerCmd);

        // --- PRIORITY: ACTIVE CONVERSATION ---
        // --- PRIORITY: ACTIVE CONVERSATION ---
        if (conversationRef.current.mode === 'CFDI_WIZARD') {
            await handleCFDIFlow(command); // Pass original case for names
            return;
        }
        if (conversationRef.current.mode === 'TRANSACTION_WIZARD') {
            await handleTransactionFlow(command);
            return;
        }

        // --- TRIGGER: START CFDI FLOW ---
        // Enhanced regex to be more permissive but STRICTER on intent (Active Voice)
        const cfdiPattern = /(generar|crear|hacer|enviar|emitir|timbrar|regálame|quiero|necesito|nueva|iniciar).*(cfdi|factura|fiscal)/i;
        if (cfdiPattern.test(lowerCmd) && !lowerCmd.includes('gasto')) { // Avoid "Factura de gasto"
            speakWithAutoListen("Claro. ¿A nombre de quién debo generar la factura?", true);
            setConversation({ mode: 'CFDI_WIZARD', step: 'ASK_CLIENT', data: {} });
            return;
        }

        // --- AGGRESSIVE FALLBACK TRIGGER ---
        // If strict regex failed but "factura" is mentioned, assume intent to invoice to avoid API calls.
        if ((lowerCmd.includes('factura') || lowerCmd.includes('cfdi')) && !lowerCmd.includes('gasto') && !lowerCmd.includes('buscar')) {
            console.log("Triggering CFDI Wizard via Keyword Fallback");
            speakWithAutoListen("Entendido. ¿A nombre de quién debo generar la factura?", true);
            setConversation({ mode: 'CFDI_WIZARD', step: 'ASK_CLIENT', data: {} });
            return;
        }

        try {
            // --- INTENT: CHANGE NAME (Llámame X) ---

            const namePattern = /(ll[aá]mame|dime|mi nombre es|cambia mi nombre a) (.+)/i;
            const nameMatch = command.match(namePattern); // Use original command to capture name case

            if (nameMatch && nameMatch[2]) {
                const newName = nameMatch[2].replace(/[.,!]/g, '').trim();
                // Clean name
                const cleanName = newName.charAt(0).toUpperCase() + newName.slice(1);

                await supabaseService.updateUserMetadata({ nickname: cleanName });
                setClientName(cleanName);
                speak(`Entendido. De ahora en adelante te llamaré ${cleanName}.`);
                return;
            }

            // --- INTENT: REGISTER TRANSACTION (PRE-FILL FORM) ---
            // Pattern: "Registra/Nuevo [gasto/ingreso] de [monto] (en/para [descripcion])"
            // Enhanced to include synonyms AND direct commands "gasto de 200"
            // REMOVED ^ anchor to allow "Quiero registrar..."
            const registerPattern = /(registrar|registra|nuevo|agrega|anota|gasto|ingreso|compra|pago|dep[oóò]sito|abono|cobro)/i;

            if (registerPattern.test(lowerCmd)) {

                // Extract Type
                // Explicit check for income keywords
                const isIncome = /ingreso|dep[oóò]sito|abono|cobro/i.test(lowerCmd);
                const type = isIncome ? 'income' : 'expense';

                // Extract Amount
                const amountMatch = lowerCmd.match(/(\d+)/);
                const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

                if (amount > 0) {
                    // NEW BEHAVIOR v7.9.13: Interactive Wizard
                    // Don't guess description. Ask for it.
                    speakWithAutoListen(`Entendido, ${type === 'income' ? 'ingreso' : 'gasto'} de ${amount} pesos. ¿Cuál es el concepto?`, true);

                    setConversation({
                        mode: 'TRANSACTION_WIZARD',
                        step: 'ASK_DESCRIPTION',
                        data: { type, amount }
                    });
                } else {
                    speak("Entendí que quieres registrar algo, pero no escuché el monto.");
                }
                return;
            }

            // --- INTENT: CHECK EXPENSES (Today) ---
            const expensePatterns = [
                /pagar.*hoy/, /vence.*hoy/, /debo.*hoy/,
                /gastos.*hoy/, /gastado.*hoy/,
                /tengo.*pagar/, /hay.*pagar/
            ];

            if (matchIntent(lowerCmd, expensePatterns)) {
                const today = new Date();
                const txs = await supabaseService.getTransactions();

                const todayExpenses = txs.filter(t =>
                    t.type === 'expense' &&
                    new Date(t.date).toDateString() === today.toDateString()
                );

                const total = todayExpenses.reduce((sum, t) => sum + t.amount, 0);

                if (total > 0) {
                    speak(`Hoy llevas registrados gastos por un total de ${total} pesos.`);
                } else {
                    speak("No veo gastos registrados para hoy. ¡Vas bien!");
                }
                return;
            }

            // --- INTENT: CHECK PENDING INCOME ---
            const incomePatterns = [
                /recibir/, /cobrar/, /ingreso.*pendiente/,
                /pagar.*mi/, /deben/, /falta.*entrar/
            ];

            if (matchIntent(lowerCmd, incomePatterns)) {
                const txs = await supabaseService.getTransactions();
                const pending = txs.filter(t => t.type === 'income' && t.payment_received === false);
                const total = pending.reduce((sum, t) => sum + t.amount, 0);

                if (pending.length > 0) {
                    speak(`Tienes ${pending.length} pagos pendientes por recibir. El total es de ${total} pesos.`);
                } else {
                    speak("No tienes ningún pago pendiente por recibir en este momento.");
                }
                return;
            }

            // --- INTENT: FINANCIAL ADVICE ---
            const advicePatterns = [
                /mejorar.*finanzas/, /consejo/, /analiza.*gastos/,
                /como.*voy/, /recomendacion/
            ];

            if (matchIntent(lowerCmd, advicePatterns)) {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                const txs = await supabaseService.getTransactions();

                // Filter current month expenses
                const monthlyExpenses = txs.filter(t =>
                    t.type === 'expense' &&
                    new Date(t.date) >= startOfMonth
                );

                if (monthlyExpenses.length === 0) {
                    speak("Este mes aún no tienes gastos registrados. ¡Vas perfecto!");
                    return;
                }

                // Group by Category
                const categoryTotals: Record<string, number> = {};
                monthlyExpenses.forEach(t => {
                    const cat = t.category || 'Otros';
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
                });

                // Find highest category
                let maxCat = '';
                let maxAmount = 0;

                Object.entries(categoryTotals).forEach(([cat, amount]) => {
                    if (amount > maxAmount) {
                        maxAmount = amount;
                        maxCat = cat;
                    }
                });

                // Generate Advice
                speak(`He revisado tus movimientos. Este mes has gastado $${maxAmount} en ${maxCat}. Podrías intentar reducir un poco los gastos en esa categoría para mejorar tu balance.`);
                return;
            }

            // --- SKILL: WEATHER (Real-time) ---
            const weatherPatterns = [
                /clima/, /tiempo/, /temperatura/, /llover/
            ];

            if (matchIntent(lowerCmd, weatherPatterns)) {
                // Check permissions (we need to inject useSettings into the hook or pass it)
                // Since this is a hook, we can't easily access context if not wrapped or passed.
                // WE WILL ASSUME global access or try to read from localStorage for now as a quick hack
                // or just try to get position if allowed.

                if (!navigator.geolocation) {
                    speak("No puedo acceder a tu ubicación para ver el clima.");
                    return;
                }

                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&lang=es`);
                        const data = await res.json();

                        const temp = data.current.temperature_2m;
                        const code = data.current.weather_code; // WMO code

                        // Simple WMO code map
                        let condition = "despejado";
                        if (code > 0 && code < 3) condition = "nublado";
                        if (code >= 3 && code < 50) condition = "con neblina";
                        if (code >= 50 && code < 80) condition = "lluvioso";
                        if (code >= 80) condition = "con tormenta";

                        speak(`La temperatura actual es de ${temp} grados centígrados y está ${condition}.`);
                    } catch (e) {
                        console.error(e);
                        speak("No pude conectar con el servicio meteorológico.");
                    }
                }, () => {
                    speak("Necesito permiso de ubicación para decirte el clima. Actívalo en Configuración.");
                });
                return;
            }

            // --- INTENT: TEACHING MODE ---
            // "Aprende que [frase] es/significa [accion]"
            // Simple version: "Aprende que 'pagar netflix' es gasto de 200 en entretenimiento"
            if (lowerCmd.startsWith("aprende que")) {
                const parts = lowerCmd.replace("aprende que", "").split(/ es | significa /);
                if (parts.length >= 2) {
                    const trigger = parts[0].trim();
                    const definition = parts[1].trim();

                    // Parse definition to see if it's a transaction
                    // "gasto de 200 en entretenimiento" -> { amount: 200, category: 'Entretenimiento', type: 'expense' }
                    let actionData: any = { text: definition };
                    let actionType = 'response';

                    const isTransaction = /(gasto|ingreso)/.test(definition);
                    if (isTransaction) {
                        const type = definition.includes('ingreso') ? 'income' : 'expense';
                        const amountMatch = definition.match(/(\d+)/);
                        const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
                        // Try to extract category? For now generic
                        actionType = 'transaction';
                        actionData = { type, amount, description: trigger, category: 'Otros' };
                    }

                    await supabaseService.addLearnedCommand(trigger, actionType, actionData);
                    speak(`Entendido. He aprendido que cuando digas "${trigger}", debo registrar eso.`);
                    return;
                }
            }

            // --- CHECK LEARNED COMMANDS (Fallback) ---
            try {
                const learnedCommands = await supabaseService.getLearnedCommands();
                const match = learnedCommands.find(cmd => lowerCmd.includes(cmd.trigger_phrase));

                if (match) {
                    if (match.action_type === 'transaction') {
                        const { amount, type, category, description } = match.action_data;
                        await supabaseService.addTransaction({
                            amount, type, category, description,
                            date: new Date().toISOString(),
                            recurring: false
                        });
                        speak(`Listo. Ejecuté tu comando personalizado: ${description}.`);
                    } else {
                        speak(match.action_data.text || "Comando ejecutado.");
                    }
                    return;
                }
            } catch (e) {
                console.error("Error fetching learned commands:", e);
            }

            // --- SKILL: HELP / ONBOARDING ---
            const helpPatterns = [/ayuda/, /c[óo]mo.*usa?r/, /qu[ée].*puedes.*hacer/, /instrucciones/, /gu[íi]a/, /qu[ée].*haces/];
            if (matchIntent(lowerCmd, helpPatterns)) {
                speak("¡Soy Gabi, tu asistente financiera! Puedes pedirme cosas como: 'Registra un gasto de 200 pesos en comida', '¿Cuánto he gastado hoy?', 'Analiza mis finanzas' o 'Dime el clima'.");
                setResponse(`
                    <ul class="text-sm space-y-2">
                        <li>💰 <b>Registrar:</b> "Gasto de 500 en súper"</li>
                        <li>📊 <b>Consultar:</b> "¿Cuánto gasté hoy?"</li>
                        <li>💡 <b>Consejos:</b> "Analiza mis finanzas"</li>
                        <li>🌦️ <b>Clima:</b> "¿Qué tiempo hace?"</li>
                        <li>🧠 <b>Enseñar:</b> "Aprende que 'Netflix' es gasto de 200"</li>
                    </ul>
                `);
                return;
            }

            // --- INTENT: GEMINI DIAGNOSTICS ---
            const diagNorm = lowerCmd.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (diagNorm.includes('diagnostico') && (diagNorm.includes('gem') || diagNorm.includes('api')) || diagNorm.includes('prueba api')) {
                const savedKey = localStorage.getItem('synaptica_gemini_key');
                if (!savedKey) {
                    speak("No tienes una clave de API configurada.");
                    return;
                }

                setResponse("🔍 Ejecutando diagnóstico de Gemini...");
                try {
                    // Step 1: List Models
                    let log = "<b>Paso 1: Listar Modelos</b><br/>";
                    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${savedKey}`;
                    const listResp = await fetch(listUrl);
                    log += `Status: ${listResp.status} ${listResp.statusText}<br/>`;

                    let modelToUse = 'gemini-1.5-flash';

                    if (listResp.ok) {
                        const listData = await listResp.json();
                        // Filter models that support 'generateContent'
                        const allModels = listData.models || [];
                        const validModels = allModels.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'));

                        const modelNames = validModels.map((m: any) => m.name.replace('models/', ''));
                        log += `Modelos válidos: ${modelNames.slice(0, 3).join(', ')}...<br/>`;

                        // Select model logic
                        const flash = modelNames.find((n: string) => n.toLowerCase().includes('flash') && n.toLowerCase().includes('gemini'));
                        const pro = modelNames.find((n: string) => n.toLowerCase().includes('pro') && n.toLowerCase().includes('gemini'));

                        if (flash) modelToUse = flash;
                        else if (pro) modelToUse = pro;
                        else if (modelNames.length > 0) modelToUse = modelNames[0];
                    } else {
                        const errText = await listResp.text();
                        log += `Error Listando: ${errText}<br/>`;
                    }

                    log += `<b>Paso 2: Usar Modelo ${modelToUse}</b><br/>`;

                    // Step 2: Generate Content
                    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${savedKey}`;
                    const payload = { contents: [{ parts: [{ text: "Hola" }] }] };

                    const genResp = await fetch(genUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    log += `Status Gen: ${genResp.status}<br/>`;

                    if (genResp.ok) {
                        const genData = await genResp.json();
                        const text = genData?.candidates?.[0]?.content?.parts?.[0]?.text;
                        log += `Respuesta: "${text}"<br/><b style="color:green">¡ÉXITO!</b>`;
                        speak("La prueba fue exitosa. Gemini está funcionando.");
                    } else {
                        const errText = await genResp.text();
                        log += `Error Gen: ${errText}<br/><b style="color:red">FALLÓ</b>`;
                        speak("Hubo un error probando la generación.");
                    }

                    setResponse(`<div class="text-xs font-mono bg-gray-100 p-2 rounded">${log}</div>`);

                } catch (e: any) {
                    setResponse(`<div class="text-xs text-red-500">Error Crítico: ${e.message}</div>`);
                    speak("Ocurrió una excepción durante el diagnóstico.");
                }
                return;
            }

            // --- LLM INTEGRATION: GEMINI API ---
            const savedKey = localStorage.getItem('synaptica_gemini_key');
            console.log("Gemini Debug: Key exists?", !!savedKey);

            if (savedKey) {
                try {
                    // DYNAMIC DISCOVERY: List models to find a valid one
                    let modelToUse = 'gemini-1.5-flash'; // Default fallback

                    try {
                        const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${savedKey}`;
                        const listResp = await fetch(listModelsUrl);

                        if (listResp.ok) {
                            // Safe Parse
                            const text = await listResp.text();
                            let listData;
                            try {
                                listData = JSON.parse(text);
                            } catch (e) {
                                console.warn("Gemini Debug: List models returned non-JSON");
                                listData = { models: [] }; // Fallback
                            }

                            const models = listData.models || [];
                            const validModels = models.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'));

                            // Suggest 1.5-flash as priority to avoid experimental/beta limits
                            const flash15 = validModels.find((m: any) => m.name.includes('gemini-1.5-flash'));
                            const flash = validModels.find((m: any) => m.name.toLowerCase().includes('flash') && m.name.toLowerCase().includes('gemini'));
                            const pro = validModels.find((m: any) => m.name.toLowerCase().includes('pro') && m.name.toLowerCase().includes('gemini'));

                            if (flash15) modelToUse = flash15.name.replace('models/', '');
                            else if (flash) modelToUse = flash.name.replace('models/', '');
                            else if (pro) modelToUse = pro.name.replace('models/', '');
                            else if (validModels.length > 0) modelToUse = validModels[0].name.replace('models/', '');

                            console.log("Gemini Debug: Selected Model:", modelToUse);
                        } else {
                            console.warn("Gemini Debug: Failed to list models", listResp.status);
                        }
                    } catch (e) {
                        console.warn("Gemini Debug: List models exception", e);
                    }

                    // Use v1beta as it supports more models usually
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${savedKey}`;
                    const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const payload = {
                        contents: [{
                            parts: [{
                                text: `
                                Eres Gabi, una asistente financiera personal.
                                Fecha actual: ${currentDate}.
                                ${clientName ? `Nombre del usuario: ${clientName}. Úsalo ocasionalmente para sonar personal.` : ''}
                                Tono: Profesional, amable y conciso (max 2 oraciones).
                                Contexto: Estás en una app de finanzas llamada Synaptica.
                                
                                REGLAS CRÍTICAS:
                                1. MONEDA: Tu moneda por defecto es SIEMPRE PESOS MEXICANOS (MXN). Nunca asumas dólares. Di "pesos" explícitamente.
                                2. INTENCIÓN DE GASTO/INGRESO:
                                    - Si el usuario dice "registrar gasto", "nuevo ingreso", "agrega una compra": NO es una factura fiscal. Es un registro interno.
                                    - Responde con el formato: [[TRANSACTION: TIPO | MONTO | CONCEPTO]]
                                    - Ejemplo: "Gasto de 500 en comida" -> [[TRANSACTION: expense | 500 | comida]]
                                    - Ejemplo: "Ingreso de 1000 por venta" -> [[TRANSACTION: income | 1000 | venta]]
                                3. FACTURACIÓN:
                                    - Solo si el usuario dice explícitamente "Generar factura", "Timbrar", "Necesito factura", inicia el proceso fiscal.
                                    - En ese caso responde con texto normal preguntando datos.
                                
                                IMPORTANTE: Tu conocimiento general tiene una fecha de corte. Si te preguntan por hechos recientes (política, noticias) o información que desconoces, NO inventes. En su lugar, responde ÚNICAMENTE con el siguiente formato, poniendo la búsqueda óptima dentro:
                                [[SEARCH: términos de búsqueda]]
                                
                                Ejemplo:
                                User: "¿Quién ganó el Super Bowl 2025?"
                                Gabi: [[SEARCH: ganador super bowl 2025]]
                                
                                Pregunta del usuario: ${command}
                            `.trim()
                            }]
                        }]
                    };

                    // Retry logic for 429 errors (Rate Limiting)
                    let response;
                    let attempts = 0;
                    const maxAttempts = 3;

                    while (attempts < maxAttempts) {
                        try {
                            response = await fetch(geminiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });

                            if (response.status === 429) {
                                attempts++;
                                console.warn(`Gemini 429 hit. Retrying (${attempts}/${maxAttempts})...`);
                                if (attempts === maxAttempts) {
                                    // FINAL FALLBACK: Local Keyword Match before giving up
                                    if (lowerCmd.includes('factura') || lowerCmd.includes('cfdi')) {
                                        speak("Tuve un problema de conexión, pero puedo ayudarte con eso localmente. ¿A nombre de quién la factura?");
                                        setConversation({ mode: 'CFDI_WIZARD', step: 'ASK_CLIENT', data: {} });
                                        return;
                                    }

                                    speak("Mis servicios cognitivos están saturados momentáneamente. Por favor intenta de nuevo en un minuto.");
                                    setResponse("⚠️ Tráfico alto en Gabi AI. Reintentar pronto.");
                                    return;
                                }
                                // Exponential backoff: 1s, 2s, 4s...
                                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
                                continue;
                            }

                            // If successful or other error, break loop
                            break;
                        } catch (e) {
                            // If network error, maybe retry? For now only 429 logic requested.
                            console.error("Fetch error during retry loop", e);
                            throw e;
                        }
                    }

                    if (!response) return; // Should not happen

                    console.log("Gemini Debug: Response Status", response.status);

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error("Gemini Debug: API Error Body", errText);
                        // Fallback message
                        speak("Lo siento, mis servicios cognitivos no responden. Intenta más tarde.");
                        setResponse(`<div class="text-red-500 text-xs">Error API: ${response.status}</div>`);
                        throw new Error(`Gemini API Error: ${response.status}`);
                    }

                    // SAFE JSON PARSE
                    let data;
                    try {
                        const text = await response.text();
                        try {
                            data = JSON.parse(text);
                        } catch (e) {
                            console.error("Gemini Debug: Invalid JSON", text.substring(0, 100));
                            throw new Error("Invalid JSON response from Gemini");
                        }
                    } catch (e) {
                        speak("Hubo un problema de conexión con el cerebro de Gabi.");
                        setResponse(`<div class="text-red-500 text-xs">Error de Protocolo (HTML recibida).</div>`);
                        return;
                    }

                    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const answer = data.candidates[0].content.parts[0].text;
                        setResponse(answer.replace(/\n/g, '<br/>'));

                        // Check for SEARCH Tool call
                        // [[SEARCH: query]]
                        const searchMatch = answer.match(/\[\[SEARCH: (.*?)\]\]/);
                        if (searchMatch) {
                            const query = searchMatch[1];
                            const gUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

                            speak(`Buscando ${query} en Google por ti.`);
                            setResponse(`Buscando: <b>${query}</b>...`);

                            setTimeout(() => {
                                const newWindow = window.open(gUrl, '_blank');
                                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                    speak("El navegador bloqueó la ventana. Revisa los permisos.");
                                }
                            }, 1500);
                            return;
                        }

                        // Check for TRANSACTION Tool call
                        // [[TRANSACTION: type | amount | description]]
                        const transMatch = answer.match(/\[\[TRANSACTION: (.*?)\|(.*?)\|(.*?)\]\]/);
                        if (transMatch) {
                            const typeRaw = transMatch[1].trim().toLowerCase();
                            const amount = parseFloat(transMatch[2].trim());
                            const desc = transMatch[3].trim();

                            const type = (typeRaw.includes('ingreso') || typeRaw === 'income') ? 'income' : 'expense';

                            setTransactionRequest({
                                type: type as 'income' | 'expense',
                                amount: amount,
                                description: desc,
                                category: 'Otros'
                            });

                            const label = type === 'income' ? 'Ingreso' : 'Gasto';
                            speak(`Abriendo formulario de ${label} por ${amount} pesos.`);
                            setResponse(`Prepared transaction: ${label} $${amount}`);
                            return;
                        }

                        speak(answer);
                        return;
                    } else {
                        console.warn("Gemini Debug: No content in response", data);
                        speak("No entendí la respuesta del servidor.");
                    }
                } catch (e) {
                    console.error("Gemini Critical Error", e);
                    // Fallback to Wiki/Google if Gemini fails
                }
            }


            // --- FINAL FALLBACK: GOOGLE SEARCH (Wiki Disabled) ---
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(lowerCmd)}`;
            speak(`No tengo esa respuesta, pero puedes buscarla en Google.`);
            setResponse(`No tengo esa respuesta. <a href="${googleUrl}" target="_blank" class="text-blue-400 underline ml-2">[Buscar en Google]</a>`);

            setTimeout(() => {
                const newWindow = window.open(googleUrl, '_blank');
                // Popup Blocker Detection
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    speak("Tu navegador bloqueó la ventana. Por favor, permite las ventanas emergentes para mostrarte la información.");
                }
            }, 3000);

        } catch (error) {
            console.error(error);
            speak("Tuve un problema al consultar tus datos.");
        }
    };

    // Keep processCommandRef updated with the latest function from the current render
    useEffect(() => {
        processCommandRef.current = processCommand;
    }, [processCommand]);

    const startListening = async () => {
        // Force stop first to clear any stuck native state (with timeout race)
        try {
            const stopPromise = SpeechRecognition.stop();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Stop timeout"), 500));
            await Promise.race([stopPromise, timeoutPromise]);
        } catch (e) {
            console.warn("Mic Stop/Clear warning (continuing):", e);
        }

        setTranscript('');
        transcriptRef.current = '';
        setResponse('');
        setState('listening');

        try {
            // Verify Browser Support (Web)
            if (typeof window !== 'undefined' && !window.SpeechRecognition && !(window as any).webkitSpeechRecognition) {
                // Check if it's native (Capacitor) - if not, fail
                // Simply assume if plugin fails, it's not supported
            }

            // Start Recognition
            const { matches } = await SpeechRecognition.start({
                language: "es-MX",
                maxResults: 1,
                prompt: "Gabi te escucha...",
                partialResults: true,
                popup: false,
            });

            // If we get here in one await, it means we have final results
            if (matches && matches.length > 0) {
                const text = matches[0];
                setTranscript(text);
                transcriptRef.current = text;

                // Process immediately
                processCommand(text);
                // Only reset to idle if we are still listening (avoid race conditions)
                setState(prev => prev === 'listening' ? 'idle' : prev);
            }

        } catch (e: any) {
            console.error("Native Speech Error:", e);

            // --- FALLBACK: Direct Web API (Bypass Plugin) ---
            if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
                console.log("Attempting Native Web Fallback...");
                try {
                    const NativeSpeech = (window as any).webkitSpeechRecognition;
                    const recognition = new NativeSpeech();
                    recognition.lang = 'es-MX';
                    recognition.continuous = false;
                    recognition.interimResults = false; // Simpler for now

                    recognition.onstart = () => setState('listening');

                    recognition.onresult = (event: any) => {
                        const last = event.results.length - 1;
                        const text = event.results[last][0].transcript;
                        setTranscript(text);
                        transcriptRef.current = text;
                        processCommand(text);
                        setState('idle');
                    };

                    recognition.onerror = (err: any) => {
                        console.error("Web Fallback Error:", err);
                        setState('idle');
                        if (err.error === 'not-allowed' || err.error === 'permission-denied') {
                            speak("Acceso al micrófono bloqueado. Revisa la configuración del sitio.");
                        }
                    };

                    // recognition.onend handled by logic above or auto-close

                    recognition.start();
                    return; // Exit function, fallback took over

                } catch (errFallback) {
                    console.error("Fallback failed:", errFallback);
                }
            }

            setState('idle');

            // User Feedback for Errors (if fallback didn't run)
            if (e.message?.includes('not allowed') || e.message?.includes('permission')) {
                speak("Necesito permiso para usar el micrófono. Verifícalo en tu navegador.");
            } else if (e.message?.includes('not supported') || e.message?.includes('implement')) {
                speak("Tu navegador no soporta reconocimiento de voz. Intenta con Google Chrome.");
            }
        }
    };

    // Keep Ref updated for speak callback
    useEffect(() => {
        startListeningRef.current = startListening;
    }, [startListening]);

    const stopListening = async () => {
        try {
            await SpeechRecognition.stop();
            setState('idle');
        } catch (e) {
            // ignore
        }
    };

    return {
        state,
        transcript,
        response,
        startListening,
        stopListening,
        processCommand,
        speak,
        speakWithAutoListen,
        conversation,
        transactionRequest,
        setTransactionRequest
    };
};
