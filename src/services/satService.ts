
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

export interface InvoiceData {
  client: string;
  rfc: string;
  fiscalRegime: string;
  paymentMethod: string;
  paymentForm: string;
  cfdiUse: string;
  satProductKey: string;
  satUnitKey: string;
  description: string;
  quantity: number;
  unitValue: number | string;
  subtotal: number;
  iva: number;
  retention: number;
  total: number;
  returnUrl?: string; // For redirect flow
  // [ADDED] Flags for Payload Construction
  customer?: string;
  hasIva?: boolean;
  hasRetention?: boolean;
  activityType?: string;
  zip?: string; // [NEW]
}

export interface StampedInvoice {
  id?: string; // Facturapi ID
  uuid: string;
  folio: string;
  date: string;
  selloSAT: string;
  selloCFDI: string;
  certificateNumber: string;
  satCertificateNumber?: string; // [NEW] - Optional if not always present
  originalChain: string;
  certDate?: string; // [NEW] - Optional
  verificationUrl?: string; // [NEW] - URL for QR Code
  xml: string;
  fullResponse?: any; // [NEW] - Raw Facturapi Response
}

export const satService = {
  // [NEW] Get Invoice Data Verification
  // [NEW] Get Invoice Data Verification
  async getInvoice(id: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { message: 'No hay sesión de usuario activa' };

    try {
      const response = await fetch(`/api/sat/invoice-check?id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return { message: json?.message || `Error API (${response.status})` };
      }
      return json;
    } catch (e: any) {
      console.error("Error fetching invoice from SAT/Facturapi", e);
      return { message: e.message || 'Error de red al consultar SAT' };
    }
  },

  /**
   * Stamps Invoice via API Route (Real or Mock handled server-side)
   */
  async stampInvoice(data: InvoiceData): Promise<StampedInvoice> {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) throw new Error("No hay sesión activa. Por favor inicia sesión nuevamente.");

    // [TRANSFORMATION] Construct Facturapi Payload from Flat Data
    const RETENTION_RATES: any = {
      'RESICO': { isr: 0.0125, iva: 0.106667 },
      'HONORARIOS': { isr: 0.10, iva: 0.106667 },
      'ARRENDAMIENTO': { isr: 0.10, iva: 0.106667 },
      'FLETES': { isr: 0.04, iva: 0.04 },
      'PLATAFORMAS': { isr: 0.01, iva: 0.50 },
    };

    const taxes = [];
    if (data.hasIva) {
      taxes.push({ type: 'IVA', rate: 0.16 });
    }

    if (data.hasRetention) {
      // Default to RESICO if not specified or found
      const rates = RETENTION_RATES[data.activityType || 'RESICO'] || RETENTION_RATES['RESICO'];

      // Add ISR Retention
      taxes.push({ type: 'ISR', rate: rates.isr, factor: 'Tasa', withholding: true });

      // Add IVA Retention (Only if IVA is also present usually, but let's follow the flag logic)
      if (data.hasIva) {
        taxes.push({ type: 'IVA', rate: rates.iva, factor: 'Tasa', withholding: true });
      }
    }

    const payload = {
      customer: data.customer, // From previous fix
      payment_form: data.paymentForm,
      payment_method: data.paymentMethod,
      use: data.cfdiUse,
      items: [{
        quantity: data.quantity,
        product: {
          description: data.description,
          product_key: data.satProductKey,
          price: Number(data.unitValue),
          unit_key: data.satUnitKey,
          unit_name: 'Servicio', // Optional but good for valid XML
          taxes: taxes // The calculated tax array
        }
      }]
    };

    // Call local API Route which handles the Secret Key and Real Logic
    const response = await fetch('/api/sat/stamp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    console.log('[DEBUG] Stamp Response:', response.status, rawText);

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      console.error('[DEBUG] JSON Parse Error:', e);
      // If it's not JSON, it's likely an HTML error page or empty - show snippet
      throw new Error(`Error del Servidor (${response.status}): ${rawText.substring(0, 100) || 'Respuesta vacía'}`);
    }

    if (!response.ok) {
      throw new Error(json.message || `Error timbrando factura (${response.status})`);
    }

    // [FIX] Map Facturapi Response to StampedInvoice Interface
    const stampData = json.stamp || {};

    return {
      id: json.id, // [NEW] Return Facturapi ID
      uuid: json.uuid,
      folio: json.folio_number ? `${json.series || ''}${json.folio_number}` : '',
      date: json.date || new Date().toISOString(),
      selloSAT: stampData.sello_sat || stampData.sat_seal || '',
      selloCFDI: stampData.sello_cfdi || stampData.signature || '',
      certificateNumber: json.certificate_number || json.att_certificate_number || json.cert_number || '', // [FIX] Issuer CSD Certificate
      satCertificateNumber: stampData.sat_cert_number || '', // [NEW] SAT Certificate
      originalChain: json.original_chain || json.original_string || '',
      certDate: stampData.date || new Date().toISOString(), // [FIX] Certification Date
      verificationUrl: json.verification_url || `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${json.uuid}&re=${json.issuer?.rfc || ''}&rr=${json.customer?.rfc || ''}&tt=${json.total}&fe=${(stampData.sello_cfdi || stampData.signature || '').slice(-8)}`,
      xml: json.xml || '',
      fullResponse: json // [NEW] Store complete raw response for absolute truth
    };
  },

  // [NEW] Cancel Invoice
  async cancelInvoice(id: string, reason: string = '02'): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("No hay sesión activa");

    // Call internal API route to handle Facturapi cancellation
    const response = await fetch('/api/sat/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id, reason })
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Error al cancelar en SAT');
    }
    return json;
  },

  async stampInvoiceLocalMock(data: InvoiceData): Promise<StampedInvoice> {
    // Simulate network latency (1.5s - 3s)
    const delay = Math.floor(Math.random() * 1500) + 1500;
    await new Promise(resolve => setTimeout(resolve, delay));

    const uuid = uuidv4().toUpperCase();
    const date = new Date().toISOString();
    // [FIX] Ensure Mock Folio looks real for testing
    const folio = `F-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const selloBase = "MIIE/TCCAwWgAwIBAgIUMDAwMDEwMDAwMDA1MDU1NjM4NDAwDQYJKoZIhvcNAQELBQAwggErMQ8wDQYDVQQDDAZBQyBTQVQxLjAsBgNVBAoMJVNFUlZJQ0lPIERFIEFETUlOSVNUUkFDSU9OIFRSSUJVVEFSSUExGjAYBgNVBAsMEVNBVC1JRVMgQXV0aG9yaXR5MSgwJgYJKoZIhvcNAQkBFhljb250YWN0by50ZWNuaWNvQHNhdC5nb2IubXgxJzAlBgNVBAkMHkFWLiBISURBTEdPIDc3LCBDT0wuIEdVRVJSRVJPMRMwEQYDVQQQDApDVUFVSFRFTU9DMRMwEQYDVQQIDApESVNUUklUTyBGRURFUkFMMQswCQYDVQQGEwJNWDEtMCsGCSqGSIb3DQEJARYeYWNvZHNAY29tcC5zZXJ2aWNpb3N0cmlidXRhbnRpYW5vcy5nb2IubXgwHhcNMTkwNTE3MTY1MzQ2WhcNMjMwNTE3MTY1MzQ2WjCBzjEpMCcGA1UEAxMgU0VSVklDSU8gREUgQURNSU5JU1RSQUNJT04gVFJJQlVUQVJJQTEpMCcGA1UEKRMgU0VSVklDSU8gREUgQURNSU5JU1RSQUNJT04gVFJJQlVUQVJJQTEpMCcGA1UEChMgU0VSVklDSU8gREUgQURNSU5JU1RSQUNJT04gVFJJQlVUQVJJQTElMCMGA1UELRMcU0FUOTcwNzAxTk4zIC8gROFLQTY2MTIyM1VQMTEeMBwGA1UEBRMVIC8gROFLQTY2MTIyM0hERlJSUzAxMRUwEwYDVQQLEwxTQVQgSUVTIUF1dGhvcmF0eTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJ4";

    const selloCFDI = selloBase + Math.random().toString(36).substring(7);
    const selloSAT = selloBase + Math.random().toString(36).substring(7);

    // Mock XML Generation
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="F" Folio="${folio.split('-')[1]}" Fecha="${date}" Sello="${selloCFDI}" FormaPago="${data.paymentForm}" NoCertificado="30001000000500003421" Certificado="${selloBase}" SubTotal="${data.subtotal.toFixed(2)}" Moneda="MXN" Total="${data.total.toFixed(2)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="${data.paymentMethod}" LugarExpedicion="20000">
  <cfdi:Emisor Rfc="XAXX010101000" Nombre="Dr. Rogelio Barba" RegimenFiscal="612"/>
  <cfdi:Receptor Rfc="${data.rfc}" Nombre="${data.client}" DomicilioFiscalReceptor="20000" RegimenFiscalReceptor="${data.fiscalRegime}" UsoCFDI="${data.cfdiUse}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="${data.satProductKey}" Cantidad="${data.quantity}" ClaveUnidad="${data.satUnitKey}" Unidad="Servicio" Descripcion="${data.description}" ValorUnitario="${Number(data.unitValue).toFixed(2)}" Importe="${data.subtotal.toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${data.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${data.iva.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${data.iva.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${data.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${data.iva.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="${uuid}" FechaTimbrado="${date}" RfcProvCertif="SAT970701NN3" SelloCFD="${selloCFDI}" NoCertificadoSAT="30001000000500003421" SelloSAT="${selloSAT}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    const originalChain = `||1.1|${uuid}|${date}|SAT970701NN3|${selloCFDI}|30001000000500003421||`;

    return {
      id: `mock_${uuid}`, // [NEW] Mock ID
      uuid,
      folio,
      date,
      selloSAT,
      selloCFDI,
      certificateNumber: '30001000000500003421',
      originalChain,
      xml
    };
  },

  /**
   * Generates a link to a mocked PDF layout
   */
  generatePDFUrl(uuid: string): string {
    return `/api/pdf/${uuid}`;
  },

  /**
   * Stamps a Payment Supplement (REP)
   */
  async stampPaymentSupplement(data: any): Promise<StampedInvoice> {
    // Logic for real API or Mock
    // For now, Mock
    return this.stampPaymentSupplementMock(data);
  },

  async stampPaymentSupplementMock(data: any): Promise<StampedInvoice> {
    const delay = Math.floor(Math.random() * 1000) + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const uuid = uuidv4().toUpperCase();
    const date = new Date().toISOString();
    const folio = `RP-${new Date().getFullYear()}${(Math.random() * 1000).toFixed(0).padStart(3, '0')}`;

    const selloBase = "MIIE/TCCAwWgAwIBAgIUMDAwMDEwMDAwMDA1MDU1NjM4NDAwDQYJKoZIhvcNAQELBQAwggErMQ8wDQYDVQQDDAZBQyBTQVQxLjAs";
    const selloCFDI = selloBase + Math.random().toString(36).substring(7);
    const selloSAT = selloBase + Math.random().toString(36).substring(7);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" Version="4.0" Serie="RP" Folio="${folio.split('-')[1]}" Fecha="${date}" Sello="${selloCFDI}" NoCertificado="30001000000500003421" Certificado="${selloBase}" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="P" Exportacion="01" LugarExpedicion="20000">
  <cfdi:Emisor Rfc="XAXX010101000" Nombre="Dr. Rogelio Barba" RegimenFiscal="612"/>
  <cfdi:Receptor Rfc="${data.rfc}" Nombre="${data.client}" DomicilioFiscalReceptor="20000" RegimenFiscalReceptor="616" UsoCFDI="CP01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <pago20:Pagos Version="2.0">
      <pago20:Pago FechaPago="${data.date}T12:00:00" FormaDePagoP="${data.paymentForm}" MonedaP="MXN" Monto="${data.amount.toFixed(2)}" NumOperacion="${data.reference || ''}">
        <pago20:DoctoRelacionado IdDocumento="${data.relatedUuid}" Serie="F" Folio="${data.relatedFolio}" MonedaDR="MXN" MetodoDePagoDR="PPD" NumParcialidad="1" ImpSaldoAnt="${data.amount.toFixed(2)}" ImpPagado="${data.amount.toFixed(2)}" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"/>
      </pago20:Pago>
    </pago20:Pagos>
    <tfd:TimbreFiscalDigital UUID="${uuid}" FechaTimbrado="${date}" RfcProvCertif="SAT970701NN3" SelloCFD="${selloCFDI}" NoCertificadoSAT="30001000000500003421" SelloSAT="${selloSAT}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    const originalChain = `||1.1|${uuid}|${date}|SAT970701NN3|${selloCFDI}|30001000000500003421||`;

    return {
      uuid,
      folio,
      date,
      selloSAT,
      selloCFDI,
      certificateNumber: '30001000000500003421',
      originalChain,
      xml
    };
  },

  // [NEW] Recover Invoice Data from Facturapi and Update DB
  async recoverInvoice(txId: number | string, facturapiId: string) {
    console.log("Recovering Invoice Data...", { txId, facturapiId });
    try {
      const invoiceData = await this.getInvoice(facturapiId);

      if (!invoiceData || invoiceData.error) {
        throw new Error(invoiceData.error || 'Failed to fetch from Facturapi');
      }

      console.log("Fetched Fresh Data:", invoiceData);

      // Now Update Supabase
      const { data: tx, error: fetchError } = await supabase
        .from('transactions')
        .select('details')
        .eq('id', txId)
        .single();

      if (fetchError) throw fetchError;

      const currentDetails = tx.details || {};
      const newDetails = {
        ...currentDetails,
        fullResponse: invoiceData,
        // Patch Helper Fields
        originalChain: invoiceData.original_string || invoiceData.original_chain || currentDetails.originalChain,
        selloSAT: invoiceData.stamp?.sello_sat || invoiceData.stamp?.sat_seal || currentDetails.selloSAT,
        selloCFDI: invoiceData.stamp?.sello_cfdi || invoiceData.stamp?.signature || currentDetails.selloCFDI,
        satCertificateNumber: invoiceData.stamp?.sat_cert_number || invoiceData.stamp?.sat_certificate_number || currentDetails.satCertificateNumber,
        certificateNumber: invoiceData.certificate_number || currentDetails.certificateNumber,
        certDate: invoiceData.stamp?.date || currentDetails.certDate,
        verificationUrl: invoiceData.verification_url || currentDetails.verificationUrl,
        uuid: invoiceData.uuid || currentDetails.uuid
      };

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ details: newDetails })
        .eq('id', txId);

      if (updateError) throw updateError;

      return newDetails;

    } catch (e) {
      console.error("Recovery Failed:", e);
      throw e;
    }
  },

  // [NEW] 24h Time Formatter Helper
  formatDate24h(dateStr: string | Date | undefined) {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '---';

      // Manual 24h Formatting: DD/MM/YYYY, HH:mm:ss
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');

      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return '---';
    }
  }
};
