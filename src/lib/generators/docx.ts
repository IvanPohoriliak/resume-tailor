import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { StructuredResume } from '@/types';

export async function generateDocx(resume: StructuredResume): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Contact Information
          new Paragraph({
            children: [
              new TextRun({
                text: resume.contact.name,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: [
                  resume.contact.email,
                  resume.contact.phone,
                  resume.contact.linkedin,
                  resume.contact.location
                ].filter(Boolean).join(' | '),
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Summary
          ...(resume.summary ? [
            new Paragraph({
              text: 'PROFESSIONAL SUMMARY',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 200 },
            }),
            new Paragraph({
              text: resume.summary,
              spacing: { after: 400 },
            }),
          ] : []),

          // Experience
          new Paragraph({
            text: 'EXPERIENCE',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          }),

          ...resume.experience.flatMap((exp) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: exp.role,
                  bold: true,
                  size: 24,
                }),
                new TextRun({
                  text: ` | ${exp.company}`,
                  size: 24,
                }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({
              text: exp.dates,
              italics: true,
              spacing: { after: 100 },
            }),
            ...exp.bullets.map((bullet) => 
              new Paragraph({
                text: bullet,
                bullet: { level: 0 },
                spacing: { after: 100 },
              })
            ),
            new Paragraph({ text: '', spacing: { after: 200 } }),
          ]),

          // Education
          new Paragraph({
            text: 'EDUCATION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          }),

          ...resume.education.flatMap((edu) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: edu.degree,
                  bold: true,
                  size: 24,
                }),
                new TextRun({
                  text: ` | ${edu.school}`,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              text: edu.dates,
              italics: true,
              spacing: { after: edu.details ? 100 : 200 },
            }),
            ...(edu.details ? [
              new Paragraph({
                text: edu.details,
                spacing: { after: 200 },
              }),
            ] : []),
          ]),

          // Skills
          ...(resume.skills && resume.skills.length > 0 ? [
            new Paragraph({
              text: 'SKILLS',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 200 },
            }),
            new Paragraph({
              text: resume.skills.join(' • '),
              spacing: { after: 200 },
            }),
          ] : []),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
