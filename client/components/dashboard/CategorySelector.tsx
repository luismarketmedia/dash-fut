"use client";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/store/app";

function slugify(s: string) {
	return s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export function CategorySelector() {
	const { state, dispatch } = useApp();
	const [_open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const router = useRouter();
	const pathname = usePathname();

	const categories = state.categories || [];
	const active = state.activeCategoryId || categories[0]?.id || "";

	const _onAdd = () => {
		const n = name.trim();
		if (!n) return;
		dispatch({ type: "ADD_CATEGORY", payload: { name: n } });
		setName("");
		setOpen(false);
	};

	const _label = useMemo(
		() => (categories || []).find((c) => c.id === active)?.name || "Categoria",
		[categories, active],
	);

	const onChangeCategory = (v: string) => {
		const catName = categories.find((c) => c.id === v)?.name || "";
		const slug = catName ? slugify(catName) : "";
		const currentSection = (() => {
			const parts = (pathname || "/").split("/").filter(Boolean);
			const sec = parts[1] || "";
			if (["jogadores", "times", "sorteio", "fases"].includes(sec)) return sec;
			return "";
		})();
		const target = `/${slug}${currentSection ? `/${currentSection}` : ""}`;
		console.log("[CategorySelector] change", { from: active, to: v, pathname, target });
		dispatch({ type: "SET_ACTIVE_CATEGORY", payload: v });
		if (target && target !== pathname) router.push(target);
		else console.log("[CategorySelector] skip push (same path)");
	};

	return (
		<div className="flex items-center gap-2">
			<Select value={active} onValueChange={onChangeCategory}>
				<SelectTrigger className="w-44">
					<SelectValue placeholder="Categoria" />
				</SelectTrigger>
				<SelectContent>
					{categories.map((c) => (
						<SelectItem key={c.id} value={c.id}>
							{c.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
