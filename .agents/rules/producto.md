---
trigger: model_decision
description: Leer antes de tocar ventas, caja, turnos, precios, listas, márgenes, stock, depósito, combos, insumos, cigarrillos, offline o IA.
---

# Reglas del producto — AdministradorKiosco

Complementa [directrices_trabajo.md](directrices_trabajo.md). Detalle funcional en la guía del tema (índice en [README.md](../../README.md)); leer solo la sección necesaria.

- No cambiar cálculos, facturación, precios, stock ni estados para simplificar una pantalla. Un cambio funcional expresamente pedido debe ser coherente en interfaz, backend y offline.
- Conservar lector/foco de venta, F1–F4, pagos mixtos, importe manual, botonera, carrito y protección al cambiar sucursal/lista/registro.
- Mantener borradores al navegar, importaciones y reposiciones en curso. Cancelar afecta solo al editor correspondiente.
- Conservar catálogo y stock total por comercio, bulto/unidad, recetas, listas por sucursal, remitos pendientes, transferencias y comprobantes privados. Stock compartido por defecto; un administrador puede activar inventario independiente por sucursal con distribución inicial explícita, tras sincronizar dispositivos y cerrar turnos.
- Depósito opcional: `stock` sigue siendo el total físico. Sin inventario por sucursal, salón/depósito son compartidos. Con inventario por sucursal, venta y componentes consumen solo la sucursal de la caja; depósito conserva su saldo central. Confirmar traslados mueve saldos, sin cambiar total ni costos; requiere conexión y deja historial. No duplicar stock al activar, borrar saldos al desactivar ni reproducir registros históricos como movimientos. Fondos por sucursal/depósito separados de turnos, con permiso explícito `manage_funds`; sin afectar arqueos, ventas ni efectivo esperado.
- Insumos: pueden tener stock/costo sin precio de venta, sin venta directa. Compuestos: consumen componentes, sin segundo stock físico; costo = cantidades × costos. No convertir ni borrar existencias por una opción visual.
- Crear combo o paquete abre el formulario específico con componentes desde el inicio y guardado atómico; no volver al alta normal seguida de una segunda configuración que pueda dejar productos incompletos.
- Cigarrillos: stock en unidades individuales, paquete/suelto con precios independientes y reposición por atados con una sola conversión.
- Bajo margen automático sobre `(precio − costo) / precio`, límite inicial 10% configurable. Costo 0 es desconocido; mantener separación estándar/bajo margen e instantáneas históricas.
- Alta de producto por porcentaje sobre costo: $100 +30% = $130. Principal única/global, derivadas en cadena conservando ajustes/fijos; lista exclusiva activa de sucursal tiene prioridad. Costo nuevo recalcula productos con porcentaje; anteriores conservan precio manual hasta convertirlos por intención. Una edición explícita incompatible de precio lo deja manual. No confundir aumento sobre costo con margen bruto; no reescribir tickets ni repriciar carritos en curso.
- Caja = puesto de cobro. Turno = período de trabajo abierto con efectivo y cerrado contando efectivo. Registro de ventas = agrupación; no es caja ni define condición fiscal.
- Conservar PWA, avisos, caché por cuenta y sincronización. No prometer configuración offline si requiere backend ni borrar colas para resolver errores.
- IA secundaria y voluntaria: no bloquea vender, guardar producto, registrar movimiento ni confirmar cierre. Fallos de Groq quedan en la herramienta; no simular respuestas. Conservar `llama-3.1-8b-instant` y configuración por entorno.
- No modificar `invoicePricingService.ts` ni `InvoicePriceProposal.tsx` salvo pedido posterior que incluya explícitamente esos módulos.
