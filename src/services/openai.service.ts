import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @ts-ignore
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateText(prompt: string, maxTokens: number = 2000): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional educational content creator. Create high-quality, well-structured, and professional educational materials. Use proper formatting, clear structure, and avoid any encoding issues. Write in clean, academic style without special characters that may cause encoding problems.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      return response.data?.[0]?.url || '';
    } catch (error) {
      this.logger.error('OpenAI Image API error:', error);
      throw error;
    }
  }

  async generateReferat(topic: string, language: string, options?: { template?: string; pages?: number; additional?: string }): Promise<string> {
    const langText = language === 'uz' ? 'o\'zbek tilida' : 'на русском языке';
    const pages = options?.pages || 2;
    const template = options?.template || '1';
    const additional = options?.additional || '';
    
    let structure = '';
    if (template === '1') {
      structure = '1. Kirish (mavzuning ahamiyati va maqsadi)\n2. Asosiy qism (mavzuning asosiy tushunchalari, faktlar, misollar)\n3. Xulosa (asosiy fikrlar yig\'indisi)\n4. Manbalar ro\'yxati (3-5 ta manba)';
    } else if (template === '2') {
      structure = '1. Kirish (mavzuning ahamiyati va maqsadi)\n2. Asosiy qism (mavzuning asosiy tushunchalari, faktlar)\n3. Misollar va amaliyot (batafsil misollar va qo\'llanilishi)\n4. Xulosa (asosiy fikrlar yig\'indisi)\n5. Manbalar ro\'yxati (5-7 ta manba)';
    } else if (template === '3') {
      structure = '1. Kirish (mavzuning ahamiyati va maqsadi)\n2. Nazariy asoslar (mavzuning nazariy jihatlari)\n3. Amaliy qo\'llanilishi (qanday qo\'llaniladi)\n4. Tahlil va misollar (batafsil tahlil va misollar)\n5. Xulosa (asosiy fikrlar yig\'indisi)\n6. Manbalar ro\'yxati (7-10 ta manba)';
    } else {
      structure = additional || '1. Kirish\n2. Asosiy qism\n3. Xulosa\n4. Manbalar ro\'yxati';
    }
    
    const prompt = language === 'uz' 
      ? `Yozing ${langText} professional, sifatli va murakkab ${pages} sahifali referat "${topic}" mavzusida. 

MUHIM TALABLAR:
- Referat professional, ilmiy va yuksak sifatli bo'lishi kerak
- Talaba yoki o'qituvchi tomonidan yozilganday professional ko'rinishda bo'lishi kerak
- Quyidagi aniq strukturaga ega bo'lishi kerak:
${structure}
${additional && additional.toLowerCase() !== 'tayyor' ? `- Qo'shimcha talablar: ${additional}` : ''}
- Matn aniq, tushunarli, ilmiy va professional uslubda yozilgan bo'lishi kerak
- Har bir bo'lim batafsil, mazmunli va to'liq bo'lishi kerak
- Maxsus belgilar va formulalarni oddiy matn ko'rinishida yozing (masalan: x^2 o'rniga "x kvadrat")
- Umumiy hajmi ${pages} sahifa (${pages * 500}-${pages * 1000} so'z)
- Kontent professional, murakkab va chuqur bo'lishi kerak
- Kichkina bola yozganday emas, professional mutaxassis yozganday bo'lishi kerak`
      : `Напишите ${langText} профессиональный, качественный и сложный реферат на ${pages} страниц по теме "${topic}".

ВАЖНЫЕ ТРЕБОВАНИЯ:
- Реферат должен быть профессиональным, научным и высокого качества
- Должен выглядеть как написанный студентом или преподавателем профессионально
- Должен иметь следующую четкую структуру:
${structure}
${additional && additional.toLowerCase() !== 'готово' ? `- Дополнительные требования: ${additional}` : ''}
- Текст должен быть четким, понятным, научным и профессиональным стилем
- Каждый раздел должен быть подробным, содержательным и полным
- Специальные символы и формулы пишите в виде простого текста (например: x^2 вместо "x в квадрате")
- Общий объем ${pages} страниц (${pages * 500}-${pages * 1000} слов)
- Контент должен быть профессиональным, сложным и глубоким
- Не должно выглядеть как написанное маленьким ребенком, а как профессиональным специалистом`;
    
    return this.generateText(prompt, pages * 1000);
  }

  async generateMustaqilIsh(topic: string, language: string, options?: { template?: string; pages?: number; additional?: string }): Promise<string> {
    const langText = language === 'uz' ? 'o\'zbek tilida' : 'на русском языке';
    const pages = options?.pages || 2;
    const template = options?.template || '1';
    const additional = options?.additional || '';
    
    let structure = '';
    if (template === '1') {
      structure = '1. Kirish (mavzu va maqsad)\n2. Vazifalar (2-3 ta aniq vazifa)\n3. Yechimlar (har bir vazifa uchun batafsil yechim)\n4. Natijalar (hisob-kitoblar va xulosa)\n5. Xulosa (umumiy natijalar)';
    } else if (template === '2') {
      structure = '1. Kirish (mavzu va maqsad)\n2. Nazariy asoslar (qisqacha nazariya)\n3. Vazifalar (3-5 ta aniq vazifa)\n4. Yechimlar (har bir vazifa uchun batafsil yechim)\n5. Natijalar va tahlil (hisob-kitoblar, grafiklar, tahlil)\n6. Xulosa (umumiy natijalar va tavsiyalar)';
    } else if (template === '3') {
      structure = '1. Kirish (mavzu va maqsad)\n2. Nazariy asoslar (batafsil nazariya)\n3. Metodologiya (qanday yechiladi)\n4. Vazifalar (5-7 ta murakkab vazifa)\n5. Yechimlar (har bir vazifa uchun batafsil yechim va izohlar)\n6. Natijalar va tahlil (hisob-kitoblar, grafiklar, jadval, tahlil)\n7. Xulosa (umumiy natijalar, tavsiyalar va kelajakdagi tadqiqotlar)';
    } else {
      structure = additional || '1. Kirish\n2. Vazifalar\n3. Yechimlar\n4. Natijalar\n5. Xulosa';
    }
    
    const prompt = language === 'uz'
      ? `Yozing ${langText} professional, sifatli va murakkab ${pages} sahifali mustaqil ish "${topic}" mavzusida.

MUHIM TALABLAR:
- Mustaqil ish professional, ilmiy va yuksak sifatli bo'lishi kerak
- Talaba yoki o'qituvchi tomonidan yozilganday professional ko'rinishda bo'lishi kerak
- Quyidagi aniq strukturaga ega bo'lishi kerak:
${structure}
${additional && additional.toLowerCase() !== 'tayyor' ? `- Qo'shimcha talablar: ${additional}` : ''}
- Har bir vazifa aniq, tushunarli va batafsil yechilgan bo'lishi kerak
- Hisob-kitoblar to'g'ri, aniq va batafsil ko'rsatilgan bo'lishi kerak
- Har bir qadam tushuntirilgan bo'lishi kerak
- Maxsus belgilar va formulalarni oddiy matn ko'rinishida yozing (masalan: x^2 o'rniga "x kvadrat")
- Matn aniq, tushunarli va ilmiy uslubda yozilgan bo'lishi kerak
- Umumiy hajmi ${pages} sahifa (${pages * 500}-${pages * 1000} so'z)
- Kontent professional, murakkab va chuqur bo'lishi kerak
- Kichkina bola yozganday emas, professional mutaxassis yozganday bo'lishi kerak`
      : `Напишите ${langText} профессиональную, качественную и сложную самостоятельную работу на ${pages} страниц по теме "${topic}".

ВАЖНЫЕ ТРЕБОВАНИЯ:
- Работа должна быть профессиональной, научной и высокого качества
- Должна выглядеть как написанная студентом или преподавателем профессионально
- Должна иметь следующую четкую структуру:
${structure}
${additional && additional.toLowerCase() !== 'готово' ? `- Дополнительные требования: ${additional}` : ''}
- Каждое задание должно быть четким, понятным и подробно решенным
- Расчеты должны быть правильными, точными и подробно показанными
- Каждый шаг должен быть объяснен
- Специальные символы и формулы пишите в виде простого текста (например: x^2 вместо "x в квадрате")
- Текст должен быть четким, понятным и написан в научном стиле
- Общий объем ${pages} страниц (${pages * 500}-${pages * 1000} слов)
- Контент должен быть профессиональным, сложным и глубоким
- Не должно выглядеть как написанное маленьким ребенком, а как профессиональным специалистом`;
    
    return this.generateText(prompt, pages * 1000);
  }

  async generateSlaydContent(topic: string, language: string): Promise<string[]> {
    const langText = language === 'uz' ? 'o\'zbek tilida' : 'на русском языке';
    const prompt = `Yarating ${langText} 3-5 ta slayd "${topic}" mavzusida. Har bir slayd uchun sarlavha va asosiy mazmunni alohida qatorlarda yozing. Format: "Slayd 1: [Sarlavha]\n[Mazmun]"`;
    
    const content = await this.generateText(prompt, 1000);
    return this.parseSlides(content, topic);
  }

  async generateKrossvord(topic: string, language: string): Promise<string> {
    const langText = language === 'uz' ? 'o\'zbek tilida' : 'на русском языке';
    const prompt = language === 'uz'
      ? `Yarating ${langText} professional va sifatli 5-10 ta test savoli "${topic}" mavzusida.

Talablar:
- Har bir savol aniq, tushunarli va mavzuga mos bo'lishi kerak
- Har bir savol uchun 4 ta variant javob (a, b, c, d)
- To'g'ri javob aniq belgilangan bo'lishi kerak
- Format: "1. Savol?\na) Variant 1\nb) Variant 2\nc) Variant 3\nd) Variant 4\nTo'g'ri javob: a)"
- Savollar turli darajadagi qiyinchilikda bo'lishi kerak
- Maxsus belgilar va formulalarni oddiy matn ko'rinishida yozing`
      : `Создайте ${langText} профессиональные и качественные 5-10 тестовых вопросов по теме "${topic}".

Требования:
- Каждый вопрос должен быть четким, понятным и соответствовать теме
- Для каждого вопроса 4 варианта ответа (a, b, c, d)
- Правильный ответ должен быть четко указан
- Формат: "1. Вопрос?\na) Вариант 1\nb) Вариант 2\nc) Вариант 3\nd) Вариант 4\nПравильный ответ: a)"
- Вопросы должны быть разного уровня сложности
- Специальные символы и формулы пишите в виде простого текста`;
    
    return this.generateText(prompt, 1500);
  }

  async generateCode(task: string, language: string): Promise<string> {
    const langText = language === 'uz' ? 'o\'zbek tilida' : 'на русском языке';
    const prompt = `Yozing kod ${langText} quyidagi vazifa uchun: "${task}". Kodga izohlar qo'shing.`;
    
    return this.generateText(prompt, 2000);
  }

  private parseSlides(content: string, topic: string): string[] {
    const slides: string[] = [];
    const slideRegex = /Slayd \d+:\s*\[([^\]]+)\]\s*\[([^\]]+)\]/gi;
    let match;

    while ((match = slideRegex.exec(content)) !== null) {
      slides.push(`${match[1]}\n${match[2]}`);
    }

    if (slides.length === 0) {
      const lines = content.split('\n').filter(l => l.trim());
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        slides.push(lines[i] || `Slayd ${i + 1}`);
      }
    }

    return slides.length > 0 ? slides : [`Slayd 1: ${topic}`];
  }
}

