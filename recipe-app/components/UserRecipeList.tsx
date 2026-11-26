
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import RecipeCard, { RecipeCardData } from "./RecipeCard";

type UserRecipeListProps = {
  userId: string;
  initialRecipes: RecipeCardData[];
  initialHasMore: boolean;
  manageRecipes?: boolean;
};

type LoadMoreResponse = {
  recipes: RecipeCardData[];
  hasMore: boolean;
};

export default function UserRecipeList({
  userId,
  initialRecipes,
  initialHasMore,
  manageRecipes = false,
}: UserRecipeListProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recipeToDelete, setRecipeToDelete] =
    useState<RecipeCardData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadingRef = useRef(false);
  const nextFromRef = useRef(initialRecipes.length);

  // レシピを追加取得する
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

  // レシピを削除する
  const deleteRecipe = async () => {
    if (!recipeToDelete || deleting) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const deletedRecipeId = recipeToDelete.id;

      const response = await fetch(
        `/api/recipes/${deletedRecipeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("削除に失敗しました。");
      }

      // 削除したレシピを一覧から取り除く
      const remainingRecipes = recipes.filter(
        (recipe) => recipe.id !== deletedRecipeId
      );

      setRecipes(remainingRecipes);

      // 削除した分、次回取得する開始位置を1つ戻す
      nextFromRef.current = Math.max(
        0,
        nextFromRef.current - 1
      );

      setRecipeToDelete(null);

      // 削除によって空いた枠に次のレシピを補充する
      if (hasMore && !loadingRef.current) {
        loadingRef.current = true;

        try {
          const from = nextFromRef.current;

          const refillResponse = await fetch(
            `/api/users/${userId}/recipes?from=${from}`,
            {
              cache: "no-store",
            }
          );

          if (!refillResponse.ok) {
            throw new Error("次のレシピの取得に失敗しました。");
          }

          const data: LoadMoreResponse =
            await refillResponse.json();

          if (
            !Array.isArray(data.recipes) ||
            typeof data.hasMore !== "boolean"
          ) {
            throw new Error("取得したデータの形式が正しくありません。");
          }

          // まだ表示されていないレシピを1件だけ取得する
          const existingIds = new Set(
            remainingRecipes.map((recipe) => recipe.id)
          );

          const nextRecipe = data.recipes.find(
            (recipe) => !existingIds.has(recipe.id)
          );

          if (nextRecipe) {
            setRecipes((current) => {
              // 念のため重複を防止
              if (
                current.some(
                  (recipe) => recipe.id === nextRecipe.id
                )
              ) {
                return current;
              }

              return [...current, nextRecipe];
            });

            // 追加した1件分だけ取得位置を進める
            nextFromRef.current += 1;
          }

          // 取得結果にまだ未表示のレシピがある場合も考慮
          const remainingInResponse = data.recipes.some(
            (recipe) =>
              recipe.id !== nextRecipe?.id &&
              !existingIds.has(recipe.id)
          );

          setHasMore(
            remainingInResponse || data.hasMore
          );
        } catch (refillError) {
          console.error(refillError);

          // 補充に失敗しても削除自体は成功している
          // 「もっと見る」から再取得できるようにする
          setError(
            "次のレシピを自動取得できませんでした。「もっと見る」から再度お試しください。"
          );
        } finally {
          loadingRef.current = false;
        }
      }

      setRecipeToDelete(null);
    } finally {
      setDeleting(false);
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
          <div key={recipe.id}>
            <RecipeCard recipe={recipe} />

            {manageRecipes && (
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/recipe/edit/${recipe.id}`}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  編集
                </Link>

                <button
                  type="button"
                  onClick={() => setRecipeToDelete(recipe)}
                  className="flex-1 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            )}
          </div>
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

      {/* 削除確認モーダル */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-dialog-title"
              className="text-lg font-bold text-gray-800"
            >
              レシピを削除しますか？
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              「{recipeToDelete.title}」を削除します。
              <br />
              この操作は取り消せません。
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                いいえ
              </button>

              <button
                type="button"
                onClick={deleteRecipe}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "削除中..." : "はい"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
