"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type ProductType = "physical" | "digital" | "service" | "workshop" | "other";

type Product = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  product_type: ProductType | string | null;
  thumbnail_url: string | null;
  external_url?: string | null;
  stock_quantity?: number | null;
  stock_unlimited?: boolean | null;
  is_active: boolean | null;
};

type ProductForm = {
  product_type: ProductType;
  title: string;
  description: string;
  price: string;
  currency: string;
  external_url: string;
  thumbnail_url: string;
  stock_unlimited: boolean;
  stock_quantity: string;
  is_active: boolean;
};

const emptyForm: ProductForm = {
  product_type: "physical",
  title: "",
  description: "",
  price: "",
  currency: "HKD",
  external_url: "",
  thumbnail_url: "",
  stock_unlimited: true,
  stock_quantity: "",
  is_active: true,
};

const typeMeta: Record<string, { label: string; icon: string; className: string }> = {
  physical: { label: "實體", icon: "📦", className: "bg-orange-50 text-orange-600" },
  digital: { label: "數碼", icon: "💾", className: "bg-blue-50 text-blue-600" },
  service: { label: "服務", icon: "🛎️", className: "bg-green-50 text-green-600" },
  workshop: { label: "工作坊", icon: "🎓", className: "bg-purple-50 text-purple-600" },
  other: { label: "其他", icon: "🛍️", className: "bg-gray-50 text-gray-600" },
};

export default function ProductsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from("egg_creator_profiles").select("id").eq("user_id", user.id).single();
      if (!profile?.id) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("egg_digital_products")
        .select("*")
        .eq("creator_id", profile.id)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        setProfileId(profile.id);
        setProducts((data ?? []) as Product[]);
        setLoading(false);
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function openAddModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase.from("egg_digital_products").update(updates).eq("id", id).select("*").single();
    if (error) {
      alert(error.message);
      return;
    }
    if (data) setProducts((current) => current.map((product) => (product.id === id ? (data as Product) : product)));
  }

  async function deleteProduct(id: string) {
    if (!confirm("確定刪除此貨品？")) return;
    const { error } = await supabase.from("egg_digital_products").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  function handleSaved(product: Product) {
    setProducts((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) return current.map((item) => (item.id === product.id ? product : item));
      return [product, ...current];
    });
    setModalOpen(false);
    setEditingProduct(null);
  }

  return (
    <div className="space-y-6 pt-[10vh]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">我的貨品</h1>
          <p className="mt-2 text-zinc-500">管理你想推介或出售的產品</p>
        </div>
        <button onClick={openAddModal} className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          + 新增貨品
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border bg-white py-16 text-center">
          <p className="text-sm text-zinc-400">暫未有貨品</p>
          <button onClick={openAddModal} className="mt-3 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white">
            新增第一件貨品
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={openEditModal} onUpdate={updateProduct} onDelete={deleteProduct} />
          ))}
        </div>
      )}

      {modalOpen && profileId && (
        <ProductModal
          creatorId={profileId}
          product={editingProduct}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onUpdate,
  onDelete,
  onEdit,
}: {
  product: Product;
  onUpdate: (id: string, updates: Partial<Product>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (product: Product) => void;
}) {
  const meta = typeMeta[product.product_type ?? "other"] ?? typeMeta.other;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      {product.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.thumbnail_url} className="h-40 w-full object-cover" alt={product.title} />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-4xl">{meta.icon}</div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{product.title}</h3>
            {Number(product.price ?? 0) > 0 ? (
              <p className="mt-0.5 text-sm font-semibold text-black">
                {product.currency ?? "HKD"} {product.price}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-400">免費</p>
            )}
          </div>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${meta.className}`}>{meta.label}</span>
        </div>

        {product.external_url && (
          <a href={product.external_url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-blue-500 hover:underline">
            🔗 {product.external_url}
          </a>
        )}

        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={product.is_active ?? false}
              onChange={() => onUpdate(product.id, { is_active: !(product.is_active ?? false) })}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-gray-500">公開顯示</span>
          </label>
          <div className="flex gap-1">
            <button onClick={() => onEdit(product)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700">
              編輯
            </button>
            <button onClick={() => onDelete(product.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-600">
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductModal({
  creatorId,
  product,
  onClose,
  onSaved,
}: {
  creatorId: string;
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          product_type: (product.product_type as ProductType) || "physical",
          title: product.title || "",
          description: product.description || "",
          price: product.price ? String(product.price) : "",
          currency: Number(product.price ?? 0) > 0 ? product.currency || "HKD" : "FREE",
          external_url: product.external_url || "",
          thumbnail_url: product.thumbnail_url || "",
          stock_unlimited: product.stock_unlimited ?? true,
          stock_quantity: product.stock_quantity ? String(product.stock_quantity) : "",
          is_active: product.is_active ?? true,
        }
      : emptyForm
  );

  function setField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProduct() {
    if (!form.title.trim()) {
      alert("請填寫產品名稱");
      return;
    }

    setSaving(true);
    const isFree = form.currency === "FREE";
    const payload = {
      creator_id: creatorId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: isFree ? 0 : Number(form.price || 0),
      currency: isFree ? "HKD" : form.currency,
      product_type: form.product_type,
      external_url: form.external_url.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      stock_unlimited: form.stock_unlimited,
      stock_quantity: form.stock_unlimited ? null : Number(form.stock_quantity || 0),
      is_active: form.is_active,
    };

    const query = product
      ? supabase.from("egg_digital_products").update(payload).eq("id", product.id).select("*").single()
      : supabase.from("egg_digital_products").insert(payload).select("*").single();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }
    if (data) onSaved(data as Product);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold">{product ? "編輯貨品" : "新增貨品"}</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">產品類型</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {Object.entries(typeMeta).map(([value, meta]) => (
                <button
                  key={value}
                  onClick={() => setField("product_type", value as ProductType)}
                  className={`rounded-xl border px-3 py-2 text-xs ${
                    form.product_type === value ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-600"
                  }`}
                  type="button"
                >
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="產品名稱 *">
            <input value={form.title} onChange={(event) => setField("title", event.target.value)} className="field-input" />
          </Field>

          <Field label="產品描述">
            <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} className="field-input resize-none" />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="貨幣">
              <select value={form.currency} onChange={(event) => setField("currency", event.target.value)} className="field-input">
                <option value="HKD">HKD</option>
                <option value="TWD">TWD</option>
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
                <option value="FREE">免費</option>
              </select>
            </Field>
            <Field label="價格">
              <input
                type="number"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
                disabled={form.currency === "FREE"}
                className="field-input disabled:bg-gray-100"
              />
            </Field>
            <Field label="庫存">
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-sm text-gray-500">
                  <input type="checkbox" checked={form.stock_unlimited} onChange={(event) => setField("stock_unlimited", event.target.checked)} />
                  無限
                </label>
                <input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(event) => setField("stock_quantity", event.target.value)}
                  disabled={form.stock_unlimited}
                  className="field-input flex-1 disabled:bg-gray-100"
                />
              </div>
            </Field>
          </div>

          <Field label="外部連結">
            <input
              value={form.external_url}
              onChange={(event) => setField("external_url", event.target.value)}
              placeholder="Shopify、Carousell、個人網站..."
              className="field-input"
            />
          </Field>

          <Field label="縮圖 URL">
            <input value={form.thumbnail_url} onChange={(event) => setField("thumbnail_url", event.target.value)} className="field-input" />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} />
            公開顯示
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={saveProduct} disabled={saving} className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "儲存中..." : "儲存"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-gray-500">
            取消
          </button>
        </div>
      </div>
      <style jsx>{`
        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #111111;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
