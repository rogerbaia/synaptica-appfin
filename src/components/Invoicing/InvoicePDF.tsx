import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { numberToLetters } from '@/utils/numberToLetters';

// SIMPLIFIED STYLES (Less nesting, standard fonts)
const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9 },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
    headerLeft: { flexGrow: 1 },
    headerRight: { width: 150, textAlign: 'right' },
    title: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
    subtitle: { fontSize: 8, color: '#555', marginBottom: 2 },

    // Grid (Simplified to simple rows)
    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 8, fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: 4, marginBottom: 4 },
    row: { flexDirection: 'row', marginBottom: 2 },
    label: { width: 80, fontSize: 8, color: '#666' },
    value: { flex: 1, fontSize: 8 },

    // Table
    tableHeader: { flexDirection: 'row', backgroundColor: '#333', color: '#fff', padding: 4, fontSize: 8, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 6, fontSize: 8 },
    colQty: { width: '10%', textAlign: 'center' },
    colDesc: { width: '60%' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },

    // Totals
    totalsContainer: { flexDirection: 'row', marginTop: 10 },
    totalsLeft: { flex: 1 },
    totalsRight: { width: 150 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalLabel: { fontSize: 8, fontWeight: 'bold' },
    totalValue: { fontSize: 9 }
});

// ROBUST HELPERS (No Polyfills)
const fmtMoney = (amount: any) => {
    const val = Number(amount) || 0;
    return '$' + val.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

const fmtDate = (dateStr: any) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toISOString().split('T')[0];
};

interface InvoiceDocumentProps {
    data: any;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    const d = data || {};
    const details = d.details || {};

    // Flatten Items
    const items = (details.items && Array.isArray(details.items)) ? details.items : [d];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>ROGERIO MARTINS BAIA</Text>
                        <Text style={styles.subtitle}>RFC: MABR750116P78</Text>
                        <Text style={styles.subtitle}>Régimen: 626 - Simplificado de Confianza</Text>
                        <Text style={styles.subtitle}>C.P. 67510 | México</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'red' }}>
                            {d.uuid ? 'FACTURA' : 'PRE-CFDI'}
                        </Text>
                        <Text style={styles.subtitle}>{d.folio || '---'}</Text>
                        <Text style={styles.subtitle}>{fmtDate(d.date)}</Text>
                    </View>
                </View>

                {/* CLIENT INFO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CLIENTE</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre:</Text>
                        <Text style={styles.value}>{d.client || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>RFC:</Text>
                        <Text style={styles.value}>{d.rfc || 'XAXX010101000'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Uso CFDI:</Text>
                        <Text style={styles.value}>{details.cfdiUse || 'G03'} (Gastos en general)</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>C.P.:</Text>
                        <Text style={styles.value}>{details.zip || '---'}</Text>
                    </View>
                </View>

                {/* ITEMS TABLE */}
                <View style={styles.section}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colQty}>Cant</Text>
                        <Text style={styles.colDesc}>Descripción</Text>
                        <Text style={styles.colPrice}>Unitario</Text>
                        <Text style={styles.colTotal}>Importe</Text>
                    </View>
                    {items.map((item: any, i: number) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <Text style={styles.colQty}>{item.quantity || 1}</Text>
                            <View style={styles.colDesc}>
                                <Text>{item.description || 'Servicio'}</Text>
                                <Text style={{ fontSize: 6, color: '#777' }}>
                                    Clave: {item.satProductKey || '84111506'} | Unidad: {item.satUnitKey || 'E48'}
                                </Text>
                            </View>
                            <Text style={styles.colPrice}>{fmtMoney(item.unitValue)}</Text>
                            <Text style={styles.colTotal}>{fmtMoney(item.subtotal || item.amount || 0)}</Text>
                        </View>
                    ))}
                </View>

                {/* TOTALS */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalsLeft}>
                        <Text style={{ fontSize: 8, fontStyle: 'italic', marginTop: 10 }}>
                            {numberToLetters(Number(d.total) || 0)}
                        </Text>
                    </View>
                    <View style={styles.totalsRight}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal:</Text>
                            <Text style={styles.totalValue}>{fmtMoney(d.subtotal)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>IVA 16%:</Text>
                            <Text style={styles.totalValue}>{fmtMoney(d.iva)}</Text>
                        </View>
                        {(Number(d.retention) > 0) && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Ret. ISR:</Text>
                                <Text style={styles.totalValue}>- {fmtMoney(d.retention)}</Text>
                            </View>
                        )}
                        <View style={[styles.totalRow, { borderTopWidth: 1, paddingTop: 4 }]}>
                            <Text style={[styles.totalLabel, { fontSize: 10 }]}>TOTAL:</Text>
                            <Text style={[styles.totalValue, { fontSize: 10, color: 'blue' }]}>{fmtMoney(d.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* FOOTER */}
                <View style={[styles.section, { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderColor: '#ccc' }]}>
                    <Text style={{ fontSize: 6, color: '#999', textAlign: 'center' }}>
                        Este documento es una representación impresa de un CFDI 4.0
                    </Text>
                    <Text style={{ fontSize: 6, color: '#999', textAlign: 'center' }}>
                        UUID: {d.uuid || details.uuid || '---'}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
