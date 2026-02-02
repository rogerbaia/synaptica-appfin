import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { numberToLetters } from '@/utils/numberToLetters';

/* 
    ZERO-DEPENDENCY VERSION 
    - No external catalog imports to prevent render context crashes.
    - Local minimal maps for codes.
    - Premium Styling based on Streamlined Code structure.
*/

// --- LOCAL DATA MAPS (To avoid imports) ---
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

// --- STYLES (PREMIUM LOOK) ---
const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 8, color: '#111' },

    // Header
    header: { flexDirection: 'row', marginBottom: 20 },
    headerLeft: { width: '25%', height: 60, justifyContent: 'center' }, // Logo Area
    headerCenter: { width: '45%', alignItems: 'center', textAlign: 'center' }, // Issuer
    headerRight: { width: '30%', alignItems: 'flex-end' }, // Folio

    // Logo
    logo: { width: '100%', height: '100%', objectFit: 'contain' },

    // Issuer Text
    issuerTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    issuerSub: { fontSize: 7, color: '#555', marginBottom: 1 },
    issuerTag: { fontSize: 6, backgroundColor: '#eee', padding: 2, borderRadius: 2, marginTop: 4, fontWeight: 'bold', color: '#444' },

    // Folio Box
    folioBox: { width: '100%', backgroundColor: '#f8f8f8', border: '1px solid #ddd', padding: 8, borderRadius: 4, alignItems: 'flex-end' },
    folioLabel: { fontSize: 6, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }, // Blue Label
    folioVal: { fontSize: 14, fontWeight: 'bold', color: '#dc2626', marginVertical: 2 }, // Red Val
    folioDate: { fontSize: 6, color: '#666' },

    // Grids (Side by Side)
    gridContainer: { flexDirection: 'row', border: '1px solid #ddd', borderRadius: 4, marginBottom: 15 },
    gridLeft: { width: '60%', borderRight: '1px solid #ddd', padding: 5 },
    gridRight: { width: '40%', padding: 5 },
    gridTitle: { fontSize: 7, fontWeight: 'bold', color: '#333', marginBottom: 4, textTransform: 'uppercase', backgroundColor: '#f1f5f9', padding: 2, textAlign: 'center' },
    row: { flexDirection: 'row', marginBottom: 2 },
    label: { width: '35%', fontSize: 7, fontWeight: 'bold', color: '#666' },
    val: { flex: 1, fontSize: 7, color: '#000' },

    // Table
    table: { width: '100%', marginBottom: 10 },
    thead: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 4, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    th: { color: 'white', fontSize: 7, fontWeight: 'bold' },
    tr: { flexDirection: 'row', borderBottom: '1px solid #eee', padding: 5 },
    td: { fontSize: 7, color: '#333' },

    // Cols
    cQty: { width: '8%', textAlign: 'center' },
    cUnit: { width: '12%' },
    cKey: { width: '12%' },
    cDesc: { width: '43%' },
    cPrice: { width: '12%', textAlign: 'right' },
    cTotal: { width: '13%', textAlign: 'right' },

    // Totals
    totalSection: { flexDirection: 'row', marginTop: 5 },
    totalText: { width: '60%', paddingRight: 10 },
    totalNums: { width: '40%' },
    amountBox: { backgroundColor: '#f9f9f9', padding: 6, border: '1px solid #eee', borderRadius: 3 },
    tRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },

    // Footer Strings
    footer: { marginTop: 20, paddingTop: 10, borderTop: '1px solid #eee', flexDirection: 'row' },
    qrBox: { width: '18%', alignItems: 'center' },
    strBox: { width: '82%', paddingLeft: 10 },
    strRow: { marginBottom: 4 },
    strLab: { fontSize: 6, fontWeight: 'bold', color: '#666' },
    strVal: { fontSize: 5, fontFamily: 'Courier', backgroundColor: '#f9f9f9', padding: 2, color: '#555' }
});

