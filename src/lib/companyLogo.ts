import { supabase } from "@/integrations/supabase/client";

const MAX_COMPANY_LOGO_SIZE = 2 * 1024 * 1024;
// SVG is intentionally excluded: SVG files can embed scripts that execute when
// the stored file is opened directly, which would allow stored XSS.
const ALLOWED_COMPANY_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export function validateCompanyLogoFile(file: File) {
  if (file.size > MAX_COMPANY_LOGO_SIZE) {
    throw new Error("Company logo must be under 2MB");
  }

  if (!ALLOWED_COMPANY_LOGO_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPG, or WEBP logo");
  }
}

function getFileExtension(file: File) {
  return EXTENSION_BY_TYPE[file.type] ?? "png";
}

export async function uploadCompanyLogo(file: File, folder: string) {
  validateCompanyLogoFile(file);

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (!userId) {
    throw new Error("You must be signed in to upload a company logo");
  }

  const extension = getFileExtension(file);
  const subFolder = folder.trim().replace(/[^a-zA-Z0-9-_]/g, "");

  // Storage policies restrict uploads to the signed-in user's own folder.
  const filePath = `${userId}/${subFolder ? `${subFolder}/` : ""}${crypto.randomUUID()}.${extension}`;

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
