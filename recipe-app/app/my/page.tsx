
import { Suspense } from "react";
import { connection } from "next/server";
import MyPageContent from "./MyPageContent";

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 py-10">
          <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            マイページを読み込んでいます...
          </div>
        </main>
      }
    >
      <MyPageContentWrapper />
    </Suspense>
  );
}

async function MyPageContentWrapper() {
  await connection();
  return <MyPageContent />;
}
