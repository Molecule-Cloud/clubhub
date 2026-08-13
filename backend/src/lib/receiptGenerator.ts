import PDFKit from "pdfkit";
import QRCode from "qrcode";

export interface ReceiptData {
  receiptNumber: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  primaryColor?: string | null;
  memberName: string;
  categoryName: string;
  amountMinorUnits: number;
  currency: string;
  gatewayRef: string;
  status: string;
  paidAt: Date;
  verificationUrl: string; // encoded into the QR — points to a public verify page
}

function formatMoney(minorUnits: number, currency: string): string {
  return `${currency} ${(minorUnits / 100).toFixed(2)}`;
}

/**
 * Builds a PDF receipt in-memory and returns it as a Buffer — never written
 * to disk. PDFKit streams pages; we collect the chunks and resolve once the
 * document is finalized.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin: 1, width: 200 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const brandColor = data.primaryColor || "#2563EB";

    // --- Header ---
    doc.rect(0, 0, doc.page.width, 110).fill(brandColor);
    doc
      .fillColor("#FFFFFF")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(data.organizationName, 50, 40, { width: 350 });
    doc.fontSize(11).font("Helvetica").text("Payment Receipt", 50, 70);

    doc.fillColor("#000000");
    doc.moveDown(4);

    // --- Receipt meta ---
    const metaTop = 140;
    doc.fontSize(10).font("Helvetica").fillColor("#555555");
    doc.text(`Receipt No.`, 50, metaTop);
    doc.text(`Date`, 50, metaTop + 18);
    doc.text(`Status`, 50, metaTop + 36);

    doc.fillColor("#000000").font("Helvetica-Bold");
    doc.text(data.receiptNumber, 150, metaTop);
    doc.text(data.paidAt.toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" }), 150, metaTop + 18);
    doc.text(data.status, 150, metaTop + 36);

    // --- QR code, top right ---
    doc.image(qrBuffer, doc.page.width - 150, metaTop - 10, { width: 100 });

    // --- Divider ---
    doc
      .moveTo(50, metaTop + 70)
      .lineTo(doc.page.width - 50, metaTop + 70)
      .strokeColor("#DDDDDD")
      .stroke();

    // --- Payment details table ---
    const tableTop = metaTop + 100;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
    doc.text("Description", 50, tableTop);
    doc.text("Member", 280, tableTop);
    doc.text("Amount", doc.page.width - 150, tableTop, { width: 100, align: "right" });

    doc
      .moveTo(50, tableTop + 20)
      .lineTo(doc.page.width - 50, tableTop + 20)
      .strokeColor("#DDDDDD")
      .stroke();

    doc.font("Helvetica").fontSize(11);
    doc.text(data.categoryName, 50, tableTop + 32, { width: 220 });
    doc.text(data.memberName, 280, tableTop + 32, { width: 180 });
    doc.font("Helvetica-Bold").text(formatMoney(data.amountMinorUnits, data.currency), doc.page.width - 150, tableTop + 32, {
      width: 100,
      align: "right",
    });

    // --- Total ---
    const totalTop = tableTop + 80;
    doc
      .moveTo(50, totalTop)
      .lineTo(doc.page.width - 50, totalTop)
      .strokeColor(brandColor)
      .lineWidth(2)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text("Total Paid", 50, totalTop + 12);
    doc.text(formatMoney(data.amountMinorUnits, data.currency), doc.page.width - 150, totalTop + 12, {
      width: 100,
      align: "right",
    });

    // --- Footer ---
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#888888")
      .text(`Transaction reference: ${data.gatewayRef}`, 50, doc.page.height - 100)
      .text("This receipt was generated automatically by ClubHub. Scan the QR code to verify.", 50, doc.page.height - 85)
      .text("Powered by ClubHub — a Movax Technologies Ltd product.", 50, doc.page.height - 70);

    doc.end();
  });
}
