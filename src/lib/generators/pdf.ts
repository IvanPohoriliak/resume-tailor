import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { StructuredResume } from '@/types';

// Helper to safely format skills
const formatSkills = (skills: any): string => {
  if (!skills) return '';
  if (Array.isArray(skills)) return skills.join(' • ');
  if (typeof skills === 'object') return Object.values(skills).flat().filter(Boolean).join(' • ');
  return String(skills);
};

export async function generatePdf(resume: StructuredResume): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const margin = 50;
  const lineHeight = 14;

  // Helper function to draw text
  const drawText = (text: string, size: number, isBold = false, x = margin) => {
    page.drawText(text, {
      x,
      y: yPosition,
      size,
      font: isBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  };

  // Helper function to wrap text
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = font.widthOfTextAtSize(testLine, 10);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  // Name
  drawText(resume.contact.name, 24, true);
  yPosition -= 10;
  
  // Contact info
  const contactInfo = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.contact.location
  ].filter(Boolean).join(' | ');
  drawText(contactInfo, 10);
  yPosition -= 20;

  // Summary
  if (resume.summary) {
    drawText('PROFESSIONAL SUMMARY', 14, true);
    yPosition -= 5;
    const summaryLines = wrapText(resume.summary, width - 2 * margin);
    summaryLines.forEach(line => drawText(line, 10));
    yPosition -= 20;
  }

  // Experience
  drawText('EXPERIENCE', 14, true);
  yPosition -= 5;
  
  resume.experience.forEach((exp) => {
    drawText(`${exp.role} | ${exp.company}`, 11, true);
    drawText(exp.dates, 10);
    yPosition -= 5;
    
    exp.bullets.forEach((bullet) => {
      const bulletLines = wrapText(`• ${bullet}`, width - 2 * margin - 10);
      bulletLines.forEach((line, index) => {
        drawText(line, 10, false, margin + (index === 0 ? 0 : 10));
      });
    });
    yPosition -= 15;
  });

  // Education
  drawText('EDUCATION', 14, true);
  yPosition -= 5;
  
  resume.education.forEach((edu) => {
    drawText(`${edu.degree} | ${edu.school}`, 11, true);
    drawText(edu.dates, 10);
    if (edu.details) {
      drawText(edu.details, 10);
    }
    yPosition -= 15;
  });

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    drawText('SKILLS', 14, true);
    yPosition -= 5;
    const skillsText = formatSkills(resume.skills);
    const skillsLines = wrapText(skillsText, width - 2 * margin);
    skillsLines.forEach(line => drawText(line, 10));
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
