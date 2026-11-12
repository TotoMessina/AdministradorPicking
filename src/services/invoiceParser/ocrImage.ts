import Tesseract from 'tesseract.js';

// Lectura de imágenes con OCR: preparación de la imagen y reconocimiento.
async function preprocessImageForOcr(dataUrl: string, rotation: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const sideways = rotation % 180 !== 0;
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        const width = sideways ? originalHeight : originalWidth;
        const height = sideways ? originalWidth : originalHeight;

        if (!width || !height) {
          resolve(dataUrl);
          return;
        }

        // 1. Escalamiento óptimo para OCR:
        // Tesseract funciona con máxima precisión con alturas de letra de 25-35px.
        // Preserve proportional letter size on long receipts; bound total memory.
        const scale = Math.min(width < 1400 ? 2 : 1, 2400 / width, 12000 / height, Math.sqrt(12000000 / (width * height)));
        const scaledW = Math.max(1, Math.round(width * scale));
        const scaledH = Math.max(1, Math.round(height * scale));

        // 2. Margen de seguridad blanco (35px en cada lado):
        // Esto elimina por completo el error 'Image too small to scale 2x36 vs min width of 3'
        // que ocurre cuando los bordes de la tabla tocan el límite de la imagen.
        const padding = 35;
        const canvas = document.createElement("canvas");
        canvas.width = scaledW + padding * 2;
        canvas.height = scaledH + padding * 2;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fondo blanco uniforme
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Renderizar imagen con suavizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.save();
        ctx.translate(padding + scaledW / 2, padding + scaledH / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.drawImage(img, -originalWidth * scale / 2, -originalHeight * scale / 2, originalWidth * scale, originalHeight * scale);
        ctx.restore();

        // 3. Conversión a escala de grises y estiramiento de contraste adaptativo:
        // Blanquea fondos de papel claros y superficies de apoyo para evitar que el granulado o textura genere ruido OCR.
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const totalPixels = canvas.width * canvas.height;

        // Histograma de luminancia (Rec. 709)
        const hist = new Uint32Array(256);
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = g;
          hist[g]++;
        }

        // Buscar percentil 5 (tinta oscura) y percentil 85 (fondo de papel / luz dominante)
        let accum = 0;
        let p05 = 0;
        let p85 = 255;
        const targetP05 = totalPixels * 0.05;
        const targetP85 = totalPixels * 0.85;

        for (let v = 0; v < 256; v++) {
          accum += hist[v];
          if (p05 === 0 && accum >= targetP05) p05 = v;
          if (p85 === 255 && accum >= targetP85) {
            p85 = v;
            break;
          }
        }

        const whiteClip = Math.max(185, p85);
        const blackClip = Math.min(p05, 80);
        const range = Math.max(1, whiteClip - blackClip);

        for (let i = 0; i < d.length; i += 4) {
          const g = d[i];
          let val: number;
          if (g >= whiteClip) {
            val = 255;
          } else if (g <= blackClip) {
            val = 0;
          } else {
            val = Math.round(((g - blackClip) * 255) / range);
            // Suavizar cerca del blanco para eliminar sombras de pliegues o textura de mesas
            if (val > 215) val = 255;
          }
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
        canvas.width = canvas.height = 0;
      } catch (err) {
        console.warn("Fallo preprocesamiento de imagen en canvas, usando original:", err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      reject(new Error('No se pudo abrir la imagen. Exportala como JPG, PNG o WEBP y volvé a subirla.'));
    };

    img.src = dataUrl;
  });
}

/**
 * Ejecuta Tesseract con worker configurado con DPI 300, modo renglón por renglón (PSM 6)
 * y espacios entre columnas preservados para comprobantes comerciales.
 */
export async function recognizeTextWithOcr(
  imageUrl: string,
  onProgress?: (message: string) => void,
  rotation = 0,
): Promise<{ text: string; confidence: number }> {
  const optimizedUrl = await preprocessImageForOcr(imageUrl, rotation);

  onProgress?.("Iniciando motor OCR de alta precisión…");
  const worker = await Tesseract.createWorker("spa", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const pct = Math.round((m.progress || 0) * 100);
        onProgress?.(`Reconociendo texto del comprobante: ${pct}%`);
      }
    },
    errorHandler: (err) => {
      console.warn("Tesseract notice:", err);
    },
  }).catch(() => {
    throw new Error('No se pudo iniciar el lector de imágenes. Revisá la conexión para cargar el idioma español y volvé a leer. También podés pegar el texto manualmente.');
  });

  try {
    // Modo SINGLE_BLOCK ('6'): Lee horizontalmente línea por línea
    // respetando la estructura de filas (Cantidad - Código - Nombre - Precio).
    // preserve_interword_spaces: '1' mantiene las separaciones entre columnas.
    await worker.setParameters({
      user_defined_dpi: "300",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });

    const res = await worker.recognize(optimizedUrl, { rotateAuto: true });
    let best = res.data;

    // Si por el formato de la imagen el bloque único capturó muy poco texto (< 60 caracteres),
    // reintenta en modo AUTO ('3')
    if (best.text.trim().length < 60) {
      onProgress?.('Revisando la distribución de columnas…');
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });
      const retryRes = await worker.recognize(optimizedUrl, { rotateAuto: true });
      const score = (page: typeof best) => Math.sqrt((page.text.match(/[\p{L}\d]/gu) || []).length) * (page.confidence + 20);
      if (score(retryRes.data) > score(best)) best = retryRes.data;
    }

    return { text: best.text || '', confidence: best.confidence };
  } finally {
    await worker.terminate();
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}
