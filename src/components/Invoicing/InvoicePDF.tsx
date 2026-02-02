import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { SAT_PAYMENT_FORMS, PAYMENT_METHODS, SAT_CFDI_USES, FISCAL_REGIMES } from '../../data/satCatalogs';

// Register Fonts (Standard Fonts for PDF)
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' }, // Fallback/Standard
        { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
    ]
});

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 8,
        color: '#1e293b' // Slate-800
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 15
    },
    logoContainer: {
        width: '30%'
    },
    logo: {
        width: 120,
        height: 'auto',
        objectFit: 'contain'
    },
    headerInfo: {
        width: '65%',
        flexDirection: 'column',
        alignItems: 'flex-end'
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a', // Slate-900
        marginBottom: 4
    },
    subtitle: {
        fontSize: 9,
        color: '#64748b', // Slate-500
        marginBottom: 8
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: 2
    },
    label: {
        fontWeight: 'bold',
        width: 90, // Slightly wider for longer labels
        textAlign: 'right',
        marginRight: 5,
        color: '#475569'
    },
    value: {
        color: '#1e293b',
        textAlign: 'right'
    },
    // Sections
    section: {
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    card: {
        width: '48%',
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 2
    },
    row: {
        flexDirection: 'row',
        marginBottom: 3
    },
    fieldLabel: {
        width: '35%',
        fontWeight: 'bold',
        color: '#64748b'
    },
    fieldValue: {
        width: '65%',
        color: '#0f172a'
    },
    // Table
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        marginBottom: 15,
        overflow: 'hidden'
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        padding: 6
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        padding: 6,
        alignItems: 'center'
    },
    colDesc: { width: '40%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTax: { width: '15%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },

    tableText: { fontSize: 8 },
    tableHeaderCell: { fontWeight: 'bold', color: '#475569', fontSize: 8 },

    // Totals
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 5
    },
    totalsContainer: {
        width: '40%',
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
        paddingTop: 5
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    totalLabel: { fontWeight: 'bold', color: '#64748b' },
    totalValue: { fontSize: 10, color: '#0f172a' },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#0f172a',
        paddingTop: 5
    },
    grandTotalLabel: { fontSize: 11, fontWeight: 'bold' },
    grandTotalValue: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },

    // Fiscal Footer
    legalsContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
        flexDirection: 'row'
    },
    qrContainer: {
        width: '20%',
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    sealsContainer: {
        width: '80%',
        paddingLeft: 10
    },
    sealLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#64748b',
        marginTop: 4
    },
    sealValue: {
        fontSize: 6,
        color: '#94a3b8',
        fontFamily: 'Courier',
        marginBottom: 6,
        lineHeight: 1.2
    },
    brandFooter: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 7,
        color: '#cbd5e1'
    }
});

// Helper Functions
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
        return new Date(dateString).toLocaleString('es-MX', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) { return dateString; }
};

const getCatalogName = (catalog: { code: string, name: string }[], code: string) => {
    const item = catalog.find(c => c.code === code);
    return item ? item.name : '';
};

const getPaymentMethodName = (code: string) => {
    const item = PAYMENT_METHODS.find(c => c.code === code);
    return item ? item.name : '';
};

const getFiscalRegimeName = (code: string) => {
    const item = FISCAL_REGIMES.find(c => c.code === code);
    return item ? item.name : '';
};

const getCfdiUseName = (code: string) => {
    const item = SAT_CFDI_USES.find(c => c.code === code);
    return item ? item.name : '';
};


interface InvoiceDocumentProps {
    data: any;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    const details = data.details || {};

    // [FIX] Logo Loading Logic - Isomorphic
    const logoUrl = data.logoUrl || (typeof window !== 'undefined' ? `${window.location.origin}/logo-synaptica.png` : '/logo-synaptica.png');

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {logoUrl && <Image src={logoUrl} style={styles.logo} />}
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>FACTURA</Text>
                        <Text style={styles.subtitle}>{data.folio || 'SIN FOLIO'}</Text>

                        <View style={styles.headerRow}>
                            <Text style={styles.label}>UUID:</Text>
                            <Text style={[styles.value, { fontSize: 7, marginTop: 1 }]}>{data.uuid || details.uuid || '---'}</Text>
                        </View>
                        <View style={styles.headerRow}>
                            <Text style={styles.label}>Fecha Emisión:</Text>
                            <Text style={styles.value}>{formatDate(data.date)}</Text>
                        </View>
                        <View style={styles.headerRow}>
                            <Text style={styles.label}>Lugar Exp:</Text>
                            <Text style={styles.value}>{details.expeditionPlace || '67510'}</Text>
                        </View>
                        <View style={styles.headerRow}>
                            <Text style={styles.label}>Versión:</Text>
                            <Text style={styles.value}>4.0</Text>
                        </View>
                    </View>
                </View>

