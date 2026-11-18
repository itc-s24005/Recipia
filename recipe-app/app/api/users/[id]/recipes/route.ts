
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 6;

type RecipeRow = {
  id: number;
  title: string;
  image_url: string;
};

type RecipeAllergenRow = {
  recipe_id: number;
  allergen_id: number;
};

type AllergenRow = {
  id: number;
  name: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const supabase = await createClient();

    // ログイン状態を確認
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "ログインが必要です。" },
        { status: 401 }
      );
    }

    // 取得開始位置を取得
    const fromValue = Number(
      request.nextUrl.searchParams.get("from") ?? "0"
    );

    if (!Number.isInteger(fromValue) || fromValue < 0) {
      return NextResponse.json(
        { error: "取得位置が正しくありません。" },
        { status: 400 }
      );
    }

    const from = fromValue;

    // レシピを取得（6件 + 続きがあるか確認する1件）
    const { data: recipeData, error: recipeError } = await supabase
      .from("recipes")
      .select("id, title, image_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE);

    if (recipeError) {
      console.error(recipeError);

      return NextResponse.json(
        { error: "レシピの取得に失敗しました。" },
        { status: 500 }
      );
    }

    const rows = (recipeData ?? []) as RecipeRow[];

    const hasMore = rows.length > PAGE_SIZE;
    const recipes = rows.slice(0, PAGE_SIZE);

    if (recipes.length === 0) {
      return NextResponse.json({
        recipes: [],
        hasMore: false,
      });
    }

    // レシピに紐づくアレルギー情報を取得
    const recipeIds = recipes.map((recipe) => recipe.id);

    const { data: recipeAllergenData, error: relationError } =
      await supabase
        .from("recipe_allergens")
        .select("recipe_id, allergen_id")
        .in("recipe_id", recipeIds);

    if (relationError) {
      console.error(relationError);

      return NextResponse.json(
        { error: "アレルギー情報の取得に失敗しました。" },
        { status: 500 }
      );
    }

    const relations = (recipeAllergenData ?? []) as RecipeAllergenRow[];

    const allergenIds = [
      ...new Set(relations.map((item) => item.allergen_id)),
    ];

    let allergenNames = new Map<number, string>();

    if (allergenIds.length > 0) {
      const { data: allergenData, error: allergenError } =
        await supabase
          .from("allergens")
          .select("id, name")
          .in("id", allergenIds);

      if (allergenError) {
        console.error(allergenError);

        return NextResponse.json(
          { error: "アレルギー食品の取得に失敗しました。" },
          { status: 500 }
        );
      }

      const allergenRows = (allergenData ?? []) as AllergenRow[];

      allergenNames = new Map(
        allergenRows.map((item) => [item.id, item.name])
      );
    }

    // レシピごとにアレルギー食品名をまとめる
    const result = recipes.map((recipe) => ({
      ...recipe,
      allergens: relations
        .filter((relation) => relation.recipe_id === recipe.id)
        .map((relation) => allergenNames.get(relation.allergen_id))
        .filter((name): name is string => Boolean(name)),
    }));

    return NextResponse.json(
      {
        recipes: result,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "予期しないエラーが発生しました。" },
      { status: 500 }
    );
  }
}
