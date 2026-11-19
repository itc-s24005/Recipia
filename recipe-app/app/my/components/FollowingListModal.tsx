
"use client";

import { useState } from "react";
import Link from "next/link";

type FollowingUser = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type FollowingListModalProps = {
  followingCount: number;
};

export default function FollowingListModal({
  followingCount,
}: FollowingListModalProps) {
  const [showFollowing, setShowFollowing] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState("");

  // フォロー中のユーザー一覧を取得
  const openFollowing = async () => {
    setShowFollowing(true);
    setFollowingLoading(true);
    setFollowingError("");

    try {
      const response = await fetch("/api/my/following", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("フォロー中のユーザーを取得できませんでした。");
      }

      const data: { users: FollowingUser[] } = await response.json();

      setFollowingUsers(data.users);
    } catch (error) {
      console.error(error);
      setFollowingError(
        "フォロー中のユーザーを読み込めませんでした。"
      );
    } finally {
      setFollowingLoading(false);
    }
  };

  return (
    <>
      {/* フォロー中の人数表示 */}
      <div className="text-center">
        <button
          type="button"
          onClick={openFollowing}
          className="rounded-lg px-3 py-1 transition hover:bg-gray-100"
          aria-label={`フォロー中のユーザー一覧を表示（${followingCount}人）`}
          aria-haspopup="dialog"
          aria-expanded={showFollowing}
        >
          <p className="text-xl font-bold text-gray-800">
            {followingCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            フォロー中
          </p>
        </button>
      </div>

      {/* フォロー中のユーザー一覧モーダル */}
      {showFollowing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setShowFollowing(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="following-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="following-modal-title"
                className="text-lg font-bold text-gray-800"
              >
                フォロー中のユーザー
              </h2>

              <button
                type="button"
                onClick={() => setShowFollowing(false)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-700"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {followingLoading ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  読み込み中...
                </p>
              ) : followingError ? (
                <p className="py-10 text-center text-sm text-red-500">
                  {followingError}
                </p>
              ) : followingUsers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {followingUsers.map((user) => (
                    <Link
                      key={user.id}
                      href={`/user/${user.id}`}
                      onClick={() => setShowFollowing(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-gray-50"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-gray-400">
                            {user.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <p className="font-semibold text-gray-800">
                        {user.name}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-gray-500">
                  フォロー中のユーザーはいません。
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
