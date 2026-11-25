
import { notFound } from "next/navigation";
import UserProfileLink from "@/components/UserProfileLink";
import { createClient } from "@/lib/supabase/server";
import LikeButton from '@/components/LikeButton'
import FollowButton from '@/components/FollowButton'
import FavoriteButton from '@/components/FavoriteButton'
import ReviewButton from '@/components/ReviewButton'


type RecipeRow = {
  id: number;
  user_id: string;
  title: string;
  description: string;
  image_url: string;
  cooking_time: number | null;
  servings: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type IngredientRow = {
  id: number;
  name: string;
  amount: string;
  sort_order: number;
};

type StepRow = {
  id: number;
  step_number: number;
  instruction: string;
};

type RecipeAllergenRow = {
  allergen_id: number;
};

type AllergenRow = {
  id: number;
  name: string;
};

type ReviewRow = {
  user_id: string
  comment: string
  image_url: string | null
  created_at: string
}

type ReviewProfileRow = {
  id: string
  name: string
  avatar_url: string | null
}


export default async function RecipeDetailContent({
  id,
}: {
  id: string;
}) {
  const recipeId = Number(id);

  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    notFound();
  }

  const supabase = await createClient();
  // ログインユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipeData, error: recipeError } = await supabase
    .from("recipes")
    .select(
      "id, user_id, title, description, image_url, cooking_time, servings, created_at"
    )
    .eq("id", recipeId)
    .maybeSingle();

  if (recipeError) {
    console.error(recipeError);
    throw new Error("レシピの取得に失敗しました。");
  }

  if (!recipeData) {
    notFound();
  }

  const recipe = recipeData as RecipeRow;

  const [
    { data: profileData, error: profileError },
    { data: ingredientData, error: ingredientError },
    { data: stepData, error: stepError },
    { data: relationData, error: relationError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", recipe.user_id)
      .maybeSingle(),

    supabase
      .from("recipe_ingredients")
      .select("id, name, amount, sort_order")
      .eq("recipe_id", recipeId)
      .order("sort_order", { ascending: true }),

    supabase
      .from("recipe_steps")
      .select("id, step_number, instruction")
      .eq("recipe_id", recipeId)
      .order("step_number", { ascending: true }),

    supabase
      .from("recipe_allergens")
      .select("allergen_id")
      .eq("recipe_id", recipeId),
  ]);

  if (profileError || ingredientError || stepError || relationError) {
    console.error(
      profileError,
      ingredientError,
      stepError,
      relationError
    );
    throw new Error("レシピ詳細情報の取得に失敗しました。");
  }

  const profile = profileData as ProfileRow | null;
  const ingredients = (ingredientData ?? []) as IngredientRow[];
  const steps = (stepData ?? []) as StepRow[];
  const relations = (relationData ?? []) as RecipeAllergenRow[];

  const allergenIds = relations.map((item) => item.allergen_id);
  let allergens: string[] = [];

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

    allergens = ((allergenData ?? []) as AllergenRow[]).map(
      (item) => item.name
    );
  }
  // レビュー一覧を取得（新しい順）
const { data: reviewData, error: reviewError } = await supabase
  .from('reviews')
  .select('user_id, comment, image_url, created_at')
  .eq('recipe_id', recipeId)
  .order('created_at', { ascending: false })

if (reviewError) {
  console.error(reviewError)
  throw new Error('レビューの取得に失敗しました。')
}

const reviews = (reviewData ?? []) as ReviewRow[]

// レビュー投稿者のIDを取得
const reviewerIds = [
  ...new Set(reviews.map((review) => review.user_id)),
]

// 投稿者のプロフィールを取得
let reviewProfiles: ReviewProfileRow[] = []

if (reviewerIds.length > 0) {
  const { data: reviewProfileData, error: reviewProfileError } =
    await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', reviewerIds)

  if (reviewProfileError) {
    console.error(reviewProfileError)
    throw new Error('レビュー投稿者の取得に失敗しました。')
  }

  reviewProfiles = (reviewProfileData ?? []) as ReviewProfileRow[]
}

