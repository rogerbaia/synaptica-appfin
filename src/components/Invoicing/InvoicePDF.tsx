import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { SAT_PAYMENT_FORMS, SAT_CFDI_USES, FISCAL_REGIMES } from '@/data/satCatalogs';
import { numberToLetters } from '@/utils/numberToLetters';

// ==========================================
// 1. ROBUST HELPER FUNCTIONS (Crash Prevention)
// ==========================================
const safeStr = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

const safeUpper = (val: any) => safeStr(val).toUpperCase();

const fmtMoney = (amount: any) => {
    try {
        const val = Number(amount) || 0;
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
    } catch { return '$0.00'; }
};

const fmtDate = (dateStr: any) => {
    if (!dateStr) return '---';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return safeStr(dateStr);
        return d.toLocaleString('es-MX', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch { return safeStr(dateStr); }
};

const getCatName = (catalog: any[], code: any) => {
    try {
        const item = catalog.find(c => c.code === String(code));
        return item ? item.name : '';
    } catch { return ''; }
};

// ==========================================
// 2. PREMIUM STYLES (Restored from Backup)
// ==========================================
// simplified hierarchy where possible to avoid Flexbox deep-nesting bugs
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 8,
        color: '#1e293b', // Slate-800
        backgroundColor: '#FFFFFF'
    },
    // HEADER (3 Cols)
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    // Col 1: Logo
    headerLeft: {
        width: '25%',
        height: 60,
        justifyContent: 'center',
        alignItems: 'center'
    },
    logoImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    },
    // Col 2: Issuer Info
    headerCenter: {
        width: '45%',
        alignItems: 'center',
        textAlign: 'center'
    },
    issuerTitle: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2, color: '#0f172a' },
    issuerText: { fontSize: 7, color: '#64748b', marginBottom: 1 },
    issuerTag: {
        fontSize: 6,
        backgroundColor: '#f1f5f9',
        paddingVertical: 2,
        paddingHorizontal: 4,
        marginTop: 3,
        borderRadius: 2,
        color: '#475569',
        fontWeight: 'bold'
    },
    // Col 3: Folio Box
    headerRight: {
        width: '30%',
        alignItems: 'flex-end'
    },
    folioBox: {
        width: '100%',
        backgroundColor: '#f8fafc', // Slate-50 instead of Indigo-50 for safety
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        padding: 8,
        alignItems: 'flex-end'
    },
    folioLabel: { fontSize: 6, fontWeight: 'bold', color: '#312e81', textTransform: 'uppercase' }, // Indigo-900
    folioValue: { fontSize: 14, fontWeight: 'bold', color: '#ef4444', marginVertical: 2 }, // Red-500
    folioDateMeta: { fontSize: 5, color: '#94a3b8', marginTop: 2 },

    // GRIDS (Side by Side)
    gridContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 15,
        borderRadius: 4
    },
    gridCol: {
        padding: 0
    },
    gridHeader: {
        backgroundColor: '#f1f5f9',
        padding: 4,
        fontSize: 7,
        fontWeight: 'bold',
        color: '#334155',
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    gridRow: {
        flexDirection: 'row',
        paddingHorizontal: 6,
        paddingVertical: 2
    },
    gridLabel: { width: '30%', fontSize: 7, fontWeight: 'bold', color: '#64748b' },
    gridVal: { width: '70%', fontSize: 7, color: '#0f172a' },

    // TABLE
    tableContainer: { width: '100%', marginBottom: 10, borderWidth: 0 },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e293b', // Slate-800
        padding: 4,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3
    },
    th: { color: 'white', fontSize: 7, fontWeight: 'bold' },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        padding: 5,
        alignItems: 'flex-start'
    },
    tableText: { fontSize: 7, color: '#334155' },
    // Column Widths
    wQty: { width: '8%', textAlign: 'center' },
    wUnit: { width: '12%' },
    wKey: { width: '12%' },
    wDesc: { width: '43%' },
    wPrice: { width: '12%', textAlign: 'right' },
    wTotal: { width: '13%', textAlign: 'right' },

    // TOTALS SECTION
    totalsSection: { flexDirection: 'row', marginTop: 5 },
    totalsLeft: { width: '60%', paddingRight: 10 },
    totalsRight: { width: '40%' },
    amountTextContainer: {
        backgroundColor: '#f8fafc',
        padding: 6,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    totalsRowFinal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },

    // FOOTER (Fiscal Strings)
    footerContainer: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        flexDirection: 'row'
    },
    qrBox: { width: '18%', alignItems: 'center' },
    qrPlaceholder: { width: 60, height: 60, backgroundColor: '#f1f5f9' },
    stringsBox: { width: '82%', paddingLeft: 8 },
    stringRow: { marginBottom: 4 },
    stringLabel: { fontSize: 6, fontWeight: 'bold', color: '#64748b' },
    stringVal: {
        fontSize: 5,
        fontFamily: 'Courier',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        padding: 2,
        wordBreak: 'break-all' // Important for long chains
    }
});

