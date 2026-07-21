import { NextResponse } from "next/server";

import { ensureParserServiceAwake } from "@/lib/parse-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pre-warm the Render parser so the first upload is less likely to 502. */
export async function GET() {
  try {
    const status = await ensureParserServiceAwake();
    return NextResponse.json(status, { status: status.ready ? 200 : 503 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach parser service.";
    return NextResponse.json({ mode: "remote", ready: false, detail: message }, { status: 503 });
  }
}
