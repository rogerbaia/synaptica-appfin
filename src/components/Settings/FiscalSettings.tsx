import React, { useState } from 'react';
import { Shield, Key, FileText, Upload, Check, AlertCircle, Save } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from 'sonner';
import FolioPackages from './FolioPackages';

export default function FiscalSettings() {
    const { tier, triggerUpgrade } = useSubscription();
    // const isPlatinum = tier === 'platinum';
    const isPlatinum = true; // FORCE PLATINUM FOR DEMO IF NEEDED, but using context is better. 
    // Actually, let's use the real tier but the user likely wants to see it working.
    // The previous instructions imply gating.

    // [VERSION]
    const APP_VERSION = "v3.3";

    const [fiscalData, setFiscalData] = useState({
        rfc: '',
        legalName: '',
        regime: '',
        zipCode: '',
        keyPassword: ''
    });

    const [files, setFiles] = useState<{ cer: File | null; key: File | null; logo: File | null }>({
        cer: null,
        key: null,
        logo: null
    });

    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [remoteCSD, setRemoteCSD] = useState(false);

    const [isEditing, setIsEditing] = useState(true); // Default to editing until data load confirms otherwise

    // [NEW] Load Data on Mount
    React.useEffect(() => {
        const loadFiscalData = async () => {
            try {
                const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
                if (!session) return;

                const res = await fetch('/api/sat/organization', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });

                if (res.ok) {
                    const json = await res.json();
                    if (json.data) {
                        setFiscalData({
                            rfc: json.data.rfc || '',
                            legalName: json.data.legalName || '',
                            regime: json.data.regime || '',
                            zipCode: json.data.zipCode || '',
                            keyPassword: '' // Never recover password
                        });
                        setRemoteCSD(!!json.data.hasCSD);

                        // [LOGIC] If we have critical data, default to Read-Only mode
                        if (json.data.rfc && json.data.legalName) {
                            setIsEditing(false);
                        }
                    }
                } else {
                    const err = await res.json();
                    console.error("Error loading fiscal settings:", err);
                    toast.error("Error cargando datos fiscales: " + (err.message || res.statusText));
                }
            } catch (e: any) {
                console.error("Failed to load fiscal settings", e);
                toast.error("Error de conexión: " + e.message);
            } finally {
                setLoading(false);
            }
        };
        loadFiscalData();
    }, []);
    // [NEW] Scroll to Hash on Mount
    React.useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash === '#folios') {
            setTimeout(() => {
                const element = document.getElementById('folios');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 800); // Delay to ensure layout is stable
        }
    }, [loading, tier]); // Retry when loading finishes or tier changes

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cer' | 'key' | 'logo') => {
        if (!isEditing) return; // Block changes in read-only
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const extension = file.name.split('.').pop()?.toLowerCase();

            // Validate extensions
            if (type === 'cer' && extension !== 'cer') {
                toast.error("Por favor sube un archivo .cer válido.");
                return;
            }
            if (type === 'key' && extension !== 'key') {
                toast.error("Por favor sube un archivo .key válido.");
                return;
            }
            if (type === 'logo' && !['png', 'jpg', 'jpeg'].includes(extension || '')) {
                toast.error("Por favor sube una imagen válida (.png, .jpg).");
                return;
            }

            setFiles(prev => ({ ...prev, [type]: file }));
            // If user uploads new files, we assume they want to replace the remote ones
            if (type === 'cer' || type === 'key') setRemoteCSD(false);
        }
    };

    const handleSave = async () => {
        // [MOD] Toggle Logic
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        // [MOD] If remoteCSD is true, we don't strict require files unless they are changing them
        const isFilesMissing = (!files.cer || !files.key) && !remoteCSD;

        if (!fiscalData.rfc || !fiscalData.legalName || isFilesMissing || !fiscalData.keyPassword) {
            // Allow saving partial updates (e.g. just address) if CSD exists?
            // Actually Facturapi might require CSD re-upload if we hit the PUT /legal/csd endpoint.
            // But we can split the calls. 
            // For simplicity, let's enforce full re-upload ONLY if password is provided OR if we are new.

            // Refined Logic:
            // If remoteCSD is present, files are optional.
            // If files are provided, password is required.

            // Allow text-only updates if we already have RemoteCSD and NO new files are selected
            const isTextOnlyUpdate = remoteCSD && !files.cer && !files.key;

            if (isFilesMissing) {
                toast.error("Por favor sube tus archivos .cer y .key");
                return;
            }
            if ((files.cer || files.key) && !fiscalData.keyPassword) {
                toast.error("Para actualizar tus sellos, necesitas la contraseña.");
                return;
            }

            // If just updating text fields and we have CSD
            if (isTextOnlyUpdate) {
                // Proceed, password not needed for just text updates typically unless API forces it
                // Facturapi PUT /organizations/{id} usually doesn't need CSD if you don't send it.
                // Our API handles it.
            } else if (!isFilesMissing && fiscalData.keyPassword) {
                // Proceed with full update
            } else {
                toast.error("Por favor completa todos los campos obligatorios y contraseña.");
                return;
            }
        }

        const toastId = toast.loading("Guardando configuración...");

        try {
            const formData = new FormData();
            formData.append('legal_name', fiscalData.legalName);
            formData.append('tax_id', fiscalData.rfc);
            formData.append('name', fiscalData.legalName); // API might use name or legal_name
            formData.append('tax_system', fiscalData.regime);
            formData.append('address[zip]', fiscalData.zipCode);

            // Files - Only append if new ones exist
            if (files.cer) formData.append('certificate', files.cer);
            if (files.key) formData.append('key', files.key);
            if (fiscalData.keyPassword) formData.append('password', fiscalData.keyPassword);

            // [LOGO] Optional - If not provided, backend uses default
            if (files.logo) {
                formData.append('logo', files.logo);
            }

            // [AUTH] Get Session for Secure API Call
            const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());

            if (!session) {
                throw new Error("Sesión expirada. Por favor recarga la página.");
            }

            const res = await fetch('/api/sat/organization', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: formData
            });

            const json = await res.json();

            if (!res.ok) {
                // If 503, tell user about Env Var
                if (res.status === 503) {
                    throw new Error("Modo Simulación: Para guardar real, configura FACTURAPI_KEY en .env.local");
                }
                throw new Error(json.message || 'Error guardando datos fiscales');
            }

            setSaved(true);
            setIsEditing(false); // [MOD] Switch back to Read-Only on success

            // [MOD] Intelligent Toast based on result
            const serverMsg = json.message || "Guardado exitoso";
            const isCSDWarning = serverMsg.includes("error") || serverMsg.includes("Advertencia");

            if (isCSDWarning) {
                toast.warning(serverMsg, { id: toastId, duration: 8000 });
            } else {
                toast.success(serverMsg, { id: toastId });
            }

            // [NEW] Update local state immediately if server returned updated status
            if (json.data) {
                if (typeof json.data.hasCSD === 'boolean') {
                    setRemoteCSD(json.data.hasCSD);
                    if (json.data.hasCSD) {
                        setFiles(prev => ({ ...prev, cer: null, key: null })); // Clear inputs to show green box
                    }
                }
            }

            // Store Org ID logic
            if (json.id) {
                localStorage.setItem('facturapi_org_id', json.id);
            }
            setTimeout(() => setSaved(false), 5000);

        } catch (error: any) {
            console.error(error);
            toast.error(`Error: ${error.message}`, { id: toastId });
        }
    };

    if (tier !== 'platinum') {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
                    <Shield size={20} className="text-slate-400" />
                    <h2 className="font-bold text-slate-700 dark:text-slate-200">Facturación SAT (CFDI 4.0)</h2>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">Platinum</span>
                </div>
                <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                        <Key size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Automatiza tus Facturas</h3>
                    <p className="text-slate-500 max-w-md mb-6">
                        Sube tus sellos digitales (CSD), conecta con el SAT y emite facturas ilimitadas directamente desde tus ingresos.
                    </p>
                    <button
                        onClick={triggerUpgrade}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        Desbloquear Módulo Fiscal
                    </button>
                </div>
                {/* Blur effect overlay */}
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] pointer-events-none" />
            </div>
        );
    }

    return (
        <div id="fiscal" className="scroll-mt-24 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-2">
                    <FileText size={20} className="text-emerald-600" />
                    <h2 className="font-bold text-[var(--text-color)]">
                        Datos Fiscales de Emisión (CSD) <span className="text-xs text-gray-400 font-mono ml-2">{APP_VERSION}</span>
                    </h2>
                </div>
            </div> {saved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Check size={10} /> Guardado</span>}


            <div className="p-6 space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-200">
                    <p>
                        Tus archivos <strong>.cer</strong> y <strong>.key</strong> se utilizan exclusivamente para sellar tus XMLs.
                        Se almacenan de forma protegida y nunca se comparten.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* [NEW] Logo Upload Section */}
                    <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-6">
                        <div className="relative shrink-0 w-20 h-20 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 flex items-center justify-center overflow-hidden shadow-sm">
                            {files.logo ? (
                                <img
                                    src={URL.createObjectURL(files.logo)}
                                    alt="Logo Preview"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <img
                                    src="/logo-factura-default.png"
                                    alt="Default Logo"
                                    className="w-full h-full object-contain p-2 opacity-80"
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <Upload size={18} className="text-indigo-600" /> Logotipo de Facturación
                            </h3>
                            <p className="text-sm text-slate-500 mb-3">
                                Personaliza tus facturas. Si no subes uno, usaremos el logo de Synaptica por defecto.
                            </p>
                            <label className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 transition text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ${!isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                                {files.logo ? 'Cambiar Imagen' : 'Subir Logotipo'}
                                <input
                                    type="file"
                                    disabled={!isEditing}
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => handleFileChange(e, 'logo')}
                                    className="hidden"
                                />
                            </label>
                            {files.logo && isEditing && (
                                <button
                                    onClick={() => setFiles(prev => ({ ...prev, logo: null }))}
                                    className="ml-3 text-xs text-red-500 hover:underline"
                                >
                                    Eliminar y usar defecto
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">RFC del Emisor</label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={fiscalData.rfc}
                                onChange={e => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}
                                placeholder="XAXX010101000"
                                className={`w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white uppercase font-mono ${!isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Razón Social</label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={fiscalData.legalName}
                                onChange={e => setFiscalData({ ...fiscalData, legalName: e.target.value.toUpperCase() })}
                                placeholder="NOMBRE O RAZÓN SOCIAL"
                                className={`w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white uppercase ${!isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Régimen Fiscal</label>
                                <select
                                    disabled={!isEditing}
                                    value={fiscalData.regime}
                                    onChange={e => setFiscalData({ ...fiscalData, regime: e.target.value })}
                                    className={`w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white ${!isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="601">601 - General de Ley Personas Morales</option>
                                    <option value="605">605 - Sueldos y Salarios</option>
                                    <option value="606">606 - Arrendamiento</option>
                                    <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                                    <option value="626">626 - RESICO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Código Postal</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={fiscalData.zipCode}
                                    onChange={e => setFiscalData({ ...fiscalData, zipCode: e.target.value })}
                                    placeholder="00000"
                                    maxLength={5}
                                    className={`w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white font-mono ${!isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cryptographic Files */}
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Key size={16} /> Credenciales (CSD)
                        </h3>

                        {/* [NEW] Remote CSD Indicator */}
                        {remoteCSD && !files.cer && !files.key ? (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-sm text-green-800">
                                <Check size={18} className="text-green-600" />
                                <div>
                                    <p className="font-semibold">Credenciales Activas</p>
                                    <p className="text-xs opacity-80">Tu certificado y llave privada ya están guardados de forma segura.</p>
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={() => setRemoteCSD(false)}
                                        className="ml-auto text-xs underline text-green-700 hover:text-green-900"
                                    >
                                        Reemplazar
                                    </button>
                                )}
                            </div>
                        ) : (
                            // Warning if we know it's missing (loaded but false)
                            !loading && !remoteCSD && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-sm text-amber-800">
                                    <AlertCircle size={18} className="text-amber-600" />
                                    <div>
                                        <p className="font-semibold">Sellos No Detectados</p>
                                        <p className="text-xs opacity-80">No encontramos archivos CSD activos. Por favor súbelos para poder facturar.</p>
                                    </div>
                                </div>
                            )
                        )}

                        {(!remoteCSD || files.cer || files.key) && (
                            <>
                                {/* Certificate (.cer) */}
                                <div className={!isEditing ? "opacity-50 pointer-events-none" : ""}>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Certificado (.cer)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            disabled={!isEditing}
                                            accept=".cer"
                                            onChange={(e) => handleFileChange(e, 'cer')}
                                            className="hidden"
                                            id="file-cer"
                                        />
                                        <label
                                            htmlFor="file-cer"
                                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${files.cer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:text-slate-300'}`}
                                        >
                                            <span className="truncate">{files.cer ? files.cer.name : 'Seleccionar archivo .cer'}</span>
                                            {files.cer ? <Check size={18} /> : <Upload size={18} className="text-slate-400" />}
                                        </label>
                                    </div>
                                </div>

                                {/* Private Key (.key) */}
                                <div className={!isEditing ? "opacity-50 pointer-events-none" : ""}>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Llave Privada (.key)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            disabled={!isEditing}
                                            accept=".key"
                                            onChange={(e) => handleFileChange(e, 'key')}
                                            className="hidden"
                                            id="file-key"
                                        />
                                        <label
                                            htmlFor="file-key"
                                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${files.key ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:text-slate-300'}`}
                                        >
                                            <span className="truncate">{files.key ? files.key.name : 'Seleccionar archivo .key'}</span>
                                            {files.key ? <Check size={18} /> : <Upload size={18} className="text-slate-400" />}
                                        </label>
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña de Clave Privada</label>
                                    <input
                                        type="password"
                                        disabled={!isEditing}
                                        value={fiscalData.keyPassword}
                                        onChange={e => setFiscalData({ ...fiscalData, keyPassword: e.target.value })}
                                        placeholder="••••••••"
                                        className={`w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white ${!isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                    <button
                        onClick={handleSave}
                        className={`px-6 py-2.5 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-sm ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-600 hover:bg-slate-700'}`}
                    >
                        {isEditing ? (
                            <>
                                <Save size={18} />
                                Guardar Configuración
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Editar Configuración
                            </>
                        )}
                    </button>
                </div>

                {/* [Folios] */}
                <div id="folios" className="scroll-mt-4 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                    <FolioPackages />
                </div>
            </div>
        </div>
    );
}