interface InvoiceDocumentProps {
    data: any;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    // 1. Safe Data Access
    const d = data || {};
    const details = d.details || {};

    // 2. Safe Logo Check
    const logoUrl = d.logoUrl || details.logoUrl;
    const hasLogo = logoUrl && (typeof logoUrl === 'string') && (logoUrl.startsWith('http') || logoUrl.startsWith('data:'));

    // 3. Fallback Issuer
    const issuer = {
        name: 'ROGERIO MARTINS BAIA',
        rfc: 'MABR750116P78',
        regime: '626 - Régimen Simplificado de Confianza',
        address: 'MATAMOROS 514 MATAMOROS, MONTEMORELOS, NUEVO LEÓN. Mexico.',
        contact: 'Tel: 81 20227181 | C.P. 67510'
    };

    // 4. Safe Items
    const items = (details.items && Array.isArray(details.items) && details.items.length > 0)
        ? details.items
        : [d]; // Fallback to root data as single item

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* --- HEADER --- */}
                <View style={styles.headerContainer}>
                    {/* Logo */}
                    <View style={styles.headerLeft}>
                        {/* 
                         [DEBUG] Image Disabled to prevent Print Crash.
                         If this works, we know the issue is the Image network fetch.
                        */}
                        {/* {hasLogo ? (
                            <Image src={logoUrl} style={styles.logoImage} />
                        ) : ( */}
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#cbd5e1' }}>SYNAPTICA</Text>
                        {/* )} */}
                    </View>

                    {/* Issuer */}
                    <View style={styles.headerCenter}>
                        <Text style={styles.issuerTitle}>{issuer.name}</Text>
                        <Text style={styles.issuerText}>RFC: {issuer.rfc}</Text>
                        <Text style={styles.issuerText}>{issuer.address}</Text>
                        <Text style={styles.issuerText}>{issuer.contact}</Text>
                        <Text style={styles.issuerTag}>{issuer.regime}</Text>
                    </View>

                    {/* Folio */}
                    <View style={styles.headerRight}>
                        <View style={styles.folioBox}>
                            <Text style={styles.folioLabel}>FACTURA ELECTRÓNICA</Text>
                            <Text style={styles.folioValue}>{safeStr(d.folio || 'F-001')}</Text>
                            <Text style={styles.folioDateMeta}>{fmtDate(d.date)}</Text>
                        </View>
                    </View>
                </View>

                {/* --- GRIDS --- */}
                <View style={styles.gridContainer}>
                    {/* Receiver */}
                    <View style={[styles.gridCol, { width: '60%', borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
                        <Text style={styles.gridHeader}>DATOS DEL RECEPTOR</Text>
                        <View style={{ padding: 4 }}>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Cliente:</Text>
                                <Text style={[styles.gridVal, { fontWeight: 'bold' }]}>{safeStr(d.client)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>RFC:</Text>
                                <Text style={styles.gridVal}>{safeStr(d.rfc)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Uso CFDI:</Text>
                                <Text style={styles.gridVal}>{safeStr(details.cfdiUse)} - {getCatName(SAT_CFDI_USES, details.cfdiUse)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>C.P.:</Text>
                                <Text style={styles.gridVal}>{safeStr(details.zip)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Régimen:</Text>
                                <Text style={styles.gridVal}>{safeStr(details.fiscalRegime)} - {getCatName(FISCAL_REGIMES, details.fiscalRegime)}</Text>
                            </View>
                        </View>
                    </View>
                    {/* Fiscal Data */}
                    <View style={[styles.gridCol, { width: '40%' }]}>
                        <Text style={styles.gridHeader}>DATOS FISCALES</Text>
                        <View style={{ padding: 4 }}>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Folio Fiscal:</Text>
                                <Text style={[styles.gridVal, { fontSize: 6 }]}>{safeStr(d.uuid || details.uuid || '---')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Certificación:</Text>
                                <Text style={styles.gridVal}>{fmtDate(details.certDate)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Lugar Exp.:</Text>
                                <Text style={styles.gridVal}>{safeStr(details.expeditionPlace || '67510')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Tipo:</Text>
                                <Text style={styles.gridVal}>I - Ingreso (4.0)</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- ITEMS TABLE --- */}
                <View style={styles.tableContainer}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, styles.wQty]}>Cant.</Text>
                        <Text style={[styles.th, styles.wUnit]}>Unidad</Text>
                        <Text style={[styles.th, styles.wKey]}>Clave</Text>
                        <Text style={[styles.th, styles.wDesc]}>Descripción</Text>
                        <Text style={[styles.th, styles.wPrice]}>P. Unit.</Text>
                        <Text style={[styles.th, styles.wTotal]}>Importe</Text>
                    </View>
                    {/* Rows */}
                    {items.map((item: any, i: number) => {
                        const qty = Number(item.quantity) || 1;
                        const uVal = Number(item.unitValue) || 0;
                        const sub = Number(item.subtotal) || (qty * uVal);

                        return (
                            <View key={i} style={styles.tr} wrap={false}>
                                <Text style={[styles.tableText, styles.wQty, { fontWeight: 'bold' }]}>{qty}</Text>
                                <View style={styles.wUnit}>
                                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{safeStr(item.satUnitKey || 'E48')}</Text>
                                    <Text style={{ fontSize: 5, color: '#64748b' }}>Unidad de servicio</Text>
                                </View>
                                <Text style={[styles.tableText, styles.wKey]}>{safeStr(item.satProductKey || '84111506')}</Text>
                                <Text style={[styles.tableText, styles.wDesc, { fontWeight: 'bold', textTransform: 'uppercase' }]}>{safeStr(item.description)}</Text>
                                <Text style={[styles.tableText, styles.wPrice]}>{fmtMoney(uVal)}</Text>
                                <Text style={[styles.tableText, styles.wTotal, { fontWeight: 'bold' }]}>{fmtMoney(sub)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* --- TOTALS --- */}
                <View style={styles.totalsSection}>
                    {/* Amount in Words */}
                    <View style={styles.totalsLeft}>
                        <View style={styles.amountTextContainer}>
                            <Text style={{ fontSize: 5, color: '#94a3b8', fontWeight: 'bold' }}>IMPORTE CON LETRA</Text>
                            <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 2 }}>{safeUpper(numberToLetters(Number(d.total) || 0))}</Text>
                        </View>
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 6, color: '#64748b' }}>Forma de Pago: <Text style={{ fontWeight: 'bold', color: '#334155' }}>{safeStr(details.paymentForm || '03')}</Text></Text>
                            <Text style={{ fontSize: 6, color: '#64748b' }}>Método de Pago: <Text style={{ fontWeight: 'bold', color: '#334155' }}>{safeStr(details.paymentMethod || 'PUE')}</Text></Text>
                        </View>
                    </View>
                    {/* Numbers */}
                    <View style={styles.totalsRight}>
                        <View style={styles.amountTextContainer}>
                            <View style={styles.totalsRow}>
                                <Text style={{ fontSize: 7, color: '#64748b' }}>Subtotal</Text>
                                <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{fmtMoney(d.subtotal)}</Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text style={{ fontSize: 7, color: '#64748b' }}>IVA 16%</Text>
                                <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{fmtMoney(d.iva)}</Text>
                            </View>
                            {(Number(d.retention) > 0) && (
                                <View style={styles.totalsRow}>
                                    <Text style={{ fontSize: 7, color: '#ef4444' }}>Ret. ISR</Text>
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#ef4444' }}>- {fmtMoney(d.retention)}</Text>
                                </View>
                            )}
                            <View style={styles.totalsRowFinal}>
                                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0f172a' }}>TOTAL</Text>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#4f46e5' }}>{fmtMoney(d.total)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- FOOTER --- */}
                <View style={styles.footerContainer}>
                    <View style={styles.qrBox}>
                        {/* QR Placeholder - Using View instead of calling ext API for safety */}
                        <View style={[styles.qrPlaceholder, { justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ fontSize: 5, color: '#cbd5e1' }}>QR CODE</Text>
                        </View>
                    </View>
                    <View style={styles.stringsBox}>
                        <View style={styles.stringRow}>
                            <Text style={styles.stringLabel}>Cadena Original:</Text>
                            <Text style={styles.stringVal}>{safeStr(details.originalChain || details.complement_string || '|| CADENA NO DISPONIBLE ||')}</Text>
                        </View>
                        <View style={styles.stringRow}>
                            <Text style={styles.stringLabel}>Sello Digital del CFDI:</Text>
                            <Text style={styles.stringVal}>{safeStr(details.selloCFDI || details.signature || '---')}</Text>
                        </View>
                        <View style={styles.stringRow}>
                            <Text style={styles.stringLabel}>Sello Digital del SAT:</Text>
                            <Text style={styles.stringVal}>{safeStr(details.selloSAT || details.sat_signature || '---')}</Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};
