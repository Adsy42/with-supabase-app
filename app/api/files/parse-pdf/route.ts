/**
 * PDF Parsing API Route
 * Extracts text from uploaded PDF files using pdf-parse v2
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFParse } from "pdf-parse";

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

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Parse PDF using pdf-parse v2
    const parser = new PDFParse({ data });
    const textResult = await parser.getText();

    // Clean up parser resources
    await parser.destroy();

    if (!textResult.text || textResult.text.trim().length === 0) {
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
      content: textResult.text,
      pages: textResult.pages?.length || 0,
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
