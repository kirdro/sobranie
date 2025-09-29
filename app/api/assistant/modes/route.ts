import { NextResponse } from "next/server";

import { fetchAssistantModes } from "@/lib/api/assistant";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  try {
    const items = await fetchAssistantModes();
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.name,
          message: error.message,
          details: error.payload
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: "UnexpectedError",
        message: "Не удалось получить режимы ассистента"
      },
      { status: 500 }
    );
  }
}

