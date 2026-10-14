import { PDFDocument, PageSizes, StandardFonts, rgb } from "pdf-lib";
import { budgetItemAmount, type CreateBudgetPdfRequest } from "@cardoc/types";
import { budgetRacingHero } from "../assets/budget-racing-hero.js";

// Native PDF adaptation of docs/templates/cardoc-racing; no browser or remote assets in Edge.
export const createBudgetPdf = async (input: CreateBudgetPdfRequest) => {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const italic = await document.embedFont(StandardFonts.HelveticaBoldOblique);
  const hero = await document.embedJpg(budgetRacingHero);
  const [width, height] = PageSizes.A4;
  const margin = 25.5;
  const right = width - margin;
  const usable = right - margin;
  const color = (hex: string) =>
    rgb(...(hex.match(/../g)!.map((v) => parseInt(v, 16) / 255) as [number, number, number]));
  const white = color("f5f6f9"),
    red = color("e31524"),
    muted = color("aab0bc"),
    line = color("3a404a");
  let page = document.addPage(PageSizes.A4);
  let y = 0;
  const box = (x: number, top: number, w: number, h: number, fill: string, border = false) =>
    page.drawRectangle({
      x,
      y: height - top - h,
      width: w,
      height: h,
      color: color(fill),
      ...(border ? { borderColor: line, borderWidth: 0.5 } : {}),
    });
  const text = (value: string, x: number, top: number, size = 10, font = regular, ink = white) =>
    page.drawText(value, { x, y: height - top - size, size, font, color: ink });
  const wrap = (value: string, maxWidth: number, size = 10, font = regular) => {
    const lines: string[] = [];
    let current = "";
    for (const character of value) {
      if (font.widthOfTextAtSize(current + character, size) > maxWidth) {
        const space = current.lastIndexOf(" ");
        if (space > 0) {
          lines.push(current.slice(0, space));
          current = current.slice(space + 1);
        } else {
          lines.push(current);
          current = "";
        }
      }
      current += character;
    }
    if (current) lines.push(current);
    return lines;
  };
  const number = (value: string, x: number, top: number, w: number, size = 9, font = regular) => {
    const fitted = Math.min(size, (size * w) / font.widthOfTextAtSize(value, size));
    text(value, x + w - font.widthOfTextAtSize(value, fitted), top, fitted, font);
  };
  const money = (value: number) =>
    `$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const checkers = (x: number, top: number, columns = 6, size = 6, ink = "aab0bc") => {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < columns; col++)
        if ((row + col) % 2 === 0) box(x + col * size, top + row * size, size, size, ink);
  };
  const background = () => box(0, 0, width, height, "080b11");
  const brand = (x: number, top: number, size: number) => {
    text("Car", x, top, size, italic);
    text("Doc", x + italic.widthOfTextAtSize("Car", size), top, size, italic, red);
  };
  const footer = () => {
    for (let x = margin; x < right - 90; x += 19) box(x, 804, 13, 3, "e31524");
    brand(right - 63, 798, 11);
    text(`${document.getPageCount()}`, right - 8, 819, 7, regular, muted);
  };
  const columns = [
    margin,
    margin + usable * 0.43,
    margin + usable * 0.58,
    margin + usable * 0.8,
    right,
  ];
  const tableHeader = () => {
    text("DETALLE DE ÍTEMS", margin + 12, y, 8, bold);
    box(margin, y, 4, 12, "e31524");
    text("///", right - 25, y - 3, 13, bold, red);
    y += 23;
    box(margin, y, usable, 28, "c91323");
    text("Descripción", margin + 9, y + 8, 9, bold);
    ["Cantidad", "Precio unitario", "Subtotal"].forEach((label, index) =>
      number(
        label,
        columns[index + 1] + 6,
        y + 8,
        columns[index + 2] - columns[index + 1] - 15,
        8.5,
        bold,
      ),
    );
    y += 28;
  };
  const continuation = () => {
    footer();
    page = document.addPage(PageSizes.A4);
    background();
    brand(margin, 26, 22);
    text("PRESUPUESTO DE SERVICIO", margin + 125, 35, 12, italic);
    box(margin, 65, usable, 2, "e31524");
    y = 85;
    tableHeader();
  };
  background();
  // The supplied hero has the same wide aspect ratio as the reference header.
  page.drawImage(hero, { x: margin, y: height - margin - 198, width: usable, height: 198 });
  page.drawRectangle({
    x: margin,
    y: height - margin - 198,
    width: usable * 0.48,
    height: 198,
    color: color("05070b"),
    opacity: 0.55,
  });
  box(margin, margin, usable, 2.5, "e31524");
  box(margin, margin + 196, usable, 2, "e31524");
  brand(margin + 21, margin + 25, 37);
  text("TU AUTO EN BUENAS MANOS", margin + 23, margin + 71, 8, bold);
  [20, 14, 9].forEach((w, i) =>
    box(margin + 23 + i * 25, margin + 101, w, 4, i === 1 ? "f5f6f9" : "e31524"),
  );
  text("PERFORMANCE", margin + 21, margin + 171, 7, bold);
  text("///", margin + 111, margin + 164, 15, bold, red);
  text("RACING EDITION", right - 110, margin + 171, 7, bold);
  y = 247;
  box(margin, y, 4, 22, "e31524");
  text("PRESUPUESTO", margin + 15, y, 21, italic);
  text("DE SERVICIO", margin + 191, y, 21, italic, red);
  checkers(right - 36, y + 2);
  box(margin, y + 34, usable, 0.7, "970811");
  y += 52;
  const gap = 8,
    leftWidth = (usable - gap) * 0.608,
    rightWidth = usable - gap - leftWidth;
  const details = [
    ["CLIENTE", input.customer.fullName, "DOMINIO", input.vehicle.plate],
    ["VEHÍCULO", input.vehicle.name, "FECHA", input.date.split("-").reverse().join("/")],
  ];
  for (const [leftLabel, leftValue, rightLabel, rightValue] of details) {
    const leftLines = wrap(leftValue, leftWidth - 24, 11, bold);
    const rightLines = wrap(rightValue, rightWidth - 24, 11, bold);
    const h = Math.max(52, 29 + Math.max(leftLines.length, rightLines.length) * 14);
    for (const [x, w, label, lines] of [
      [margin, leftWidth, leftLabel, leftLines],
      [margin + leftWidth + gap, rightWidth, rightLabel, rightLines],
    ] as const) {
      box(x, y, w, h, "10151e", true);
      box(x, y, 2.5, h, "e31524");
      text(label, x + 12, y + 9, 7.3, bold, color("ff3644"));
      lines.forEach((value, i) => text(value, x + 12, y + 25 + i * 14, 11, bold));
    }
    y += h + gap;
  }
  y += 15;
  tableHeader();
  let totalCents = 0;
  input.items.forEach((item, index) => {
    const lines = wrap(item.description, columns[1] - margin - 18, 9.4);
    const rowHeight = Math.max(33, lines.length * 13 + 16);
    if (y + rowHeight > 770) continuation();
    box(margin, y, usable, rowHeight, index % 2 === 0 ? "10151d" : "1c212a", true);
    lines.forEach((value, i) => text(value, margin + 9, y + 9 + i * 13, 9.4));
    const amount = budgetItemAmount(item);
    totalCents += Math.round(amount * 100);
    [
      item.quantity.toLocaleString("es-AR", { maximumFractionDigits: 3 }),
      money(item.unitPrice),
      money(amount),
    ].forEach((value, i) =>
      number(value, columns[i + 1] + 6, y + 10, columns[i + 2] - columns[i + 1] - 15),
    );
    for (const x of columns.slice(1, -1))
      page.drawLine({
        start: { x, y: height - y },
        end: { x, y: height - y - rowHeight },
        thickness: 0.5,
        color: line,
      });
    y += rowHeight;
  });
  if (y + 110 > 775) continuation();
  y += 18;
  checkers(margin + 12, y + 6, 8, 12, "393d45");
  box(margin + 6, y + 62, 150, 1.5, "970811");
  const summaryWidth = 235,
    summaryX = right - summaryWidth;
  box(summaryX, y, summaryWidth, 37, "141920", true);
  box(summaryX, y + 37, summaryWidth, 43, "d51929", true);
  text("Subtotal", summaryX + 12, y + 12, 10, bold);
  number(money(totalCents / 100), summaryX + 74, y + 11, summaryWidth - 86, 11, bold);
  text("Total", summaryX + 12, y + 49, 14, bold);
  number(money(totalCents / 100), summaryX + 65, y + 49, summaryWidth - 77, 15, bold);
  footer();
  return document.save();
};
