import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function DELETE(req: NextRequest) {
    try {
        // 1. Auth Check (Must be Super Admin)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: 'Missing Authorization' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return NextResponse.json({ message: 'Invalid Session' }, { status: 401 });
        }

        // HARDCODED SUPER ADMIN CHECK
        if (user.email !== 'rogerbaia@hotmail.com') {
            console.warn(`Unauthorized delete attempt by: ${user.email}`);
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        // 2. Parsed Request
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ message: 'Missing User ID' }, { status: 400 });
        }

        console.log(`[ADMIN] Deleting user: ${userId} requested by ${user.email}`);

        // 3. Delete User (Auth + Database via Cascade)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error("Supabase Delete Error:", deleteError);
            throw new Error(deleteError.message);
        }

        return NextResponse.json({ message: 'User deleted successfully' });

    } catch (error: any) {
        console.error("Delete User Route Error:", error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
