import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { SAT_PAYMENT_FORMS, PAYMENT_METHODS, SAT_CFDI_USES, FISCAL_REGIMES } from '../../data/satCatalogs';
import { numberToLetters } from '@/utils/numberToLetters';

// Register Fonts (Standard Fonts for PDF)
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' }, // Fallback/Standard
        { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
        { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf', fontStyle: 'italic' }
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
    // Watermark
    watermarkContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1
    },
    watermarkText: {
        fontSize: 60,
        color: '#f1f5f9', // Very light slate
        transform: 'rotate(-45deg)',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    // Header Section (3 Columns)
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
        backgroundColor: '#eef2ff', // Indigo-50
        borderColor: '#e0e7ff', // Indigo-100
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
        width: '100%',
        alignItems: 'flex-end'
    },
    folioTitle: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#312e81', // Indigo-900
        textTransform: 'uppercase',
        marginBottom: 2
    },
    folioNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ef4444', // Red-500
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

    // Grids (Receiver & Fiscal)
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

    // Table
    table: {
        width: '100%',
        marginBottom: 15
    },
    tableHeaderBase: {
        flexDirection: 'row',
        backgroundColor: '#1e293b', // Slate-800
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

    // Totals Section
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
        fontFamily: 'Helvetica-Bold', // Ensure mono-like alignment
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
        color: '#4f46e5' // Indigo-600
    },

    // Fiscal Footer
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
        fontFamily: 'Courier'
    },
    footerDates: {
        flexDirection: 'row',
        marginTop: 2
    },
    footerDateCol: {
        width: '50%'
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

    // Logic for Stamped Status
    const isStamped = !!data.uuid || ['paid', 'pending', 'cancelled'].includes(data.status);

    // [FIX] Logo Loading Logic - Isomorphic
    const logoUrl = data.logoUrl || (typeof window !== 'undefined' ? `${window.location.origin}/logo-synaptica.png` : '/logo-synaptica.png');

    // Default Issuer Data (Matches InvoicePreview)
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
                        {logoUrl && <Image src={logoUrl} style={styles.logo} />}
                    </View>
                    <View style={styles.issuerContainer}>
                        <Text style={styles.issuerName}>{issuer.name}</Text>
                        <Text style={styles.issuerCode}>RFC: {issuer.rfc}</Text>
                        <Text style={styles.issuerAddress}>{issuer.address}</Text>
                        <Text style={styles.issuerCode}>{issuer.contact}</Text>
                        <Text style={styles.issuerRegime}>{issuer.regime}</Text>
                    </View>
                    <View style={styles.folioContainer}>
                        <View style={styles.folioBox}>
                            <Text style={styles.folioTitle}>{isStamped ? 'FACTURA ELECTRÓNICA' : 'PRE-COMPROBANTE'}</Text>
                            <Text style={styles.folioNumber}>{data.folio || 'F-001'}</Text>
                            <Text style={styles.folioDateLabel}>Fecha de Emisión</Text>
                            <Text style={styles.folioDateValue}>{formatDate(data.date)}</Text>
                        </View>
                    </View>
                </View>

                {/* Data Grids */}
                <View style={styles.gridContainer}>
                    {/* Left: Receiver */}
                    <View style={styles.gridColumnLeft}>
                        <Text style={styles.gridHeader}>DATOS DEL RECEPTOR</Text>
                        <View style={styles.gridContent}>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Razón Social:</Text>
                                <Text style={[styles.gridValue, { fontWeight: 'bold' }]}>{data.client || '---'}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>RFC:</Text>
                                <Text style={styles.gridValue}>{data.rfc || '---'}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Régimen Fiscal:</Text>
                                <Text style={styles.gridValue}>{details.fiscalRegime ? `${details.fiscalRegime} - ${getFiscalRegimeName(details.fiscalRegime)}` : '---'}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Domicilio:</Text>
                                <Text style={styles.gridValue}>{details.zip ? `C.P. ${details.zip}` : '---'}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Uso del CFDI:</Text>
                                <Text style={styles.gridValue}>{details.cfdiUse ? `${details.cfdiUse} - ${getCfdiUseName(details.cfdiUse)}` : '---'}</Text>
                            </View>
                        </View>
                    </View>
                    {/* Right: Fiscal */}
                    <View style={styles.gridColumnRight}>
                        <Text style={styles.gridHeader}>DATOS FISCALES</Text>
                        <View style={styles.gridContent}>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Folio Fiscal:</Text>
                                <Text style={[styles.gridValue, { fontSize: 6 }]}>{data.uuid || details.uuid || '---'}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Tipo CFDI:</Text>
                                <Text style={styles.gridValue}>I - Ingreso</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Versión:</Text>
                                <Text style={styles.gridValue}>4.0</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Lugar Exp.:</Text>
                                <Text style={styles.gridValue}>{details.expeditionPlace || '67510'}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Certificación:</Text>
                                <Text style={styles.gridValue}>{formatDate(details.certDate)}</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>Serie CSD:</Text>
                                <Text style={styles.gridValue}>{details.certificateNumber || '00001000000000000000'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeaderBase}>
                        <Text style={[styles.tableHeaderText, styles.colQty]}>Cant.</Text>
                        <Text style={[styles.tableHeaderText, styles.colUnit]}>Unidad</Text>
                        <Text style={[styles.tableHeaderText, styles.colKey]}>Clave</Text>
                        <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
                        <Text style={[styles.tableHeaderText, styles.colPrice]}>Valor Unit.</Text>
                        <Text style={[styles.tableHeaderText, styles.colTotal]}>Importe</Text>
                    </View>
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableTextBold, styles.colQty]}>{data.quantity || 1}</Text>
                        <View style={styles.colUnit}>
                            <Text style={styles.tableTextBold}>{data.satUnitKey || 'E48'}</Text>
                            <Text style={[styles.tableText, { fontSize: 6 }]}>Unidad de servicio</Text>
                        </View>
                        <Text style={[styles.tableText, styles.colKey]}>{data.satProductKey || '85121600'}</Text>
                        <View style={styles.colDesc}>
                            <Text style={[styles.tableTextBold, { textTransform: 'uppercase' }]}>{data.description}</Text>
                        </View>
                        <Text style={[styles.tableText, styles.colPrice]}>{formatCurrency(data.unitValue)}</Text>
                        <Text style={[styles.tableTextBold, styles.colTotal]}>{formatCurrency(data.subtotal)}</Text>
                    </View>
                </View>

                {/* Footer Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.amountToTextFor}>
                        <View style={styles.amountBox}>
                            <Text style={styles.amountLabel}>Importe con Letra</Text>
                            <Text style={styles.amountText}>*** {numberToLetters(data.total)} ***</Text>
                        </View>
                    </View>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalRowLabel}>Forma de Pago</Text>
                            <Text style={[styles.totalRowValue, { width: '60%', textAlign: 'right' }]}>{details.paymentForm || '03'} - {getCatalogName(SAT_PAYMENT_FORMS, details.paymentForm || '03')}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalRowLabel}>Método de Pago</Text>
                            <Text style={[styles.totalRowValue, { width: '60%', textAlign: 'right' }]}>{details.paymentMethod || 'PUE'} - {details.paymentMethod === 'PPD' ? 'Parcialidades' : 'Una sola exhibición'}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 4 }} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalRowLabel}>Subtotal</Text>
                            <Text style={styles.totalRowValue}>{formatCurrency(data.subtotal)}</Text>
                        </View>
                        {data.iva > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalRowLabel}>IVA 16%</Text>
                                <Text style={styles.totalRowValue}>{formatCurrency(data.iva)}</Text>
                            </View>
                        )}
                        {data.retention > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={[styles.totalRowLabel, { color: '#ef4444' }]}>Retención ISR</Text>
                                <Text style={[styles.totalRowValue, { color: '#ef4444' }]}>- {formatCurrency(data.retention)}</Text>
                            </View>
                        )}
                        {data.ivaRetention > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={[styles.totalRowLabel, { color: '#ef4444' }]}>Retención IVA</Text>
                                <Text style={[styles.totalRowValue, { color: '#ef4444' }]}>- {formatCurrency(data.ivaRetention)}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>TOTAL MXN</Text>
                            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Fiscal Footer (Strings & QR) */}
                <View style={styles.footer}>
                    <View style={styles.qrContainer}>
                        {details.verificationUrl ? (
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(details.verificationUrl)}`}
                                style={styles.qrImage}
                            />
                        ) : (
                            <View style={[styles.qrImage, { backgroundColor: '#f1f5f9' }]} />
                        )}
                        <Text style={[styles.stringLabel, { marginTop: 4, textAlign: 'center' }]}>Representación impresa de un CFDI 4.0</Text>
                    </View>
                    <View style={styles.stringsContainer}>
                        <View style={styles.stringBlock}>
                            <Text style={styles.stringLabel}>Cadena Original del Complemento de Certificación Digital del SAT</Text>
                            <Text style={styles.stringContent}>{details.originalChain || details.complement_string || '|| CADENA NO DISPONIBLE ||'}</Text>
                        </View>
                        <View style={styles.stringBlock}>
                            <Text style={styles.stringLabel}>Sello Digital del CFDI</Text>
                            <Text style={styles.stringContent}>{details.selloCFDI || details.signature || '---'}</Text>
                        </View>
                        <View style={styles.stringBlock}>
                            <Text style={styles.stringLabel}>Sello Digital del SAT</Text>
                            <Text style={styles.stringContent}>{details.selloSAT || details.sat_signature || '---'}</Text>
                        </View>
                        <View style={styles.footerDates}>
                            <View style={styles.footerDateCol}>
                                <Text style={styles.stringLabel}>No. de Serie del Certificado del SAT</Text>
                                <Text style={[styles.stringContent, { backgroundColor: 'transparent', borderWidth: 0, padding: 0 }]}>{details.satCertificateNumber || details.sat_cert_number || '---'}</Text>
                            </View>
                            <View style={styles.footerDateCol}>
                                <Text style={styles.stringLabel}>Fecha y Hora de Certificación</Text>
                                <Text style={[styles.stringContent, { backgroundColor: 'transparent', borderWidth: 0, padding: 0 }]}>{formatDate(details.certDate)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};
