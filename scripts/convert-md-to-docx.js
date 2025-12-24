/**
 * Convert Markdown to DOCX
 * Converts ML Architecture Executive Summary to Word format
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

// Read markdown content
const mdPath = path.join(__dirname, '..', 'docs', 'study_docs', 'ML_Architecture_Executive_Summary.md');
const mdContent = fs.readFileSync(mdPath, 'utf-8');

// Parse markdown into sections
function parseMarkdown(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  let inCodeBlock = false;
  let inTable = false;
  let tableRows = [];

  for (const line of lines) {
    // Handle code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock && currentSection) {
        currentSection.content.push({ type: 'code-end' });
      } else if (currentSection) {
        currentSection.content.push({ type: 'code-start', lang: line.slice(3) });
      }
      continue;
    }

    if (inCodeBlock) {
      if (currentSection) {
        currentSection.content.push({ type: 'code', text: line });
      }
      continue;
    }

    // Handle tables
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      if (!line.includes('---')) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      inTable = false;
      if (currentSection && tableRows.length > 0) {
        currentSection.content.push({ type: 'table', rows: tableRows });
      }
      tableRows = [];
    }

    // H1
    if (line.startsWith('# ')) {
      currentSection = { level: 1, title: line.slice(2).trim(), content: [] };
      sections.push(currentSection);
    }
    // H2
    else if (line.startsWith('## ')) {
      currentSection = { level: 2, title: line.slice(3).trim(), content: [] };
      sections.push(currentSection);
    }
    // H3
    else if (line.startsWith('### ')) {
      currentSection = { level: 3, title: line.slice(4).trim(), content: [] };
      sections.push(currentSection);
    }
    // Regular text
    else if (line.trim() && currentSection) {
      // Bold text handling
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<<BOLD>>$1<<ENDBOLD>>');
      // Location references
      const locationLine = processedLine.replace(/`([^`]+)`/g, '<<CODE>>$1<<ENDCODE>>');
      currentSection.content.push({ type: 'text', text: locationLine });
    }
    // Empty line
    else if (!line.trim() && currentSection) {
      currentSection.content.push({ type: 'break' });
    }
  }

  return sections;
}

// Create document
async function createDocx() {
  const sections = parseMarkdown(mdContent);
  const children = [];

  // Title styling
  children.push(
    new Paragraph({
      text: 'Aves ML Architecture',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      text: 'Executive Summary',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Document Version: ', bold: true }),
        new TextRun('1.0'),
        new TextRun({ text: '    |    Date: ', bold: true }),
        new TextRun('December 21, 2025'),
        new TextRun({ text: '    |    Status: ', bold: true }),
        new TextRun('Production-Ready'),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Process sections
  for (const section of sections) {
    // Skip the main title as we've already added it
    if (section.level === 1 && section.title.includes('Executive Summary')) continue;

    // Add heading
    const headingLevel = section.level === 1 ? HeadingLevel.HEADING_1 :
                        section.level === 2 ? HeadingLevel.HEADING_2 :
                        HeadingLevel.HEADING_3;

    children.push(
      new Paragraph({
        text: section.title,
        heading: headingLevel,
        spacing: { before: 300, after: 200 },
      })
    );

    // Process content
    let inCodeBlock = false;
    let codeLines = [];

    for (const item of section.content) {
      if (item.type === 'code-start') {
        inCodeBlock = true;
        codeLines = [];
      } else if (item.type === 'code-end') {
        inCodeBlock = false;
        // Add code block as monospace text
        if (codeLines.length > 0) {
          children.push(
            new Paragraph({
              children: codeLines.map((line, i) =>
                new TextRun({
                  text: line + (i < codeLines.length - 1 ? '\n' : ''),
                  font: 'Consolas',
                  size: 20,
                })
              ),
              spacing: { before: 100, after: 100 },
              shading: { fill: 'F0F0F0' },
            })
          );
        }
      } else if (item.type === 'code') {
        codeLines.push(item.text);
      } else if (item.type === 'table') {
        // Create table
        const tableRows = item.rows.map((row, rowIndex) =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: cell,
                    bold: rowIndex === 0,
                    size: 22,
                  })],
                })],
                width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                shading: rowIndex === 0 ? { fill: 'E8E8E8' } : undefined,
              })
            ),
          })
        );

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      } else if (item.type === 'text') {
        // Process text with formatting
        const textRuns = [];
        let text = item.text;

        // Handle bullet points
        const isBullet = text.trim().startsWith('- ') || text.trim().startsWith('* ');
        if (isBullet) {
          text = '  ' + text.trim().substring(2);
        }

        // Handle numbered lists
        const numberMatch = text.trim().match(/^(\d+)\.\s+/);
        if (numberMatch) {
          text = '  ' + text.trim();
        }

        // Split by formatting markers
        const parts = text.split(/(<<BOLD>>|<<ENDBOLD>>|<<CODE>>|<<ENDCODE>>)/);
        let bold = false;
        let code = false;

        for (const part of parts) {
          if (part === '<<BOLD>>') { bold = true; continue; }
          if (part === '<<ENDBOLD>>') { bold = false; continue; }
          if (part === '<<CODE>>') { code = true; continue; }
          if (part === '<<ENDCODE>>') { code = false; continue; }

          if (part) {
            textRuns.push(new TextRun({
              text: part,
              bold: bold,
              font: code ? 'Consolas' : undefined,
              size: code ? 20 : 24,
              shading: code ? { fill: 'F5F5F5' } : undefined,
            }));
          }
        }

        if (textRuns.length > 0) {
          children.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 100 },
              bullet: isBullet ? { level: 0 } : undefined,
            })
          );
        }
      } else if (item.type === 'break') {
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    }
  }

  // Add footer
  children.push(
    new Paragraph({
      text: '---',
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Document generated from codebase analysis - December 2025',
          italics: true,
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: children,
    }],
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: {
            size: 24,
            font: 'Calibri',
          },
        },
      ],
    },
  });

  // Write file
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'docs', 'study_docs', 'ML_Architecture_Executive_Summary.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log('DOCX file created:', outputPath);
}

createDocx().catch(console.error);
