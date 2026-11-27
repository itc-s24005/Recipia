
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type DeleteRecipeResult = {
  recipe_image_url: string | null;
  review_image_urls: string[];
  step_image_urls?: string[];
};

const BUCKET_NAME = "recipe-images";

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

// サーバー側のStorage管理クライアントを作成
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabaseの管理者設定がありません。");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ログインユーザーとレシピの所有者を確認
async function verifyRecipeOwner(id: string) {
  if (!/^\d+$/.test(id)) {
    return {
      error: NextResponse.json(
        { error: "不正なレシピIDです。" },
        { status: 400 }
      ),
      userId: null,
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "ログインしてください。" },
        { status: 401 }
      ),
      userId: null,
    };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", Number(id))
    .eq("user_id", user.id)
    .maybeSingle();

  if (recipeError || !recipe) {
    return {
      error: NextResponse.json(
        { error: "レシピが見つからないか、削除する権限がありません。" },
        { status: 403 }
      ),
      userId: null,
    };
  }

  return {
    error: null,
    userId: user.id,
  };
}

// 編集時に不要になった画像を削除
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error: ownerError, userId } = await verifyRecipeOwner(id);

    if (ownerError) {
      return ownerError;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "ログインしてください。" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const paths: unknown = body.paths;

    if (
      !Array.isArray(paths) ||
      !paths.every(
        (path): path is string =>
          typeof path === "string" &&
          path.length > 0 &&
          path.startsWith(`${userId}/`) &&
          !path.includes("..")
      )
    ) {
      return NextResponse.json(
        { error: "削除対象の画像パスが不正です。" },
        { status: 400 }
      );
    }

    const uniquePaths = [...new Set(paths)];

    if (uniquePaths.length === 0) {
      return NextResponse.json({ success: true });
    }

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.storage
      .from(BUCKET_NAME)
      .remove(uniquePaths);

    if (error) {
      console.error("編集時の画像削除エラー:", error);

      return NextResponse.json(
        { error: "画像の削除に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: data?.length ?? 0,
    });
  } catch (error) {
    console.error("編集時の画像削除APIエラー:", error);

    return NextResponse.json(
      { error: "画像の削除に失敗しました。" },
      { status: 500 }
    );
  }
}

// レシピ削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error: ownerError } = await verifyRecipeOwner(id);

    if (ownerError) {
      return ownerError;
    }

    const supabase = await createClient();

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
        { error: "削除に失敗しました。もう一度お試しください。" },
        { status: 400 }
      );
    }

    const result = data as DeleteRecipeResult;

    const adminSupabase = createAdminClient();

    // レシピ画像
    const recipeImagePath = getStoragePath(
      result.recipe_image_url,
      "recipe-images"
    );

    // 手順画像
    const stepImagePaths = (result.step_image_urls ?? [])
      .map((url) => getStoragePath(url, "recipe-images"))
      .filter((path): path is string => path !== null);

    // レビュー画像
    const reviewImagePaths = (result.review_image_urls ?? [])
      .map((url) => getStoragePath(url, "review-images"))
      .filter((path): path is string => path !== null);

    // レシピ画像と手順画像をまとめて削除
    const recipeImagePaths = [
      ...(recipeImagePath ? [recipeImagePath] : []),
      ...stepImagePaths,
    ];

    if (recipeImagePaths.length > 0) {
      const { error } = await adminSupabase.storage
        .from("recipe-images")
        .remove([...new Set(recipeImagePaths)]);

      if (error) {
        console.error("レシピ・手順画像削除エラー:", error);
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
      { error: "削除に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
