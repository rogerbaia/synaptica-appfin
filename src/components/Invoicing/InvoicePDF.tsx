import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { SAT_PAYMENT_FORMS, PAYMENT_METHODS, SAT_CFDI_USES, FISCAL_REGIMES } from '@/data/satCatalogs';
import { numberToLetters } from '@/utils/numberToLetters';

// Use standard fonts only
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 8,
        color: '#1e293b'
    },
    watermarkContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
        zIndex: -1
    },
    watermarkText: {
        fontSize: 60,
        color: '#f1f5f9',
        transform: 'rotate(-45deg)',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    logoContainer: {
        width: '30%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    logo: {
        width: 100,
        height: 'auto',
        objectFit: 'contain'
    },
    issuerContainer: {
        width: '35%',
        alignItems: 'center',
        textAlign: 'center'
    },
    issuerName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0f172a',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    issuerCode: {
        fontSize: 7,
        color: '#64748b',
        marginBottom: 2
    },
    issuerAddress: {
        fontSize: 7,
        color: '#64748b',
        marginBottom: 2,
        lineHeight: 1.2
    },
    issuerRegime: {
        fontSize: 7,
        backgroundColor: '#f1f5f9',
        padding: '2 4',
        borderRadius: 2,
        marginTop: 4,
        color: '#475569',
        fontWeight: 'bold'
    },
    folioContainer: {
        width: '30%',
        alignItems: 'flex-end'
    },
    folioBox: {
        backgroundColor: '#eef2ff',
        borderColor: '#e0e7ff',
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
        width: '100%',
        alignItems: 'flex-end'
    },
    folioTitle: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#312e81',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    folioNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 4
    },
    folioDateLabel: {
        fontSize: 6,
        color: '#64748b'
    },
    folioDateValue: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#334155'
    },
    gridContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 15
    },
    gridColumnLeft: {
        width: '60%',
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0'
    },
    gridColumnRight: {
        width: '40%'
    },
    gridHeader: {
        backgroundColor: '#f8fafc',
        padding: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        textAlign: 'center',
        fontSize: 7,
        fontWeight: 'bold',
        color: '#334155',
        textTransform: 'uppercase'
    },
    gridContent: {
        padding: 8
    },
    gridRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    gridLabel: {
        width: '30%',
        fontSize: 7,
        fontWeight: 'bold',
        color: '#64748b'
    },
    gridValue: {
        width: '70%',
        fontSize: 7,
        color: '#0f172a'
    },
    table: {
        width: '100%',
        marginBottom: 15
    },
    tableHeaderBase: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        padding: 5,
        alignItems: 'center',
        color: 'white',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        padding: 6,
        alignItems: 'flex-start'
    },
    colQty: { width: '8%', textAlign: 'center' },
    colUnit: { width: '12%' },
    colKey: { width: '12%' },
    colDesc: { width: '43%' },
    colPrice: { width: '12%', textAlign: 'right' },
    colTotal: { width: '13%', textAlign: 'right' },
    tableHeaderText: {
        fontSize: 7,
        fontWeight: 'bold',
        color: 'white'
    },
    tableText: { fontSize: 7, color: '#334155' },
    tableTextBold: { fontSize: 7, fontWeight: 'bold', color: '#0f172a' },
    totalsSection: {
        flexDirection: 'row',
        marginTop: 5
    },
    amountToTextFor: {
        width: '60%',
        paddingRight: 20
    },
    amountBox: {
        backgroundColor: '#f8fafc',
        padding: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    amountLabel: {
        fontSize: 6,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    amountText: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#334155',
        textTransform: 'uppercase'
    },
    totalsBox: {
        width: '40%',
        backgroundColor: '#f8fafc',
        borderRadius: 4,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3
    },
    totalRowLabel: {
        fontSize: 7,
        color: '#64748b'
    },
    totalRowValue: {
        fontSize: 7,
        fontFamily: 'Helvetica',
        fontWeight: 'bold',
        color: '#334155'
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    grandTotalLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    grandTotalValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4f46e5'
    },
    footer: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
        flexDirection: 'row'
    },
    qrContainer: {
        width: '20%',
        alignItems: 'center'
    },
    qrImage: {
        width: 80,
        height: 80
    },
    stringsContainer: {
        width: '80%',
        paddingLeft: 10
    },
    stringBlock: {
        marginBottom: 6
    },
    stringLabel: {
        fontSize: 6,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 1
    },
    stringContent: {
        fontSize: 5,
        color: '#64748b',
        backgroundColor: '#f8fafc',
        padding: 3,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        fontFamily: 'Courier',
        wordBreak: 'break-all'
    },
    footerDates: {
        flexDirection: 'row',
        marginTop: 2
    },
    footerDateCol: {
        width: '50%'
    }
});

