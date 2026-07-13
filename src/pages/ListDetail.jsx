const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Plus, Search, Trash2, Pencil, CheckCircle2, ShoppingCart,
  Wallet, TrendingDown, MoreVertical, Package, Download, Share2, Archive,
} from "lucide-react";
import ProductForm from "@/components/ProductForm";
import {
  CATEGORIES, CATEGORY_META, LIST_COLORS, formatCurrency,
  generateListSummary, downloadTextFile, shareContent,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [l, p, f, cats] = await Promise.all([
        db.entities.ShoppingList.get(id),
        db.entities.Product.filter({ shopping_list_id: id }, "category"),
        db.entities.FavoriteProduct.list("-use_count", 20),
        db.entities.Category.list("name"),
      ]);
      setList(l);
      setProducts(p);
      setFavorites(f);
      setCustomCats(cats);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const categoryList = useMemo(() => [
    ...CATEGORIES.map((c) => ({ name: c, icon: CATEGORY_META[c]?.icon || "🛒" })),
    ...customCats.map((c) => ({ name: c.name, icon: c.icon || "🛒" })),
  ], [customCats]);

  const getCatIcon = (name) => categoryList.find((c) => c.name === name)?.icon || "🛒";

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || p.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [products, search, filterCat]);

  const grouped = useMemo(() => {
    const groups = {};
    categoryList.forEach((c) => { groups[c.name] = []; });
    filtered.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filtered, categoryList]);

  const stats = useMemo(() => {
    const total = products.length;
    const purchased = products.filter((p) => p.is_purchased).length;
    const estimated = products.reduce((s, p) => s + (p.estimated_price || 0) * (p.quantity || 1), 0);
    const spent = products.filter((p) => p.is_purchased).reduce((s, p) => s + (p.actual_price || p.estimated_price || 0) * (p.quantity || 1), 0);
    const pct = total > 0 ? Math.round((purchased / total) * 100) : 0;
    return { total, purchased, estimated, spent, pct, diff: spent - estimated };
  }, [products]);

  const handleSaveProduct = async (data) => {
    if (editProduct) {
      const updated = await db.entities.Product.update(editProduct.id, data);
      setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? updated : p)));
      if (Number(data.estimated_price) !== Number(editProduct.estimated_price) && Number(data.estimated_price) > 0) {
        await db.entities.PriceHistory.create({
          product_id: editProduct.id,
          product_name: data.name,
          price: Number(data.estimated_price),
          shopping_list_id: id,
          establishment: list?.name || "",
          change_type: "edited",
        });
      }
      setEditProduct(null);
    } else {
      const created = await db.entities.Product.create({ ...data, shopping_list_id: id });
      setProducts((prev) => [...prev, created]);
      if (Number(data.estimated_price) > 0) {
        await db.entities.PriceHistory.create({
          product_id: created.id,
          product_name: data.name,
          price: Number(data.estimated_price),
          shopping_list_id: id,
          establishment: list?.name || "",
          change_type: "created",
        });
      }
      const existingFav = favorites.find((f) => f.name.toLowerCase() === data.name.toLowerCase());
      if (existingFav) {
        const updated = await db.entities.FavoriteProduct.update(existingFav.id, { use_count: (existingFav.use_count || 1) + 1 });
        setFavorites((prev) => prev.map((f) => (f.id === existingFav.id ? updated : f)));
      } else {
        const fav = await db.entities.FavoriteProduct.create({ name: data.name, category: data.category, unit: data.unit });
        setFavorites((prev) => [...prev, fav]);
      }
    }
  };

  const togglePurchased = async (product) => {
    const purchased_date = !product.is_purchased ? new Date().toISOString() : null;
    const updated = await db.entities.Product.update(product.id, {
      is_purchased: !product.is_purchased,
      purchased_date,
    });
    setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setFormOpen(true);
    setMenuOpen(null);
  };

  const handleDelete = async (productId) => {
    await db.entities.Product.delete(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setMenuOpen(null);
  };

  const toggleListStatus = async () => {
    const completing = list.status === "active";
    const newStatus = completing ? "completed" : "active";
    const updated = await db.entities.ShoppingList.update(list.id, {
      status: newStatus,
      completed_date: completing ? new Date().toISOString() : null,
    });
    setList(updated);
  };

  const handleDownload = () => {
    downloadTextFile(
      `lista-${list.name.toLowerCase().replace(/\s+/g, "-")}.txt`,
      generateListSummary(list, products)
    );
  };

  const handleShare = async () => {
    await shareContent(`Lista: ${list.name}`, generateListSummary(list, products));
  };

  if (loading) {
    return (
      <div className="p-5 md:p-8">
        <div className="h-8 w-32 bg-muted rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Lista não encontrada.</p>
        <Button variant="link" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground truncate">{list.name}</h1>
            {list.status === "completed" && (
              <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 shrink-0">
                <Archive className="w-3 h-3 mr-1" /> Encerrada
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.purchased} de {stats.total} itens comprados
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {list.status === "completed" && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Baixar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Compartilhar</span>
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={toggleListStatus}>
            {list.status === "active" ? "Concluir" : "Reabrir"}
          </Button>
        </div>
      </div>

      {/* Completed banner */}
      {list.status === "completed" && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 mb-4 flex items-center gap-3">
          <Archive className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Lista encerrada e arquivada</p>
            <p className="text-xs text-muted-foreground">
              Enviada ao histórico mensal de gastos. Você pode consultá-la, editá-la, baixá-la e compartilhá-la, mas não excluí-la.
            </p>
          </div>
        </div>
      )}

      {/* Progress + stats */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white mb-6 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium opacity-90">Progresso da compra</span>
          <span className="text-sm font-bold">{stats.pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/20 overflow-hidden mb-5">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${stats.pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Estimado
            </div>
            <p className="font-bold text-lg">{formatCurrency(stats.estimated)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
              <ShoppingCart className="w-3.5 h-3.5" /> Gasto
            </div>
            <p className="font-bold text-lg">{formatCurrency(stats.spent)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
              <TrendingDown className="w-3.5 h-3.5" /> Diferença
            </div>
            <p className="font-bold text-lg">{formatCurrency(stats.diff)}</p>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterCat("all")}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
              filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Todas
          </button>
          {categoryList.map((c) => (
            <button
              key={c.name}
              onClick={() => setFilterCat(c.name)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                filterCat === c.name ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product list by category */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {products.length === 0 ? "Nenhum produto nesta lista ainda." : "Nenhum produto encontrado."}
          </p>
          <Button onClick={() => { setEditProduct(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar produto
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {categoryList.map(({ name: cat }) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">{getCatIcon(cat)}</span>
                  <h3 className="text-sm font-semibold text-muted-foreground">{cat}</h3>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-3 rounded-xl bg-card border border-border p-3 transition-all hover:shadow-sm"
                    >
                      <Checkbox checked={p.is_purchased} onCheckedChange={() => togglePurchased(p)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={cn("font-medium text-sm text-foreground truncate", p.is_purchased && "line-through")}>
                            {p.name}
                          </span>
                          {p.brand && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">{p.brand}</span>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {p.quantity} {p.unit}
                          </span>
                        </div>
                        {p.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.notes}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency((p.estimated_price || 0) * (p.quantity || 1))}
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === p.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl bg-popover border border-border shadow-lg overflow-hidden">
                              <button
                                onClick={() => handleEdit(p)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating add button - mobile */}
      <button
        onClick={() => { setEditProduct(null); setFormOpen(true); }}
        className="sm:hidden fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add button - desktop */}
      <Button
        onClick={() => { setEditProduct(null); setFormOpen(true); }}
        className="hidden sm:flex fixed bottom-6 right-6 gap-2 shadow-lg shadow-primary/20 z-40"
      >
        <Plus className="w-4 h-4" /> Adicionar produto
      </Button>

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSaveProduct}
        product={editProduct}
        favorites={favorites}
      />
    </div>
  );
}