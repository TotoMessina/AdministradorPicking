# Lista de control: pasar la facturación a producción

Para revisar con tu contador antes de emitir facturas reales. Cada punto dice qué hace hoy la app. Marcalo cuando tu contador lo confirme.

## 1. Datos del comercio en ARCA

- [ ] **CUIT y razón social** iguales a los de la constancia de inscripción.
- [ ] **Condición frente al IVA**: Responsable Inscripto o Monotributo. Con IVA exento la app todavía no emite.
- [ ] **Punto de venta** dado de alta en ARCA como «RECE para aplicativo y web services». No sirve uno de «Factura en línea». Usar un punto de venta solo para la app: si se emite con el mismo número desde otro sistema, la numeración choca.
- [ ] **Actividad y domicilio** actualizados.
- [ ] **Ingresos brutos** e inicio de actividades cargados para el ticket.

## 2. Comprobantes que emite la app

| Comercio | Cliente | Comprobante |
| --- | --- | --- |
| Responsable Inscripto | Sin cliente, o consumidor final | Factura B a consumidor final |
| Responsable Inscripto | Cliente con DNI o CUIT, consumidor final o exento | Factura B con su documento |
| Responsable Inscripto | Responsable Inscripto o Monotributista con CUIT | Factura A |
| Monotributo | Cualquiera | Factura C |

- [ ] **Factura A a Monotributistas**: confirmar que corresponde en tu caso. La app la emite así hoy.
- [ ] **Monto para identificar a consumidor final**: desde **$10.000.000** (RG 5700/2025) la app no pide el CAE sin un cliente con DNI, CUIL o CUIT, y lo avisa al cobrar. Si se cobró sin cliente, en Ver ventas se elige «Factura a nombre de un cliente» y se factura. Si el monto cambia, hay que actualizarlo en la app.
- [ ] **Concepto**: la app informa siempre «Productos». Si vendés servicios, avisar: hace falta otro concepto y fechas de servicio.
- [ ] **Moneda**: siempre pesos.

## 3. IVA

- [ ] **Alícuota por producto**: en Mi comercio → Facturación, «IVA de los productos». Todos van al 21% salvo los que se marquen (10,5%, 27%, 5%, 2,5%, 0% o exento), uno por uno o por categoría. Revisar la lista con el contador antes de pasar a producción.
- [ ] **Desglose**: el total de la venta se reparte entre alícuotas en proporción a cada renglón (descuentos y recargos incluidos); la alícuota con más importe se queda con los centavos de redondeo. Por alícuota: neto = parte ÷ (1 + tasa) redondeado a centavos, e IVA = parte − neto. Los exentos van como operaciones exentas. Confirmar que lo acepta.
- [ ] **Ticket**: Factura B a consumidor final con la leyenda de Transparencia Fiscal (Ley 27.743) e «IVA Contenido»; «Otros Impuestos Nacionales Indirectos» sale en $0,00 hasta definir cómo completarlo. Factura A con neto, IVA por alícuota y exento.
- [ ] **Percepciones e impuestos internos**: la app no los informa. Confirmar que no correspondan.

## 4. Fecha y numeración

- [ ] **Fecha**: el comprobante lleva la fecha del día en que se pide el CAE, en hora argentina. Una venta sin conexión que se factura al día siguiente sale con esa fecha. Confirmar que está bien o si prefiere otra regla.
- [ ] **Numeración**: la app toma el último número autorizado en ARCA y usa el siguiente, con un solo pedido por punto de venta a la vez. Antes de empezar, anotar el último número de cada tipo, con **Probar conexión** o en ARCA.
- [ ] **Respuesta que no llegó**: antes de pedir otro número, la app consulta en ARCA si ese número quedó emitido. Un número usado con otro importe queda marcado para revisar con vos.
- [ ] **Contingencia CAEA** (RG 5782/2025): con un punto de venta de contingencia CAEA cargado en Mi comercio (dado de alta en ARCA para contingencia, mismo domicilio, distinto del de facturación), la app pide el CAEA de cada quincena. Si ARCA no responde, la venta sale con ese CAEA y su propia numeración, y la app la rinde (FECAEARegInformativo) cuando ARCA vuelve. Las quincenas sin uso se informan «sin movimiento». Confirmar con el contador el punto de venta y que el ticket con CAEA es correcto.

## 5. Notas de crédito

- [ ] **Devoluciones**: anular o devolver una parte de una venta facturada emite la nota de crédito del mismo tipo (A, B o C). Va por el importe devuelto, con el IVA de los productos devueltos, al mismo cliente y asociada a la factura original. Sale del punto de venta de facturación actual aunque la factura sea de otro (por ejemplo, el de contingencia).
- [ ] **Descuentos y bonificaciones**: hoy solo se emiten notas de crédito por devoluciones. Confirmar si también hacen falta por descuentos posteriores o notas de débito.
- [ ] **Devoluciones anteriores a esta versión**: las que quedaron «Falta nota de crédito» se cargan a mano con el número emitido en ARCA.

## 6. Certificado

- [ ] **Certificado de producción** generado con el pedido (.csr) de la app, en «Administración de Certificados Digitales», y asociado al servicio **wsfe** en «Administrador de Relaciones de Clave Fiscal».
- [ ] **Clave privada**: la descarga el navegador al generar el pedido. Guardarla en un gestor de contraseñas, nunca por mail ni en carpetas compartidas. En la base queda cifrada.
- [ ] **Vencimiento**: el certificado vence, por lo general a los 2 años. Anotar la fecha y renovarlo antes.
- [ ] **Quién lo carga**: solo el dueño o un administrador.

## 7. Prueba antes de producción

- [ ] Recorrer la [prueba en homologación](administracion.md#prueba-en-homologación-sin-duplicados) en un proyecto de prueba, con Factura A, B o C, nota de crédito, reintentos y sin conexión.
- [ ] Revisar con tu contador un ticket de cada tipo: datos del comercio, cliente, IVA, CAE, vencimiento y QR. El QR tiene que abrir la consulta de ARCA.
- [ ] Pasar a **Producción** en Mi comercio con el certificado de producción, el día de corte. La app pide confirmación. Al pasar de homologación a producción, las ventas anteriores quedan sin factura de la app (las facturadas en pruebas y las que esperaban factura): lo anterior al corte es del sistema que facturaba antes.
- [ ] Primer día: emitir una venta real de monto chico, verla en «Mis Comprobantes» de ARCA y anularla con una devolución para ver la nota de crédito.
- [ ] Revisar a diario, la primera semana, **Ver ventas → Con error en ARCA** y las devoluciones con nota pendiente.

## 8. Libros y registros

- [ ] **Libro IVA Digital / Mis Comprobantes**: ARCA ya tiene todo lo emitido. Confirmar si el contador toma los datos de ahí o necesita el CSV de ventas de la app (incluye tipo, número y CAE).
- [ ] **Facturas emitidas antes de pasar a la app** u otros sistemas en el mismo CUIT: confirmar que usan otro punto de venta.
