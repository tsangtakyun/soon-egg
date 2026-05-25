"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProductTypeIcon, productTypeBadgeClasses, productTypeLabels, type ProductType } from "@/components/products/ProductTypeIcon";

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

type Order = {
  id: string;
  creator_id: string | null;
  product_id: string | null;
  product_title: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  delivery_name: string | null;
  delivery_address: string | null;
  delivery_district: string | null;
  tracking_number: string | null;
  created_at: string;
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

const productTypes: ProductType[] = ["physical", "digital", "service", "workshop", "other"];

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "待付款", color: "bg-gray-100 text-gray-500" },
  paid: { label: "已付款", color: "bg-yellow-50 text-yellow-700" },
  processing: { label: "處理中", color: "bg-blue-50 text-blue-700" },
  shipped: { label: "已寄出", color: "bg-purple-50 text-purple-700" },
  delivered: { label: "已完成", color: "bg-green-50 text-green-700" },
  cancelled: { label: "已取消", color: "bg-red-50 text-red-500" },
};

export default function ProductsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeComplete, setStripeComplete] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

      const [{ data: productData }, { data: orderData }] = await Promise.all([
        supabase.from("egg_digital_products").select("*").eq("creator_id", profile.id).order("created_at", { ascending: false }),
        supabase.from("egg_product_orders").select("*").eq("creator_id", profile.id).order("created_at", { ascending: false }),
      ]);

      if (!cancelled) {
        setProfileId(profile.id);
        setProducts((productData ?? []) as Product[]);
        setOrders((orderData ?? []) as Order[]);
        setLoading(false);
      }
    }

    async function loadStripeStatus() {
      const res = await fetch("/api/stripe/connect/status");
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setStripeConnected(Boolean(data.connected));
        setStripeComplete(Boolean(data.complete));
      }
    }

    void load();
    void loadStripeStatus();
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

  async function handleStripeOnboard() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        alert(data.error ?? "未能建立 Stripe 連結");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      alert("未能建立 Stripe 連結");
    } catch (error) {
      alert(error instanceof Error ? error.message : "未能建立 Stripe 連結");
    } finally {
      setStripeLoading(false);
    }
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

  async function reloadOrders() {
    if (!profileId) return;
    setOrdersLoading(true);
    const { data } = await supabase.from("egg_product_orders").select("*").eq("creator_id", profileId).order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
    setOrdersLoading(false);
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
        <button onClick={openAddModal} className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          <Plus size={16} />
          新增貨品
        </button>
      </div>

      {!stripeComplete && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div>
            <p className="text-sm font-medium text-orange-800">連結 Stripe 收款帳戶</p>
            <p className="mt-0.5 text-xs text-orange-600">連結後買家可直接喺你的貨品頁付款，款項直接入帳</p>
          </div>
          <button
            onClick={handleStripeOnboard}
            disabled={stripeLoading}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {stripeLoading ? "連結中..." : stripeConnected ? "繼續設定" : "立即連結"}
          </button>
        </div>
      )}

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition ${activeTab === "products" ? "border-black text-black" : "border-transparent text-gray-400"}`}
        >
          我的貨品
        </button>
        <button
          onClick={() => {
            setActiveTab("orders");
            void reloadOrders();
          }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition ${activeTab === "orders" ? "border-black text-black" : "border-transparent text-gray-400"}`}
        >
          訂單管理
        </button>
      </div>

      {activeTab === "products" && (
        <>
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
        </>
      )}

      {activeTab === "orders" && (
        <>
          {ordersLoading ? (
            <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border bg-white py-16 text-center">
              <p className="text-sm text-zinc-400">暫未有訂單</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onUpdated={reloadOrders} />
              ))}
            </div>
          )}
        </>
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
  const kind = product.product_type ?? "other";
  const badgeClass = productTypeBadgeClasses[kind] ?? productTypeBadgeClasses.other;
  const label = productTypeLabels[kind] ?? productTypeLabels.other;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      {product.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.thumbnail_url} className="h-40 w-full object-cover" alt={product.title} />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gray-100">
          <ProductTypeIcon type={kind} size={40} />
        </div>
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
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${badgeClass}`}>{label}</span>
        </div>

        {product.external_url && (
          <a href={product.external_url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-blue-500 hover:underline">
            {product.external_url}
          </a>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => onUpdate(product.id, { is_active: !(product.is_active ?? false) })}
            className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500"
            type="button"
          >
            {product.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
            {product.is_active ? "公開顯示" : "已隱藏"}
          </button>
          <div className="flex gap-1">
            <button onClick={() => onEdit(product)} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-700" type="button">
              <Pencil size={13} />
              編輯
            </button>
            <button onClick={() => onDelete(product.id)} className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-600" type="button">
              <Trash2 size={13} />
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
              {productTypes.map((value) => (
                <button
                  key={value}
                  onClick={() => setField("product_type", value)}
                  className={`flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs ${
                    form.product_type === value ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-600"
                  }`}
                  type="button"
                >
                  <ProductTypeIcon type={value} size={14} />
                  {productTypeLabels[value]}
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

function OrderCard({ order, onUpdated }: { order: Order; onUpdated: () => Promise<void> }) {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [loading, setLoading] = useState(false);
  const badge = statusLabels[order.status ?? "pending"] ?? statusLabels.pending;

  async function updateStatus(status: string, tracking?: string) {
    setLoading(true);
    const res = await fetch("/api/orders/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.id,
        status,
        tracking_number: tracking ?? trackingNumber,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "更新訂單失敗");
      return;
    }
    await onUpdated();
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{order.product_title ?? "未命名貨品"}</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {order.buyer_name ?? "未提供姓名"} · {order.buyer_email ?? "未提供電郵"}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {order.currency ?? "HKD"} {order.amount ?? 0}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${badge.color}`}>{badge.label}</span>
      </div>

      {order.delivery_address && (
        <div className="mb-3 rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-xs text-gray-500">寄送地址</p>
          <p className="text-xs text-gray-700">{order.delivery_name}</p>
          <p className="text-xs text-gray-700">
            {order.delivery_district} {order.delivery_address}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {order.status === "paid" && (
          <button onClick={() => updateStatus("processing")} disabled={loading} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">
            開始處理
          </button>
        )}
        {order.status === "processing" && order.delivery_address && (
          <div className="flex w-full gap-2">
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="填寫運單號碼"
              className="flex-1 rounded-lg border bg-white px-3 py-1.5 text-xs"
            />
            <button
              onClick={() => updateStatus("shipped", trackingNumber)}
              disabled={loading || !trackingNumber}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white disabled:opacity-40"
            >
              標記已寄出
            </button>
          </div>
        )}
        {order.status === "processing" && !order.delivery_address && (
          <button onClick={() => updateStatus("delivered")} disabled={loading} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">
            標記已完成
          </button>
        )}
        {order.status === "shipped" && (
          <button onClick={() => updateStatus("delivered")} disabled={loading} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">
            確認已送達
          </button>
        )}
      </div>

      {order.tracking_number && <p className="mt-2 text-xs text-gray-500">運單號：{order.tracking_number}</p>}
      <p className="mt-2 text-xs text-gray-300">{new Date(order.created_at).toLocaleString("zh-HK")}</p>
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
