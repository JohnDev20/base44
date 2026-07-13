const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CATEGORY_META, UNITS } from "@/lib/constants";
import { Plus, Lock } from "lucide-react";
import CategoryModal from "@/components/CategoryModal";

export default function ProductForm({ open, onOpenChange, onSave, product, favorites }) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    quantity: 1,
    unit: "un",
    category: "Outros",
    notes: "",
    estimated_price: 0,
  });
  const [customCats, setCustomCats] = useState([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const cats = await db.entities.Category.list("name");
      setCustomCats(cats);
    } catch {
      // entity may not be ready yet
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        brand: product.brand || "",
        quantity: product.quantity || 1,
        unit: product.unit || "un",
        category: product.category || "Outros",
        notes: product.notes || "",
        estimated_price: product.estimated_price || 0,
      });
    } else {
      setForm({ name: "", brand: "", quantity: 1, unit: "un", category: "Outros", notes: "", estimated_price: 0 });
    }
    setError("");
  }, [product, open]);

  const allCategories = [
    ...CATEGORIES.map((c) => ({ name: c, icon: CATEGORY_META[c]?.icon || "🛒" })),
    ...customCats.map((c) => ({ name: c.name, icon: c.icon || "🛒" })),
  ];

  const handleCreateCategory = async (data) => {
    const created = await db.entities.Category.create(data);
    setCustomCats((prev) => [...prev, created]);
    setForm((prev) => ({ ...prev, category: created.name }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (product && product.brand && !form.brand.trim()) {
      setError("A marca não pode ser removida, apenas editada.");
      return;
    }
    if (product && Number(product.estimated_price) > 0 && Number(form.estimated_price) <= 0) {
      setError("O preço não pode ser removido, apenas editado.");
      return;
    }
    setError("");
    onSave({
      ...form,
      quantity: Number(form.quantity) || 1,
      estimated_price: Number(form.estimated_price) || 0,
    });
    onOpenChange(false);
  };

  const suggestions =
    favorites && form.name.length > 0
      ? favorites.filter((f) => f.name.toLowerCase().includes(form.name.toLowerCase())).slice(0, 4)
      : [];

  const brandLocked = product && product.brand;
  const priceLocked = product && Number(product.estimated_price) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{product ? "Editar produto" : "Adicionar produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do produto</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Arroz integral"
                autoFocus
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm({ ...form, name: s.name, category: s.category, unit: s.unit })}
                      className="text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {CATEGORY_META[s.category]?.icon || "🛒"} {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand" className="flex items-center gap-1.5">
                Marca
                {brandLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Ex: Tio João, Nestlé, Coca-Cola..."
              />
              {brandLocked && (
                <p className="text-[11px] text-muted-foreground">
                  A marca fica vinculada ao produto e só pode ser alterada, não removida.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCatModalOpen(true)}
                  title="Criar categoria"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price" className="flex items-center gap-1.5">
                Preço estimado (R$)
                {priceLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_price}
                onChange={(e) => setForm({ ...form, estimated_price: e.target.value })}
                placeholder="0,00"
              />
              {priceLocked && (
                <p className="text-[11px] text-muted-foreground">
                  O preço fica vinculado ao produto e só pode ser alterado, não removido.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: marca preferida, tamanho..."
                rows={2}
              />
            </div>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {product ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <CategoryModal open={catModalOpen} onOpenChange={setCatModalOpen} onSave={handleCreateCategory} />
    </>
  );
}