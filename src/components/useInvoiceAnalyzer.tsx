import type { InvoiceAnalyzerProps } from './invoiceAnalyzerHelpers';
import { useInvoiceInputState } from './invoiceAnalyzer/useInvoiceInputState';
import { useInvoiceCosts } from './invoiceAnalyzer/useInvoiceCosts';
import { useInvoiceParse } from './invoiceAnalyzer/useInvoiceParse';
import { useInvoiceImport } from './invoiceAnalyzer/useInvoiceImport';
import { useInvoiceReviewActions } from './invoiceAnalyzer/useInvoiceReviewActions';
import { useInvoiceReviewSummary } from './invoiceAnalyzer/useInvoiceReviewSummary';

/** Estado y acciones del analizador de facturas. Las vistas reciben el resultado como `s`. */
export function useInvoiceAnalyzer(props: InvoiceAnalyzerProps) {
  const s1 = useInvoiceInputState(props);
  const s2 = useInvoiceCosts({ ...props, ...s1 });
  const s3 = useInvoiceParse({ ...props, ...s1, ...s2 });
  const s4 = useInvoiceImport({ ...props, ...s1, ...s2, ...s3 });
  const s5 = useInvoiceReviewActions({ ...props, ...s1, ...s2, ...s3, ...s4 });
  const s6 = useInvoiceReviewSummary({ ...props, ...s1, ...s2, ...s3, ...s4, ...s5 });
  // Devuelve todo lo de cada parte: es lo que reciben las vistas como `s`.
  return { ...s1, ...s2, ...s3, ...s4, ...s5, ...s6 };
}

export type InvoiceAnalyzerState = ReturnType<typeof useInvoiceAnalyzer>;
