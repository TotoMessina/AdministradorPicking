import { useCallback } from 'react';
import { GroqError } from '../../services/groqService';
import { extractInvoiceProducts, invoiceNumber, prepareInvoiceExtractionText, type ExtractedInvoice } from '../../services/invoiceExtractionService';
import { cleanInvoiceOcrText } from '../../services/invoiceParserService';
import { unitsPerPack as configuredPackSize } from '../../services/inventoryUnits';
import { draftFromQr, draftFromText } from '../../services/purchaseInvoiceService';
import { randomUUID } from '../../utils/uuid';
import { linkInvoiceItems, rankCatalogMatches } from '../../services/invoiceMatchingService';
import { applySupplierDiscount, findRegisteredSupplier } from '../../services/supplierDiscountService';
import { applyInvoiceRules, cuitsInText, findSupplierByCuit, findSupplierByName, findSupplierBySimilarName, formatCuit, isStoreName } from '../../services/supplierInvoiceRules';
import { detectInvoiceFormat, findInvoiceFormat, readWithInvoiceFormat } from '../../services/invoiceFormatService';
import { defaultProductCategory } from '../../services/productCategoryService';
import { type InvoiceItem, isRealBarcode, type InvoiceAnalyzerProps, formatSuggestedProductName, detectPackUnits, resolveCategory, buildParsePrompt } from '../invoiceAnalyzerHelpers';
import type { useInvoiceInputState } from './useInvoiceInputState';
import type { useInvoiceCosts } from './useInvoiceCosts';

