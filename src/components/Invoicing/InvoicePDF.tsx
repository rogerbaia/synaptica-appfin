import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Minimal styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 12
    }
});

interface InvoiceDocumentProps {
    data: any;
}

// Minimal Test Component
export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View>
                    <Text>Test PDF Generation - Diagnostic Mode</Text>
                    <Text>If you see this, the print pipeline is working.</Text>
                    <Text>Data ID: {data.uuid || 'No UUID'}</Text>
                    <Text>Total: {data.total}</Text>
                </View>
            </Page>
        </Document>
    );
};
