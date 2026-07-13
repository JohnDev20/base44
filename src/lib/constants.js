export const CATEGORIES = [
  "Frutas e verduras",
  "Carnes",
  "Bebidas",
  "Limpeza",
  "Higiene",
  "Alimentos",
  "Outros",
];

export const UNITS = ["un", "kg", "g", "L", "ml", "pacote", "caixa", "dz"];

export const CATEGORY_META = {
  "Frutas e verduras": { icon: "🥬", color: "green" },
  "Carnes": { icon: "🥩", color: "red" },
  "Bebidas": { icon: "🥤", color: "blue" },
  "Limpeza": { icon: "🧹", color: "purple" },
  "Higiene": { icon: "🧴", color: "cyan" },
  "Alimentos": { icon: "📦", color: "amber" },
  "Outros": { icon: "🛒", color: "slate" },
};

export const LIST_COLORS = {
  emerald: "from-emerald-400 to-teal-500",
  blue: "from-blue-400 to-indigo-500",
  rose: "from-rose-400 to-pink-500",
  amber: "from-amber-400 to-orange-500",
  violet: "from-violet-400 to-purple-500",
};

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function generateListSummary(list, products) {
  const items = products.filter((p) => p.shopping_list_id === list.id);
  const total = items.reduce((s, p) => s + (p.actual_price || p.estimated_price || 0) * (p.quantity || 1), 0);
  const purchased = items.filter((p) => p.is_purchased).length;
  const date = new Date(list.completed_date || list.updated_date || list.created_date);
  let text = `🛒 CompraFácil — ${list.name}\n`;
  text += `Data: ${date.toLocaleDateString("pt-BR")}\n`;
  text += `Itens: ${items.length} (${purchased} comprados)\n`;
  text += `Total: ${formatCurrency(total)}\n\nItens:\n`;
  items.forEach((p) => {
    text += `- ${p.quantity}${p.unit} ${p.name}${p.brand ? " (" + p.brand + ")" : ""} — ${formatCurrency((p.actual_price || p.estimated_price || 0) * (p.quantity || 1))}${p.is_purchased ? " ✓" : ""}\n`;
  });
  return text;
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareContent(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return false;
  }
}