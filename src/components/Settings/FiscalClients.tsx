import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, User, Mail, Phone, Edit2, Trash2, FileText, Filter, Download, X, Receipt } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';

interface Client {
    id: string;
    name: string;
    rfc: string;
    contact: string;
    email: string;
    phone: string;
    tax_system: string;
}

export default function FiscalClients() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [debugData, setDebugData] = useState<any>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newClient, setNewClient] = useState({
        legal_name: '',
        tax_id: '',
        tax_system: '626', // Default Resico which is common, or 612
        email: '',
        address: { zip: '' }
    });

    const loadClients = async () => {
        setLoading(true);
        try {
            console.log("Fetching clients...");
            console.log("Fetching clients...");
            // Force cache bust with timestamp
            const response = await fetch(`/api/sat/clients?q=${searchTerm || ''}&_t=${Date.now()}`);
            const dataWrapper = await response.json();

            console.log("Clients Data Received:", dataWrapper);
            if (dataWrapper._debug) setDebugData(dataWrapper._debug);

            const data = dataWrapper.data || [];

            if (!Array.isArray(data)) {
                console.error("Data is not an array:", data);
                setClients([]);
                return;
            }

            const mapped = data.map((c: any) => ({
                id: c.id,
                name: c.legal_name,
                rfc: c.tax_id,
                contact: c.address?.zip || 'Sin CP',
                email: c.email || '',
                phone: c.phone || '',
                tax_system: c.tax_system || '626'
            }));
            setClients(mapped);
        } catch (err) {
            console.error("Error loading clients:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, [searchTerm]);

    const handleBill = (client: Client) => {
        const params = new URLSearchParams({
            source: 'modal',
            client: client.name,
            rfc: client.rfc,
            fiscalRegime: client.tax_system || '626',
            zip: client.contact !== 'Sin CP' ? client.contact : '',
            tab: 'issued'
        });
        router.push(`/dashboard/invoicing?${params.toString()}`);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar cliente?')) {
            await supabaseService.deleteFiscalClient(id);
            loadClients();
        }
    };

    const handleEdit = (client: Client) => {
        setNewClient({
            legal_name: client.name,
            tax_id: client.rfc,
            tax_system: client.tax_system,
            email: client.email,
            address: { zip: client.contact === 'Sin CP' ? '' : client.contact }
        });
        setEditingId(client.id);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!newClient.legal_name || !newClient.tax_id || !newClient.address.zip) {
            alert('Nombre, RFC y CP son obligatorios');
            return;
        }
        try {
            if (editingId) {
                await supabaseService.updateFiscalClient(editingId, newClient);
            } else {
                await supabaseService.createFiscalClient(newClient);
            }
            setIsModalOpen(false);
            setNewClient({ legal_name: '', tax_id: '', tax_system: '626', email: '', address: { zip: '' } });
            setEditingId(null);
            loadClients();
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const openCreate = () => {
        setNewClient({ legal_name: '', tax_id: '', tax_system: '626', email: '', address: { zip: '' } });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const filteredClients = clients;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full relative">


            {/* Header / Tools */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-indigo-50 dark:bg-indigo-900/10">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por Nombre o RFC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition">
                        <Filter size={16} />
                        Filtros
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition shadow-sm w-full md:w-auto justify-center">
                        <Plus size={18} />
                        Agregar Cliente
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                            <th className="px-6 py-4">Nombre o Razón Social</th>
                            <th className="px-6 py-4">RFC</th>
                            <th className="px-6 py-4 hidden md:table-cell">CP</th>
                            <th className="px-6 py-4 hidden sm:table-cell">E-mail</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredClients.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                                    No se encontraron clientes. Agrega uno nuevo desde Facturapi.
                                </td>
                            </tr>
                        )}
                        {filteredClients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                            {client.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{client.name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                        {client.rfc}
                                    </span>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400" />
                                        {client.contact}
                                    </div>
                                </td>
                                <td className="px-6 py-4 hidden sm:table-cell text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        {client.email}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleBill(client)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition" title="Facturar">
                                            <Receipt size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(client)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition" title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(client.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition" title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Plus size={18} className="text-green-600" />
                                {editingId ? 'Editar Cliente' : 'Nuevo Cliente Fiscal'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Razón Social o Nombre Completo</label>
                                <input
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    value={newClient.legal_name}
                                    onChange={e => setNewClient({ ...newClient, legal_name: e.target.value.toUpperCase() })}
                                    placeholder="Ej. JUAN PEREZ LOPEZ"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">RFC</label>
                                    <input
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                                        value={newClient.tax_id}
                                        onChange={e => setNewClient({ ...newClient, tax_id: e.target.value.toUpperCase() })}
                                        placeholder="XAXX010101000"
                                        maxLength={13}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Código Postal</label>
                                    <input
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newClient.address.zip}
                                        onChange={e => setNewClient({ ...newClient, address: { zip: e.target.value } })}
                                        placeholder="00000"
                                        maxLength={5}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Régimen Fiscal</label>
                                <select
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={newClient.tax_system}
                                    onChange={e => setNewClient({ ...newClient, tax_system: e.target.value })}
                                >
                                    <option value="601">601 - General de Ley Personas Morales</option>
                                    <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                                    <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                                    <option value="606">606 - Arrendamiento</option>
                                    <option value="608">608 - Demás ingresos</option>
                                    <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                                    <option value="616">616 - Sin obligaciones fiscales</option>
                                    <option value="621">621 - Incorporación Fiscal</option>
                                    <option value="625">625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas</option>
                                    <option value="626">626 - Régimen Simplificado de Confianza</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Correo Electrónico</label>
                                <input
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newClient.email}
                                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                    placeholder="cliente@ejemplo.com"
                                    type="email"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md hover:shadow-lg transition transform active:scale-95"
                            >
                                {editingId ? 'Actualizar Cliente' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
