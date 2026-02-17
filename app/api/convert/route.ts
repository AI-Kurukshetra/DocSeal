import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const { filePath, bucket } = await request.json();
    const supabase = createServiceClient();

    const { data: fileData, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error || !fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { value: html } = await mammoth.convertToHtml({ buffer });

    const plainText = html
      .replace(/<[^>]*>/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const lineHeight = fontSize * 1.4;

    const lines = plainText.split("\n");
    let page = pdfDoc.addPage([612, 792]);
    let y = 792 - margin;

    for (const line of lines) {
      const words = line.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width > 612 - margin * 2) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage([612, 792]);
            y = 792 - margin;
          }
          page.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          y -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([612, 792]);
          y = 792 - margin;
        }
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();

    const convertedPath = filePath.replace(/\.\w+$/, ".pdf");
    const { error: uploadError } = await supabase.storage
      .from("converted")
      .upload(convertedPath, pdfBytes, { contentType: "application/pdf" });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ convertedPath });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Conversion failed" },
      { status: 500 },
    );
  }
}