// --- HELPERS ---
const fmtMoney = (v: any) => {
    try { return '$' + Number(v).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'); } catch { return '$0.00'; }
};
const fmtDate = (v: any) => {
    if (!v) return '';
    try { return new Date(v).toISOString().split('T')[0]; } catch { return String(v); }
};
const safe = (v: any) => (v || '') + '';

interface InvoiceDocumentProps {
    data: any;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    // 1. Data Prep
    const d = data || {};
    const det = d.details || {};
    const items = (det.items && Array.isArray(det.items)) ? det.items : [d];

    // Check Logo
    const logoUrl = d.logoUrl || det.logoUrl;
    const hasLogo = logoUrl && typeof logoUrl === 'string' && logoUrl.length > 10;

    // Issuer Hardcoded
    const issuer = {
        name: 'ROGERIO MARTINS BAIA',
        rfc: 'MABR750116P78',
        regime: '626 - Régimen Simplificado de Confianza',
        addr: 'MATAMOROS 514, MONTEMORELOS, NL. CP 67510',
        contact: 'Tel: 81 20227181'
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {hasLogo ? (
                            <Image src={logoUrl} style={styles.logo} />
                        ) : (
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ccc' }}>SYNAPTICA</Text>
                        )}
                    </View>
                    <View style={styles.headerCenter}>
                        <Text style={styles.issuerTitle}>{issuer.name}</Text>
                        <Text style={styles.issuerSub}>RFC: {issuer.rfc}</Text>
                        <Text style={styles.issuerSub}>{issuer.addr}</Text>
                        <Text style={styles.issuerTag}>{issuer.regime}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.folioBox}>
                            <Text style={styles.folioLabel}>FACTURA</Text>
                            <Text style={styles.folioVal}>{safe(d.folio || 'F-001')}</Text>
                            <Text style={styles.folioDate}>{fmtDate(d.date)}</Text>
                        </View>
                    </View>
                </View>

                {/* Grid */}
                <View style={styles.gridContainer}>
                    <View style={styles.gridLeft}>
                        <Text style={styles.gridTitle}>CLIENTE</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Nombre:</Text>
                            <Text style={styles.val}>{safe(d.client)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>RFC:</Text>
                            <Text style={styles.val}>{safe(d.rfc)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>CP:</Text>
                            <Text style={styles.val}>{safe(det.zip)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Uso:</Text>
                            <Text style={styles.val}>{safe(det.cfdiUse)} - {getUseName(det.cfdiUse)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Régimen:</Text>
                            <Text style={styles.val}>{safe(det.fiscalRegime)} - {getRegimeName(det.fiscalRegime)}</Text>
                        </View>
                    </View>
                    <View style={styles.gridRight}>
                        <Text style={styles.gridTitle}>DATOS FISCALES</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Folio Fiscal:</Text>
                            <Text style={[styles.val, { fontSize: 6 }]}>{safe(d.uuid || det.uuid || '---')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Fecha:</Text>
                            <Text style={styles.val}>{fmtDate(det.certDate)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Lugar:</Text>
                            <Text style={styles.val}>{safe(det.expeditionPlace || '67510')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Tipo:</Text>
                            <Text style={styles.val}>I - Ingreso</Text>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.thead}>
                        <Text style={[styles.th, styles.cQty]}>Cant</Text>
                        <Text style={[styles.th, styles.cUnit]}>Unidad</Text>
                        <Text style={[styles.th, styles.cKey]}>Clave</Text>
                        <Text style={[styles.th, styles.cDesc]}>Descripción</Text>
                        <Text style={[styles.th, styles.cPrice]}>P. Unit</Text>
                        <Text style={[styles.th, styles.cTotal]}>Importe</Text>
                    </View>
                    {items.map((it: any, i: number) => (
                        <View key={i} style={styles.tr}>
                            <Text style={[styles.td, styles.cQty]}>{it.quantity || 1}</Text>
                            <View style={styles.cUnit}>
                                <Text style={[styles.td, { fontWeight: 'bold' }]}>{safe(it.satUnitKey || 'E48')}</Text>
                            </View>
                            <Text style={[styles.td, styles.cKey]}>{safe(it.satProductKey || '84111506')}</Text>
                            <Text style={[styles.td, styles.cDesc, { textTransform: 'uppercase' }]}>{safe(it.description)}</Text>
                            <Text style={[styles.td, styles.cPrice]}>{fmtMoney(it.unitValue)}</Text>
                            <Text style={[styles.td, styles.cTotal, { fontWeight: 'bold' }]}>{fmtMoney(it.subtotal || it.amount)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalSection}>
                    <View style={styles.totalText}>
                        <View style={styles.amountBox}>
                            <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#666' }}>IMPORTE CON LETRA</Text>
                            <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{numberToLetters(data.total)}</Text>
                        </View>
                        <View style={{ marginTop: 5 }}>
                            <Text style={{ fontSize: 6 }}>Forma Pago: {safe(det.paymentForm)} - {getPaymentFormName(det.paymentForm)}</Text>
                            <Text style={{ fontSize: 6 }}>Método: {safe(det.paymentMethod)}</Text>
                        </View>
                    </View>
                    <View style={styles.totalNums}>
                        <View style={styles.amountBox}>
                            <View style={styles.tRow}>
                                <Text style={{ fontSize: 7 }}>Subtotal:</Text>
                                <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{fmtMoney(d.subtotal)}</Text>
                            </View>
                            <View style={styles.tRow}>
                                <Text style={{ fontSize: 7 }}>IVA 16%:</Text>
                                <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{fmtMoney(d.iva)}</Text>
                            </View>
                            {(Number(d.retention) > 0) && (
                                <View style={styles.tRow}>
                                    <Text style={{ fontSize: 7, color: 'red' }}>Ret. ISR:</Text>
                                    <Text style={{ fontSize: 7, color: 'red' }}>- {fmtMoney(d.retention)}</Text>
                                </View>
                            )}
                            <View style={[styles.tRow, { borderTop: '1px solid #ddd', marginTop: 2, paddingTop: 2 }]}>
                                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>TOTAL:</Text>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1e40af' }}>{fmtMoney(d.total)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.qrBox}>
                        {/* Safe QR: Just a box to avoid network */}
                        <View style={{ width: 60, height: 60, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 5 }}>QR</Text>
                        </View>
                    </View>
                    <View style={styles.strBox}>
                        <View style={styles.strRow}>
                            <Text style={styles.strLab}>Cadena Original:</Text>
                            <Text style={styles.strVal}>{safe(det.originalChain || det.complement_string || '|| ... ||').slice(0, 150)}...</Text>
                        </View>
                        <View style={styles.strRow}>
                            <Text style={styles.strLab}>Sello CFDI:</Text>
                            <Text style={styles.strVal}>{safe(det.selloCFDI || det.signature).slice(0, 80)}...</Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};
