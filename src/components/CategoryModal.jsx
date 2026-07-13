import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  "🛒", "🥬", "🥩", "🥤", "🧹", "🧴", "📦", "🍎",
  "🥛", "🍞", "🐟", "🧀", "🍫", "☕", "🍺", "🐔",
  "🥚", "🌽", "🍅", "🍌", "🍇", "💊", "🐶", "🎁",
];

export default function CategoryModal({ open, onOpenChange, onSave }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");

  useEffect(() => {
    if (open) {
      setName("");
      setIcon("🛒");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nome da categoria</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pet, Hortifruti, Padaria..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                    icon === ic ? "bg-primary/15 ring-2 ring-primary" : "bg-accent hover:bg-muted"
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">Criar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}