import jsPDF from "jspdf";
import QRCode from "qrcode";

type LabelOrder = {
  order_number: string;
  created_at: string;
  total_amount: number;
  delivery_type: string;
  delivery_address_snapshot: any;
  profiles?:
    | { name: string | null; email: string | null; phone?: string | null }
    | null;
  pickup_point?: string | null;
  paid_amount?: number;
  payment_type?: string;
  partial_payment_amount?: number;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function generateQR(text: string): Promise<string> {
  return await QRCode.toDataURL(text, { width: 200, margin: 1 });
}

export async function generateLabelPDF(
  orders: LabelOrder[],
  filename: string
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const labelW = 95;
  const labelH = 140;
  const marginX = 8;
  const marginY = 8;
  const gapX = 4;
  const gapY = 4;

  const labelsPerRow = 2;
  const labelsPerCol = 2;
  const perPage = labelsPerRow * labelsPerCol;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const indexOnPage = i % perPage;

    if (i > 0 && indexOnPage === 0) {
      pdf.addPage();
    }

    const col = indexOnPage % labelsPerRow;
    const row = Math.floor(indexOnPage / labelsPerRow);

    const x = marginX + col * (labelW + gapX);
    const y = marginY + row * (labelH + gapY);

    const isPickup = order.delivery_type === "self_pickup";

    // Border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, labelW, labelH);

    // Header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(x, y, labelW, 12, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Quickpin", x + labelW / 2, y + 8, { align: "center" });

    // Order number
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Order: ${order.order_number}`, x + 4, y + 20);
    pdf.text(`Date: ${formatDate(order.created_at)}`, x + 4, y + 25);

    // Divider
    pdf.setDrawColor(200, 200, 200);
    pdf.line(x + 4, y + 28, x + labelW - 4, y + 28);

    // Section header
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(isPickup ? "PICKUP BY:" : "DELIVER TO:", x + 4, y + 34);

    // Customer name
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");

    const addr = order.delivery_address_snapshot || {};
    const name = addr.full_name || order.profiles?.name || "Customer";
    pdf.text(name, x + 4, y + 41, { maxWidth: labelW - 8 });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    let cy = y + 48;

    // Phone
    const phone = addr.phone || order.profiles?.phone || "";
    if (phone) {
      pdf.text(`Phone: ${phone}`, x + 4, cy);
      cy += 6;
    }

    if (isPickup) {
      // SELF PICKUP
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("PICKUP FROM:", x + 4, cy);
      cy += 5;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");

      const pickupAddr = order.pickup_point || "Quickpin Store";
      const pickupLines = pdf.splitTextToSize(pickupAddr, labelW - 8);
      pickupLines.forEach((line: string) => {
        pdf.text(line, x + 4, cy);
        cy += 5;
      });

      pdf.setFillColor(255, 237, 213);
      pdf.roundedRect(x + 4, cy + 2, 42, 7, 2, 2, "F");
      pdf.setTextColor(194, 65, 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("SELF PICKUP", x + 8, cy + 7);
    } else {
      // HOME DELIVERY
      const addrLines: string[] = [];
      if (addr.address_line1) addrLines.push(addr.address_line1);
      if (addr.address_line2) addrLines.push(addr.address_line2);
      if (addr.city && addr.state && addr.pincode) {
        addrLines.push(`${addr.city}, ${addr.state} - ${addr.pincode}`);
      } else if (addr.city) {
        addrLines.push(addr.city);
      }

      addrLines.forEach((line) => {
        const wrapped = pdf.splitTextToSize(line, labelW - 8);
        wrapped.forEach((w: string) => {
          pdf.text(w, x + 4, cy);
          cy += 5;
        });
      });
    }

    // Divider
    pdf.setDrawColor(200, 200, 200);
    pdf.line(x + 4, y + 90, x + labelW - 4, y + 90);

    // Amount
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text("AMOUNT:", x + 4, y + 97);

    pdf.setFontSize(14);
    pdf.setTextColor(37, 99, 235);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Rs.${order.total_amount}`, x + 4, y + 105);

    // Payment badge
    const alreadyPaid = order.paid_amount || 0;
    const isPartial = order.payment_type === "partial";
    const codAmount = isPartial
      ? (order.total_amount || 0) - (order.partial_payment_amount || 0)
      : (order.total_amount || 0) - alreadyPaid;

    pdf.setFontSize(8);
    if (isPartial && codAmount > 0) {
      pdf.setTextColor(234, 88, 12);
      pdf.text(`COD: Rs.${codAmount.toFixed(2)}`, x + labelW - 34, y + 105);
    } else {
      pdf.setTextColor(22, 163, 74);
      pdf.text("PREPAID", x + labelW - 25, y + 105);
    }

    // QR Code
    const qrData = `ORDER:${order.order_number}|AMOUNT:${order.total_amount}|NAME:${name}`;
    try {
      const qrDataUrl = await generateQR(qrData);
      pdf.addImage(qrDataUrl, "PNG", x + labelW - 32, y + 30, 28, 28);
    } catch (e) {
      console.error("QR error:", e);
    }

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      "Thank you for shopping with Quickpin",
      x + labelW / 2,
      y + labelH - 5,
      { align: "center" }
    );
  }

  pdf.save(filename);
        }
