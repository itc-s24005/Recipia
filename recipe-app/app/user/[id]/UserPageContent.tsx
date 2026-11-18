
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserRecipeList from "@/components/UserRecipeList";
import type { RecipeCardData } from "@/components/RecipeCard";

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

export default async function UserPageContent({
  userId,
  visitKey,
}: {
  userId: string;
  visitKey: string;
}) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error(profileError);
    throw new Error("プロフィールの取得に失敗しました。");
  }

  if (!profile) {
    notFound();
  }

  const [
    { count: followerCount, error: followerError },
    { count: recipeCount, error: countError },
    { data: recipeData, error: recipeError },
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),

    supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("recipes")
      .select("id, title, image_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, PAGE_SIZE),
  ]);

  if (followerError || countError || recipeError) {
    console.error(followerError, countError, recipeError);
    throw new Error("ユーザー情報の取得に失敗しました。");
  }

  const rows = (recipeData ?? []) as RecipeRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const firstRecipes = rows.slice(0, PAGE_SIZE);

  let initialRecipes: RecipeCardData[] = [];

  if (firstRecipes.length > 0) {
    const recipeIds = firstRecipes.map((recipe) => recipe.id);

    const { data: relationData, error: relationError } = await supabase
      .from("recipe_allergens")
      .select("recipe_id, allergen_id")
      .in("recipe_id", recipeIds);

    if (relationError) {
      console.error(relationError);
      throw new Error("アレルギー情報の取得に失敗しました。");
    }

    const relations = (relationData ?? []) as RecipeAllergenRow[];

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
        throw new Error("アレルギー食品の取得に失敗しました。");
      }

      const allergenRows = (allergenData ?? []) as AllergenRow[];

      allergenNames = new Map(
        allergenRows.map((item) => [item.id, item.name])
      );
    }

    initialRecipes = firstRecipes.map((recipe) => ({
      ...recipe,
      allergens: relations
        .filter((relation) => relation.recipe_id === recipe.id)
        .map((relation) => allergenNames.get(relation.allergen_id))
        .filter((name): name is string => Boolean(name)),
    }));
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.name}のプロフィール画像`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-gray-400">
                  {profile.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="w-full text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-800">
                {profile.name}
              </h1>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                {profile.bio || "プロフィールはまだ登録されていません。"}
              </p>

              <div className="mt-5 flex justify-center gap-8 sm:justify-start">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-800">
                    {followerCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    フォロワー
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xl font-bold text-gray-800">
                    {recipeCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    投稿レシピ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              投稿したレシピ
            </h2>

            <span className="text-sm text-gray-500">
              全 {recipeCount ?? 0} 件
            </span>
          </div>

          <UserRecipeList
            key={`${userId}-${visitKey}`}
            userId={userId}
            initialRecipes={initialRecipes}
            initialHasMore={hasMore}
          />
        </section>
      </div>
    </main>
  );
}
