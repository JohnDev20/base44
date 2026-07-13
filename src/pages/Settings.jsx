const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sun, Moon, Trash2, Star, Download, Upload, Info } from "lucide-react";

export default function Settings() {
  const [theme, setTheme] = useState("light");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  useEffect(() => {
    db.entities.FavoriteProduct.list("-use_count", 50).then(setFavorites).catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const removeFavorite = async (id) => {
    await db.entities.FavoriteProduct.delete(id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const fileInputRef = useRef(null);

  const exportData = async () => {
    const [lists, products] = await Promise.all([
      db.entities.ShoppingList.list(),
      db.entities.Product.list("-created_date", 500),
    ]);
    const data = JSON.stringify({ lists, products, exported_at: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprafacil-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const idMap = {};
      for (const list of data.lists || []) {
        const created = await db.entities.ShoppingList.create({
          name: list.name,
          status: list.status,
          color: list.color,
          completed_date: list.completed_date,
        });
        idMap[list.id] = created.id;
      }
      const newProducts = (data.products || [])
        .map((p) => ({ ...p, shopping_list_id: idMap[p.shopping_list_id] }))
        .filter((p) => p.shopping_list_id);
      if (newProducts.length) {
        const clean = newProducts.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest);
        await db.entities.Product.bulkCreate(clean);
      }
      alert("Dados importados com sucesso!");
    } catch (err) {
      alert("Erro ao importar. Verifique se o arquivo é um backup válido.");
    }
    e.target.value = "";
  };

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-6">Configurações</h1>

      {/* Theme */}
      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-foreground mb-1">Aparência</h2>
        <p className="text-sm text-muted-foreground mb-4">Escolha o tema do aplicativo</p>
        <div className="flex gap-2">
          <button
            onClick={() => theme !== "light" && toggleTheme()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
              theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <Sun className="w-4 h-4" /> Claro
          </button>
          <button
            onClick={() => theme !== "dark" && toggleTheme()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
              theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <Moon className="w-4 h-4" /> Escuro
          </button>
        </div>
      </Card>

      {/* Favorites */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-foreground">Produtos favoritos</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Produtos que você usa com frequência</p>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum favorito ainda. Eles aparecem automaticamente ao adicionar produtos.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5 bg-accent rounded-full pl-3 pr-1.5 py-1.5">
                <span className="text-xs font-medium text-foreground">{f.name}</span>
                <span className="text-[10px] text-muted-foreground">×{f.use_count}</span>
                <button
                  onClick={() => removeFavorite(f.id)}
                  className="p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Data management */}
      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-foreground mb-1">Gerenciamento de dados</h2>
        <p className="text-sm text-muted-foreground mb-4">Faça backup e restaure suas listas</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="gap-2 flex-1" onClick={exportData}>
            <Download className="w-4 h-4" /> Exportar dados
          </Button>
          <Button variant="outline" className="gap-2 flex-1" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importar dados
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importData} />
        </div>
      </Card>

      {/* About */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Sobre</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          CompraFácil — seu assistente de compras. Organize listas, controle gastos e nunca mais esqueça um item. 
          Seus dados ficam sincronizados e seguros na nuvem.
        </p>
        <p className="text-xs text-muted-foreground mt-3">Versão 1.0.0</p>
      </Card>
    </div>
  );
}