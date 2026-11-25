
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type UserProfileLinkProps = {
  userId: string;
  children: React.ReactNode;
  className?: string;
  isCurrentUser?: boolean;
};

export default function UserProfileLink({
  userId,
  children,
  className,
  isCurrentUser = false,
}: UserProfileLinkProps) {
  const router = useRouter();

  // 自分の場合はマイページへ移動
  if (isCurrentUser) {
    return (
      <a href="/my" className={className}>
        {children}
      </a>
    );
  }

  // 他のユーザーの場合は従来どおりユーザーページへ移動
  const href = `/user/${userId}`;

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();

        const visitId = Date.now();

        router.push(`${href}?visit=${visitId}`);
      }}
    >
      {children}
    </Link>
  );
}

