import type { DemoResponse } from "@shared/api";
import { NextResponse } from "next/server";

export function GET() {
	const response: DemoResponse = { message: "Hello from Next API" };
	return NextResponse.json(response);
}
