
import Link from "next/link";

export type RecipeCardData = {
  id: number;
  title: string;
  image_url: string;
  allergens: string[];
};

type RecipeCardProps = {
  recipe: RecipeCardData;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            画像がありません
          </div>
        )}
      </div>

      <div className="p-4">
        <h3
          className="truncate text-base font-bold text-gray-800"
          title={recipe.title}
        >
          {recipe.title}
        </h3>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-gray-500">
            対応アレルギー食品
          </p>

          {recipe.allergens.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {recipe.allergens.map((allergen) => (
                <span
                  key={allergen}
                  className="rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-700"
                >
                  {allergen}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              登録されていません
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
