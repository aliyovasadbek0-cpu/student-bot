import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
const PptxGenJS = require('pptxgenjs');
// @ts-ignore
const axios = require('axios');

@Injectable()
export class FileGenerationService {
  private readonly logger = new Logger(FileGenerationService.name);

  async generatePDF(content: string, filename: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'temp', `${filename}.pdf`);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      doc.fontSize(12);
      doc.text(content, {
        align: 'left',
        indent: 20,
      });
      
      doc.end();
      
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  async generatePPTX(slides: string[], filename: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'temp', `${filename}.pptx`);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const pptx = new (PptxGenJS as any)();
    
    slides.forEach((slideContent, index) => {
      const slide = pptx.addSlide();
      const lines = slideContent.split('\n');
      const title = lines[0] || `Slayd ${index + 1}`;
      const content = lines.slice(1).join('\n') || '';
      
      slide.addText(title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 24,
        bold: true,
        color: '363636',
      });
      
      if (content) {
        slide.addText(content, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5,
          fontSize: 14,
          color: '363636',
        });
      }
    });

    await pptx.writeFile({ fileName: filePath });
    return filePath;
  }

  async downloadImage(url: string, filename: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'temp', `${filename}.png`);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }

  async generateTXT(content: string, filename: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'temp', `${filename}.txt`);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  async generateCodeFile(content: string, filename: string, extension: string = 'txt'): Promise<string> {
    const filePath = path.join(process.cwd(), 'temp', `${filename}.${extension}`);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
}

