import { useMemo, useRef, useState, useEffect } from 'react';
import { groqStream } from '../../services/groqService';
import { retail } from '../../features/retail/api';
import type { KioscoSale } from '../../types/kiosco';
import type { PeriodType, AIReportStatus } from './aiReportTypes';
import { filterSales, filterShifts, calculateLocalMetrics } from './aiReportMetrics';
import { SYSTEM_PROMPT, buildUserPrompt, buildClipboardReport } from './aiReportPrompt';
import type { aiReportPanelProps } from './useAiReportPanel';

/** Período, métricas locales, generación del reporte con IA y copia. */
export function useAiReportPanelState(ctx: ReturnType<typeof aiReportPanelProps>) {
  const { shifts, allSales, products, storeName, role, storeId } = ctx;
  const [period, setPeriod] = useState<PeriodType>("7days");
  const [status, setStatus] = useState<AIReportStatus>("idle");
  const [reportText, setReportText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [localSales, setLocalSales] = useState<KioscoSale[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Gating: Only visible/accessible for owner or admin
  const isAuthorized = !role || role === "owner" || role === "admin";

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Sync or fetch sales
  useEffect(() => {
    if (allSales && allSales.length > 0) {
      setLocalSales(allSales);
    } else if (storeId) {
      retail
        .allSales(storeId)
        .then((data) => {
          if (data && data.length > 0) setLocalSales(data);
        })
        .catch(() => {});
    }
  }, [allSales, storeId]);

  const activeSales = localSales.length > 0 ? localSales : allSales;

  // Filter sales and shifts based on current selected period
  const filteredSales = useMemo(() => {
    return filterSales(activeSales, period, new Date());
  }, [activeSales, period]);

  const filteredShifts = useMemo(() => {
    return filterShifts(shifts, period, new Date());
  }, [shifts, period]);

  // Local metric calculations (sin IA)
  const metrics = useMemo(() => {
    return calculateLocalMetrics(filteredSales, filteredShifts, products, period);
  }, [filteredSales, filteredShifts, products, period]);
  const metricsSignature = JSON.stringify(metrics);
  useEffect(() => {
    abortControllerRef.current?.abort();
    setStatus('idle'); setReportText(''); setErrorMessage('');
  }, [metricsSignature]);

  // Handle stream generation
  const handleGenerateReport = async () => {
    if (!isAuthorized) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setReportText("");
    setErrorMessage("");

    try {
      const userPrompt = buildUserPrompt(storeName, metrics);
      let started = false;

      await groqStream(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        (delta) => {
          if (controller.signal.aborted) return;
          if (!started) {
            started = true;
            setStatus("streaming");
          }
          setReportText((prev) => prev + delta);
        },
        {
          signal: controller.signal,
          temperature: 0.3,
          maxTokens: 1200,
        }
      );

      if (!controller.signal.aborted) setStatus("done");
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      setStatus("error");
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo conectar con Groq para generar el reporte.";
      setErrorMessage(msg);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setStatus("idle");
  };

  const handleCopyClipboard = async () => {
    if (!reportText) return;
    const textToCopy = buildClipboardReport(storeName, metrics, reportText);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return { period, setPeriod, status, setStatus, reportText, setReportText, errorMessage, setErrorMessage, copied, setCopied, localSales, setLocalSales, abortControllerRef, isAuthorized, activeSales, filteredSales, filteredShifts, metrics, metricsSignature, handleGenerateReport, handleCancel, handleCopyClipboard };
}
