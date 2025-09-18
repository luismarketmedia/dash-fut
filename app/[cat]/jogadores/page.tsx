"use client";
"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { PlayersSection } from "@/components/dashboard/Players";
import { useApp } from "@/store/app";

function slugify(name: string) {
	return name
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export default function JogadoresByCatPage() {
	const { state, dispatch } = useApp();
	const params = useParams<{ cat: string }>();
	const catSlug = String(params.cat || "");
	const catId = useMemo(
		() => state.categories.find((c) => slugify(c.name) === catSlug)?.id || null,
		[state.categories, catSlug],
	);

	useEffect(() => {
		if (catId && state.activeCategoryId !== catId)
			dispatch({ type: "SET_ACTIVE_CATEGORY", payload: catId });
	}, [catId, state.activeCategoryId, dispatch]);

	return (
		<DashboardLayout>
			<PlayersSection />
		</DashboardLayout>
	);
}
