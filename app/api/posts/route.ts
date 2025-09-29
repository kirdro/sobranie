import { NextResponse } from "next/server";

import { createPost, fetchPosts } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/cookies";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  try {
    const posts = await fetchPosts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });
    return NextResponse.json(posts);
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
        message: "Не удалось получить ленту"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized", message: "Требуется авторизация" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    authorId: string;
    content: string;
    circleId?: string;
    attachments?: string[];
    tags?: string[];
  };

  try {
    const post = await createPost(token, payload);
    return NextResponse.json(post, { status: 201 });
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
        message: "Не удалось создать пост"
      },
      { status: 500 }
    );
  }
}

