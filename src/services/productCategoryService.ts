type CategoryOption = { id: string; name: string; canonicalName?: string };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Options/IDs always come from the store's database catalog. Never create one. */
export function defaultProductCategory(categories: CategoryOption[]): string {
  return categories.find(category => normalize(category.canonicalName || category.name) === 'varios')?.id || '';
}

export function resolveProductCategory(categories: CategoryOption[], suggested?: string, productName = ''): string {
  const normalized = normalize(suggested || '');
  const exact = normalized ? categories.find(category => normalize(category.name) === normalized || normalize(category.canonicalName || '') === normalized) : undefined;
  if (exact) return exact.id;

  // Specific families precede broad ones; do not match "Bebidas Alcoholicas"
  // to "Bebidas" just because they share a word. Unknowns stay in Varios.
  const families: [string, RegExp][] = [
    ['Alfajores', /\balfajor(?:es)?\b/],
    ['Aguas y saborizadas', /\b(aguas?|saborizadas?|aquarius|levite|villavicencio)\b/],
    ['Bebidas Alcoholicas', /\b(alcohol(?:icas?)?|cervezas?|vinos?|fernet|vodka|whisky|branca|quilmes|brahma|heineken)\b/],
    ['Energizantes y deportivas', /\b(energizantes?|deportivas?|monster|speed|red bull|gatorade|powerade)\b/],
    ['Jugos', /\b(jugos?|tang|clight)\b/],
    ['Galletitas y obleas', /\b(galletas?|galletitas?|obleas?|oreo|chocolinas?|pepitos|crackers|traviata|criollitas)\b/],
    ['Cereales y barras', /\b(cereal(?:es)?|barras?|barritas?|granola)\b/],
    ['Helados', /\b(helados?)\b/],
    ['Chocolates', /\b(chocolates?|milka|cofler|aguila|marroc|rocklets|bon o bon)\b/],
    ['Cigarrillos', /\b(cigarrillos?|tabaco|marlboro|chesterfield|camel|philip morris|lucky strike)\b/],
    ['Infusiones', /\b(infusion(?:es)?|yerba|te|cafe|mate cocido)\b/],
    ['Lacteos', /\b(lacteos?|leches?|yogur(?:es|t)?|quesos?|manteca|serenisima|sancor|ilolay)\b/],
    ['Panificados y reposteria', /\b(panificados?|reposteria|panaderia|pan|panes|budin(?:es)?|magdalenas?|bizcochos?|tostadas?)\b/],
    ['Aderezos y conservas', /\b(aderezos?|conservas?|mayonesa|ketchup|mostaza)\b/],
    ['Snacks', /\b(snacks?|salados?|copetin|papas|lays|doritos|cheetos|chizitos|mani|palitos|saladix|pehuamar|nachos|twistos|krachitos)\b/],
    ['Golosinas', /\b(golosinas?|dulces?|caramelos?|chupetin(?:es)?|chicles?|gomitas|beldent|bubbaloo|mentoplus|halls|confites?)\b/],
    ['Bebidas', /\b(bebidas?|gaseosas?|coca|pepsi|sprite|fanta|soda)\b/],
    ['Almacen', /\b(almacen)\b/],
  ];
  for (const source of [normalized, normalize(productName)]) {
    for (const [name, pattern] of families) {
      if (!pattern.test(source)) continue;
      const category = categories.find(option => normalize(option.canonicalName || option.name) === normalize(name));
      if (category) return category.id;
    }
  }
  return defaultProductCategory(categories);
}
