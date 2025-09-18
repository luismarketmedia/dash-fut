import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

const WorkspaceInsert = z.object({
	name: z.string().min(1),
	owner_id: z.string().uuid().optional(),
});

function getClient() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	const key = serviceRoleKey || anonKey;
	if (!url || !key) {
		throw new Error("Missing Supabase env vars (URL or KEY)");
	}
	return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}));
		const parsed = WorkspaceInsert.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", issues: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const supabase = getClient();

		const ownerFromHeader = request.headers.get("x-user-id");
		const effectiveOwner = parsed.data.owner_id ?? ownerFromHeader ?? undefined;

		const row: Record<string, any> = { name: parsed.data.name };
		if (effectiveOwner) row.owner_id = effectiveOwner;

		const { data, error } = await supabase
			.from("workspaces")
			.insert(row)
			.select("id,name")
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ workspace: data }, { status: 201 });
	} catch (e: any) {
		const msg = e?.message || "Unexpected error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
