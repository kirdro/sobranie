import { NextResponse } from "next/server";

import { clearAuthToken } from "@/lib/auth/cookies";

export async function POST() {
  await clearAuthToken();
  return NextResponse.json({ success: true });
}

