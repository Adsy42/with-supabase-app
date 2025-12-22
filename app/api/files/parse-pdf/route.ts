/**
 * PDF Parsing API Route
 * Extracts text from uploaded PDF files
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Dynamic import for pdf-parse to handle SSR
const getPdfParser = async () => {
  try {
    // pdf-parse uses test files that cause issues in some environments
    // We'll use a try-catch to handle this gracefully
    const pdfParseModule = await import("pdf-parse");
    // Handle both ESM and CJS exports
    // @ts-expect-error - pdf-parse has inconsistent export types
    return pdfParseModule.default || pdfParseModule;
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Verify it's a PDF
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try to parse with pdf-parse
    const pdfParse = await getPdfParser();
    
    if (!pdfParse) {
      // pdf-parse not available, return helpful message
      return NextResponse.json(
        {
          error: "PDF parsing not available",
          message: "Please copy and paste the document content directly into the chat.",
          content: `[PDF: ${file.name}]\n\nPDF parsing is not configured. Please copy and paste the document content.`,
        },
        { status: 200 } // Return 200 with message so client can handle gracefully
      );
    }

    // Parse PDF
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      return NextResponse.json(
        {
          error: "No text found",
          message: "This PDF appears to be image-based or empty. Please copy and paste the text content.",
          content: `[PDF: ${file.name}]\n\nNo extractable text found. This may be a scanned document. Please copy and paste the content.`,
        },
        { status: 200 }
      );
    }

    // Return extracted content
    return NextResponse.json({
      content: data.text,
      pages: data.numpages,
      info: data.info,
    });
  } catch (error) {
    console.error("PDF parsing error:", error);
    return NextResponse.json(
      {
        error: "Failed to parse PDF",
        message: error instanceof Error ? error.message : "Unknown error",
        content: "[PDF parsing failed. Please copy and paste the document content.]",
      },
      { status: 200 } // Return 200 so client gets the message
    );
  }
}


