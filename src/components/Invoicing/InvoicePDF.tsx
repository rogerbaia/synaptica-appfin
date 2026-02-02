import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { numberToLetters } from '@/utils/numberToLetters';

/* 
    PREMIUM PDF (DIRECT PRINT OPTIMIZED)
    - Zero External Dependencies (Assets pre-processed in Client)
    - Full Strings (No Truncation)
    - Correct Tax Logic
*/

// --- LOCAL DATA MAPS ---
const getPaymentFormName = (code: string) => {
    const map: Record<string, string> = {
        '01': 'Efectivo', '02': 'Cheque nominativo', '03': 'Transferencia electrónica',
        '04': 'Tarjeta de crédito', '28': 'Tarjeta de débito', '99': 'Por definir'
    };
    return map[code] || '';
};

const getRegimeName = (code: string) => {
    const map: Record<string, string> = {
        '626': 'Régimen Simplificado de Confianza',
        '612': 'Personas Físicas con Actividades Empresariales',
        '601': 'General de Ley Personas Morales'
    };
    return map[code] || '';
};

const getUseName = (code: string) => {
    const map: Record<string, string> = {
        'G03': 'Gastos en general', 'P01': 'Por definir', 'D01': 'Honorarios médicos'
    };
    return map[code] || '';
};

// --- STYLES ---
const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 8, color: '#1e293b', backgroundColor: '#FFFFFF' },

    // Header
    header: { flexDirection: 'row', marginBottom: 20 },
    headerLeft: { width: '30%', height: 70, justifyContent: 'center' },
    headerCenter: { width: '40%', alignItems: 'center', textAlign: 'center', paddingTop: 5 },
    headerRight: { width: '30%', alignItems: 'flex-end' },

    logo: { width: '100%', height: '100%', objectFit: 'contain' },

    // Issuer
    issuerTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 2, color: '#0f172a', textTransform: 'uppercase' },
    issuerSub: { fontSize: 7, color: '#64748b', marginBottom: 1 },
    issuerTag: { fontSize: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 2, marginTop: 4, fontWeight: 'bold', color: '#475569' },

    // Folio Box
    folioBox: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e0e7ff',
        padding: 8,
        borderRadius: 6,
        alignItems: 'flex-end'
    },
    folioLabel: { fontSize: 6, fontWeight: 'bold', color: '#312e81', textTransform: 'uppercase', marginBottom: 2 },
    folioVal: { fontSize: 14, fontWeight: 'bold', color: '#ef4444', marginBottom: 4 },
    folioDate: { fontSize: 7, fontWeight: 'bold', color: '#334155' },
    folioDateLabel: { fontSize: 6, color: '#64748b' },

    // Grids
    gridContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 6,
        marginBottom: 15,
        overflow: 'hidden'
    },
    gridLeft: { width: '60%', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
    gridRight: { width: '40%' },

    gridHeader: {
        backgroundColor: '#f8fafc',
        padding: 5,
        fontSize: 7,
        fontWeight: 'bold',
        color: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        textTransform: 'uppercase', // react-pdf uppercase property
        textAlign: 'center'
    },
    gridContent: { padding: 6 },

    row: { flexDirection: 'row', marginBottom: 3 },
    label: { width: '30%', fontSize: 7, fontWeight: 'bold', color: '#64748b' },
    val: { flex: 1, fontSize: 7, color: '#0f172a' },

    // Table
    table: { width: '100%', marginBottom: 15 },
    thead: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        paddingVertical: 5,
        paddingHorizontal: 4,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    th: { color: 'white', fontSize: 7, fontWeight: 'bold' },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 6,
        paddingHorizontal: 4
    },
    td: { fontSize: 7, color: '#334155' },

    cQty: { width: '8%', textAlign: 'center' },
    cUnit: { width: '12%' },
    cKey: { width: '12%' },
    cDesc: { width: '43%' },
    cPrice: { width: '12%', textAlign: 'right' },
    cTotal: { width: '13%', textAlign: 'right' },

    // Totals
    totalSection: { flexDirection: 'row' },
    totalText: { width: '60%', paddingRight: 20 },
    totalNums: { width: '40%' },

    amountBox: {
        backgroundColor: '#f8fafc',
        padding: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4
    },
    tRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },

    // Footer Strings
    footer: {
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        flexDirection: 'row'
    },
    qrBox: { width: '18%', alignItems: 'center' },
    qrImage: { width: 90, height: 90 }, // Bigger QR
    qrPlaceholder: {
        width: 70,
        height: 70,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    strBox: { width: '82%', paddingLeft: 10 },
    strRow: { marginBottom: 6 },
    strLab: { fontSize: 6, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 1 },
    strVal: {
        fontSize: 5,
        fontFamily: 'Courier',
        backgroundColor: '#f8fafc',
        padding: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        color: '#475569',
        borderRadius: 2,
        // Ensure wrapping
        textOverflow: 'clip'
    }
});

