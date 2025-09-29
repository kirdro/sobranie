import { NextResponse } from "next/server";

import { register } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { setAuthToken } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  };

  try {
    const auth = await register(payload);
    await setAuthToken(auth.accessToken, auth.expiresIn);
    return NextResponse.json(auth);
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
        message: "Не удалось выполнить регистрацию"
      },
      { status: 500 }
    );
  }
}