// SAFE GUARD HELPER FUNCTIONS
const safeString = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val);
};

const formatCurrency = (amount: any) => {
    try {
        const value = Number(amount) || 0;
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    } catch (e) { return '$0.00'; }
};

const formatDate = (dateString: any) => {
    if (!dateString) return '---';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return String(dateString); // Return original if parse fails
        return d.toLocaleString('es-MX', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) { return String(dateString); }
};

const safeGetCatalogName = (catalog: any[], code: any) => {
    if (!Array.isArray(catalog)) return '';
    if (!code) return '';
    try {
        const item = catalog.find((c: any) => c.code === code);
        return item ? item.name : '';
    } catch (e) { return ''; }
};

interface InvoiceDocumentProps {
    data: any;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    // Guard against null data
    const safeData = data || {};
    const details = safeData.details || {};

    // Items Logic
    let items = [safeData];
    if (details.items && Array.isArray(details.items) && details.items.length > 0) {
        items = details.items;
    }

    const isStamped = !!safeData.uuid || ['paid', 'pending', 'cancelled'].includes(safeData.status);

    const issuer = {
        name: 'ROGERIO MARTINS BAIA',
        rfc: 'MABR750116P78',
        regime: '626 - Régimen Simplificado de Confianza',
        address: 'MATAMOROS 514 MATAMOROS, MONTEMORELOS, NUEVO LEÓN. Mexico.',
        contact: 'Tel: 81 20227181 | C.P. 67510'
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Watermark */}
                {!isStamped && (
                    <View style={styles.watermarkContainer}>
                        <Text style={styles.watermarkText}>SIN VALIDEZ OFICIAL</Text>
                    </View>
                )}

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {/* No Image for Safety */}
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#cbd5e1' }}>SYNAPTICA</Text>
                    </View>
                    <View style={styles.issuerContainer}>
                        <Text style={styles.issuerName}>{safeString(issuer.name)}</Text>
                        <Text style={styles.issuerCode}>RFC: {safeString(issuer.rfc)}</Text>
                        <Text style={styles.issuerAddress}>{safeString(issuer.address)}</Text>
                        <Text style={styles.issuerCode}>{safeString(issuer.contact)}</Text>
                        <Text style={styles.issuerRegime}>{safeString(issuer.regime)}</Text>
                    </View>
                    <View style={styles.folioContainer}>
                        <View style={styles.folioBox}>
                            <Text style={styles.folioTitle}>{isStamped ? 'FACTURA ELECTRÓNICA' : 'PRE-COMPROBANTE'}</Text>
                            <Text style={styles.folioNumber}>{safeString(safeData.folio || 'F-001')}</Text>
                            <Text style={styles.folioDateLabel}>Fecha de Emisión</Text>
                            <Text style={styles.folioDateValue}>{formatDate(safeData.date)}</Text>
                        </View>
                    </View>
                </View>