// ユーザーIDからプロフィールを探せるようにする
const reviewProfileMap = new Map(
  reviewProfiles.map((profile) => [profile.id, profile])
)

  return (
    <main className="min-h-screen bg-gray-50 px-4 pt-26 pb-10">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="aspect-[16/9] bg-gray-100">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              画像がありません
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
            {/* タイトルといいね・お気に入り */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold leading-relaxed text-gray-800 sm:text-3xl">
                {recipe.title}
              </h1>

          {/* いいね・お気に入り */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <LikeButton
                recipeId={recipe.id}
                recipeUserId={recipe.user_id}
              />
              <FavoriteButton
                recipeId={recipe.id}
                recipeUserId={recipe.user_id}
              />
            </div>

          </div>

          <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-gray-600">
            {recipe.description}
          </p>

          {profile && (
            <div>
              <UserProfileLink
                userId={profile.id}
                isCurrentUser={user?.id === profile.id}
                className="mt-6 flex items-center gap-3 border-y border-gray-100 py-10"
              >
                <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-100">
                  {profile.avatar_url ? (
                    <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                    />
                  ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-gray-400">
                    {profile.name.charAt(0)}
                    </div>
                  )}
                  </div>
                  <p className="font-semibold text-gray-800">
                    {profile.name}
                  </p>
              </UserProfileLink>
              {/* フォローボタン */}
              <FollowButton targetUserId={profile.id} />
              </div>
            )}

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600">
            {recipe.cooking_time !== null && (
              <p>
                <span className="font-semibold">調理時間：</span>
                約 {recipe.cooking_time} 分
              </p>
            )}

            {recipe.servings !== null && (
              <p>
                <span className="font-semibold">分量：</span>
                {recipe.servings} 人分
              </p>
            )}
          </div>

          <section className="mt-10">
            <h2 className="border-b-2 border-green-500 pb-3 text-xl font-bold text-gray-800">
              対応アレルギー食品
            </h2>

            {allergens.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="rounded-full bg-green-50 px-3 py-1.5 text-sm text-green-700"
                  >
                    {allergen}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-400">
                対応アレルギー食品は登録されていません。
              </p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="border-b-2 border-green-500 pb-3 text-xl font-bold text-gray-800">
              材料
            </h2>

            {ingredients.length > 0 ? (
              <ul className="mt-4 divide-y divide-gray-100">
                {ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <span className="font-medium text-gray-700">
                      {ingredient.name}
                    </span>
                    <span className="text-gray-500">
                      {ingredient.amount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-400">
                材料が登録されていません。
              </p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="border-b-2 border-green-500 pb-3 text-xl font-bold text-gray-800">
              作り方
            </h2>

            {steps.length > 0 ? (
              <ol className="mt-5 space-y-5">
                {steps.map((step) => (
                  <li key={step.id} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                      {step.step_number}
                    </span>

                    <p className="flex-1 whitespace-pre-wrap break-words pt-1 leading-7 text-gray-700">
                      {step.instruction}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-gray-400">
                作り方が登録されていません。
              </p>
            )}
          </section>

        </div>
      </article>

    {/* レビューを書くボタン */}
    {user && user.id !== recipe.user_id && (
      <div className="mx-auto mt-6 max-w-3xl text-center">
        <ReviewButton
        recipeId={recipe.id}
        recipeUserId={recipe.user_id}
        />
      </div>
    )}

    {/* レビュー一覧 */}
    <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="border-b-2 border-green-500 pb-3 text-xl font-bold text-gray-800">
        レビュー（{reviews.length}件）
      </h2>

      {reviews.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {reviews.map((review) => {
            const reviewer = reviewProfileMap.get(review.user_id)

            return (
              <div
                key={`${review.user_id}-${review.created_at}`}
                className="py-6"
              >
                {/* 投稿者情報 */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {reviewer?.avatar_url ? (
                      <img
                        src={reviewer.avatar_url}
                        alt={reviewer.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-gray-400">
                        {reviewer?.name?.charAt(0) ?? '?'}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-800">
                      {reviewer?.name ?? 'ユーザー'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>

                {/* レビュー本文 */}
                <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-gray-700">
                  {review.comment}
                </p>

                {/* レビュー写真 */}
                {review.image_url && (
                  <div className="mt-4">
                    <img
                      src={review.image_url}
                      alt="レビュー投稿写真"
                      className="max-h-80 w-auto max-w-full rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-gray-400">
          まだレビューはありません。最初のレビューを書いてみましょう
        </p>
      )}
    </section>
  </main>
  );
}
