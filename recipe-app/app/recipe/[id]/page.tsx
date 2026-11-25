
import { Suspense } from "react";
import { connection } from "next/server";
import RecipeDetailContent from "./RecipeDetailContent";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("title")
    .eq("id", id)
    .single();

  const Title = recipe?.title ?? "レシピ詳細";

  return {
    title: `${Title} - Recipia`,
  };
}

export default function RecipeDetailPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 pt-26 pb-10">
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            レシピを読み込んでいます...
          </div>
        </main>
      }
    >
      <RecipeDetailPageContent params={params} />
    </Suspense>
  );
}

async function RecipeDetailPageContent({ params }: Props) {
  // リクエスト時に実行することをNext.jsに伝える
  await connection();

  const { id } = await params;

  return <RecipeDetailContent id={id} />;
}
