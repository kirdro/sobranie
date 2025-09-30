import { NextResponse } from "next/server";

import { clearAuthToken } from "@/lib/auth/cookies";
import { clearSessionCache } from "@/lib/auth/session";

export async function POST() {
  await clearAuthToken();
  clearSessionCache();
  return NextResponse.json({ success: true });
}