                {/* Info Cards */}
                <View style={styles.section}>
                    {/* Issuer */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>DATOS DEL EMISOR</Text>
                        <Text style={[styles.value, { fontWeight: 'bold', marginBottom: 4 }]}>DR. ROGELIO BARBA</Text>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>RFC:</Text>
                            <Text style={styles.fieldValue}>XAXX010101000</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>Régimen:</Text>
                            <Text style={styles.fieldValue}>612 - Personas Físicas con Actividades Empresariales</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>Serie CSD:</Text>
                            <Text style={styles.fieldValue}>{details.certificateNumber || '00001000000500000000'}</Text>
                        </View>
                    </View>

                    {/* Recipient */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>DATOS DEL RECEPTOR</Text>
                        <Text style={[styles.value, { fontWeight: 'bold', marginBottom: 4 }]}>{data.client || 'Cliente General'}</Text>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>RFC:</Text>
                            <Text style={styles.fieldValue}>{data.rfc || 'XAXX010101000'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>Régimen:</Text>
                            <Text style={styles.fieldValue}>{data.fiscalRegime ? `${data.fiscalRegime} - ${getFiscalRegimeName(data.fiscalRegime)}` : '---'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>Uso CFDI:</Text>
                            <Text style={styles.fieldValue}>{data.cfdiUse ? `${data.cfdiUse} - ${getCfdiUseName(data.cfdiUse)}` : '---'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.fieldLabel}>CP:</Text>
                            <Text style={styles.fieldValue}>{data.zip || details.zip || '---'}</Text>
                        </View>
                    </View>
                </View>

                {/* Fiscal Details Bar */}
                <View style={[styles.section, { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 4 }]}>
                    <View style={{ width: '33%' }}>
                        <Text style={styles.fieldLabel}>Forma de Pago</Text>
                        <Text style={styles.tableText}>{data.paymentForm} - {getCatalogName(SAT_PAYMENT_FORMS, data.paymentForm) || '---'}</Text>
                    </View>
                    <View style={{ width: '33%' }}>
                        <Text style={styles.fieldLabel}>Método de Pago</Text>
                        <Text style={styles.tableText}>{data.paymentMethod} - {getPaymentMethodName(data.paymentMethod) || '---'}</Text>
                    </View>
                    <View style={{ width: '33%' }}>
                        <Text style={styles.fieldLabel}>Tipo Comprobante</Text>
                        <Text style={styles.tableText}>I - Ingreso</Text>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>CANT</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIPCIÓN</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>PRECIO U.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTax]}>IMPUESTOS</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>IMPORTE</Text>
                    </View>
                    {/* Rows */}
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableText, styles.colQty]}>{data.quantity || 1}</Text>
                        <View style={styles.colDesc}>
                            <Text style={[styles.tableText, { fontWeight: 'bold' }]}>{data.description}</Text>
                            <Text style={{ fontSize: 7, color: '#64748b' }}>ClaveProdServ: {data.satProductKey || '85121600'} | Unidad: {data.satUnitKey || 'E48'}</Text>
                        </View>
                        <Text style={[styles.tableText, styles.colPrice]}>{formatCurrency(data.unitValue)}</Text>
                        <View style={styles.colTax}>
                            {data.items?.[0]?.product?.taxes?.map((t: any, i: number) => (
                                <Text key={i} style={{ fontSize: 7 }}>{t.type} {t.rate * 100}%: {formatCurrency(data.subtotal * t.rate)}</Text>
                            )) || <Text style={{ fontSize: 7 }}>IVA 16%: {formatCurrency(data.iva)}</Text>}
                        </View>
                        <Text style={[styles.tableText, styles.colTotal]}>{formatCurrency(data.subtotal)}</Text>
                    </View>
                </View>

                {/* Totals */}
                <View style={styles.footerSection}>
                    <View style={styles.totalsContainer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
                        </View>
                        {(data.iva > 0) && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>IVA 16%</Text>
                                <Text style={styles.totalValue}>{formatCurrency(data.iva)}</Text>
                            </View>
                        )}
                        {(data.retention > 0) && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Retención</Text>
                                <Text style={styles.totalValue}>- {formatCurrency(data.retention)}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotal}>
                            <Text style={styles.grandTotalLabel}>TOTAL MXN</Text>
                            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer / QR / Seals */}
                <View style={styles.legalsContainer}>
                    <View style={styles.qrContainer}>
                        {/* QR Code */}
                        {details.verificationUrl && (
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(details.verificationUrl)}`}
                                style={{ width: 80, height: 80 }}
                            />
                        )}
                        {!details.verificationUrl && <View style={{ width: 80, height: 80, backgroundColor: '#f1f5f9' }} />}
                        <Text style={{ fontSize: 6, textAlign: 'center', marginTop: 4 }}>Representación impresa de un CFDI 4.0</Text>
                    </View>
                    <View style={styles.sealsContainer}>
                        <Text style={styles.sealLabel}>Sello Digital del CFDI:</Text>
                        <Text style={styles.sealValue}>{details.selloCFDI || '---'}</Text>

                        <Text style={styles.sealLabel}>Sello del SAT:</Text>
                        <Text style={styles.sealValue}>{details.selloSAT || '---'}</Text>

                        <Text style={styles.sealLabel}>Cadena Original del Complemento de Certificación Digital del SAT:</Text>
                        <Text style={styles.sealValue}>{details.originalChain || '---'}</Text>

                        <View style={{ flexDirection: 'row', marginTop: 5 }}>
                            <View style={{ width: '50%' }}>
                                <Text style={styles.sealLabel}>No. de Serie del Certificado del SAT:</Text>
                                <Text style={styles.sealValue}>{details.satCertificateNumber || '---'}</Text>
                            </View>
                            <View style={{ width: '50%' }}>
                                <Text style={styles.sealLabel}>Fecha y Hora de Certificación:</Text>
                                <Text style={styles.sealValue}>{formatDate(details.certDate)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <Text style={styles.brandFooter}>
                    Emitido por Synaptica AppFin
                </Text>
            </Page>
        </Document>
    );
};
