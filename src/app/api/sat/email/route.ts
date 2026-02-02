
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { invoiceId, email, pdfBase64, filename, replyTo, senderName } = body;

        if (!email || !pdfBase64) {
            return NextResponse.json({ message: 'Faltan datos (email o PDF)' }, { status: 400 });
        }

        const host = process.env.SMTP_HOST || 'smtp.gmail.com'; // Fallback example
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        // Allows customizing the "From" name while keeping the auth email
        // e.g. "Dr. Rogelio Barba (via Aurea)" <notificaciones@aurasynaptica.com>
        const systemSender = process.env.SMTP_FROM || user || 'facturacion@synaptica.ai';
        const fromName = senderName ? `${senderName} (via Synaptica)` : 'Facturación Synaptica';
        const from = `"${fromName}" <${user}>`; // Must use authenticated user email to avoid spam blocks

        if (!user || !pass) {
            console.warn("SMTP Credentials missing. Cannot send email.");
            return NextResponse.json({
                message: 'No se ha configurado el servidor de correo (SMTP). Por favor contacta al administrador.'
            }, { status: 503 });
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
        });

        const mailOptions = {
            from: from,
            to: email,
            replyTo: replyTo || user, // Dynamic Reply-To (User's Email) or fallback to System
            subject: `Factura ${filename?.replace('.pdf', '') || 'CFDI'} - ${senderName || 'Aurea'}`,
            text: `Estimado cliente,\n\nAdjunto encontrará su factura electrónica emitida por ${senderName || 'nosotros'}.\n\nSaludos.`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Factura Electrónica</h2>
                    <p>Estimado cliente,</p>
                    <p>Adjunto encontrará su factura electrónica emitida por: <strong>${senderName || 'Su Proveedor'}</strong></p>
                    <p>Folio: <strong>${filename || 'N/A'}</strong></p>
                    <hr/>
                    <p style="font-size: 12px; color: #888;">
                        Este correo fue enviado automáticamente por el sistema Aurea/Synaptica.
                        <strong>Si responde a este correo, su mensaje llegará directamente a ${senderName || 'al emisor'}.</strong>
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: filename || 'factura.pdf',
                    content: pdfBase64.split('base64,')[1],
                    encoding: 'base64',
                    contentType: 'application/pdf'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (e: any) {
        console.error("Error sending email:", e);
        return NextResponse.json({ message: e.message || 'Error enviando correo' }, { status: 500 });
    }
}
