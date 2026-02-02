import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { numberToLetters } from '@/utils/numberToLetters';
import { SAT_CFDI_USES, FISCAL_REGIMES, SAT_PAYMENT_FORMS, PAYMENT_METHODS } from '@/data/satCatalogs';

// Register standard fonts if needed, or use Helvetica by default
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#334155', // slate-700
    },
    header: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    logoContainer: {
        width: 120,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    issuerInfo: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    issuerName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a', // slate-900
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    issuerDetails: {
        fontSize: 8,
        color: '#64748b', // slate-500
        textAlign: 'center',
        marginBottom: 1,
    },
    regimeBadge: {
        marginTop: 5,
        backgroundColor: '#f1f5f9', // slate-100
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
        fontSize: 7,
        color: '#475569', // slate-600
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    folioBox: {
        width: 160,
        backgroundColor: '#eef2ff', // indigo-50
        borderColor: '#e0e7ff', // indigo-100
        borderWidth: 1,
        borderRadius: 6,
        padding: 8,
        alignItems: 'flex-end',
    },
    folioTitle: {
        color: '#312e81', // indigo-900
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    folioNumber: {
        color: '#ef4444', // red-500
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 5,
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e7ff', // indigo-100
        width: '100%',
        marginVertical: 4,
    },
    gridContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 20,
    },
    columnLeft: {
        flex: 7,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
    },
    columnRight: {
        flex: 5,
    },
    sectionHeader: {
        backgroundColor: '#f8fafc', // slate-50
        paddingVertical: 5,
        paddingHorizontal: 8, // Match row padding
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        alignItems: 'flex-start', // Left align title
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1e293b', // slate-800
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc', // slate-50
        paddingVertical: 3,
        paddingHorizontal: 8,
    },
    label: {
        width: '35%',
        fontSize: 8,
        fontWeight: 'bold',
        color: '#475569', // slate-600
    },
    value: {
        width: '65%',
        fontSize: 8,
        color: '#1e293b', // slate-800
        textAlign: 'left', // Changed from right to left per user request
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e293b', // slate-800
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    tableHeaderCell: {
        color: '#ffffff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9', // slate-100
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    tableCell: {
        fontSize: 8,
        color: '#334155', // slate-700
    },
    totalsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 20,
        marginBottom: 20,
    },
    amountLetters: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderRadius: 6,
        padding: 8,
        height: 60,
    },
    totalsBox: {
        width: 220,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 6,
        padding: 10,
    },
    footer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        flexDirection: 'row',
        gap: 15,
    },
    qrContainer: {
        width: 120,
        alignItems: 'center',
    },
    sealsContainer: {
        flex: 1,
    },
    sealBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderRadius: 4,
        padding: 4,
        marginBottom: 6,
    },
    sealText: {
        fontSize: 5,
        fontFamily: 'Courier',
        color: '#64748b',
        textAlign: 'justify',
    },
    watermark: {
        position: 'absolute',
        top: 300,
        left: 100,
        transform: 'rotate(-45deg)',
        fontSize: 80,
        color: '#f1f5f9', // very light slate
        zIndex: -1,
    }
});

// Helper functions (duplicated from InvoicePreview logic for safety)
const getRegimeDesc = (code: string) => {
    if (!code) return '601';
    if (!FISCAL_REGIMES) return code;
    const found = FISCAL_REGIMES.find((r: any) => r.code === code);
    return found ? `${code} - ${found.name}` : code;
};

const getUseDesc = (code: string) => {
    if (!code) return 'G03';
    if (!SAT_CFDI_USES) return code;
    const found = SAT_CFDI_USES.find((u: any) => u.code === code);
    return found ? `${code} - ${found.name}` : code;
};

const getPaymentFormDesc = (code: string) => {
    if (!code) return '03'; // Default to Transferencia
    if (!SAT_PAYMENT_FORMS) return code;
    const found = SAT_PAYMENT_FORMS.find((f: any) => f.code === code);
    return found ? `${code} - ${found.name}` : code;
};

const getPaymentMethodDesc = (code: string) => {
    if (!code) return 'PUE';
    if (!PAYMENT_METHODS) return code;
    const found = PAYMENT_METHODS.find((m: any) => m.code === code);
    return found ? `${code} - ${found.name}` : code;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
        return new Date(dateString).toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
    } catch (e) { return dateString; }
};

