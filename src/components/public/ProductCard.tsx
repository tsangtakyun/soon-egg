"use client";

export type PublicProduct = {
  id: string;
  title: string;
  title_zh: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  thumbnail_url: string | null;
};

export function ProductCard({
  product,
  btnColor,
  btnRadius,
  onAddToCart,
  currency,
}: {
  product: PublicProduct;
  btnColor: string;
  btnRadius: string;
  onAddToCart: (productId: string) => void;
  currency: string;
}) {
  const symbol = currency === "HKD" ? "HK$" : "$";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "0.5px solid rgba(255,255,255,0.15)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {product.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.thumbnail_url}
          style={{ width: "100%", height: 180, objectFit: "cover" }}
          alt={product.title_zh ?? product.title}
        />
      )}
      <div style={{ padding: 16 }}>
        <h3 style={{ color: "white", fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{product.title_zh ?? product.title}</h3>
        {product.description && (
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            {product.description}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: "white", fontSize: 20, fontWeight: 500 }}>
            {symbol}
            {Number(product.price ?? 0).toLocaleString()}
          </span>
          <button
            onClick={() => onAddToCart(product.id)}
            style={{
              backgroundColor: btnColor,
              color: "white",
              border: "none",
              borderRadius: btnRadius,
              padding: "9px 20px",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
            type="button"
          >
            加入購物車
          </button>
        </div>
      </div>
    </div>
  );
}
