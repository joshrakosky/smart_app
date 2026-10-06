// Product art slots. Files will live in Supabase Storage; the product only keeps metadata.
// Path shape (planned): products/{productId}/{kind}/{fileName}

export type ProductArtKind = "thumbnail" | "popt" | "other";

export type ProductArtFile = {
  id: string;
  kind: ProductArtKind;
  name: string;
  // MIME type from the upload (image/png, application/pdf, …).
  contentType: string;
  sizeBytes: number;
  // Supabase Storage object path once wired.
  storagePath: string;
  // Signed or public URL for download/preview.
  url: string;
};

export const ART_SLOTS: { kind: ProductArtKind; label: string; detail: string }[] = [
  { kind: "thumbnail", label: "Thumbnail", detail: "Small preview image for the product." },
  { kind: "popt", label: "POPT", detail: "Optimized print file." },
  { kind: "other", label: "Other", detail: "Extra art, dielines, or reference files." },
];
