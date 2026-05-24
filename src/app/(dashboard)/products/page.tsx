import { PLANS } from "@/lib/plans";

const products = [
  { title: "Creator Media Kit 模板", price: "HK$188", sales: 42 },
  { title: "香港探店合作報價表", price: "HK$88", sales: 86 },
  { title: "30 分鐘創作者諮詢", price: "HK$680", sales: 12 },
];

export default function ProductsPage() {
  return (
    <div className="space-y-6 pt-[20vh]">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">數位產品</h1>
        <p className="mt-2 text-zinc-500">銷售下載、課程、諮詢和會員產品，支援 HKD 收款。</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {products.map((product) => (
          <article key={product.title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-950">{product.title}</h2>
            <div className="mt-4 font-mono text-2xl font-semibold">{product.price}</div>
            <p className="mt-1 text-sm text-zinc-500">{product.sales} sales</p>
          </article>
        ))}
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        {Object.entries(PLANS).map(([key, plan]) => (
          <article key={key} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-950">{plan.name}</h2>
            <div className="mt-3 font-mono text-3xl font-semibold">HK${plan.price_hkd}</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              {plan.features.slice(0, 5).map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
