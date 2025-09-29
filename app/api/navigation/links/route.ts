import { NextResponse } from "next/server";

import { fetchNavigationLinks } from "@/lib/api/navigation";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  try {
    const links = await fetchNavigationLinks();
    return NextResponse.json({ items: links });
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
        message: "Не удалось загрузить навигацию"
      },
      { status: 500 }
    );
  }
}

