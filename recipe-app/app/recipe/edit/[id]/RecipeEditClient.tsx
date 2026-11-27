
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ingredient = {
  name: string;
  amount: string;
};

type Step = {
  instruction: string;
  originalImageUrl: string | null;
  image: File | null;
  previewUrl: string;
};

type Allergen = {
  id: number;
  name: string;
};

type RecipeData = {
  id: number;
  user_id: string;
  title: string;
  description: string;
  image_url: string;
  cooking_time: number | null;
  servings: number | null;
};

type StepData = {
  instruction: string;
  step_number: number;
  image_url: string | null;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type RecipeEditClientProps = {
  recipeId: string;
};

export default function RecipeEditClient({
  recipeId,
}: RecipeEditClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // 編集開始時点で登録されていた手順画像URLを保持
  const initialStepImageUrlsRef = useRef<string[]>([]);

  const [originalImageUrl, setOriginalImageUrl] = useState("");
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
    {
      instruction: "",
      originalImageUrl: null,
      image: null,
      previewUrl: "",
    },
  ]);

  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 既存レシピと関連データを取得
  useEffect(() => {
    let cancelled = false;

    const fetchRecipe = async () => {
      try {
        if (!/^\d+$/.test(recipeId)) {
          throw new Error("不正なレシピIDです。");
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        if (cancelled) return;

        // 自分が投稿したレシピか確認
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select(
            "id, user_id, title, description, image_url, cooking_time, servings"
          )
          .eq("id", Number(recipeId))
          .eq("user_id", user.id)
          .maybeSingle();

        if (recipeError) throw recipeError;

        if (!recipeData) {
          router.replace("/my");
          return;
        }

        const recipe = recipeData as RecipeData;

        const [
          { data: ingredientData, error: ingredientError },
          { data: stepData, error: stepError },
          { data: relationData, error: relationError },
          { data: allergenData, error: allergenError },
        ] = await Promise.all([
          supabase
            .from("recipe_ingredients")
            .select("name, amount, sort_order")
            .eq("recipe_id", Number(recipeId))
            .order("sort_order", { ascending: true }),

          // image_urlも取得する
          supabase
            .from("recipe_steps")
            .select("instruction, step_number, image_url")
            .eq("recipe_id", Number(recipeId))
            .order("step_number", { ascending: true }),

          supabase
            .from("recipe_allergens")
            .select("allergen_id")
            .eq("recipe_id", Number(recipeId)),

          supabase
            .from("allergens")
            .select("id, name")
            .order("id", { ascending: true }),
        ]);

        if (
          ingredientError ||
          stepError ||
          relationError ||
          allergenError
        ) {
          console.error(
            ingredientError,
            stepError,
            relationError,
            allergenError
          );

          throw new Error("レシピ情報の取得に失敗しました。");
        }

        if (cancelled) return;

        setTitle(recipe.title);
        setDescription(recipe.description);

        setCookingTime(
          recipe.cooking_time === null
            ? ""
            : String(recipe.cooking_time)
        );

        setServings(
          recipe.servings === null
            ? ""
            : String(recipe.servings)
        );

        setOriginalImageUrl(recipe.image_url);
        setPreviewUrl(recipe.image_url);

        setIngredients(
          ingredientData && ingredientData.length > 0
            ? ingredientData.map((item) => ({
                name: item.name,
                amount: item.amount,
              }))
            : [{ name: "", amount: "" }]
        );
        initialStepImageUrlsRef.current = (stepData ?? [])
          .map((item) => (item as StepData).image_url)
          .filter((url): url is string => typeof url === "string");

        setSteps(
          stepData && stepData.length > 0
            ? (stepData as StepData[]).map((item) => ({
                instruction: item.instruction,
                originalImageUrl: item.image_url,
                image: null,
                previewUrl: item.image_url ?? "",
              }))
            : [
                {
                  instruction: "",
                  originalImageUrl: null,
                  image: null,
                  previewUrl: "",
                },
              ]
        );

        setAllergens(allergenData ?? []);

        setSelectedAllergenIds(
          (relationData ?? []).map((item) => item.allergen_id)
        );
      } catch (err) {
        console.error("レシピ取得エラー:", err);

        if (!cancelled) {
          setError("レシピ情報を取得できませんでした。");
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    fetchRecipe();

    return () => {
      cancelled = true;
    };
  }, [recipeId, router, supabase]);

  // コンポーネント終了時にプレビューURLを解放
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // レシピ画像選択
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > MAX_IMAGE_SIZE
    ) {
      setError("5MB以下のJPEGまたはPNG画像を選んでください。");
      event.target.value = "";
      return;
    }

    setError("");

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = "";
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

  // 手順の説明文を更新
  const updateStep = (index: number, value: string) => {
    setSteps((current) =>
      current.map((item, i) =>
        i === index ? { ...item, instruction: value } : item
      )
    );
  };

  // 手順画像を選択
  const handleStepImageChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > MAX_IMAGE_SIZE
    ) {
      setError("手順画像は5MB以下のJPEGまたはPNG画像を選んでください。");
      event.target.value = "";
      return;
    }

    setError("");

    const newPreviewUrl = URL.createObjectURL(file);

    setSteps((current) =>
      current.map((step, i) => {
        if (i !== index) return step;

        if (
          step.previewUrl.startsWith("blob:") &&
          step.previewUrl !== newPreviewUrl
        ) {
          URL.revokeObjectURL(step.previewUrl);
        }

        return {
          ...step,
          image: file,
          previewUrl: newPreviewUrl,
        };
      })
    );

    event.target.value = "";
  };

  // 手順画像を削除
  const removeStepImage = (index: number) => {
    setSteps((current) =>
      current.map((step, i) => {
        if (i !== index) return step;

        if (step.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(step.previewUrl);
        }

        return {
          ...step,
          image: null,
          originalImageUrl: null,
          previewUrl: "",
        };
      })
    );
  };

  const addStep = () => {
    if (steps.length >= 20) return;

    setSteps((current) => [
      ...current,
      {
        instruction: "",
        originalImageUrl: null,
        image: null,
        previewUrl: "",
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((current) => {
      const target = current[index];

      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((_, i) => i !== index);
    });
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
      (item) =>
        item.name.trim() !== "" || item.amount.trim() !== ""
    );

    if (
      validIngredients.length < 1 ||
      validIngredients.length > 30
    ) {
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
      (!Number.isInteger(Number(cookingTime)) ||
        Number(cookingTime) < 1)
    ) {
      return "調理時間は1以上の整数で入力してください。";
    }

    if (
      servings.trim() !== "" &&
      (!Number.isInteger(Number(servings)) ||
        Number(servings) < 1)
    ) {
      return "人数は1以上の整数で入力してください。";
    }

    return "";
  };

  // Storageの公開URLからファイルパスを取得
  const getStoragePath = (imageUrl: string | null) => {
    if (!imageUrl) return null;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return null;

      const url = new URL(imageUrl);
      const baseUrl = new URL(supabaseUrl);

      if (url.origin !== baseUrl.origin) return null;

      const prefix = "/storage/v1/object/public/recipe-images/";

      if (!url.pathname.startsWith(prefix)) return null;

      const encodedPath = url.pathname.slice(prefix.length);

      return encodedPath ? decodeURIComponent(encodedPath) : null;
    } catch {
      return null;
    }
  };

  // Storageに画像をアップロード
  const uploadImage = async (file: File, userId: string) => {
    const extension = file.type === "image/png" ? "png" : "jpg";
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const path = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(path);

    return {
      path,
      url: publicUrl,
    };
  };

  // 編集処理
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

    // 今回新しくアップロードした画像のパス
    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("ログイン情報を取得できませんでした。");
      }

      // レシピ画像
      let newImageUrl = originalImageUrl;

      if (image) {
        const uploaded = await uploadImage(image, user.id);

        uploadedPaths.push(uploaded.path);
        newImageUrl = uploaded.url;
      }

      // 材料
      const validIngredients = ingredients
        .filter(
          (item) =>
            item.name.trim() !== "" || item.amount.trim() !== ""
        )
        .map((item) => ({
          name: item.name.trim(),
          amount: item.amount.trim(),
        }));

      // 手順画像をアップロードし、RPCに渡すデータを作成
      const validSteps = [];

      for (const step of steps) {
        if (step.instruction.trim() === "") continue;

        let stepImageUrl = step.originalImageUrl;

        if (step.image) {
          const uploaded = await uploadImage(step.image, user.id);

          uploadedPaths.push(uploaded.path);
          stepImageUrl = uploaded.url;
        }

        validSteps.push({
          instruction: step.instruction.trim(),
          image_url: stepImageUrl,
        });
      }

      // RPCでレシピと関連データを一括更新
      const { error: updateError } = await supabase.rpc(
        "update_recipe",
        {
          p_recipe_id: Number(recipeId),
          p_title: title.trim(),
          p_description: description.trim(),
          p_image_url: newImageUrl,
          p_cooking_time: cookingTime
            ? Number(cookingTime)
            : null,
          p_servings: servings ? Number(servings) : null,
          p_ingredients: validIngredients,
          p_steps: validSteps,
          p_allergen_ids: selectedAllergenIds,
        }
      );

      if (updateError) throw updateError;

      // DB更新成功後、不要になった古い画像を削除
      const retainedStepImageUrls = new Set(
        validSteps
          .map((step) => step.image_url)
          .filter((url): url is string => typeof url === "string")
      );

      // 編集開始時点で存在していた画像と、更新後に残っている画像を比較
      const oldStepImageUrls = initialStepImageUrlsRef.current.filter(
        (url) => !retainedStepImageUrls.has(url)
      );

      // 削除対象の画像パスを作成
      const oldImagePaths = [
        ...(image && originalImageUrl
          ? [getStoragePath(originalImageUrl)]
          : []),
        ...oldStepImageUrls.map((url) => getStoragePath(url)),
      ].filter((path): path is string => path !== null);

      // サーバー側APIを通して画像を削除
      const uniqueOldImagePaths = [...new Set(oldImagePaths)];

      if (uniqueOldImagePaths.length > 0) {
        const response = await fetch(`/api/recipes/${recipeId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths: uniqueOldImagePaths,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);

          console.error(
            "古い画像の削除に失敗しました:",
            result?.error ?? response.statusText
          );

          alert(
            "レシピは更新されましたが、一部の古い画像をStorageから削除できませんでした。"
          );
        }
      }

      router.push(`/recipe/${recipeId}`);
    } catch (err) {
      console.error("レシピ更新エラー:", err);

      // 更新失敗時は今回アップロードした画像だけ削除する
      if (uploadedPaths.length > 0) {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: uploadedPaths,
        }),
      });

      if (!response.ok) {
        console.error("新しくアップロードした画像の削除に失敗しました。");
      }
    }

      setError("更新に失敗しました。もう一度お試しください。");
      alert("更新に失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <p>レシピ情報を読み込み中...</p>
        </div>
      </main>
    );
  }

  if (error && !title) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <p style={styles.error}>{error}</p>
          <button
            type="button"
            onClick={() => router.push("/my")}
            style={styles.addButton}
          >
            マイページへ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>レシピ編集</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* レシピ画像 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              レシピ画像
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

            <small style={styles.counter}>
              画像を変更しない場合は、そのまま保存できます。
            </small>
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

            <small style={styles.counter}>
              {title.length}/40文字
            </small>
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
                  disabled={ingredients.length === 1 || loading}
                  style={styles.removeButton}
                >
                  削除
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addIngredient}
              disabled={ingredients.length >= 30 || loading}
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
                    disabled={steps.length === 1 || loading}
                    style={styles.removeButton}
                  >
                    削除
                  </button>
                </div>

                {/* 手順の説明 */}
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

                {/* 手順画像 */}
                <div style={styles.stepImageSection}>
                  <span style={styles.stepImageLabel}>
                    手順画像（任意）
                  </span>

                  {step.previewUrl ? (
                    <div style={styles.stepImagePreviewArea}>
                      <img
                        src={step.previewUrl}
                        alt={`STEP ${index + 1} の画像プレビュー`}
                        style={styles.stepImagePreview}
                      />

                      <div style={styles.stepImageActions}>
                        <label style={styles.imageSelectButton}>
                          画像を変更
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(e) =>
                              handleStepImageChange(index, e)
                            }
                            disabled={loading}
                            style={{ display: "none" }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => removeStepImage(index)}
                          disabled={loading}
                          style={styles.removeImageButton}
                        >
                          画像を削除
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={styles.imageSelectButton}>
                      ＋ 手順画像を選択
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) =>
                          handleStepImageChange(index, e)
                        }
                        disabled={loading}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}

                  <small style={styles.imageHelp}>
                    JPEG / PNG・5MB以下。画像を設定しなくても保存できます。
                  </small>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addStep}
              disabled={steps.length >= 20 || loading}
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

            {allergens.length === 0 ? (
              <p>アレルゲン情報がありません。</p>
            ) : (
              <div style={styles.allergenGrid}>
                {allergens.map((allergen) => (
                  <label
                    key={allergen.id}
                    style={styles.allergenItem}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAllergenIds.includes(allergen.id)}
                      onChange={() => toggleAllergen(allergen.id)}
                      disabled={loading}
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

          {/* 更新ボタン */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "更新中..." : "編集を完了する"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => router.push(`/recipe/${recipeId}`)}
            style={styles.cancelButton}
          >
            キャンセル
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
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
    margin: "0 0 28px",
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
  stepImageSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
  },
  stepImageLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#555",
  },
  stepImagePreviewArea: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
  },
  stepImagePreview: {
    maxWidth: "100%",
    maxHeight: 220,
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
  },
  stepImageActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  imageSelectButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    padding: "9px 14px",
    border: "1px solid #ccc",
    borderRadius: 7,
    background: "#fff",
    color: "#333",
    cursor: "pointer",
    fontSize: 13,
  },
  removeImageButton: {
    padding: "9px 14px",
    border: "1px solid #e0baba",
    borderRadius: 7,
    background: "#fff",
    color: "#b44",
    cursor: "pointer",
    fontSize: 13,
  },
  imageHelp: {
    color: "#999",
    fontSize: 12,
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
    padding: 16,
    border: "none",
    borderRadius: 8,
    background: "#222",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelButton: {
    width: "100%",
    padding: 14,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    color: "#555",
    fontSize: 15,
    cursor: "pointer",
  },
};
