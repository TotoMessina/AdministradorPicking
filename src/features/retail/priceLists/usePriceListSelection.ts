import { useEffect, useRef, useState } from 'react';
import { randomUUID } from '../../../utils/uuid';
import type { PriceList, Product } from '../api';
import { productsForList } from '../pricing';
import { type Session, PAGE_SIZE, ownChanges } from './priceListHelpers';
import type { priceListSettingsProps } from './usePriceListSettings';

/** Lista elegida, borradores abiertos y consulta de precios. */
export function usePriceListSelection(ctx: ReturnType<typeof priceListSettingsProps>) {
  const { storeId, lists, overrides, products } = ctx;
  const primary = lists.find(l => l.is_primary);
  const [selected, setSelected] = useState('cost');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState('');
  const [percentageTarget, setPercentageTarget] = useState({ key: '', request: 0 });
  const heading = useRef<HTMLHeadingElement>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const focusPreview = useRef(false);
  useEffect(() => {
    if (focusPreview.current && !active && !preview.current?.closest('[hidden]')) {
      preview.current?.focus(); focusPreview.current = false;
    }
  }, [active, selected]);
  const list = lists.find(l => l.id === selected);
  const fixedFor = (productId: string) => overrides.find(o => o.list_id === selected && o.product_id === productId);
  const changesFor = (p: Product) => list ? ownChanges(p, list, fixedFor(p.id)) : [];
  const onlyChanged = !!list && !showAll;
  const matches = products.filter(p => p.sellable !== false && `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())
    && (!onlyChanged || changesFor(p).length > 0));
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = matches.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const priced = selected === 'cost' ? visible.map(p => ({ ...p, price: Number(p.cost), pricingError: p.cost > 0 ? undefined : 'Costo sin cargar' })) : productsForList(visible, list, overrides, lists);
  const start = (source: string, existing?: PriceList, percentage = false) => {
    // Costo stays a valid root; a second catalog root would duplicate Principal.
    if (!existing && primary && source === 'catalog') source = primary.id;
    const key = existing ? existing.id : `new:${source}`;
    if (!sessions.some(s => s.key === key)) {
      const parent = lists.find(l => l.id === source);
      const draft: PriceList = existing ? structuredClone(existing) : {
        id: randomUUID(), store_id: storeId, name: '', adjustment: 0, active: true,
        branch_id: parent?.branch_id || null, base_kind: source === 'cost' ? 'cost' : source === 'catalog' ? 'catalog' : 'list',
        parent_id: parent?.id || null, pricing_rules: [], revision: 0,
      };
      setSessions(prev => [...prev, { key, draft, existing: !!existing }]);
    }
    setActive(key);
    if (percentage) setPercentageTarget(prev => ({ key, request: prev.request + 1 }));
  };
  const close = (key: string) => {
    setSessions(prev => prev.filter(s => s.key !== key)); setActive('');
    if (!heading.current?.closest('[hidden]')) heading.current?.focus();
  };
  const inspect = (id: string) => {
    setSelected(id); setActive(''); setPage(0);
    if (active) focusPreview.current = true;
    else if (!preview.current?.closest('[hidden]')) preview.current?.focus();
  };


  return { primary, selected, setSelected, query, setQuery, showAll, setShowAll, page, setPage, sessions, setSessions, active, setActive, percentageTarget, setPercentageTarget, heading, preview, focusPreview, list, fixedFor, changesFor, onlyChanged, matches, pageCount, currentPage, visible, priced, start, close, inspect };
}
