
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type UserProfileLinkProps = {
  userId: string;
  children: React.ReactNode;
  className?: string;
};

export default function UserProfileLink({
  userId,
  children,
  className,
}: UserProfileLinkProps) {
  const router = useRouter();

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
