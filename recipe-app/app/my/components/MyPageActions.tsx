
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/logout-button";

type MyPageActionsProps = {
  initialBio: string;
};

export default function MyPageActions({
  initialBio,
}: MyPageActionsProps) {
  const router = useRouter();

  const [showEdit, setShowEdit] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // プロフィール編集モーダルを開く
  const openEdit = () => {
    setBio(initialBio);
    setSaveError("");
    setSaveMessage("");
    setShowEdit(true);
  };

  // プロフィール文を保存
  const saveProfile = async () => {
    if (bio.length > 200) {
      setSaveError("プロフィール文は200文字以内で入力してください。");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/my/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "プロフィールの保存に失敗しました。"
        );
      }

      setSaveMessage("プロフィールを保存しました。");

      // サーバー側のプロフィール表示を更新
      router.refresh();

      setTimeout(() => {
        setShowEdit(false);
      }, 700);
    } catch (error) {
      console.error(error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "プロフィールの保存に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* 操作ボタン */}
      <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
        <button
          type="button"
          onClick={openEdit}
          className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          プロフィール編集
        </button>

        <div className="[&>button]:rounded-full [&>button]:border [&>button]:border-gray-300 [&>button]:px-5 [&>button]:py-2.5 [&>button]:text-sm [&>button]:font-semibold [&>button]:text-gray-700 [&>button]:transition [&>button]:hover:bg-gray-100">
          <LogoutButton />
        </div>
      </div>

      {/* プロフィール編集モーダル */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                プロフィール編集
              </h2>

              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-700"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <label
              htmlFor="profile-bio"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              プロフィール文
            </label>

            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={200}
              rows={5}
              placeholder="自己紹介を入力してください"
              className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm leading-6 text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />

            <div className="mt-2 text-right text-xs text-gray-400">
              {bio.length} / 200文字
            </div>

            {saveError && (
              <p className="mt-3 text-sm text-red-500">
                {saveError}
              </p>
            )}

            {saveMessage && (
              <p className="mt-3 text-sm text-green-600">
                {saveMessage}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                disabled={saving}
                className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