/** Lectura de la factura: formato aprendido o IA, y vínculo con el catálogo. */
export function useInvoiceParse(ctx: InvoiceAnalyzerProps & ReturnType<typeof useInvoiceInputState> & ReturnType<typeof useInvoiceCosts>) {
  const {
    storeId, products, storeCuit, storeNames, setStep, invoiceText, setItems, catalogController,
    setCatalogSuggestions, setProviderName, supplierOverride, setInvoiceDate, setError, setExpandedItems,
    fileReadFailed, fileReading, mounted, parseController, parsing, extractionCache, setShowRawText,
    setSearchQuery, setFilterStatus, setReviewAttention, setProductSearch, setLinkProgress, suppliers,
    invoiceFormats, readSource, setReadWithFormat, setFormatNotice, setCuitNotice, setPurchaseDraft,
    qrData, setRegisterPurchase, setPurchaseAiError, purchaseRequest, setPurchaseNotice,
    setDiscountOverride, setLandedOverride, localCategories, rateLimitCountdown, clearRateLimitTimer,
    startRateLimitCountdown,
  } = ctx;
  // ── Parse invoice ───────────────────────────────────────────────────────

  const handleParse = useCallback(
    async (options: { useAi?: boolean; skipAi?: boolean } = {}) => {
      if (parsing.current || fileReading.current || fileReadFailed || ((rateLimitCountdown ?? 0) > 0 && !options.skipAi)) return;
      if (!invoiceText.trim()) {
        setError("Pegá o escribí el texto de la factura antes de continuar.");
        return;
      }
      clearRateLimitTimer();
      parsing.current = true;
      const controller = new AbortController();
      parseController.current = controller;
      setError(null);
      setStep("parsing");
      setLinkProgress(options.skipAi ? 'Organizando los renglones para revisión…' : 'Extrayendo los artículos y el proveedor…');
      try {
        // Filtrar caracteres innecesarios y ruido de escaneo/AFIP antes de enviar al LLM
        const cleanText = cleanInvoiceOcrText(invoiceText);
        const lines = prepareInvoiceExtractionText(cleanText).text.split('\n').filter(Boolean);
        // The supplier's CUIT on the invoice identifies it even when the AI misreads the name.
        // Without a readable CUIT, a registered supplier whose name appears in the text is used.
        // The ARCA QR carries the official issuer CUIT, even when the OCR cannot read the header.
        const qrSupplier = qrData ? suppliers.find(item => item.cuit === qrData.issuer_cuit) ?? null : null;
        const cuitSupplier = supplierOverride.trim() ? null : qrSupplier ?? findSupplierByCuit(suppliers, invoiceText) ?? findSupplierByName(suppliers, invoiceText, storeNames);
        const presetSupplier = supplierOverride.trim() || cuitSupplier?.name || '';
        const presetRules = (cuitSupplier ?? findRegisteredSupplier(suppliers, presetSupplier))?.invoice_rules ?? {};
        // A supplier with a learned layout is read locally: no tokens and no Groq limits.
        const known = presetSupplier ? findInvoiceFormat(invoiceFormats, presetSupplier) : detectInvoiceFormat(lines, invoiceFormats);
        // A fractional quantity means the columns shifted (OCR split an amount): use AI instead of a wrong read.
        const formatItems = known && !options.useAi ? readWithInvoiceFormat(lines, known.format) : null;
        const localItems = formatItems?.every(item => Number.isInteger(item.qty ?? 0)) ? formatItems : null;
        readSource.current = { lines, format: localItems ? known : null, mismatch: known && !localItems && !options.useAi ? known.supplier_name : '' };
        let parsed: ExtractedInvoice;
        if (localItems && known) {
          parsed = { proveedor: known.supplier_name, items: localItems };
        } else if (options.skipAi) {
          const NON_PRODUCT_HEADER = /^(?:cuit|cuil|iibb|ingresos\s+brutos|inicio\s+actividades|condici[oó]n|iva|responsable|monotributo|factura|remito|comprobante|recibo|ticket|punto\s+de\s+venta|comp\.?\s*nro|fecha|vto|vencimiento|domicilio|direcci[oó]n|tel[eé]fono|celular|cliente|se[ñn]or|cuenta|transporte|c[oó]d(?:igo)?\s+descripci[oó]n|cant(?:idad)?\s+descripci[oó]n|descripci[oó]n\s+precio)\b/i;
          const SUMMARY_RE = /^(?:sub\s*total|total|neto|importe|saldo|son\s+pesos|iva|percepci[oó]n|perc\.?|bonificaci[oó]n|descuento|dto\.?|recargo|flete|env[ií]o|redondeo|impuesto|ii\.?\s*bb|iibb)\b/i;
          const candidateLines = lines.filter(l => {
            const trimmed = l.trim();
            if (trimmed.length < 4) return false;
            if (SUMMARY_RE.test(trimmed) || NON_PRODUCT_HEADER.test(trimmed)) return false;
            return /\p{L}{2,}/u.test(trimmed) && /\d/.test(trimmed);
          });
          const effectiveLines = candidateLines.length ? candidateLines : lines.filter(l => /\p{L}{2,}/u.test(l) && !SUMMARY_RE.test(l.trim()));
          parsed = {
            proveedor: presetSupplier,
            items: effectiveLines.map(line => {
              const toks = line.replace(/(?<!\d)[\\/|√✓]+|[\\/|√✓]+(?!\d)/g, ' ').replace(/\$\s+/g, '$').split(/\s+/).filter(Boolean);
              const nums: number[] = [];
              for (let i = toks.length - 1; i >= 0 && nums.length < 4; i--) {
                const val = invoiceNumber(toks[i]);
                if (val !== undefined && val > 0) nums.push(val);
              }
              let cost: number | undefined;
              let qty = 1;
              if (nums.length === 1) {
                cost = nums[0];
              } else if (nums.length >= 2) {
                cost = nums[0];
                const possibleQty = nums.find(n => Number.isInteger(n) && n > 0 && n <= 1000 && n !== cost);
                if (possibleQty) qty = possibleQty;
              }
              const desc = formatSuggestedProductName(line);
              return {
                invoice_line: line,
                name: desc || line,
                qty,
                cost,
                unread: false,
              };
            }),
          };
        } else try {
          const textToAnalyze = cleanText.trim().length >= 20 ? cleanText : invoiceText;
          parsed = await extractInvoiceProducts(textToAnalyze, part => buildParsePrompt(part, localCategories, products, presetRules), {
            cache: extractionCache.current, signal: controller.signal, supplierKnown: !!presetSupplier,
            onProgress: message => { if (mounted.current) setLinkProgress(message); },
          });
        } catch (errFirst) {
          const isRateLimit =
            errFirst instanceof GroqError &&
            (errFirst.status === 429 ||
              errFirst.code === "rate_limit_exceeded" ||
              errFirst.message.toLowerCase().includes("rate limit") ||
              errFirst.message.toLowerCase().includes("tokens per minute"));

          if (isRateLimit) {
            const waitSec = errFirst.retryAfter || 25;
            startRateLimitCountdown(waitSec);
            // The daily quota does not recover in seconds; say which limit it was.
            const daily = /per day|\(TPD\)|\(RPD\)/i.test(errFirst.message);
            throw new Error(daily
              ? `Se agotó la cuota diaria de Groq de esta clave. Podés cargar la factura a mano, continuar sin IA o reintentar más tarde (Groq indica ${Math.ceil(waitSec)} s); el texto detectado se conserva.`
              : `Groq alcanzó su límite por minuto. Podés continuar a revisión sin IA o esperar ${Math.ceil(waitSec)} segundos para reintentar; el texto detectado se conserva.`,
            );
          } else {
            throw errFirst;
          }
        }

        if (!mounted.current || controller.signal.aborted) return;
        if (!parsed.items.length) {
          throw new Error(options.skipAi
            ? 'No se detectaron renglones con texto en la factura. Podés cargar productos manualmente o revisar el texto detectado.'
            : 'La IA no encontró renglones de productos en el texto leído. Abrí Ver / editar texto detectado: si faltan, usá Volver a leer o Girar y leer. También podés continuar sin IA.');
        }

        // The AI sometimes returns the buyer: the store's own names are never the supplier.
        const aiSupplier = parsed.proveedor?.trim() || '';
        const readSupplier = presetSupplier || (isStoreName(aiSupplier, storeNames) ? '' : aiSupplier);
        // A misspelled name read by the AI ("Castila") still finds the registered supplier and its rules.
        const similarSupplier = cuitSupplier || findRegisteredSupplier(suppliers, readSupplier) || !readSupplier ? null : findSupplierBySimilarName(suppliers, readSupplier);
        const registered = cuitSupplier ?? findRegisteredSupplier(suppliers, readSupplier) ?? similarSupplier;
        const supplier = registered?.name ?? readSupplier;
        setProviderName(supplier);
        setDiscountOverride(null);
        const parseDiscount = registered?.discount_percent ?? 0;
        // Unit of sale and bonus lines follow the supplier's rules, also for invoices read without AI.
        parsed = { ...parsed, items: applyInvoiceRules(parsed.items, registered?.invoice_rules ?? {}, invoiceText.split('\n')) };
        setCuitNotice(cuitSupplier ? (cuitSupplier === qrSupplier ? `Proveedor reconocido por el QR de ARCA (CUIT ${formatCuit(qrSupplier.cuit ?? '')}).`
          : cuitSupplier.cuit && cuitsInText(invoiceText).includes(cuitSupplier.cuit)
          ? `Proveedor reconocido por su CUIT ${formatCuit(cuitSupplier.cuit)}.` : `Proveedor reconocido por su nombre en la factura: ${cuitSupplier.name}.`)
          : similarSupplier ? `Proveedor reconocido por un nombre parecido: la factura dice «${readSupplier}» y se usó ${similarSupplier.name}. Cambialo si no corresponde.`
          : !presetSupplier && aiSupplier && !readSupplier ? 'La IA leyó el nombre de tu comercio como proveedor y se descartó: indicá el proveedor.' : '');
        const headerDraft = draftFromText(invoiceText, { supplierCuit: registered?.cuit, storeCuit });
        setPurchaseDraft(qrData ? draftFromQr(headerDraft, qrData) : headerDraft);
        purchaseRequest.current = randomUUID();
        setPurchaseAiError(''); setPurchaseNotice(null); setRegisterPurchase(true); setLandedOverride(null);
        setInvoiceDate("");
        setLinkProgress('Buscando en la memoria del proveedor y comparando con tu catálogo…');
        const links = await linkInvoiceItems(storeId, supplier, parsed.items.map(it => ({
          invoice_line: (it.invoice_line || it.name || '').trim(),
          commercial_name: (it.name && it.name !== it.invoice_line ? it.name : '').trim() || undefined,
          code: it.code,
          quantity: it.qty, quantity_unit: it.quantityUnit, invoiced_cost: it.cost ?? null,
          extracted_pack_size: it.quantityUnit === 'unit' ? 1 : detectPackUnits(it.invoice_line || it.name || '') > 1
            ? detectPackUnits(it.invoice_line || it.name || '') : it.unitsPerPack,
        })), products, controller.signal);
        if (!mounted.current || controller.signal.aborted) return;

        const existingCodes = new Set(
          products.map((p) => p.code?.trim().toLowerCase()).filter(Boolean),
        );

        const resolvedItems: InvoiceItem[] = parsed.items.map((it, index) => {
          const rawInvoiceLine = (it.invoice_line || it.name || "").trim();
          const cleanCommercialName = (it.name || rawInvoiceLine).trim();
          const rawCode = (it.code || "").trim();
          const link = links[index];
          const matchedProduct = products.find(product => product.id === link.matched_product_id) || null;

          // Respect explicit individual units; otherwise use the presentation, catalog pack, or AI suggestion.
          const regexUnits = detectPackUnits(link.invoice_line || rawInvoiceLine);
          const aiUnits = Number(it.unitsPerPack);
          const catalogUnits = configuredPackSize(matchedProduct?.pack_size);
          const safeAiUnits = Number.isInteger(aiUnits) && aiUnits > 1 ? aiUnits : 1;
          const unitsPerPack = link.code_units ?? (it.quantityUnit === 'unit' ? 1 : regexUnits > 1 ? regexUnits : link.pack_size_detected ?? (safeAiUnits > 1 ? safeAiUnits : catalogUnits));
          const isPack = unitsPerPack > 1;

          const rawQty = it.qty == null ? 1 : Number(it.qty);
          const costKnown = (it.cost != null && Number.isFinite(Number(it.cost)) && Number(it.cost) >= 0)
            || (it.unitCost != null && Number.isFinite(Number(it.unitCost)) && Number(it.unitCost) >= 0);
          const rawCost = Math.max(0, Number(it.cost ?? (Number(it.unitCost) * unitsPerPack)) || 0);

          // Si viene en display/caja: el costo unitario real es rawCost / unitsPerPack
          // y el stock total a ingresar es rawQty * unitsPerPack
          const unitCost = isPack && rawCost > 0
            ? Math.round((rawCost / unitsPerPack) * 100) / 100
            : rawCost;
          const qty = rawQty * unitsPerPack;

          // Búsqueda inteligente en catálogo para sugerir categoría y EAN
          const isBarcode = isRealBarcode(rawCode);
          const catalogMatches = rankCatalogMatches(cleanCommercialName || rawInvoiceLine, rawCode, products, 3);
          const bestCatalogMatch = catalogMatches.length > 0 && catalogMatches[0].confidence >= 0.4 ? catalogMatches[0].product : null;

          let newCode = "";
          let codeDetected = false;
          let codeSource: InvoiceItem["codeSource"] = "none";

          if (isBarcode) {
            newCode = rawCode;
            codeDetected = true;
            codeSource = "invoice";
          } else if (bestCatalogMatch?.code && isRealBarcode(bestCatalogMatch.code)) {
            newCode = bestCatalogMatch.code;
            codeDetected = true;
            codeSource = "catalog";
          }

          // Categorización entre las opciones provistas por la base de datos o catálogo.
          let assignedCategoryId = resolveCategory(it.category || undefined, cleanCommercialName || rawInvoiceLine, localCategories);
          let categorySource: InvoiceItem["categorySource"] = it.category ? "ai" : "manual";

          const defaultCat = defaultProductCategory(localCategories);
          if ((!assignedCategoryId || assignedCategoryId === defaultCat) && bestCatalogMatch?.categoryId) {
            assignedCategoryId = bestCatalogMatch.categoryId;
            categorySource = "catalog";
          }

          const hasMatch = !!matchedProduct;
          const defaultMargin = 40;
          const suggestedPrice = unitCost > 0 ? Math.max(1, Math.round(applySupplierDiscount(unitCost, parseDiscount) * (1 + defaultMargin / 100))) : 100;
          const suggestedName = formatSuggestedProductName(rawInvoiceLine, cleanCommercialName);

          return {
            invoiceLine: link.invoice_line || rawInvoiceLine,
            linkStatus: link.autoLinked && (!link.mapping?.pack_size_detected || link.mapping.pack_size_detected === unitsPerPack) ? 'auto' : 'pending',
            linkReason: it.unread ? `La IA no pudo leer este renglón. Completá cantidad y costo mirando la factura. ${link.reason}` : link.reason,
            mapping: link.mapping,
            mappingInvoiceText: link.mapping_invoice_text,
            // The model explanation is supplemental; never use it to calculate the cost.
            divisionReason: costKnown && link.pack_size_detected === unitsPerPack && link.unit_cost !== null && Math.abs(link.unit_cost - unitCost) < 0.01 ? link.division_reason : undefined,
            costKnown,
            rawName: rawInvoiceLine || "Producto sin nombre",
            rawCode: rawCode || undefined,
            rawQty,
            rawCost,
            unitsPerPack,
            quantityUnit: it.quantityUnit,
            isPack,
            qty,
            unitCost,
            matchedProduct,
            matchConfidence: link.confidence,
            action: hasMatch ? (costKnown ? 'both' : 'add_stock') : 'create_new',
            suggestedName,
            newName: suggestedName,
            newCode,
            newMinStock: 4,
            codeDetected,
            codeSource,
            newPrice: suggestedPrice,
            customMargin: defaultMargin,
            isManualPrice: false,
            newCategoryId: assignedCategoryId,
            categorySource,
          };
        });

        setItems(resolvedItems);
        setReadWithFormat({ format: readSource.current.format, mismatch: readSource.current.mismatch });
        const unread = parsed.items.filter(item => item.unread).length;
        if (unread) {
          setError(`${unread === 1 ? 'Un renglón no se pudo leer' : `${unread} renglones no se pudieron leer`} con IA y ${unread === 1 ? 'quedó' : 'quedaron'} con cantidad 0 y sin costo. Completalos mirando la factura u omitilos antes de aplicar.`);
        } else if (options.skipAi) {
          setError('Revisión directa sin IA: verificá cantidades, costos y nombres antes de aplicar la reposición.');
        }
        setFormatNotice('');
        catalogController.current?.abort();
        setCatalogSuggestions(null);
        setReviewAttention(null);
        setProductSearch({});
        setSearchQuery('');
        setFilterStatus('all');
        setExpandedItems(new Set());
        setStep("review");
      } catch (err) {
        if (!mounted.current || controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Error desconocido al analizar la factura.";
        setError(msg);
        setShowRawText(true);
        setStep("input");
      } finally { parsing.current = false; }
    },
    [invoiceText, products, localCategories, supplierOverride, suppliers, invoiceFormats, storeId, clearRateLimitTimer, startRateLimitCountdown, fileReadFailed, rateLimitCountdown, qrData, storeCuit, storeNames],
  );

  return { handleParse };
}
