import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type DeleteRecipeResult = {
  recipe_image_url: string | null;
  review_image_urls: string[];
};

// Supabaseの公開画像URLからStorage内のファイルパスを取得
function getStoragePath(
  imageUrl: string | null,
  bucketName: string
): string | null {
  if (!imageUrl) return null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) return null;

    const url = new URL(imageUrl);
    const baseUrl = new URL(supabaseUrl);

    // 別のドメインのURLは対象外
    if (url.origin !== baseUrl.origin) return null;

    const prefix = `/storage/v1/object/public/${bucketName}/`;

    if (!url.pathname.startsWith(prefix)) return null;

    const encodedPath = url.pathname.slice(prefix.length);

    if (!encodedPath) return null;

    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "不正なレシピIDです。" },
        { status: 400 }
      );
    }

    // ログインユーザーを確認
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "ログインしてください。" },
        { status: 401 }
      );
    }

    // ログインユーザーの権限でDB削除RPCを実行
    const { data, error: deleteError } = await supabase.rpc(
      "delete_recipe",
      {
        p_recipe_id: Number(id),
      }
    );

    if (deleteError) {
      console.error("レシピ削除RPCエラー:", deleteError);

      return NextResponse.json(
        { error: "削除に失敗しました。もう一度お試しください" },
        { status: 400 }
      );
    }

    const result = data as DeleteRecipeResult;

    // Storageの管理操作はサーバー側だけで実行
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY が設定されていません。");

      // DB削除自体は成功しているため、削除成功として扱う
      return NextResponse.json({ success: true });
    }

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // レシピ画像のパス
    const recipeImagePath = getStoragePath(
      result.recipe_image_url,
      "recipe-images"
    );

    // レビュー画像のパス
    const reviewImagePaths = (result.review_image_urls ?? [])
      .map((url) => getStoragePath(url, "review-images"))
      .filter((path): path is string => path !== null);

    // レシピ画像を削除
    if (recipeImagePath) {
      const { error } = await adminSupabase.storage
        .from("recipe-images")
        .remove([recipeImagePath]);

      if (error) {
        console.error("レシピ画像削除エラー:", error);
      }
    }

    // レビュー画像を削除
    if (reviewImagePaths.length > 0) {
      const { error } = await adminSupabase.storage
        .from("review-images")
        .remove(reviewImagePaths);

      if (error) {
        console.error("レビュー画像削除エラー:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("レシピ削除APIエラー:", error);

    return NextResponse.json(
      { error: "削除に失敗しました。もう一度お試しください" },
      { status: 500 }
    );
  }
}