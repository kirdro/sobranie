import { NextResponse } from "next/server";

import { fetchUsers } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/cookies";

export async function GET(request: Request) {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized", message: "Требуется авторизация" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  try {
    const users = await fetchUsers(token, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });
    return NextResponse.json(users);
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
        message: "Не удалось получить список пользователей"
      },
      { status: 500 }
    );
  }
}

