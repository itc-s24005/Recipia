
import type { Metadata } from "next";
import RecipePostClient from "./RecipePostClient";

export const metadata: Metadata = {
  title: "レシピ投稿 | Recipia",
};

export default function RecipePostPage() {
  return <RecipePostClient />;
}
