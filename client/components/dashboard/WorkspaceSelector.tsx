"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/store/app";

export function WorkspaceSelector() {
	const { state, dispatch } = useApp();
	const { userId } = useAuth();
	const [creating, setCreating] = useState(false);
	const workspaces = state.workspaces || [];
	const active = state.activeWorkspaceId || undefined;
	const [shareOpen, setShareOpen] = useState(false);
	const [role, setRole] = useState<string | null>(null);
	useEffect(() => {
		if (!active || !userId) {
			setRole(null);
			return;
		}
		let cancelled = false;
		const load = async () => {
			try {
				const { data } = await supabase
					.from("workspace_members")
					.select("role")
					.eq("workspace_id", active)
					.eq("user_id", userId);
				const r = Array.isArray(data) ? (data[0]?.role ?? null) : ((data as any)?.role ?? null);
				if (!cancelled) setRole(r);
			} catch {
				if (!cancelled) setRole(null);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [active, userId]);

	const inviteLink = useMemo(() => {
		if (!active) return "";
		if (typeof window === "undefined") return "";
		const url = new URL(window.location.href);
		url.searchParams.set("joinWorkspace", active);
		return url.toString();
	}, [active]);
	const inviteRef = useRef<HTMLInputElement | null>(null);
	const copyInvite = async () => {
		if (!inviteLink) return;
		try {
			await navigator.clipboard.writeText(inviteLink);
		} catch {
			const el = inviteRef.current;
			if (el) {
				el.select();
				el.setSelectionRange(0, inviteLink.length);
				document.execCommand("copy");
				el.blur();
			}
		}
	};

	const onChange = (id: string) => {
		dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: id });
	};

	const createWorkspace = async () => {
		if (!userId) return;
		try {
			setCreating(true);
			const name = "Meu Workspace";
			const { data: ws, error: e1 } = await supabase
				.from("workspaces")
				.insert({ name, created_by: userId })
				.select("id, name")
				.single();
			if (e1) throw e1;
			const { error: e2 } = await supabase
				.from("workspace_members")
				.insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
			if (e2) throw e2;
			await Promise.all([
				supabase
					.from("categories")
					.update({ workspace_id: ws.id })
					.eq("owner_id", userId)
					.is("workspace_id", null),
				supabase
					.from("players")
					.update({ workspace_id: ws.id })
					.eq("owner_id", userId)
					.is("workspace_id", null),
				supabase
					.from("teams")
					.update({ workspace_id: ws.id })
					.eq("owner_id", userId)
					.is("workspace_id", null),
				supabase
					.from("matches")
					.update({ workspace_id: ws.id })
					.eq("owner_id", userId)
					.is("workspace_id", null),
				supabase
					.from("assignments")
					.update({ workspace_id: ws.id })
					.eq("owner_id", userId)
					.is("workspace_id", null),
				supabase
					.from("match_events")
					.update({ workspace_id: ws.id })
					.eq("owner_id", userId)
					.is("workspace_id", null),
			]);
			const next = [...workspaces, { id: ws.id as string, name: ws.name as string }];
			dispatch({ type: "SET_WORKSPACES", payload: next as any });
			dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: ws.id as string });
		} finally {
			setCreating(false);
		}
	};

	if (workspaces.length === 0) {
		return (
			<Button size="sm" variant="outline" disabled={!userId || creating} onClick={createWorkspace}>
				{creating ? "Criando…" : "Criar workspace"}
			</Button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Select value={active} onValueChange={onChange}>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Selecionar workspace" />
				</SelectTrigger>
				<SelectContent>
					{workspaces.map((w) => (
						<SelectItem key={w.id} value={w.id}>
							{w.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{role === "owner" && (
				<Button size="sm" variant="outline" onClick={() => setShareOpen(true)} disabled={!active}>
					Compartilhar
				</Button>
			)}
			<Dialog open={shareOpen} onOpenChange={setShareOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Compartilhar workspace</DialogTitle>
						<DialogDescription>
							Envie o link abaixo para o outro usuário entrar neste workspace.
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center gap-2">
						<Input readOnly value={inviteLink} className="flex-1" ref={inviteRef} />
						<Button type="button" onClick={copyInvite}>
							Copiar
						</Button>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShareOpen(false)}>
							Fechar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
