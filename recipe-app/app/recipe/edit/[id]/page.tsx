
import { Suspense } from "react";
import type { Metadata } from "next";
import RecipeEditClient from "./RecipeEditClient";

export const metadata: Metadata = {
  title: "レシピ編集 | Recipia",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function RecipeEditPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 pt-26 pb-10">
          <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            レシピ情報を読み込んでいます...
          </div>
        </main>
      }
    >
      <RecipeEditPageContent params={params} />
    </Suspense>
  );
}

async function RecipeEditPageContent({ params }: Props) {
  const { id } = await params;

  return <RecipeEditClient recipeId={id} />;
}
