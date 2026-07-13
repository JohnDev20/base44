const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, ShoppingCart, Tag, Calendar, ArrowRight, Download, Share2, Eye, Archive,
} from "lucide-react";
import {
  formatCurrency, CATEGORY_META, LIST_COLORS, generateListSummary, downloadTextFile, shareContent,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function getMonthKey(dateStr) {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key) {
  if (key === "unknown") return "Sem data";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function History() {
  const navigate = useNavigate();
  const [priceHistory, setPriceHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [completedLists, setCompletedLists] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("prices");

  useEffect(() => {
    Promise.all([
      db.entities.PriceHistory.list("-created_date", 200),
      db.entities.Product.filter({ is_purchased: true }, "-purchased_date", 200),
      db.entities.ShoppingList.filter({ status: "completed" }, "-completed_date"),
      db.entities.Product.list("-created_date", 500),
    ])
      .then(([ph, p, cl, ap]) => {
        setPriceHistory(ph);
        setProducts(p);
        setCompletedLists(cl);
        setAllProducts(ap);
      })
      .finally(() => setLoading(false));
  }, []);

  const groupedPrices = useMemo(() => {
    const groups = {};
    priceHistory.forEach((h) => {
      if (!groups[h.product_name]) groups[h.product_name] = [];
      groups[h.product_name].push(h);
    });
    return Object.entries(groups).sort((a, b) => {
      const aDate = a[1][0]?.created_date || "";
      const bDate = b[1][0]?.created_date || "";
      return bDate.localeCompare(aDate);
    });
  }, [priceHistory]);

  const monthlyGroups = useMemo(() => {
    const groups = {};
    completedLists.forEach((l) => {
      const key = getMonthKey(l.completed_date || l.updated_date || l.created_date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [completedLists]);

  const getListStats = (listId) => {
    const items = allProducts.filter((p) => p.shopping_list_id === listId);
    const spent = items.filter((p) => p.is_purchased).reduce((s, p) => s + (p.actual_price || p.estimated_price || 0) * (p.quantity || 1), 0);
    const estimated = items.reduce((s, p) => s + (p.estimated_price || 0) * (p.quantity || 1), 0);
    return { total: items.length, spent, estimated };
  };

  const totalSpent = products.reduce(
    (s, p) => s + (p.actual_price || p.estimated_price || 0) * (p.quantity || 1),
    0
  );

  const handleDownloadList = (list) => {
    downloadTextFile(
      `lista-${list.name.toLowerCase().replace(/\s+/g, "-")}.txt`,
      generateListSummary(list, allProducts)
    );
  };

  const handleShareList = async (list) => {
    await shareContent(`Lista: ${list.name}`, generateListSummary(list, allProducts));
  };

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe preços, compras e gastos mensais</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-[18px] h-[18px] text-violet-500" />
          </div>
          <p className="text-xl font-bold text-foreground">{priceHistory.length}</p>
          <p className="text-xs text-muted-foreground">Registros de preço</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <ShoppingCart className="w-[18px] h-[18px] text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
          <p className="text-xs text-muted-foreground">Total em compras</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <Archive className="w-[18px] h-[18px] text-amber-500" />
          </div>
          <p className="text-xl font-bold text-foreground">{completedLists.length}</p>
          <p className="text-xs text-muted-foreground">Listas encerradas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted mb-5 w-full sm:w-auto sm:inline-flex">
        <button
          onClick={() => setTab("prices")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "prices" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <TrendingUp className="w-4 h-4" /> Preços
        </button>
        <button
          onClick={() => setTab("purchases")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "purchases" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <ShoppingCart className="w-4 h-4" /> Compras
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "expenses" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Archive className="w-4 h-4" /> Gastos
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : tab === "prices" ? (
        groupedPrices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum histórico de preço ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Os preços aparecem aqui ao criar e editar produtos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedPrices.map(([name, entries]) => {
              const sorted = [...entries].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
              const latest = sorted[0];
              const first = sorted[sorted.length - 1];
              const trend = latest.price - first.price;
              return (
                <div key={name} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground">{name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatCurrency(latest.price)}</p>
                      {entries.length > 1 && (
                        <p className={cn("text-xs", trend > 0 ? "text-rose-500" : trend < 0 ? "text-emerald-500" : "text-muted-foreground")}>
                          {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {formatCurrency(Math.abs(trend))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {sorted.map((h, idx) => {
                      const prev = sorted[idx + 1];
                      const hEst = h.establishment || h.shopping_list_id;
                      const prevEst = prev && (prev.establishment || prev.shopping_list_id);
                      const sameEst = prev && hEst === prevEst;
                      const diff = sameEst ? h.price - prev.price : 0;
                      const hasTag = sameEst && diff !== 0;
                      return (
                        <div key={h.id} className="flex items-center gap-2 text-sm flex-wrap">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", h.change_type === "created" ? "bg-emerald-500" : "bg-amber-500")} />
                          <span className="text-muted-foreground text-xs flex items-center gap-1 w-20">
                            <Calendar className="w-3 h-3" />
                            {formatDate(h.created_date)}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", h.change_type === "created" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                            {h.change_type === "created" ? "Criado" : "Editado"}
                          </span>
                          {h.establishment && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">📍 {h.establishment}</span>
                          )}
                          {hasTag && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", diff > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600")}>
                              {diff > 0 ? "▲ Subiu" : "▼ Desceu"}
                            </span>
                          )}
                          <span className="font-medium text-foreground ml-auto">{formatCurrency(h.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : tab === "purchases" ? (
        products.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma compra registrada ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Marque produtos como comprados nas suas listas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => p.shopping_list_id && navigate(`/list/${p.shopping_list_id}`)}
                className="group flex items-center gap-3 rounded-xl bg-card border border-border p-3 cursor-pointer hover:border-primary/40 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-base">
                  {CATEGORY_META[p.category]?.icon || "🛒"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.quantity} {p.unit} · {formatDate(p.purchased_date)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency((p.actual_price || p.estimated_price || 0) * (p.quantity || 1))}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        )
      ) : completedLists.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Archive className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma lista encerrada ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Conclua uma compra para arquivá-la no histórico mensal.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {monthlyGroups.map(([monthKey, monthLists]) => {
            const monthTotal = monthLists.reduce((s, l) => s + getListStats(l.id).spent, 0);
            return (
              <div key={monthKey}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground capitalize">{formatMonth(monthKey)}</h3>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(monthTotal)}</span>
                </div>
                <div className="space-y-2">
                  {monthLists.map((list) => {
                    const stats = getListStats(list.id);
                    return (
                      <div key={list.id} className="rounded-2xl bg-card border border-border p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", LIST_COLORS[list.color] || LIST_COLORS.emerald)}>
                              <Archive className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-foreground leading-tight truncate">{list.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDate(list.completed_date || list.updated_date)} · {stats.total} itens
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-foreground shrink-0">{formatCurrency(stats.spent)}</span>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-border">
                          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => navigate(`/list/${list.id}`)}>
                            <Eye className="w-3.5 h-3.5" /> Consultar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => handleDownloadList(list)}>
                            <Download className="w-3.5 h-3.5" /> Baixar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => handleShareList(list)}>
                            <Share2 className="w-3.5 h-3.5" /> Compartilhar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}