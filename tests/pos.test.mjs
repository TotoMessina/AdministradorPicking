import { JSDOM } from "jsdom";
import { createServer } from "vite";
import assert from "node:assert/strict";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3001",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
localStorage.setItem("kiosco_audio_muted", "true");
const React = await import("react");
const { render, fireEvent, cleanup } = await import("@testing-library/react");
const screen = {
  getByRole(role, options = {}) {
    const el = this.queryByRole(role, options);
    if (!el) throw new Error(`Missing ${role} ${options.name}`);
    return el;
  },
  queryByRole(role, options = {}) {
    return (
      [
        ...document.querySelectorAll(
          role === "checkbox" ? "input[type=checkbox]" : "button",
        ),
      ].find((el) => {
        const label = (el.getAttribute("aria-label") || el.textContent).trim();
        return (
          options.name === undefined ||
          (options.name instanceof RegExp
            ? options.name.test(label)
            : label === options.name)
        );
      }) || null
    );
  },
  getByText(text) {
    const el = [...document.querySelectorAll("div")].find(
      (el) => el.textContent === text,
    );
    if (!el) throw new Error("Missing " + text);
    return el;
  },
};
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const { PosTab } = await server.ssrLoadModule("/src/components/PosTab.tsx");
  const { ToastProvider } = await server.ssrLoadModule(
    "/src/context/ToastContext.tsx",
  );
  const products = [
    {
      id: "11111111-2222-3333-4444-555555555555",
      code: "AGUA",
      name: "Agua",
      price: 1500,
      stock: 2,
      minStock: 1,
      category: "Mi categoria propia",
    },
  ];
  const calls = [];
  let rejectNext = false;
  let finish;
  function Harness() {
    const [cart, setCart] = React.useState([]);
    return React.createElement(
      ToastProvider,
      null,
      React.createElement(PosTab, {
        products,
        cart,
        setCart,
        onTriggerChecklist: () => {},
        onCompleteSale: async (sale) => {
          calls.push(sale);
          if (rejectNext) {
            rejectNext = false;
            throw new Error("Test connection failure");
          }
          await new Promise((resolve) => (finish = resolve));
        },
      }),
    );
  }
  render(React.createElement(Harness));
  assert.ok(screen.getByRole("button", { name: "Mi categoria propia" }));
  fireEvent.click(screen.getByRole("button", { name: /Agregar Agua/ }));
  assert.equal(screen.getByRole("button", { name: /Cobrar/ }).disabled, true);
  fireEvent.click(screen.getByRole("button", { name: "Monto exacto" }));
  assert.equal(screen.getByRole("button", { name: /Cobrar/ }).disabled, false);
  rejectNext = true;
  await React.act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Cobrar/ }));
  });
  assert.ok(screen.getByText("Test connection failure"));
  assert.ok(screen.getByRole("button", { name: "Quitar Agua" }));
  await React.act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Cobrar/ }));
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].id, calls[1].id, "retry must preserve idempotency key");
  assert.equal(calls[1].items[0].productId, products[0].id);
  assert.equal(calls[1].total, 1500);
  assert.equal(
    screen.getByRole("button", { name: /Registrando/ }).disabled,
    true,
  );
  await React.act(async () => {
    finish();
  });
  assert.equal(screen.queryByRole("button", { name: "Quitar Agua" }), null);
  console.log(
    "PASS custom categories, cash validation, retained cart after failure, idempotent retry, product ID, pending guard and successful clearing",
  );
  fireEvent.click(screen.getByRole("button", { name: /Agregar Agua/ }));
  fireEvent.click(screen.getByRole("button", { name: "QR", exact: true }));
  assert.equal(screen.getByRole("button", { name: /Cobrar/ }).disabled, true);
  fireEvent.click(screen.getByRole("checkbox"));
  assert.equal(screen.getByRole("button", { name: /Cobrar/ }).disabled, false);
  fireEvent.click(
    screen.getByRole("button", { name: "Sumar una unidad de Agua" }),
  );
  assert.equal(
    screen.getByRole("button", { name: /Cobrar/ }).disabled,
    true,
    "change of cart invalidates payment confirmation",
  );
  assert.equal(
    screen.getByRole("button", { name: "Sumar una unidad de Agua" }).disabled,
    true,
    "stock cap",
  );
  console.log(
    "PASS external-payment confirmation, confirmation invalidation and stock cap",
  );
  cleanup();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  cleanup();
  await server.close();
  dom.window.close();
}
