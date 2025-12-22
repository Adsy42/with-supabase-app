/**
 * DOCX Parsing API Route
 * Extracts text from uploaded DOCX files using mammoth
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import mammoth from "mammoth";

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

    // Verify it's a DOCX
    const isDocx = file.name.toLowerCase().endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    if (!isDocx) {
      return NextResponse.json({ error: "File must be a DOCX" }, { status: 400 });
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

    // Parse DOCX using mammoth
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length === 0) {
      return NextResponse.json(
        {
          error: "No text found",
          message: "This DOCX appears to be empty or contains only images.",
          content: `[DOCX: ${file.name}]\n\nNo extractable text found. Please copy and paste the content.`,
        },
        { status: 200 }
      );
    }

    // Return extracted content
    return NextResponse.json({
      content: result.value,
      messages: result.messages, // Any warnings from mammoth
    });
  } catch (error) {
    console.error("DOCX parsing error:", error);
    return NextResponse.json(
      {
        error: "Failed to parse DOCX",
        message: error instanceof Error ? error.message : "Unknown error",
        content: "[DOCX parsing failed. Please copy and paste the document content.]",
      },
      { status: 200 }
    );
  }
}