const fmtMoney = (v: any) => {
    try { return '$' + Number(v).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'); } catch { return '$0.00'; }
};
const fmtDate = (v: any) => {
    if (!v) return '';
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return d.toISOString().split('T')[0];
    } catch { return String(v); }
};
const safe = (v: any) => (v === null || v === undefined) ? '' : String(v).trim();
const safeRegime = (v: any) => { const s = safe(v); return s.includes('-') ? s : s + ' - ' + getRegimeName(s); };
const safeUse = (v: any) => { const s = safe(v); return s.includes('-') ? s : s + ' - ' + getUseName(s); };

interface InvoiceDocumentProps {
    data: any;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    const d = data || {};
    const det = d.details || {};
    const items = (det.items && Array.isArray(det.items)) ? det.items : [d];

    // Assets from props (handled in Client)
    const logoUrl = d.logoUrl;
    const qrCodeUrl = d.qrCodeUrl;

    // Issuer (Hardcoded for this user context, matching Preview)
    const issuer = {
        name: 'ROGERIO MARTINS BAIA',
        rfc: 'MABR750116P78',
        regime: '626 - Régimen Simplificado de Confianza',
        addr: 'MATAMOROS 514, MONTEMORELOS, NL. CP 67510',
        contact: 'Tel: 81 20227181 | rogerbaia@hotmail.com'
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {logoUrl ? (
                            <Image src={logoUrl} style={styles.logo} />
                        ) : (
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#cbd5e1' }}>SYNAPTICA</Text>
                        )}
                    </View>
                    <View style={styles.headerCenter}>
                        <Text style={styles.issuerTitle}>{issuer.name}</Text>
                        <Text style={styles.issuerSub}>RFC: {issuer.rfc}</Text>
                        <Text style={styles.issuerSub}>{issuer.addr}</Text>
                        <Text style={styles.issuerSub}>{issuer.contact}</Text>
                        <Text style={styles.issuerTag}>{issuer.regime}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.folioBox}>
                            <Text style={styles.folioLabel}>FACTURA</Text>
                            <Text style={styles.folioVal}>{safe(d.folio || 'F-001')}</Text>
                            <Text style={styles.folioDateLabel}>Fecha de Emisión</Text>
                            <Text style={styles.folioDate}>{fmtDate(d.date)}</Text>
                        </View>
                    </View>
                </View>

