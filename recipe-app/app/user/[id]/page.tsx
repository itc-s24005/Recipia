
import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import UserPageContent from "./UserPageContent";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ visit?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", id)
    .single();

  const userName = profile?.name ?? "ユーザー";

  return {
    title: `${userName}さんのユーザーページ - Recipia`,
  };
}

export default function UserPage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 pt-26 pb-10">
          <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            ユーザー情報を読み込んでいます...
          </div>
        </main>
      }
    >
      <UserPageContentWrapper
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function UserPageContentWrapper({
  params,
  searchParams,
}: Props) {
  await connection();

  const { id } = await params;
  const { visit } = await searchParams;

  return (
    <UserPageContent
      userId={id}
      visitKey={visit ?? "initial"}
    />
  );
}
