import React, { useEffect, useState } from "react";
import {
  Store,
  ShoppingBag,
  Wallet,
  Package,
  Tags,
  Settings2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowUpRight,
} from "lucide-react";
import type { SandboxChecklist } from "../types/kiosco";
import { getAudioMuted, setAudioMuted } from "../utils/audio";
export type KioscoTab = "pos" | "arqueo" | "stock" | "precios" | "pruebas";
interface Props {
  activeTab: KioscoTab;
  setActiveTab: (tab: KioscoTab) => void;
  cartCount: number;
  criticalStockCount: number;
  expectedCash: number;
  checklist: SandboxChecklist;
}
const tabs = [
  { id: "pos", label: "Nueva venta", icon: ShoppingBag, key: "F1" },
  { id: "arqueo", label: "Mi caja", icon: Wallet, key: "F2" },
  { id: "stock", label: "Inventario", icon: Package, key: "F3" },
  { id: "precios", label: "Productos y precios", icon: Tags, key: "F4" },
  { id: "pruebas", label: "Herramientas", icon: Settings2, key: "F6" },
] as const;
export function KioscoHeader({
  activeTab,
  setActiveTab,
  cartCount,
  criticalStockCount,
  expectedCash,
}: Props) {
  const [muted, setMuted] = useState(getAudioMuted());
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  return (
    <header className="app-sidebar">
      <a
        className="brand"
        href="#main-content"
        onClick={() => setActiveTab("pos")}
      >
        <span className="brand-mark">
          <Store size={23} />
        </span>
        <span>
          Kiosco<span className="brand-sub">EXPRESS</span>
        </span>
      </a>
      <div className="nav-caption">TU MOSTRADOR, MÁS SIMPLE</div>
      <nav aria-label="Navegación principal">
        {tabs.map(({ id, label, icon: Icon, key }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? "active" : ""}`}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
            {id === "pos" && cartCount > 0 ? (
              <b className="nav-badge">{cartCount}</b>
            ) : id === "stock" && criticalStockCount > 0 ? (
              <b className="nav-badge warning">{criticalStockCount}</b>
            ) : (
              <kbd>{key}</kbd>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="cash-summary" onClick={() => setActiveTab("arqueo")}>
          <span>
            Efectivo esperado <ArrowUpRight size={15} />
          </span>
          <strong>${expectedCash.toLocaleString("es-AR")}</strong>
          <small>Ver movimientos de caja</small>
        </button>
        <div className="sidebar-tools">
          <button
            className="icon-button"
            aria-label={muted ? "Activar sonidos" : "Silenciar sonidos"}
            title={muted ? "Activar sonidos" : "Silenciar sonidos"}
            onClick={() => {
              setAudioMuted(!muted);
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label={
              fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
            title="Pantalla completa"
            onClick={() => {
              if (document.fullscreenElement)
                void document.exitFullscreen().catch(() => {});
              else
                void document.documentElement
                  .requestFullscreen()
                  .catch(() => {});
            }}
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <span>Hecho para tu día a día</span>
        </div>
      </div>
    </header>
  );
}
