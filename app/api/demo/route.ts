import { NextResponse } from "next/server";
import type { DemoResponse } from "@shared/api";

export function GET() {
  const response: DemoResponse = { message: "Hello from Next API" };
  return NextResponse.json(response);
}
