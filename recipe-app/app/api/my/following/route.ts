
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FollowRow = {
  following_id: string;
};

type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export async function GET() {
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

    // 自分がフォローしているユーザーIDを取得
    const { data: followData, error: followError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false });

    if (followError) {
      console.error(followError);

      return NextResponse.json(
        { error: "フォロー情報の取得に失敗しました。" },
        { status: 500 }
      );
    }

    const follows = (followData ?? []) as FollowRow[];

    if (follows.length === 0) {
      return NextResponse.json(
        { users: [] },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const userIds = follows.map((item) => item.following_id);

    // フォロー中ユーザーのプロフィールを取得
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    if (profileError) {
      console.error(profileError);

      return NextResponse.json(
        { error: "プロフィール情報の取得に失敗しました。" },
        { status: 500 }
      );
    }

    const profiles = (profileData ?? []) as ProfileRow[];

    // フォローした順番を維持
    const profileMap = new Map(
      profiles.map((profile) => [profile.id, profile])
    );

    const users = userIds
      .map((id) => profileMap.get(id))
      .filter((profile): profile is ProfileRow => Boolean(profile));

    return NextResponse.json(
      { users },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "フォロー中のユーザー取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
