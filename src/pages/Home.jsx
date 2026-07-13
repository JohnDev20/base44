const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, CheckCircle2, Clock, TrendingUp, ChevronRight, Trash2 } from "lucide-react";
import AddListModal from "@/components/AddListModal";
import { LIST_COLORS, formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [l, p] = await Promise.all([
        db.entities.ShoppingList.list("-created_date"),
        db.entities.Product.list("-created_date", 200),
      ]);
      setLists(l);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data) => {
    const created = await db.entities.ShoppingList.create(data);
    setLists((prev) => [created, ...prev]);
    navigate(`/list/${created.id}`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await db.entities.ShoppingList.delete(id);
    await db.entities.Product.deleteMany({ shopping_list_id: id });
    setLists((prev) => prev.filter((l) => l.id !== id));
    setProducts((prev) => prev.filter((p) => p.shopping_list_id !== id));
  };

  const getListStats = (listId) => {
    const items = products.filter((p) => p.shopping_list_id === listId);
    const purchased = items.filter((p) => p.is_purchased).length;
    const total = items.reduce((s, p) => s + (p.estimated_price || 0) * (p.quantity || 1), 0);
    return { total: items.length, purchased, estimated: total };
  };

  const activeLists = lists.filter((l) => l.status === "active");
  const completedLists = lists.filter((l) => l.status === "completed");
  const totalSpent = products.filter((p) => p.is_purchased).reduce((s, p) => s + (p.actual_price || p.estimated_price || 0) * (p.quantity || 1), 0);

  return (
    <div className="p-5 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Minhas listas</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize suas compras de forma inteligente</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova lista</span>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <ShoppingBag className="w-[18px] h-[18px] text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{lists.length}</p>
          <p className="text-xs text-muted-foreground">Listas criadas</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <Clock className="w-[18px] h-[18px] text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{activeLists.length}</p>
          <p className="text-xs text-muted-foreground">Listas ativas</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{completedLists.length}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-[18px] h-[18px] text-violet-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
          <p className="text-xs text-muted-foreground">Total já gasto</p>
        </div>
      </div>

      {/* Lists */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-foreground">Nenhuma lista ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Crie sua primeira lista de compras</p>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Criar lista
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {activeLists.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ativas</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeLists.map((list) => {
                  const stats = getListStats(list.id);
                  const pct = stats.total > 0 ? Math.round((stats.purchased / stats.total) * 100) : 0;
                  return (
                    <div
                      key={list.id}
                      onClick={() => navigate(`/list/${list.id}`)}
                      className="group relative rounded-2xl bg-card border border-border p-4 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", LIST_COLORS[list.color] || LIST_COLORS.emerald)}>
                            <ShoppingBag className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground leading-tight">{list.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {stats.total} {stats.total === 1 ? "item" : "itens"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(list.id, e)}
                          className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {stats.total > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{stats.purchased} de {stats.total} comprados</span>
                            <span className="font-medium text-foreground">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(stats.estimated)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedLists.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {completedLists.length} {completedLists.length === 1 ? "lista encerrada" : "listas encerradas"} — veja no{" "}
              <Link to="/history" className="text-primary font-medium hover:underline">Histórico → Gastos mensais</Link>
            </p>
          )}
        </div>
      )}

      <AddListModal open={modalOpen} onOpenChange={setModalOpen} onSave={handleCreate} />
    </div>
  );
}