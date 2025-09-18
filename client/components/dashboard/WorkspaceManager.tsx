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
import { supabase } from "@/lib/supabase";
import { useApp } from "@/store/app";

interface MemberRow {
	user_id: string;
	role: string | null;
}

export function WorkspaceManager({ variant = "button" }: { variant?: "button" | "link" }) {
	const { state, dispatch } = useApp();
	const { userId } = useAuth();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [members, setMembers] = useState<MemberRow[]>([]);
	const [name, setName] = useState("");

	const activeId = state.activeWorkspaceId || undefined;
	const workspaces = state.workspaces || [];
	const active = useMemo(
		() => workspaces.find((w) => w.id === activeId) || null,
		[workspaces, activeId],
	);

	// Prepare invite link
	const inviteLink = useMemo(() => {
		if (!activeId) return "";
		if (typeof window === "undefined") return "";
		const url = new URL(window.location.href);
		url.searchParams.set("joinWorkspace", activeId);
		return url.toString();
	}, [activeId]);
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

	const myRole = useMemo(
		() => members.find((m) => m.user_id === userId)?.role || null,
		[members, userId],
	);
	const isOwner = myRole === "owner";

	useEffect(() => {
		if (!open) return;
		setName(active?.name || "");
		let cancelled = false;
		const loadMembers = async () => {
			if (!activeId) return setMembers([]);
			try {
				const { data } = await supabase
					.from("workspace_members")
					.select("user_id, role")
					.eq("workspace_id", activeId);
				if (!cancelled) setMembers((data as any) || []);
			} catch {
				if (!cancelled) setMembers([]);
			}
		};
		void loadMembers();
		return () => {
			cancelled = true;
		};
	}, [open, activeId, active?.name]);

	const saveName = async () => {
		if (!activeId) return;
		const n = name.trim();
		if (!n || n === active?.name) return;
		try {
			setLoading(true);
			await supabase.from("workspaces").update({ name: n }).eq("id", activeId).throwOnError();
			const next = workspaces.map((w) => (w.id === activeId ? { ...w, name: n } : w));
			dispatch({ type: "SET_WORKSPACES", payload: next as any });
		} finally {
			setLoading(false);
		}
	};

	const removeMember = async (uid: string) => {
		if (!activeId) return;
		try {
			setLoading(true);
			await supabase
				.from("workspace_members")
				.delete()
				.eq("workspace_id", activeId)
				.eq("user_id", uid)
				.throwOnError();
			setMembers((prev) => prev.filter((m) => m.user_id !== uid));
			if (uid === userId) {
				const remaining = workspaces.filter((w) => w.id !== activeId);
				dispatch({ type: "SET_WORKSPACES", payload: remaining as any });
				const newActive = remaining[0]?.id || null;
				if (newActive) dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: newActive });
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			{variant === "link" ? (
				<button
					type="button"
					className="text-sm text-muted-foreground hover:text-foreground"
					onClick={() => setOpen(true)}
					disabled={!activeId}
				>
					Workspace
				</button>
			) : (
				<Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={!activeId}>
					Workspace
				</Button>
			)}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Gerenciar workspace</DialogTitle>
						<DialogDescription>
							Renomeie, visualize e gerencie quem tem acesso a este workspace.
						</DialogDescription>
					</DialogHeader>

					{isOwner && (
						<div className="space-y-2">
							<div className="text-xs font-medium text-muted-foreground">Nome</div>
							<div className="flex items-center gap-2">
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Nome do workspace"
								/>
								<Button
									type="button"
									onClick={saveName}
									disabled={!name.trim() || name.trim() === (active?.name || "") || loading}
								>
									Salvar
								</Button>
							</div>
						</div>
					)}

					{isOwner && (
						<div className="space-y-2">
							<div className="text-xs font-medium text-muted-foreground">Convite</div>
							<div className="flex items-center gap-2">
								<Input readOnly value={inviteLink} className="flex-1" ref={inviteRef} />
								<Button type="button" onClick={copyInvite}>
									Copiar
								</Button>
							</div>
						</div>
					)}

					{/* Members */}
					<div className="space-y-2">
						<div className="text-xs font-medium text-muted-foreground">Compartilhado com</div>
						<div className="rounded-md border">
							{members.length === 0 ? (
								<div className="p-3 text-sm text-muted-foreground">Nenhum membro</div>
							) : (
								<ul className="divide-y">
									{members.map((m) => (
										<li key={m.user_id} className="flex items-center justify-between gap-3 p-3">
											<div className="min-w-0">
												<div className="truncate text-sm font-medium">{m.user_id}</div>
												<div className="text-xs text-muted-foreground">{m.role || "member"}</div>
											</div>
											{userId &&
												(m.user_id === userId ? (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => removeMember(m.user_id)}
														disabled={loading}
													>
														Sair
													</Button>
												) : isOwner ? (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => removeMember(m.user_id)}
														disabled={loading}
													>
														Remover
													</Button>
												) : null)}
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Fechar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
