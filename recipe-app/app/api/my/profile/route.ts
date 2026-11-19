
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "ログインが必要です。" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (typeof body.bio !== "string") {
      return NextResponse.json(
        { error: "プロフィール文が正しくありません。" },
        { status: 400 }
      );
    }

    if (body.bio.length > 200) {
      return NextResponse.json(
        { error: "プロフィール文は200文字以内で入力してください。" },
        { status: 400 }
      );
    }

    const bio = body.bio.trim() || null;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(updateError);

      return NextResponse.json(
        { error: "プロフィールの更新に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "プロフィールを更新しました。" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "プロフィール更新中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
