export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjs: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjs) return pdfjs;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        try {
            // Load core ESM build (v5 compatible)
            const core = await import('pdfjs-dist');
            // Try to load worker as URL so bundler serves it correctly
            try {
                const workerUrlMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
                // In v5, GlobalWorkerOptions still exists for setting workerSrc
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (core as any).GlobalWorkerOptions.workerSrc = (workerUrlMod as any).default || workerUrlMod;
            } catch {
                // Fallback to public path where we ship the worker
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (core as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            }
            pdfjs = core;
            return core;
        } catch (e) {
            // Final fallback to legacy path if core import failed
            const legacy = await import('pdfjs-dist/build/pdf.mjs');
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (legacy as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            } catch {
                // ignore
            }
            pdfjs = legacy;
            return legacy;
        }
    })();

    return loadPromise;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        // Use a conservative scale to avoid memory issues on large PDFs/devices
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!context) {
            return {
                imageUrl: '',
                file: null,
                error: 'Canvas 2D context is not available in this environment',
            };
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: context, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const originalName = file.name.replace(/\.pdf$/i, '');
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: 'image/png',
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: '',
                            file: null,
                            error: 'Failed to create image blob from canvas',
                        });
                    }
                },
                'image/png',
                1.0
            );
        });
    } catch (err: any) {
        return {
            imageUrl: '',
            file: null,
            error: `Failed to convert PDF: ${err?.message || String(err)}`,
        };
    }
}