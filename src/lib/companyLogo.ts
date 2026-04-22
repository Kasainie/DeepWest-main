import { supabase } from "@/integrations/supabase/client";

const MAX_COMPANY_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_COMPANY_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function validateCompanyLogoFile(file: File) {
  if (file.size > MAX_COMPANY_LOGO_SIZE) {
    throw new Error("Company logo must be under 2MB");
  }

  if (!ALLOWED_COMPANY_LOGO_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPG, WEBP, or SVG logo");
  }
}

function getFileExtension(file: File) {
  const fromType = EXTENSION_BY_TYPE[file.type];
  if (fromType) return fromType;

  const fromName = file.name.split(".").pop()?.toLowerCase();
  return fromName && fromName.length <= 5 ? fromName : "png";
}

export async function uploadCompanyLogo(file: File, folder: string) {
  validateCompanyLogoFile(file);

  const extension = getFileExtension(file);
  const safeFolder = folder.trim();

  if (!safeFolder) {
    throw new Error("Missing upload folder for company logo");
  }

  const filePath = `${safeFolder}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload company logo");
  }

  const { data } = supabase.storage.from("company-logos").getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Company logo uploaded but its public URL could not be created");
  }

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  };
}