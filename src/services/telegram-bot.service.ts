import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @ts-ignore
const TelegramBot = require('node-telegram-bot-api');
import { UserService } from './user.service';
import { LanguageService } from './language.service';
import { OpenAIService } from './openai.service';
import { FileGenerationService } from './file-generation.service';
import { PaymentService } from './payment.service';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: any;
  private userStates: Map<number, { state: string; data?: any }> = new Map();
  private pendingPayments: Map<string, { chatId: number; telegramId: number; serviceType: string; topic: string; lang: string; packageType?: string; packageTopics?: string[] }> = new Map();

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private languageService: LanguageService,
    private openaiService: OpenAIService,
    private fileGenerationService: FileGenerationService,
    private paymentService: PaymentService,
  ) {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN is required');
    }
    
    // Production'da webhook ishlatish, development'da polling
    const webhookUrl = this.configService.get<string>('WEBHOOK_URL');
    const usePolling = this.configService.get<string>('USE_POLLING') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Agar webhook URL mavjud bo'lsa va production'da bo'lsak, webhook ishlatamiz
    if (webhookUrl && isProduction && !usePolling) {
      // Webhook rejimi
      this.bot = new TelegramBot(token);
      this.bot.setWebHook(webhookUrl);
      this.logger.log(`Webhook mode: ${webhookUrl}`);
    } else {
      // Polling rejimi (development yoki USE_POLLING=true bo'lsa)
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('Polling mode enabled');
    }
  }

  async onModuleInit() {
    this.setupHandlers();
    this.logger.log('Telegram bot started');
  }

  async onModuleDestroy() {
    if (this.bot && typeof this.bot.stopPolling === 'function') {
      this.bot.stopPolling();
    }
    if (this.bot && typeof this.bot.deleteWebHook === 'function') {
      await this.bot.deleteWebHook();
    }
  }

  async handleWebhookUpdate(update: any) {
    // Webhook orqali kelgan update'larni qayta ishlash
    this.bot.processUpdate(update);
  }

  private setupHandlers() {
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    this.bot.onText(/\/menu/, async (msg) => {
      await this.handleMenu(msg);
    });

    this.bot.onText(/\/packages/, async (msg) => {
      await this.handlePackages(msg);
    });

    this.bot.onText(/\/support/, async (msg) => {
      await this.handleSupport(msg);
    });

    this.bot.on('callback_query', async (query) => {
      await this.handleCallbackQuery(query);
    });

    this.bot.on('message', async (msg) => {
      if (!msg.text?.startsWith('/')) {
        await this.handleMessage(msg);
      }
    });
  }

  private async handleStart(msg: any) {
    const chatId = msg.chat.id;
    if (!msg.from) return;
    const telegramId = msg.from.id;

    const user = await this.userService.findOrCreate(telegramId);

    if (!user.language || user.language === 'uz') {
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🇺🇿 O\'zbekcha', callback_data: 'lang_uz' }],
            [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
          ],
        },
      };
      await this.bot.sendMessage(chatId, this.languageService.getTranslation('uz', 'welcome'), keyboard);
      await this.bot.sendMessage(chatId, this.languageService.getTranslation('uz', 'chooseLanguage'));
    } else {
      await this.showMenu(chatId, user.language);
    }
  }

  private async handleMenu(msg: any) {
    const chatId = msg.chat.id;
    if (!msg.from) return;
    const telegramId = msg.from.id;
    const user = await this.userService.getUser(telegramId);
    const lang = user?.language || 'uz';
    await this.showMenu(chatId, lang);
  }

  private async handlePackages(msg: any) {
    const chatId = msg.chat.id;
    if (!msg.from) return;
    const telegramId = msg.from.id;
    const user = await this.userService.getUser(telegramId);
    const lang = user?.language || 'uz';
    await this.showPackages(chatId, lang);
  }

  private async handleSupport(msg: any) {
    const chatId = msg.chat.id;
    if (!msg.from) return;
    const telegramId = msg.from.id;
    const user = await this.userService.getUser(telegramId);
    const lang = user?.language || 'uz';
    
    const supportMsg = this.languageService.getTranslation(lang, 'support.message');
    await this.bot.sendMessage(chatId, supportMsg);
  }

  private async handleCallbackQuery(query: any) {
    if (!query.message) return;
    const chatId = query.message.chat.id;
    const telegramId = query.from.id;
    const data = query.data;
    if (!data) return;

    if (data.startsWith('lang_')) {
      const lang = data.split('_')[1];
      await this.userService.updateLanguage(telegramId, lang);
      await this.bot.answerCallbackQuery(query.id, { text: 'Til tanlandi / Язык выбран' });
      await this.showMenu(chatId, lang);
      return;
    }

    const user = await this.userService.getUser(telegramId);
    const lang = user?.language || 'uz';
    const state = this.userStates.get(telegramId);

    if (data === 'menu') {
      await this.showMenu(chatId, lang);
    } else if (data === 'packages') {
      await this.showPackages(chatId, lang);
    } else if (data === 'change_lang') {
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🇺🇿 O\'zbekcha', callback_data: 'lang_uz' }],
            [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
          ],
        },
      };
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'chooseLanguage'), keyboard);
    } else if (data === 'support') {
      const supportMsg = this.languageService.getTranslation(lang, 'support.message');
      await this.bot.sendMessage(chatId, supportMsg);
    } else if (data.startsWith('template_')) {
      const templateNum = data.split('_')[1];
      const state = this.userStates.get(telegramId);
      if (state?.state === 'waiting_template' && state.data) {
        state.data.template = templateNum;
        state.state = 'waiting_pages';
        this.userStates.set(telegramId, state);
        const pagesMsg = this.languageService.getTranslation(lang, 'services.enterPages');
        await this.bot.sendMessage(chatId, pagesMsg);
      }
    } else if (data.startsWith('service_')) {
      const serviceType = data.split('_')[1];
      await this.handleServiceSelection(chatId, telegramId, serviceType, lang);
    } else if (data.startsWith('package_')) {
      const packageType = data.split('_')[1];
      const packageMap: Record<string, string> = {
        miniPaket: 'mini',
        superPaket: 'super',
      };
      await this.handlePackageSelection(chatId, telegramId, packageMap[packageType] || packageType, lang);
    } else if (data === 'yes_another') {
      await this.showMenu(chatId, lang);
    } else if (data === 'no_another') {
      await this.showMenu(chatId, lang);
    } else if (data.startsWith('check_payment_')) {
      const invoiceId = data.split('_')[2];
      await this.checkAndProcessPayment(chatId, telegramId, invoiceId, lang);
    } else if (data === 'cancel_payment') {
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'menu.title'));
      await this.showMenu(chatId, lang);
    }

    await this.bot.answerCallbackQuery(query.id);
  }

  private async handleMessage(msg: any) {
    if (msg.text?.startsWith('/')) return;
    if (!msg.from || !msg.text) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const state = this.userStates.get(telegramId);

    if (state?.state === 'waiting_topic' && state.data?.serviceType && state.data?.lang) {
      // Mavzuni saqlaymiz va shablon tanlashga o'tamiz
      state.data.topic = msg.text;
      state.state = 'waiting_template';
      this.userStates.set(telegramId, state);
      await this.showTemplates(chatId, telegramId, state.data.serviceType, state.data.lang);
    } else if (state?.state === 'waiting_template' && state.data) {
      // Shablon tanlandi (callback query orqali), parametrlarni so'raymiz
      // Bu yerda faqat sahifalar sonini so'raymiz
      state.state = 'waiting_pages';
      this.userStates.set(telegramId, state);
      const pagesMsg = this.languageService.getTranslation(state.data.lang, 'services.enterPages');
      await this.bot.sendMessage(chatId, pagesMsg);
    } else if (state?.state === 'waiting_pages' && state.data) {
      // Sahifalar soni kiritildi
      const pages = parseInt(msg.text) || 2;
      if (pages < 1 || pages > 10) {
        await this.bot.sendMessage(chatId, this.languageService.getTranslation(state.data.lang, 'errors.invalidInput'));
        return;
      }
      state.data.pages = pages;
      state.state = 'waiting_additional';
      this.userStates.set(telegramId, state);
      const additionalMsg = this.languageService.getTranslation(state.data.lang, 'services.enterAdditional');
      await this.bot.sendMessage(chatId, additionalMsg);
    } else if (state?.state === 'waiting_additional' && state.data) {
      // Qo'shimcha ma'lumotlar kiritildi, endi yaratamiz
      state.data.additional = msg.text;
      await this.processServiceRequest(chatId, telegramId, state.data.serviceType, state.data.topic, state.data.lang, state.data);
      this.userStates.delete(telegramId);
    } else if (state?.state === 'waiting_package_topic' && state.data) {
      await this.processPackageRequest(chatId, telegramId, state.data, msg.text);
    }
  }

  private async processPackageRequest(chatId: number, telegramId: number, packageData: any, topic: string) {
    const { packageType, lang, step, topics, paid } = packageData;
    if (!topics) {
      packageData.topics = [];
    }
    packageData.topics.push(topic);

    try {
      if (packageType === 'mini') {
        const steps = ['referat', 'mustaqilIsh', 'slayd'];
        if (step < steps.length - 1) {
          const nextStep = step + 1;
          this.userStates.set(telegramId, { 
            state: 'waiting_package_topic', 
            data: { packageType, lang, step: nextStep, topics } 
          });
          const serviceNames = { referat: 'Referat', mustaqilIsh: 'Mustaqil Ish', slayd: 'Slayd' };
          await this.bot.sendMessage(chatId, `${this.languageService.getTranslation(lang, 'services.enterTopic')} (${serviceNames[steps[nextStep]]})`);
        } else {
          // Generate all files
          await this.generatePackageFiles(chatId, telegramId, packageType, topics, lang);
          this.userStates.delete(telegramId);
        }
      } else if (packageType === 'super') {
        const totalSteps = 8; // 2 Referat, 2 Mustaqil Ish, 2 Slayd, 2 AI Rasm
        if (step < totalSteps - 1) {
          const nextStep = step + 1;
          this.userStates.set(telegramId, { 
            state: 'waiting_package_topic', 
            data: { packageType, lang, step: nextStep, topics } 
          });
          const stepNames = ['Referat 1', 'Referat 2', 'Mustaqil Ish 1', 'Mustaqil Ish 2', 'Slayd 1', 'Slayd 2', 'AI Rasm 1', 'AI Rasm 2'];
          await this.bot.sendMessage(chatId, `${this.languageService.getTranslation(lang, 'services.enterTopic')} (${stepNames[nextStep]})`);
        } else {
          await this.generatePackageFiles(chatId, telegramId, packageType, topics, lang);
          this.userStates.delete(telegramId);
        }
      }
    } catch (error) {
      this.logger.error('Package processing error:', error);
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
      this.userStates.delete(telegramId);
    }
  }

  private async generatePackageFiles(chatId: number, telegramId: number, packageType: string, topics: string[], lang: string) {
    try {
      if (packageType === 'mini') {
        // 1 Referat
        const referatContent = await this.openaiService.generateReferat(topics[0], lang);
        const referatFile = await this.fileGenerationService.generatePDF(referatContent, `referat_${Date.now()}`);
        await this.bot.sendDocument(chatId, referatFile);
        
        // 1 Mustaqil Ish
        const mustaqilContent = await this.openaiService.generateMustaqilIsh(topics[1], lang);
        const mustaqilFile = await this.fileGenerationService.generatePDF(mustaqilContent, `mustaqil_${Date.now()}`);
        await this.bot.sendDocument(chatId, mustaqilFile);
        
        // 1 Slayd
        const slides = await this.openaiService.generateSlaydContent(topics[2], lang);
        const slaydFile = await this.fileGenerationService.generatePPTX(slides, `slayd_${Date.now()}`);
        await this.bot.sendDocument(chatId, slaydFile);
      } else if (packageType === 'super') {
        // 2 Referat
        for (let i = 0; i < 2; i++) {
          const content = await this.openaiService.generateReferat(topics[i], lang);
          const file = await this.fileGenerationService.generatePDF(content, `referat_${i}_${Date.now()}`);
          await this.bot.sendDocument(chatId, file);
        }
        // 2 Mustaqil Ish
        for (let i = 2; i < 4; i++) {
          const content = await this.openaiService.generateMustaqilIsh(topics[i], lang);
          const file = await this.fileGenerationService.generatePDF(content, `mustaqil_${i}_${Date.now()}`);
          await this.bot.sendDocument(chatId, file);
        }
        // 2 Slayd
        for (let i = 4; i < 6; i++) {
          const slides = await this.openaiService.generateSlaydContent(topics[i], lang);
          const file = await this.fileGenerationService.generatePPTX(slides, `slayd_${i}_${Date.now()}`);
          await this.bot.sendDocument(chatId, file);
        }
        // 2 AI Rasm
        for (let i = 6; i < 8; i++) {
          const imageUrl = await this.openaiService.generateImage(topics[i]);
          const file = await this.fileGenerationService.downloadImage(imageUrl, `ai_rasm_${i}_${Date.now()}`);
          await this.bot.sendPhoto(chatId, file);
        }
      }

      // Free task faqat birinchi marta
      const currentUser = await this.userService.getUser(telegramId);
      if (currentUser && !currentUser.usedFreeTask) {
        await this.userService.useFreeTask(telegramId);
        await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.freeTaskUsed'));
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: this.languageService.getTranslation(lang, 'services.yes'), callback_data: 'yes_another' }],
            [{ text: this.languageService.getTranslation(lang, 'services.no'), callback_data: 'no_another' }],
          ],
        },
      };
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.anotherTask'), keyboard);
    } catch (error) {
      this.logger.error('Package file generation error:', error);
      throw error;
    }
  }

  private async checkAndProcessPayment(chatId: number, telegramId: number, invoiceId: string, lang: string) {
    try {
      const isPaid = await this.paymentService.checkClickPaymentStatus(invoiceId);
      
      if (!isPaid) {
        const notPaidMsg = lang === 'uz' 
          ? '❌ To\'lov hali amalga oshirilmagan. Iltimos, to\'lovni yakunlang va qayta urinib ko\'ring.'
          : '❌ Платеж еще не выполнен. Пожалуйста, завершите оплату и попробуйте снова.';
        await this.bot.sendMessage(chatId, notPaidMsg);
        return;
      }

      const paymentData = this.pendingPayments.get(invoiceId);
      if (!paymentData) {
        await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
        return;
      }

      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'payment.success'));
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.generating'));

      // Payment ma'lumotlarini o'chirish
      this.pendingPayments.delete(invoiceId);

      // Service yoki package ni bajarish
      if (paymentData.packageType) {
        // Package uchun topiclarni so'rash
        const topicMsg = this.languageService.getTranslation(lang, 'services.enterTopic');
        this.userStates.set(telegramId, {
          state: 'waiting_package_topic',
          data: {
            packageType: paymentData.packageType,
            lang,
            step: 0,
            topics: [],
            paid: true,
          },
        });
        const stepNames = paymentData.packageType === 'mini' 
          ? ['Referat', 'Mustaqil Ish', 'Slayd']
          : ['Referat 1', 'Referat 2', 'Mustaqil Ish 1', 'Mustaqil Ish 2', 'Slayd 1', 'Slayd 2', 'AI Rasm 1', 'AI Rasm 2'];
        await this.bot.sendMessage(chatId, `${topicMsg} (${stepNames[0]})`);
      } else {
        // Oddiy service - to'lov qilingan, fayl yaratish
        await this.processServiceRequest(
          paymentData.chatId,
          paymentData.telegramId,
          paymentData.serviceType,
          paymentData.topic,
          paymentData.lang,
        );
      }
    } catch (error) {
      this.logger.error('Payment check error:', error);
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
    }
  }

  private async showMenu(chatId: number, lang: string) {
    const menu = this.languageService.getMenu(lang);
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: menu.referat, callback_data: 'service_referat' }],
          [{ text: menu.mustaqilIsh, callback_data: 'service_mustaqilIsh' }],
          [{ text: menu.slayd, callback_data: 'service_slayd' }],
          [{ text: menu.krossvord, callback_data: 'service_krossvord' }],
          [{ text: menu.aiRasm, callback_data: 'service_aiRasm' }],
          [{ text: menu.kod, callback_data: 'service_kod' }],
          [{ text: menu.packages, callback_data: 'packages' }],
          [{ text: menu.support, callback_data: 'support' }],
          [{ text: menu.changeLanguage, callback_data: 'change_lang' }],
        ],
      },
    };

    await this.bot.sendMessage(chatId, menu.title, keyboard);
  }

  private async showPackages(chatId: number, lang: string) {
    const packages = this.languageService.getPackages(lang);
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: packages.mini, callback_data: 'package_miniPaket' }],
          [{ text: packages.super, callback_data: 'package_superPaket' }],
          [{ text: packages.back, callback_data: 'menu' }],
        ],
      },
    };

    await this.bot.sendMessage(chatId, packages.title, keyboard);
  }

  private async handleServiceSelection(chatId: number, telegramId: number, serviceType: string, lang: string) {
    // Avval mavzuni so'raymiz
    this.userStates.set(telegramId, { state: 'waiting_topic', data: { serviceType, lang } });
    const enterTopicMsg = this.languageService.getTranslation(lang, 'services.enterTopic');
    await this.bot.sendMessage(chatId, enterTopicMsg);
  }

  private async showTemplates(chatId: number, telegramId: number, serviceType: string, lang: string) {
    const chooseTemplateMsg = this.languageService.getTranslation(lang, 'services.chooseTemplate');
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: this.languageService.getTranslation(lang, 'services.template1'), callback_data: 'template_1' }],
          [{ text: this.languageService.getTranslation(lang, 'services.template2'), callback_data: 'template_2' }],
          [{ text: this.languageService.getTranslation(lang, 'services.template3'), callback_data: 'template_3' }],
          [{ text: this.languageService.getTranslation(lang, 'services.template4'), callback_data: 'template_4' }],
        ],
      },
    };
    await this.bot.sendMessage(chatId, chooseTemplateMsg, keyboard);
  }

  private async processServiceRequest(chatId: number, telegramId: number, serviceType: string, topic: string, lang: string, options?: any) {
    try {
      const user = await this.userService.getUser(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
        return;
      }
      const isFree = !user.usedFreeTask;

      if (!isFree) {
        const price = this.paymentService.getServicePrice(serviceType);
        const needPaymentMsg = this.languageService.getTranslation(lang, 'services.needPayment').replace('{price}', price.toString());
        await this.bot.sendMessage(chatId, needPaymentMsg);
        
        // Click payment yaratish
        const orderId = `order_${telegramId}_${Date.now()}`;
        const payment = await this.paymentService.createClickPayment(price, telegramId, serviceType, orderId);
        
        // Payment ma'lumotlarini saqlash
        this.pendingPayments.set(payment.invoiceId, {
          chatId,
          telegramId,
          serviceType,
          topic,
          lang,
        });
        
        const paymentMsg = lang === 'uz' 
          ? `💳 To'lov uchun quyidagi havolaga bosing:\n\n${payment.paymentUrl}\n\nTo'lovdan keyin fayl avtomatik yuboriladi.`
          : `💳 Для оплаты перейдите по ссылке:\n\n${payment.paymentUrl}\n\nПосле оплаты файл будет отправлен автоматически.`;
        
        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'uz' ? '✅ To\'lov qildim' : '✅ Я оплатил', callback_data: `check_payment_${payment.invoiceId}` }],
              [{ text: lang === 'uz' ? '❌ Bekor qilish' : '❌ Отмена', callback_data: 'cancel_payment' }],
            ],
          },
        };
        
        await this.bot.sendMessage(chatId, paymentMsg, keyboard);
        return;
      }

      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.generating'));

      let filePath: string | undefined;
      let fileName: string;

      switch (serviceType) {
        case 'referat':
          const referatContent = await this.openaiService.generateReferat(topic, lang, options);
          fileName = `referat_${Date.now()}`;
          filePath = await this.fileGenerationService.generatePDF(referatContent, fileName);
          await this.bot.sendDocument(chatId, filePath);
          break;

        case 'mustaqilIsh':
          const mustaqilContent = await this.openaiService.generateMustaqilIsh(topic, lang, options);
          fileName = `mustaqil_${Date.now()}`;
          filePath = await this.fileGenerationService.generatePDF(mustaqilContent, fileName);
          await this.bot.sendDocument(chatId, filePath);
          break;

        case 'slayd':
          const slides = await this.openaiService.generateSlaydContent(topic, lang);
          fileName = `slayd_${Date.now()}`;
          filePath = await this.fileGenerationService.generatePPTX(slides, fileName);
          await this.bot.sendDocument(chatId, filePath);
          break;

        case 'krossvord':
          const krossvordContent = await this.openaiService.generateKrossvord(topic, lang);
          fileName = `krossvord_${Date.now()}`;
          filePath = await this.fileGenerationService.generatePDF(krossvordContent, fileName);
          await this.bot.sendDocument(chatId, filePath);
          break;

        case 'aiRasm':
          const imageUrl = await this.openaiService.generateImage(topic);
          fileName = `ai_rasm_${Date.now()}`;
          filePath = await this.fileGenerationService.downloadImage(imageUrl, fileName);
          await this.bot.sendPhoto(chatId, filePath);
          break;

        case 'kod':
          const codeContent = await this.openaiService.generateCode(topic, lang);
          fileName = `kod_${Date.now()}`;
          filePath = await this.fileGenerationService.generateCodeFile(codeContent, fileName, 'txt');
          await this.bot.sendDocument(chatId, filePath);
          break;
      }

      // Free task faqat birinchi marta
      const currentUser = await this.userService.getUser(telegramId);
      if (currentUser && !currentUser.usedFreeTask) {
        await this.userService.useFreeTask(telegramId);
        await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.freeTaskUsed'));
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: this.languageService.getTranslation(lang, 'services.yes'), callback_data: 'yes_another' }],
            [{ text: this.languageService.getTranslation(lang, 'services.no'), callback_data: 'no_another' }],
          ],
        },
      };
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.anotherTask'), keyboard);

      if (filePath) {
        setTimeout(() => this.fileGenerationService.cleanupFile(filePath), 60000);
      }
    } catch (error) {
      this.logger.error('Service processing error:', error);
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
    }
  }

  private async handlePackageSelection(chatId: number, telegramId: number, packageType: string, lang: string) {
    try {
      const user = await this.userService.getUser(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
        return;
      }
      const isFree = !user.usedFreeTask;

      if (!isFree) {
        const price = this.paymentService.getServicePrice(packageType);
        const needPaymentMsg = this.languageService.getTranslation(lang, 'services.needPayment').replace('{price}', price.toString());
        await this.bot.sendMessage(chatId, needPaymentMsg);
        
        // Click payment yaratish
        const orderId = `package_${telegramId}_${Date.now()}`;
        const payment = await this.paymentService.createClickPayment(price, telegramId, packageType, orderId);
        
        // Payment ma'lumotlarini saqlash
        this.pendingPayments.set(payment.invoiceId, {
          chatId,
          telegramId,
          serviceType: packageType,
          topic: '',
          lang,
          packageType,
          packageTopics: [],
        });
        
        const paymentMsg = lang === 'uz' 
          ? `💳 To'lov uchun quyidagi havolaga bosing:\n\n${payment.paymentUrl}\n\nTo'lovdan keyin paket avtomatik yuboriladi.`
          : `💳 Для оплаты перейдите по ссылке:\n\n${payment.paymentUrl}\n\nПосле оплаты пакет будет отправлен автоматически.`;
        
        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'uz' ? '✅ To\'lov qildim' : '✅ Я оплатил', callback_data: `check_payment_${payment.invoiceId}` }],
              [{ text: lang === 'uz' ? '❌ Bekor qilish' : '❌ Отмена', callback_data: 'cancel_payment' }],
            ],
          },
        };
        
        await this.bot.sendMessage(chatId, paymentMsg, keyboard);
        return;
      }

      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'services.generating'));

      if (packageType === 'mini') {
        // Mini Paket: 1 Referat, 1 Mustaqil Ish, 1 Slayd
        const topicMsg = this.languageService.getTranslation(lang, 'services.enterTopic');
        this.userStates.set(telegramId, { 
          state: 'waiting_package_topic', 
          data: { packageType: 'mini', lang, step: 0, topics: [] } 
        });
        await this.bot.sendMessage(chatId, `${topicMsg} (Referat)`);
      } else if (packageType === 'super') {
        // Super Paket: 2 Referat, 2 Mustaqil Ish, 2 Slayd, 2 AI Rasm
        const topicMsg = this.languageService.getTranslation(lang, 'services.enterTopic');
        this.userStates.set(telegramId, { 
          state: 'waiting_package_topic', 
          data: { packageType: 'super', lang, step: 0, topics: [] } 
        });
        await this.bot.sendMessage(chatId, `${topicMsg} (Referat 1)`);
      }
    } catch (error) {
      this.logger.error('Package selection error:', error);
      await this.bot.sendMessage(chatId, this.languageService.getTranslation(lang, 'errors.general'));
    }
  }
}