export const InvoiceDocument = ({ data }: { data: any }) => {
    const details = data.details || {};
    const isStamped = !!data.uuid || ['paid', 'pending', 'cancelled'].includes(data.status);

    // 1. Split address in issuer object
    const issuer = {
        name: 'ROGERIO MARTINS BAIA',
        rfc: 'MABR750116P78',
        regime: '626 Régimen Simplificado de Confianza',
        addressLine1: 'MATAMOROS 514',
        addressLine2: 'MONTEMORELOS, NUEVO LEÓN, MÉXICO.',
        contact: 'Tel: 81 20227181 | C.P. 67510'
    };

    const subtotal = data.total / (details.iva ? 1.16 : 1);
    const finalSubtotal = details.subtotal || subtotal;
    const finalTotal = data.total;

    // Resolve Logo URL
    // CAUTION: Image src in @react-pdf must be absolute URL or base64. Relative paths like '/logo.png' fail in some envs.
    // We will assume window.location.origin is available if running client side, but we must be careful.
    // For safety, we can try to pass the full URL or handle it in the parent. 
    // Here we'll try a relative path and see if it works, otherwise we might need a prop.
    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo-synaptica.png` : '/logo-synaptica.png';

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {/* We use a safe fallback or the logo */}
                        <Image src={logoUrl} style={styles.logo} />
                    </View>
                    <View style={styles.issuerInfo}>
                        <Text style={styles.issuerName}>{issuer.name}</Text>
                        <Text style={styles.issuerDetails}>RFC: {issuer.rfc}</Text>
                        <Text style={styles.issuerDetails}>{issuer.addressLine1}</Text>
                        <Text style={styles.issuerDetails}>{issuer.addressLine2}</Text>
                        <Text style={styles.issuerDetails}>{issuer.contact}</Text>
                        <View style={styles.regimeBadge}>
                            <Text>{issuer.regime}</Text>
                        </View>
                    </View>
                    <View style={styles.folioBox}>
                        <Text style={styles.folioTitle}>{isStamped ? 'FACTURA ELECTRÓNICA' : 'PRE-COMPROBANTE'}</Text>
                        <Text style={styles.folioNumber}>{data.folio || '---'}</Text>
                        <View style={styles.separator} />
                        <Text style={{ fontSize: 7, color: '#64748b' }}>Fecha de Emisión</Text>
                        <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{formatDate(data.rawDate || data.date)}</Text>
                    </View>
                </View>

                {/* Grids */}
                <View style={styles.gridContainer}>
                    {/* Left Column */}
                    <View style={styles.columnLeft}>
                        {/* Centered Title */}
                        <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
                            <Text style={styles.sectionTitle}>Datos del Receptor</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Razón Social:</Text>
                            {/* Bold Name */}
                            <Text style={[styles.value, { fontWeight: 'bold' }]}>{data.client || '---'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>RFC:</Text>
                            <Text style={styles.value}>{data.rfc || '---'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Régimen:</Text>
                            <Text style={[styles.value, { fontSize: 7 }]}>{getRegimeDesc(details?.fiscalRegime)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Uso CFDI:</Text>
                            <Text style={styles.value}>{getUseDesc(details?.cfdiUse)}</Text>
                        </View>
                        <View style={{ ...styles.row, borderBottomWidth: 0 }}>
                            <Text style={styles.label}>C.P.:</Text>
                            <Text style={styles.value}>{details?.address?.zip || details?.zip || '---'}</Text>
                        </View>
                    </View>

                    {/* Right Column */}
                    <View style={styles.columnRight}>
                        {/* Centered Title */}
                        <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
                            <Text style={styles.sectionTitle}>Datos Fiscales</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Folio Fiscal:</Text>
                            <Text style={[styles.value, { fontSize: 6 }]}>{data.uuid || (isStamped ? '---' : 'NO DISPONIBLE')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Serie CSD Emisor:</Text>
                            <Text style={styles.value}>{details?.certificateNumber || '---'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Emisión:</Text>
                            <Text style={styles.value}>{formatDate(data.rawDate || data.date)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Certificación:</Text>
                            <Text style={styles.value}>{formatDate(details?.certDate)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Tipo CFDI:</Text>
                            <Text style={styles.value}>I - Ingreso</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Versión:</Text>
                            <Text style={styles.value}>4.0</Text>
                        </View>
                        <View style={{ ...styles.row, borderBottomWidth: 0 }}>
                            <Text style={styles.label}>Lugar Exp.:</Text>
                            <Text style={styles.value}>{details?.expeditionPlace || '67510'}</Text>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Cant.</Text>
                        <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Unidad</Text>
                        <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Clave</Text>
                        <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Descripción</Text>
                        <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Valor Unit.</Text>
                        <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Importe</Text>
                    </View>
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{details?.quantity || 1}</Text>
                        <Text style={[styles.tableCell, { width: '15%' }]}>{details?.satUnitKey || 'E48'}</Text>
                        <Text style={[styles.tableCell, { width: '15%' }]}>{details?.satProductKey || '---'}</Text>
                        <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>{data.description}</Text>
                        <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>${(details?.unitValue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                        <Text style={[styles.tableCell, { width: '15%', textAlign: 'right', fontWeight: 'bold' }]}>${(details?.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                    </View>
                </View>

                {/* Totals & Letters */}
                <View style={styles.totalsContainer}>
                    <View style={styles.amountLetters}>
                        <Text style={{ fontSize: 8, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Importe con Letra</Text>
                        <Text style={{ fontSize: 9, color: '#334155' }}>*** {numberToLetters(data.total)} ***</Text>

                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#64748b' }}>Forma de Pago: <Text style={{ fontWeight: 'normal' }}>{getPaymentFormDesc(details?.paymentForm)}</Text></Text>
                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#64748b' }}>Método de Pago: <Text style={{ fontWeight: 'normal' }}>{getPaymentMethodDesc(details?.paymentMethod)}</Text></Text>
                        </View>
                    </View>

                    <View style={styles.totalsBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: '#64748b' }}>Subtotal</Text>
                            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>${(finalSubtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        {Number(details?.iva) > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 8, color: '#64748b' }}>(+ 002 IVA)</Text>
                                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>${Number(details.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                            </View>
                        )}
                        {Number(details?.retention) > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 8, color: '#ef4444' }}>(- Ret. ISR)</Text>
                                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ef4444' }}>-${Number(details.retention).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                            </View>
                        )}
                        <View style={styles.separator} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Total</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4f46e5' }}>${finalTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer / Seals */}
                <View style={styles.footer}>
                    <View style={styles.qrContainer}>
                        {details?.verificationUrl ? (
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(details.verificationUrl)}`}
                                style={{ width: 100, height: 100 }}
                            />
                        ) : (
                            <View style={{ width: 100, height: 100, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontSize: 8, color: '#cbd5e1' }}>QR NO DISPONIBLE</Text>
                            </View>
                        )}
                        {/* Duplicate QR code removed here */}
                        <Text style={{ fontSize: 6, color: '#64748b', marginTop: 4, textAlign: 'center' }}>
                            Representación impresa de un CFDI 4.0
                        </Text>
                    </View>

                    <View style={styles.sealsContainer}>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#475569', marginBottom: 2 }}>Cadena Original del Complemento de Certificación Digital del SAT</Text>
                        <View style={styles.sealBox}>
                            <Text style={styles.sealText}>
                                {details?.originalChain || (isStamped ? '|| CADENA NO DISPONIBLE ||' : '||1.1|UUID|FECHA|SAT970701NN3|SELLO|CERT||')}
                            </Text>
                        </View>

                        <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#475569', marginBottom: 2 }}>Sello Digital del CFDI</Text>
                        <View style={styles.sealBox}>
                            <Text style={styles.sealText}>
                                {details?.selloCFDI || details?.signature || '---'}
                            </Text>
                        </View>

                        <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#475569', marginBottom: 2 }}>Sello Digital del SAT</Text>
                        <View style={styles.sealBox}>
                            <Text style={styles.sealText}>
                                {details?.selloSAT || details?.sat_signature || '---'}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <View style={{ width: '48%' }}>
                                <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>No. de Serie del Certificado del SAT</Text>
                                <Text style={{ fontSize: 7, fontFamily: 'Helvetica' }}>{details?.satCertificateNumber || '---'}</Text>
                            </View>
                            <View style={{ width: '48%' }}>
                                <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>Fecha y Hora de Certificación</Text>
                                <Text style={{ fontSize: 7, fontFamily: 'Helvetica' }}>{formatDate(details?.certDate)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Watermark for Preview */}
                {!isStamped && (
                    <Text style={styles.watermark}>SIN VALIDEZ OFICIAL</Text>
                )}
            </Page>
        </Document>
    );
};
