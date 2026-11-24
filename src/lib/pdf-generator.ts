import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface PdfSeedInfo {
  titleAr: string;
  titleEn: string;
  author: string;
  categoryNameEn: string;
  descriptionAr: string;
  pageCount: number;
  slug: string;
}

export async function generateSampleBookPdf(info: PdfSeedInfo): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(info.titleEn || info.slug);
  pdfDoc.setAuthor(info.author || 'Al-Maktaba Al-Raqamiya Al-Fakhira');
  pdfDoc.setSubject(info.categoryNameEn || 'Digital Library Edition');
  pdfDoc.setCreator('Luxury Arabic Digital Library');

  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const navy = rgb(0.024, 0.082, 0.184);
  const royalBlue = rgb(0.063, 0.153, 0.29);
  const gold = rgb(0.91, 0.725, 0.31);
  const white = rgb(1, 1, 1);
  const slate = rgb(0.25, 0.3, 0.38);
  const cream = rgb(0.985, 0.975, 0.945);

  // Page 1: Luxury Cover Page
  const coverPage = pdfDoc.addPage([595, 842]);
  coverPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: navy });
  coverPage.drawRectangle({
    x: 28,
    y: 28,
    width: 539,
    height: 786,
    borderColor: gold,
    borderWidth: 2,
    color: royalBlue,
  });
  coverPage.drawRectangle({
    x: 38,
    y: 38,
    width: 519,
    height: 766,
    borderColor: gold,
    borderWidth: 0.75,
  });

  coverPage.drawText('LUXURY ARABIC DIGITAL LIBRARY', {
    x: 135,
    y: 745,
    size: 14,
    font: fontBold,
    color: gold,
  });

  coverPage.drawLine({
    start: { x: 90, y: 725 },
    end: { x: 505, y: 725 },
    thickness: 1,
    color: gold,
  });

  const safeTitle = (info.titleEn || info.slug.replace(/-/g, ' ')).slice(0, 48);
  coverPage.drawText(safeTitle, {
    x: 70,
    y: 520,
    size: 26,
    font: fontBold,
    color: white,
    maxWidth: 455,
  });

  coverPage.drawText(`Category: ${info.categoryNameEn}`, {
    x: 70,
    y: 440,
    size: 13,
    font: fontRegular,
    color: gold,
  });

  coverPage.drawText(`Edition Reference: ${info.slug.toUpperCase()}`, {
    x: 70,
    y: 412,
    size: 11,
    font: fontMono,
    color: rgb(0.82, 0.86, 0.92),
  });

  coverPage.drawRectangle({
    x: 70,
    y: 120,
    width: 455,
    height: 110,
    color: navy,
    borderColor: gold,
    borderWidth: 1,
  });

  coverPage.drawText('Digital Archival Edition - Full Online Reader Ready', {
    x: 92,
    y: 185,
    size: 13,
    font: fontBold,
    color: gold,
  });

  coverPage.drawText(
    'Published exclusively via Al-Maktaba Al-Raqamiya Al-Fakhira Platform.',
    {
      x: 92,
      y: 155,
      size: 11,
      font: fontRegular,
      color: white,
    }
  );

  // Pages 2-4: Structured Reading Chapters
  const chapters = [
    {
      heading: 'Chapter 1: Foundations & Core Principles',
      paragraphs: [
        'Welcome to the digital edition curated by the Luxury Arabic Digital Library. Every volume in our collection is formatted for high-clarity reading across desktop, tablet, and mobile screens.',
        'Knowledge thrives when preservation meets accessibility. This edition brings structured reference notes, key concepts, and executive summaries together in a portable archival PDF.',
        'Key study focus: understanding core terminology, historical lineage, and practical application frameworks across modern disciplines.',
      ],
    },
    {
      heading: 'Chapter 2: Methodology & Analytical Insights',
      paragraphs: [
        'Systematic reading begins with mapping the overarching thesis before diving into granular chapters. Readers are encouraged to review each section sequentially and annotate key insights.',
        'Modern research underscores the importance of cross-disciplinary synthesis: connecting classical foundations with contemporary digital tooling and analytical rigor.',
        'Use the built-in browser reader controls to navigate smoothly between pages, zoom in on technical details, or download this copy for offline reference.',
      ],
    },
    {
      heading: 'Chapter 3: Practical Takeaways & Reference Index',
      paragraphs: [
        '1. Establish clear reading objectives prior to each study session.',
        '2. Synthesize principles into actionable summaries and real-world workflows.',
        '3. Revisit core definitions periodically to reinforce long-term retention.',
        'Thank you for reading with Al-Maktaba Al-Raqamiya Al-Fakhira.',
      ],
    },
  ];

  chapters.forEach((chapter, idx) => {
    const page = pdfDoc.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: cream });
    page.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: navy });
    page.drawText(safeTitle, {
      x: 48,
      y: 810,
      size: 12,
      font: fontBold,
      color: gold,
    });
    page.drawText(`Page ${idx + 2} of ${chapters.length + 1}`, {
      x: 468,
      y: 810,
      size: 10,
      font: fontMono,
      color: white,
    });

    page.drawText(chapter.heading, {
      x: 48,
      y: 725,
      size: 19,
      font: fontBold,
      color: navy,
    });

    page.drawLine({
      start: { x: 48, y: 710 },
      end: { x: 547, y: 710 },
      thickness: 1.5,
      color: gold,
    });

    let yCursor = 665;
    for (const para of chapter.paragraphs) {
      page.drawText(para, {
        x: 48,
        y: yCursor,
        size: 13,
        font: fontRegular,
        color: slate,
        maxWidth: 495,
        lineHeight: 21,
      });
      yCursor -= 115;
    }

    page.drawLine({
      start: { x: 48, y: 55 },
      end: { x: 547, y: 55 },
      thickness: 0.75,
      color: gold,
    });
    page.drawText('Al-Maktaba Al-Raqamiya Al-Fakhira  |  Digital PDF Archive', {
      x: 48,
      y: 35,
      size: 10,
      font: fontRegular,
      color: slate,
    });
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
