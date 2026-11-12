
"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ingredient = {
  name: string;
  amount: string;
};

type Step = {
  instruction: string;
};

type Allergen = {
  id: number;
  name: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function RecipePostPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [servings, setServings] = useState("");

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", amount: "" },
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { instruction: "" },
  ]);

  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [allergenLoading, setAllergenLoading] = useState(true);
  const [error, setError] = useState("");

  // アレルゲン一覧を取得
  useEffect(() => {
    const fetchAllergens = async () => {
      const { data, error } = await supabase
        .from("allergens")
        .select("id, name")
        .order("id", { ascending: true });

      if (error) {
        console.error("アレルゲン取得エラー:", error);
        setError("アレルゲン情報を取得できませんでした。");
      } else {
        setAllergens(data ?? []);
      }

      setAllergenLoading(false);
    };

    fetchAllergens();
  }, []);

  // 画像選択
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > MAX_IMAGE_SIZE
    ) {
      setError("5MB以下のJPEGまたはPNG画像を選んでください");
      event.target.value = "";
      return;
    }

    setError("");
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // 材料の更新
  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string
  ) => {
    setIngredients((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addIngredient = () => {
    if (ingredients.length >= 30) return;

    setIngredients((current) => [
      ...current,
      { name: "", amount: "" },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  // 手順の更新
  const updateStep = (index: number, value: string) => {
    setSteps((current) =>
      current.map((item, i) =>
        i === index ? { instruction: value } : item
      )
    );
  };

  const addStep = () => {
    if (steps.length >= 20) return;

    setSteps((current) => [
      ...current,
      { instruction: "" },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  // アレルゲン選択
  const toggleAllergen = (id: number) => {
    setSelectedAllergenIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  // 入力チェック
  const validate = () => {
    if (!image) {
      return "レシピ画像を選択してください。";
    }

    if (title.trim().length < 1 || title.trim().length > 40) {
      return "タイトルは1〜40文字で入力してください。";
    }

    if (
      description.trim().length < 1 ||
      description.trim().length > 150
    ) {
      return "説明文は1〜150文字で入力してください。";
    }

    const validIngredients = ingredients.filter(
      (item) => item.name.trim() !== "" || item.amount.trim() !== ""
    );

    if (validIngredients.length < 1 || validIngredients.length > 30) {
      return "材料は1〜30行で入力してください。";
    }

    for (const item of validIngredients) {
      if (
        item.name.trim().length < 1 ||
        item.name.trim().length > 25
      ) {
        return "材料名は1〜25文字で入力してください。";
      }

      if (
        item.amount.trim().length < 1 ||
        item.amount.trim().length > 20
      ) {
        return "分量は1〜20文字で入力してください。";
      }
    }

    const validSteps = steps.filter(
      (item) => item.instruction.trim() !== ""
    );

    if (validSteps.length < 1 || validSteps.length > 20) {
      return "作り方は1〜20行で入力してください。";
    }

    for (const step of validSteps) {
      if (
        step.instruction.trim().length < 1 ||
        step.instruction.trim().length > 150
      ) {
        return "作り方は1〜150文字で入力してください。";
      }
    }

    if (
      cookingTime.trim() !== "" &&
      (!Number.isInteger(Number(cookingTime)) || Number(cookingTime) < 1)
    ) {
      return "調理時間は1以上の整数で入力してください。";
    }

    if (
      servings.trim() !== "" &&
      (!Number.isInteger(Number(servings)) || Number(servings) < 1)
    ) {
      return "人数は1以上の整数で入力してください。";
    }

    return "";
  };

  // 投稿処理
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    let uploadedPath = "";

    try {
      // ログインユーザーを取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("ログイン情報を取得できませんでした。");
      }

      if (!image) {
        throw new Error("画像が選択されていません。");
      }

      // 画像をStorageにアップロード
      const extension = image.type === "image/png" ? "png" : "jpg";
      const fileName = `${crypto.randomUUID()}.${extension}`;
      uploadedPath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(uploadedPath, image, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 画像URLを取得
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("recipe-images")
        .getPublicUrl(uploadedPath);

      // 空の材料行・手順行を除外
      const validIngredients = ingredients
        .filter(
          (item) => item.name.trim() !== "" || item.amount.trim() !== ""
        )
        .map((item) => ({
          name: item.name.trim(),
          amount: item.amount.trim(),
        }));

      const validSteps = steps
        .filter((item) => item.instruction.trim() !== "")
        .map((item) => ({
          instruction: item.instruction.trim(),
        }));

      // RPCでレシピ情報を一括登録
      const { data: recipeId, error: insertError } = await supabase.rpc(
        "create_recipe",
        {
          p_title: title.trim(),
          p_description: description.trim(),
          p_image_url: publicUrl,
          p_cooking_time: cookingTime ? Number(cookingTime) : null,
          p_servings: servings ? Number(servings) : null,
          p_ingredients: validIngredients,
          p_steps: validSteps,
          p_allergen_ids: selectedAllergenIds,
        }
      );

      if (insertError) {
        throw insertError;
      }

      // 投稿成功
      router.push(`/recipe/${recipeId}`);
      router.refresh();
    } catch (err) {
      console.error("レシピ投稿エラー:", err);

      // DB登録に失敗した場合、アップロード画像を削除
      if (uploadedPath) {
        const { error: deleteError } = await supabase.storage
          .from("recipe-images")
          .remove([uploadedPath]);

        if (deleteError) {
          console.error("画像削除エラー:", deleteError);
        }
      }

      setError("投稿に失敗しました。もう一度お試しください");
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>レシピ投稿</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 画像 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              レシピ画像 <span style={styles.required}>必須</span>
            </h2>

            <div
              style={styles.imageArea}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="レシピ画像プレビュー"
                  style={styles.preview}
                />
              ) : (
                <div style={styles.imagePlaceholder}>
                  <span style={{ fontSize: 36 }}>＋</span>
                  <span>画像を選択してください</span>
                  <small>JPEG / PNG・5MB以下</small>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </section>

          {/* タイトル */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              レシピ名 <span style={styles.required}>必須</span>
            </h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              placeholder="例：簡単ふわふわオムライス"
              style={styles.input}
            />
            <small style={styles.counter}>{title.length}/40文字</small>
          </section>

          {/* 説明 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              説明文 <span style={styles.required}>必須</span>
            </h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={150}
              rows={4}
              placeholder="レシピの特徴やおすすめポイントを入力してください。"
              style={styles.textarea}
            />
            <small style={styles.counter}>
              {description.length}/150文字
            </small>
          </section>

          {/* 調理時間・人数 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>調理時間・人数</h2>

            <div style={styles.twoColumns}>
              <label style={styles.fieldLabel}>
                調理時間（分）
                <input
                  type="number"
                  min="1"
                  value={cookingTime}
                  onChange={(e) => setCookingTime(e.target.value)}
                  placeholder="例：30"
                  style={styles.input}
                />
              </label>

              <label style={styles.fieldLabel}>
                何人分
                <input
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="例：2"
                  style={styles.input}
                />
              </label>
            </div>
          </section>

          {/* 材料 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              材料 <span style={styles.required}>必須</span>
            </h2>

            <div style={styles.ingredientHeader}>
              <span>材料名</span>
              <span>分量</span>
              <span />
            </div>

            {ingredients.map((item, index) => (
              <div key={index} style={styles.ingredientRow}>
                <input
                  value={item.name}
                  onChange={(e) =>
                    updateIngredient(index, "name", e.target.value)
                  }
                  maxLength={25}
                  placeholder="例：卵"
                  style={styles.input}
                />
                <input
                  value={item.amount}
                  onChange={(e) =>
                    updateIngredient(index, "amount", e.target.value)
                  }
                  maxLength={20}
                  placeholder="例：2個"
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                  style={styles.removeButton}
                  aria-label="材料を削除"
                >
                  削除
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addIngredient}
              disabled={ingredients.length >= 30}
              style={styles.addButton}
            >
              ＋ 材料を追加
            </button>
          </section>

          {/* 作り方 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              作り方 <span style={styles.required}>必須</span>
            </h2>

            {steps.map((step, index) => (
              <div key={index} style={styles.stepItem}>
                <div style={styles.stepHeader}>
                  <strong>STEP {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={steps.length === 1}
                    style={styles.removeButton}
                  >
                    削除
                  </button>
                </div>

                <textarea
                  value={step.instruction}
                  onChange={(e) => updateStep(index, e.target.value)}
                  maxLength={150}
                  rows={3}
                  placeholder="作り方を入力してください。"
                  style={styles.textarea}
                />
                <small style={styles.counter}>
                  {step.instruction.length}/150文字
                </small>
              </div>
            ))}

            <button
              type="button"
              onClick={addStep}
              disabled={steps.length >= 20}
              style={styles.addButton}
            >
              ＋ 手順を追加
            </button>
          </section>

          {/* アレルゲン */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>アレルゲン</h2>
            <p style={styles.descriptionText}>
              このレシピで使用していないアレルゲンを選択してください。
            </p>

            {allergenLoading ? (
              <p>アレルゲンを読み込み中...</p>
            ) : allergens.length === 0 ? (
              <p>アレルゲン情報がありません。</p>
            ) : (
              <div style={styles.allergenGrid}>
                {allergens.map((allergen) => (
                  <label key={allergen.id} style={styles.allergenItem}>
                    <input
                      type="checkbox"
                      checked={selectedAllergenIds.includes(allergen.id)}
                      onChange={() => toggleAllergen(allergen.id)}
                    />
                    {allergen.name}
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* エラー */}
          {error && (
            <div role="alert" style={styles.error}>
              {error}
            </div>
          )}

          {/* 投稿ボタン */}
          <button
            type="submit"
            disabled={loading || allergenLoading}
            style={{
              ...styles.submitButton,
              opacity: loading || allergenLoading ? 0.6 : 1,
            }}
          >
            {loading ? "投稿中..." : "レシピを投稿する"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f7f7",
    padding: "48px 16px",
    color: "#222",
  },
  container: {
    maxWidth: 760,
    margin: "0 auto",
    background: "#fff",
    padding: "36px",
    borderRadius: 14,
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  heading: {
    fontSize: 30,
    fontWeight: 700,
    margin: "0 0 8px",
  },
  subHeading: {
    color: "#777",
    marginBottom: 36,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 30,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 700,
    margin: 0,
  },
  required: {
    color: "#fff",
    background: "#dc5555",
    fontSize: 11,
    padding: "3px 7px",
    borderRadius: 4,
    marginLeft: 8,
    verticalAlign: "middle",
  },
  imageArea: {
    height: 260,
    border: "2px dashed #ccc",
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    background: "#fafafa",
  },
  imagePlaceholder: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "#888",
  },
  preview: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#eee",
  },
  input: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: 7,
    fontSize: 15,
    background: "#fff",
    color: "#222",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: 7,
    fontSize: 15,
    resize: "vertical",
    fontFamily: "inherit",
    background: "#fff",
    color: "#222",
  },
  counter: {
    color: "#999",
    textAlign: "right",
    fontSize: 12,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 14,
  },
  ingredientHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 52px",
    gap: 8,
    fontSize: 13,
    color: "#777",
  },
  ingredientRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 52px",
    gap: 8,
    alignItems: "center",
  },
  removeButton: {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#b44",
    padding: "9px 5px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  addButton: {
    alignSelf: "flex-start",
    border: "1px solid #222",
    background: "#fff",
    color: "#222",
    padding: "10px 16px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 14,
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 14,
    background: "#fafafa",
    borderRadius: 8,
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  descriptionText: {
    color: "#777",
    fontSize: 14,
    margin: 0,
  },
  allergenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
  },
  allergenItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  error: {
    padding: 14,
    background: "#fff0f0",
    border: "1px solid #e7aaaa",
    color: "#b22",
    borderRadius: 7,
    fontSize: 14,
  },
  submitButton: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: 8,
    background: "#222",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
};
