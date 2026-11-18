
import { Suspense } from "react";
import { connection } from "next/server";
import UserPageContent from "./UserPageContent";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ visit?: string }>;
};

export default function UserPage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 py-10">
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