                {/* Grid */}
                <View style={styles.gridContainer}>
                    <View style={styles.gridLeft}>
                        <Text style={styles.gridHeader}>DATOS DEL RECEPTOR</Text>
                        <View style={styles.gridContent}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Nombre:</Text>
                                <Text style={[styles.val, { fontWeight: 'bold' }]}>{safe(d.client)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>RFC:</Text>
                                <Text style={styles.val}>{safe(d.rfc)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Domicilio:</Text>
                                <Text style={styles.val}>{safe(det.zip ? 'CP ' + det.zip : '---')}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Uso CFDI:</Text>
                                <Text style={styles.val}>{safeUse(det.cfdiUse)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Régimen:</Text>
                                <Text style={styles.val}>{safeRegime(det.fiscalRegime)}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.gridRight}>
                        <Text style={styles.gridHeader}>DATOS FISCALES</Text>
                        <View style={styles.gridContent}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Folio Fiscal:</Text>
                                <Text style={[styles.val, { fontSize: 6, fontFamily: 'Courier' }]}>{safe(d.uuid || det.uuid || '---')}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Certificación:</Text>
                                <Text style={styles.val}>{fmtDate(det.certDate)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Lugar Exp.:</Text>
                                <Text style={styles.val}>{safe(det.expeditionPlace || '67510')}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Tipo CFDI:</Text>
                                <Text style={styles.val}>I - Ingreso</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.thead}>
                        <Text style={[styles.th, styles.cQty]}>Cant.</Text>
                        <Text style={[styles.th, styles.cUnit]}>Unidad</Text>
                        <Text style={[styles.th, styles.cKey]}>Clave</Text>
                        <Text style={[styles.th, styles.cDesc]}>Descripción</Text>
                        <Text style={[styles.th, styles.cPrice]}>Valor Unit.</Text>
                        <Text style={[styles.th, styles.cTotal]}>Importe</Text>
                    </View>
                    {items.map((it: any, i: number) => (
                        <View key={i} style={styles.tr} wrap={false}>
                            <Text style={[styles.td, styles.cQty, { fontWeight: 'bold' }]}>{it.quantity || 1}</Text>
                            <View style={styles.cUnit}>
                                <Text style={[styles.td, { fontWeight: 'bold' }]}>{safe(it.satUnitKey || 'E48')}</Text>
                                <Text style={{ fontSize: 5, color: '#64748b' }}>Unidad de servicio</Text>
                            </View>
                            <Text style={[styles.td, styles.cKey]}>{safe(it.satProductKey || '84111506')}</Text>
                            <Text style={[styles.td, styles.cDesc, { fontWeight: 'bold', textTransform: 'uppercase' }]}>{safe(it.description)}</Text>
                            <Text style={[styles.td, styles.cPrice, { fontFamily: 'Courier' }]}>{fmtMoney(it.unitValue)}</Text>
                            <Text style={[styles.td, styles.cTotal, { fontWeight: 'bold', fontFamily: 'Courier' }]}>{fmtMoney(it.subtotal || it.amount)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalSection}>
                    <View style={styles.totalText}>
                        <View style={styles.amountBox}>
                            <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Importe con Letra</Text>
                            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>*** {numberToLetters(data.total)} ***</Text>
                        </View>
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 6, color: '#64748b', marginBottom: 2 }}>Forma de Pago: <Text style={{ color: '#334155', fontWeight: 'bold' }}>{safe(det.paymentForm)} - {getPaymentFormName(det.paymentForm)}</Text></Text>
                            <Text style={{ fontSize: 6, color: '#64748b' }}>Método de Pago: <Text style={{ color: '#334155', fontWeight: 'bold' }}>{safe(det.paymentMethod || 'PUE')}</Text></Text>
                        </View>
                    </View>
                    <View style={styles.totalNums}>
                        <View style={styles.amountBox}>
                            <View style={styles.tRow}>
                                <Text style={{ fontSize: 7, color: '#64748b' }}>Subtotal</Text>
                                <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155', fontFamily: 'Courier' }}>{fmtMoney(d.subtotal)}</Text>
                            </View>
                            {/* IVA check: Show if positive */}
                            {Number(d.iva) > 0 && (
                                <View style={styles.tRow}>
                                    <Text style={{ fontSize: 7, color: '#64748b' }}>IVA 16%</Text>
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155', fontFamily: 'Courier' }}>{fmtMoney(d.iva)}</Text>
                                </View>
                            )}
                            {/* Retention check: Show if positive */}
                            {Number(d.retention) > 0 && (
                                <View style={styles.tRow}>
                                    <Text style={{ fontSize: 7, color: '#ef4444' }}>Ret. ISR</Text>
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#ef4444', fontFamily: 'Courier' }}>- {fmtMoney(d.retention)}</Text>
                                </View>
                            )}
                            <View style={[styles.tRow, { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 4, paddingTop: 4 }]}>
                                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0f172a' }}>TOTAL</Text>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#4f46e5', fontFamily: 'Courier' }}>{fmtMoney(d.total)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.qrBox}>
                        {qrCodeUrl ? (
                            <Image src={qrCodeUrl} style={styles.qrImage} />
                        ) : (
                            <View style={styles.qrPlaceholder}>
                                <Text style={{ fontSize: 6, color: '#94a3b8' }}>QR Code</Text>
                            </View>
                        )}
                        <Text style={{ fontSize: 5, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>Representación impresa de un CFDI 4.0</Text>
                    </View>
                    <View style={styles.strBox}>
                        <View style={styles.strRow}>
                            <Text style={styles.strLab}>Cadena Original del Complemento de Certificación Digital del SAT</Text>
                            {/* No Slice - Full String */}
                            <Text style={styles.strVal}>{safe(d.originalChain || '|| CADENA NO DISPONIBLE ||')}</Text>
                        </View>
                        <View style={styles.strRow}>
                            <Text style={styles.strLab}>Sello Digital del CFDI</Text>
                            <Text style={styles.strVal}>{safe(d.selloCFDI || '---')}</Text>
                        </View>
                        <View style={styles.strRow}>
                            <Text style={styles.strLab}>Sello Digital del SAT</Text>
                            <Text style={styles.strVal}>{safe(d.selloSAT || '---')}</Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};
