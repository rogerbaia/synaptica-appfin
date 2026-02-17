
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Supabase Admin Client (Service Role)
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { userId, email, reason } = body;

        // Verify that the request comes from the authenticated user
        // We get the user from the Supabase Auth header sent by the client
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) {
            return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
        }

        if (user.id !== userId) {
            return NextResponse.json({ message: 'No tienes permiso para eliminar esta cuenta' }, { status: 403 });
        }

        // --- 1. Send Notification Email to Admin ---
        try {
            const host = process.env.SMTP_HOST || 'smtp.gmail.com';
            const port = Number(process.env.SMTP_PORT) || 587;
            const authUser = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASS;

            if (authUser && pass) {
                const transporter = nodemailer.createTransport({
                    host,
                    port,
                    secure: port === 465,
                    auth: { user: authUser, pass },
                });

                const adminEmail = 'rogerbaia@hotmail.com'; // Hardcoded Admin

                await transporter.sendMail({
                    from: `"Sistema Aurea" <${authUser}>`,
                    to: adminEmail,
                    subject: `🚨 USUARIO ELIMINADO: ${email}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #d32f2f;">Usuario ha eliminado su cuenta</h2>
                            <p>El siguiente usuario ha solicitado la eliminación permanente de su cuenta y ha sido procesado:</p>
                            <ul>
                                <li><strong>Email:</strong> ${email}</li>
                                <li><strong>ID:</strong> ${userId}</li>
                                <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
                            </ul>
                            <p>Esta acción fue realizada por el propio usuario desde el panel de facturación.</p>
                        </div>
                    `
                });
                console.log(`Notification email sent to ${adminEmail}`);
            } else {
                console.warn("SMTP credentials missing, skipping admin notification email.");
            }
        } catch (mailError) {
            console.error("Failed to send admin notification:", mailError);
            // Continue with deletion even if email fails
        }

        // --- 2. Delete User from Supabase ---
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error("Supabase Admin Delete Error:", deleteError);
            return NextResponse.json({ message: 'Error eliminando usuario en base de datos' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Cuenta eliminada correctamente' });

    } catch (e: any) {
        console.error("Delete Account Error:", e);
        return NextResponse.json({ message: e.message || 'Error interno del servidor' }, { status: 500 });
    }
}