                {/* Grids */}
                <View style={styles.gridContainer}>
                    <View style={styles.gridColumnLeft}>
                        <Text style={styles.gridHeader}>DATOS DEL RECEPTOR</Text>
                        <View style={styles.gridContent}>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Razón Social:</Text>
                                <Text style={[styles.gridValue, { fontWeight: 'bold' }]}>{safeString(safeData.client || '---')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>RFC:</Text>
                                <Text style={styles.gridValue}>{safeString(safeData.rfc || '---')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Régimen Fiscal:</Text>
                                <Text style={styles.gridValue}>{safeString(details.fiscalRegime)} - {safeGetCatalogName(FISCAL_REGIMES, details.fiscalRegime)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Domicilio:</Text>
                                <Text style={styles.gridValue}>C.P. {safeString(details.zip || '---')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Uso del CFDI:</Text>
                                <Text style={styles.gridValue}>{safeString(details.cfdiUse)} - {safeGetCatalogName(SAT_CFDI_USES, details.cfdiUse)}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.gridColumnRight}>
                        <Text style={styles.gridHeader}>DATOS FISCALES</Text>
                        <View style={styles.gridContent}>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Folio Fiscal:</Text>
                                <Text style={[styles.gridValue, { fontSize: 6 }]}>{safeString(safeData.uuid || details.uuid || '---')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Tipo CFDI:</Text>
                                <Text style={styles.gridValue}>I - Ingreso</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Lugar Exp.:</Text>
                                <Text style={styles.gridValue}>{safeString(details.expeditionPlace || '67510')}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Certificación:</Text>
                                <Text style={styles.gridValue}>{formatDate(details.certDate)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Serie CSD:</Text>
                                <Text style={styles.gridValue}>{safeString(details.certificateNumber || '00001000000000000000')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.table}>
                    <View style={styles.tableHeaderBase}>
                        <Text style={[styles.tableHeaderText, styles.colQty]}>Cant.</Text>
                        <Text style={[styles.tableHeaderText, styles.colUnit]}>Unidad</Text>
                        <Text style={[styles.tableHeaderText, styles.colKey]}>Clave</Text>
                        <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
                        <Text style={[styles.tableHeaderText, styles.colPrice]}>Valor Unit.</Text>
                        <Text style={[styles.tableHeaderText, styles.colTotal]}>Importe</Text>
                    </View>
                    {items.map((item: any, index: number) => {
                        // Calculate safe values inside mapping
                        const qty = Number(item.quantity) || 1;
                        const val = Number(item.unitValue) || 0;
                        const sub = item.subtotal ? Number(item.subtotal) : (qty * val);
                        return (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableTextBold, styles.colQty]}>{qty}</Text>
                                <View style={styles.colUnit}>
                                    <Text style={styles.tableTextBold}>{safeString(item.satUnitKey || 'E48')}</Text>
                                </View>
                                <Text style={[styles.tableText, styles.colKey]}>{safeString(item.satProductKey || '85121600')}</Text>
                                <View style={styles.colDesc}>
                                    <Text style={[styles.tableTextBold, { textTransform: 'uppercase' }]}>{safeString(item.description)}</Text>
                                </View>
                                <Text style={[styles.tableText, styles.colPrice]}>{formatCurrency(val)}</Text>
                                <Text style={[styles.tableTextBold, styles.colTotal]}>{formatCurrency(sub)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Footer Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.amountToTextFor}>
                        <View style={styles.amountBox}>
                            <Text style={styles.amountLabel}>Importe con Letra</Text>
                            <Text style={styles.amountText}>*** {safeString(numberToLetters(Number(safeData.total) || 0))} ***</Text>
                        </View>
                    </View>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalRowLabel}>Forma de Pago</Text>
                            <Text style={[styles.totalRowValue, { width: '60%', textAlign: 'right' }]}>
                                {safeString(details.paymentForm || '03')} - {safeGetCatalogName(SAT_PAYMENT_FORMS, details.paymentForm || '03')}
                            </Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalRowLabel}>Método de Pago</Text>
                            <Text style={[styles.totalRowValue, { width: '60%', textAlign: 'right' }]}>
                                {safeString(details.paymentMethod || 'PUE')}
                            </Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalRowLabel}>Subtotal</Text>
                            <Text style={styles.totalRowValue}>{formatCurrency(safeData.subtotal)}</Text>
                        </View>
                        {Number(safeData.iva) > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalRowLabel}>IVA 16%</Text>
                                <Text style={styles.totalRowValue}>{formatCurrency(safeData.iva)}</Text>
                            </View>
                        )}
                        {Number(safeData.retention) > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={[styles.totalRowLabel, { color: '#ef4444' }]}>Retención ISR</Text>
                                <Text style={[styles.totalRowValue, { color: '#ef4444' }]}>- {formatCurrency(safeData.retention)}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>TOTAL MXN</Text>
                            <Text style={styles.grandTotalValue}>{formatCurrency(safeData.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Fiscal Footer */}
                <View style={styles.footer}>
                    <View style={styles.qrContainer}>
                        {/* QR Placeholder */}
                        <View style={[styles.qrImage, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ fontSize: 6, color: '#94a3b8' }}>QR Code</Text>
                        </View>
                    </View>
                    <View style={styles.stringsContainer}>
                        <View style={styles.stringBlock}>
                            <Text style={styles.stringLabel}>Cadena Original</Text>
                            <Text style={styles.stringContent}>{safeString(details.originalChain || details.complement_string || '|| CADENA NO DISPONIBLE ||')}</Text>
                        </View>
                        <View style={styles.footerDates}>
                            <View style={styles.footerDateCol}>
                                <Text style={styles.stringLabel}>No. Certificado SAT</Text>
                                <Text style={[styles.stringContent, { backgroundColor: 'transparent', borderWidth: 0, padding: 0 }]}>
                                    {safeString(details.satCertificateNumber || '---')}
                                </Text>
                            </View>
                            <View style={styles.footerDateCol}>
                                <Text style={styles.stringLabel}>Fecha Certificación</Text>
                                <Text style={[styles.stringContent, { backgroundColor: 'transparent', borderWidth: 0, padding: 0 }]}>
                                    {formatDate(details.certDate)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};
