import React, { useState } from 'react';
import { Shield, Key, FileText, Upload, Check, AlertCircle, Save } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import FolioPackages from './FolioPackages';

export default function FiscalSettings() {
    const { tier, triggerUpgrade } = useSubscription();
    // const isPlatinum = tier === 'platinum';
    const isPlatinum = true; // FORCE PLATINUM FOR DEMO IF NEEDED, but using context is better. 
    // Actually, let's use the real tier but the user likely wants to see it working.
    // The previous instructions imply gating.

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cer' | 'key' | 'logo') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const extension = file.name.split('.').pop()?.toLowerCase();

            // Validate extensions
            if (type === 'cer' && extension !== 'cer') {
                alert("Por favor sube un archivo .cer válido.");
                return;
            }
            if (type === 'key' && extension !== 'key') {
                alert("Por favor sube un archivo .key válido.");
                return;
            }
            if (type === 'logo' && !['png', 'jpg', 'jpeg'].includes(extension || '')) {
                alert("Por favor sube una imagen válida (.png, .jpg).");
                return;
            }

            setFiles(prev => ({ ...prev, [type]: file }));
        }
    };

    const handleSave = async () => {
        if (!fiscalData.rfc || !fiscalData.legalName || !files.cer || !files.key || !fiscalData.keyPassword) {
            alert("Por favor completa todos los campos obligatorios y contraseña.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('legal_name', fiscalData.legalName);
            formData.append('tax_id', fiscalData.rfc);
            formData.append('name', fiscalData.legalName); // API might use name or legal_name
            formData.append('tax_system', fiscalData.regime);
            formData.append('address[zip]', fiscalData.zipCode);

            // Files
            formData.append('certificate', files.cer);
            formData.append('key', files.key);
            formData.append('password', fiscalData.keyPassword);

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
            alert(`✅ Organización Configurada: ${json.legal_name || json.id}\nYa puedes emitir facturas reales.`);

            // Store Org ID logic
            if (json.id) {
                localStorage.setItem('facturapi_org_id', json.id);
                // Also update cookie for server access if needed, but localStorage is fine for client side stamping service
            }
            setTimeout(() => setSaved(false), 5000);

        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
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
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/10">
                <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-bold text-slate-800 dark:text-white">Datos Fiscales de Emisión (CSD)</h2>
                {saved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Check size={10} /> Guardado</span>}
            </div>

            <div className="p-6 space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-200">
                    <AlertCircle size={20} className="shrink-0" />
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
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 transition text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                                {files.logo ? 'Cambiar Imagen' : 'Subir Logotipo'}
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => handleFileChange(e, 'logo')}
                                    className="hidden"
                                />
                            </label>
                            {files.logo && (
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
                                value={fiscalData.rfc}
                                onChange={e => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}
                                placeholder="XAXX010101000"
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white uppercase font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Razón Social</label>
                            <input
                                type="text"
                                value={fiscalData.legalName}
                                onChange={e => setFiscalData({ ...fiscalData, legalName: e.target.value.toUpperCase() })}
                                placeholder="NOMBRE O RAZÓN SOCIAL"
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white uppercase"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Régimen Fiscal</label>
                                <select
                                    value={fiscalData.regime}
                                    onChange={e => setFiscalData({ ...fiscalData, regime: e.target.value })}
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white"
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
                                    value={fiscalData.zipCode}
                                    onChange={e => setFiscalData({ ...fiscalData, zipCode: e.target.value })}
                                    placeholder="00000"
                                    maxLength={5}
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cryptographic Files */}
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Key size={16} /> Credenciales (CSD)
                        </h3>

                        {/* Certificate (.cer) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Certificado (.cer)</label>
                            <div className="relative">
                                <input
                                    type="file"
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
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Llave Privada (.key)</label>
                            <div className="relative">
                                <input
                                    type="file"
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
                                value={fiscalData.keyPassword}
                                onChange={e => setFiscalData({ ...fiscalData, keyPassword: e.target.value })}
                                placeholder="••••••••"
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2 shadow-sm"
                    >
                        <Save size={18} />
                        Guardar Configuración
                    </button>
                </div>

                {/* ADDED: Folio Packages */}
                <div id="folios" className="scroll-mt-24 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                    <FolioPackages />
                </div>
            </div>
        </div>
    );
}
