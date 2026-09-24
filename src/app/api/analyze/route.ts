import { NextRequest, NextResponse } from "next/server";
import { extractTextFromImage, explainResult, fallbackExplanation } from "@/lib/openai";
import { analyzeMessage, JevError } from "@/lib/jev";
import { deriveConcernLevel } from "@/lib/concern-level";
import { cleanMessageText, validateTextInput, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation";
import { AnalyzeRequest, AnalyzeError, AnalysisResult } from "@/types/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;

  try {
    body = await req.json();
  } catch {
    return errorResponse("validation", "Invalid request body.");
  }

  if (!body || typeof body !== "object" || !["text", "image"].includes(body.mode)) {
    return errorResponse("validation", 'Use { "mode": "text", "text": "your message" } or image mode. The JEV Postman payload goes directly to TypeSafe, not /api/analyze.');
  }
  if ((body.mode === "text" && typeof body.text !== "string") ||
      (body.mode === "image" && (typeof body.imageBase64 !== "string" || typeof body.mimeType !== "string"))) {
    return errorResponse("validation", "Message text and image fields must be strings.");
  }

  // ---- Step 1/2: get message text, from image or direct paste ----
  let extractedText = "";

  if (body.mode === "image") {
    if (!body.imageBase64 || !body.mimeType) {
      return errorResponse("validation", "No image was provided.");
    }

    if (!ALLOWED_IMAGE_TYPES.includes(body.mimeType)) {
      return errorResponse("validation", "Upload a PNG, JPG, or WEBP screenshot.");
    }
    if (body.imageBase64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
      return errorResponse("validation", "That image is too large. Upload a file up to 3 MB.", 413);
    }
    if (body.imageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.imageBase64)) {
      return errorResponse("validation", "Invalid image data. Please select the screenshot again.");
    }
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return errorResponse("extraction", "Screenshot reading is unavailable. Paste the message text instead.", 503);
    }

    try {
      const extracted = await extractTextFromImage(body.imageBase64, body.mimeType);

      if (extracted.readability === "unclear" || !extracted.extractedText.trim()) {
        return errorResponse(
          "extraction",
          "We could not clearly read this image. Upload a clearer screenshot or paste the message manually."
        );
      }

      extractedText = extracted.extractedText;
    } catch {
      return errorResponse(
        "extraction",
        "We could not read the message right now. Please try again or paste the message manually."
      );
    }
  } else {
    extractedText = body.text ?? "";
  }

  // ---- Step 3: clean + validate ----
  const cleaned = cleanMessageText(extractedText);
  const validation = validateTextInput(cleaned);
  if (!validation.valid) {
    return errorResponse("validation", validation.error ?? "Invalid input.");
  }

  // ---- Step 4: JEV structured decision ----
  // JEV is the source of truth for the risk decision. If it fails, we do
  // not let OpenAI improvise a decision in its place (spec section 24).
  let jev;
  try {
    jev = await analyzeMessage(cleaned);
  } catch (error) {
    return errorResponse("jev", error instanceof JevError ? error.message : "We could not complete the risk analysis. Please try again.", error instanceof JevError ? error.status : 502);
  }

  // ---- Step 5: concern level ----
  const concernLevel = deriveConcernLevel(jev);

  // ---- Step 6: OpenAI explanation, with predefined fallback on failure ----
  let explanation;
  let usedFallbackExplanation = !process.env.OPENAI_API_KEY?.trim();
  try {
    explanation = await explainResult({ extractedText: cleaned, jev, concernLevel });
  } catch {
    explanation = fallbackExplanation(concernLevel);
    usedFallbackExplanation = true;
  }

  const result: AnalysisResult = {
    concernLevel,
    category: jev.category,
    riskScore: jev.riskScore,
    extractedText: cleaned,
    jev,
    explanation,
    usedFallbackExplanation,
  };

  return NextResponse.json(result);
}

function errorResponse(stage: AnalyzeError["stage"], message: string, status = 400) {
  const body: AnalyzeError = { error: true, stage, message };
  return NextResponse.json(body, { status });
}
