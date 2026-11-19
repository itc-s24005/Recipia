
"use client";

import { useRef, useState } from "react";
import RecipeCard, { RecipeCardData } from "./RecipeCard";

type UserRecipeListProps = {
  userId: string;
  initialRecipes: RecipeCardData[];
  initialHasMore: boolean;
};

type LoadMoreResponse = {
  recipes: RecipeCardData[];
  hasMore: boolean;
};

export default function UserRecipeList({
  userId,
  initialRecipes,
  initialHasMore,
}: UserRecipeListProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadingRef = useRef(false);
  const nextFromRef = useRef(initialRecipes.length);

  const loadMore = async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const from = nextFromRef.current;

      const response = await fetch(
        `/api/users/${userId}/recipes?from=${from}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("レシピの取得に失敗しました。");
      }

      const data: LoadMoreResponse = await response.json();

      if (
        !Array.isArray(data.recipes) ||
        typeof data.hasMore !== "boolean"
      ) {
        throw new Error("取得したデータの形式が正しくありません。");
      }

      setRecipes((current) => {
        const existingIds = new Set(
          current.map((recipe) => recipe.id)
        );

        const newRecipes = data.recipes.filter(
          (recipe) => !existingIds.has(recipe.id)
        );

        return [...current, ...newRecipes];
      });

      nextFromRef.current += data.recipes.length;
      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);

      setError(
        "レシピを読み込めませんでした。もう一度お試しください。"
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 px-4 py-16 text-center">
        <p className="text-gray-500">
          投稿したレシピはまだありません
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {error && (
        <p className="mt-5 text-center text-sm text-red-500">
          {error}
        </p>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
