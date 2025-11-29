import { Injectable } from '@nestjs/common';

@Injectable()
export class LanguageService {
  private translations = {
    uz: {
      welcome: '👋 Salom! Student Assistant AI botiga xush kelibsiz!',
      chooseLanguage: 'Iltimos, tilni tanlang:',
      menu: {
        title: '📋 Asosiy menyu',
        referat: '📄 Referat (3,000 UZS)',
        mustaqilIsh: '📝 Mustaqil Ish (3,000 UZS)',
        slayd: '📊 Slayd (2,500 UZS)',
        krossvord: '🧩 Krossvord / Testlar (2,500 UZS)',
        aiRasm: '🎨 AI Rasm (3,000 UZS)',
        kod: '💻 Kod yozish (7,000 UZS)',
        packages: '📦 Paketlar',
        support: '🆘 Yordam',
        changeLanguage: '🌐 Tilni o\'zgartirish',
      },
      packages: {
        title: '📦 Paketlar',
        mini: 'Mini Paket - 8,000 UZS\n(1 Referat, 1 Mustaqil Ish, 1 Slayd)',
        super: 'Super Paket - 12,000 UZS\n(2 Referat, 2 Mustaqil Ish, 2 Slayd, 2 AI Rasm)',
        back: '⬅️ Orqaga',
      },
      services: {
        enterTopic: 'Mavzuni kiriting:',
        chooseTemplate: '📋 Shablon tanlang:',
        template1: '📄 Standart shablon (Kirish, Asosiy qism, Xulosa)',
        template2: '📚 Kengaytirilgan shablon (Kirish, Asosiy qism, Misollar, Xulosa, Manbalar)',
        template3: '🎓 Ilmiy shablon (Kirish, Nazariya, Amaliyot, Tahlil, Xulosa, Manbalar)',
        template4: '✨ O\'zingiz yaratish (Barcha bo\'limlarni o\'zingiz belgilaysiz)',
        enterPages: 'Nechta sahifa bo\'lsin? (1-10):',
        enterSections: 'Qo\'shimcha bo\'limlar qo\'shasizmi? (Ha/Yo\'q):',
        enterAdditional: 'Qo\'shimcha talablar yoki bo\'limlar kiriting (yoki "Tayyor" deb yozing):',
        generating: '⏳ Professional kontent yaratilmoqda...',
        freeTaskUsed: '✅ Bepul topshiriq ishlatildi!',
        needPayment: '💳 To\'lov talab qilinadi. Narx: {price} UZS',
        anotherTask: 'Yana bir topshiriq qilmoqchimisiz?',
        yes: 'Ha',
        no: 'Yo\'q',
        ready: 'Tayyor',
      },
      payment: {
        title: 'To\'lov',
        processing: 'To\'lov qayta ishlanmoqda...',
        success: '✅ To\'lov muvaffaqiyatli! Fayl yaratilmoqda...',
        failed: '❌ To\'lov muvaffaqiyatsiz.',
      },
      support: {
        title: '🆘 Yordam',
        message: 'Savollaringiz bo\'lsa, admin bilan bog\'laning: @admin',
      },
      errors: {
        general: 'Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        invalidInput: 'Noto\'g\'ri kiritilgan ma\'lumot.',
      },
    },
    ru: {
      welcome: '👋 Здравствуйте! Добро пожаловать в бота Student Assistant AI!',
      chooseLanguage: 'Пожалуйста, выберите язык:',
      menu: {
        title: '📋 Главное меню',
        referat: '📄 Реферат (3,000 UZS)',
        mustaqilIsh: '📝 Самостоятельная работа (3,000 UZS)',
        slayd: '📊 Слайды (2,500 UZS)',
        krossvord: '🧩 Кроссворд / Тесты (2,500 UZS)',
        aiRasm: '🎨 AI Изображение (3,000 UZS)',
        kod: '💻 Написание кода (7,000 UZS)',
        packages: '📦 Пакеты',
        support: '🆘 Поддержка',
        changeLanguage: '🌐 Изменить язык',
      },
      packages: {
        title: '📦 Пакеты',
        mini: 'Мини Пакет - 8,000 UZS\n(1 Реферат, 1 Самостоятельная работа, 1 Слайды)',
        super: 'Супер Пакет - 12,000 UZS\n(2 Реферата, 2 Самостоятельные работы, 2 Слайды, 2 AI Изображения)',
        back: '⬅️ Назад',
      },
      services: {
        enterTopic: 'Введите тему:',
        generating: '⏳ Создается...',
        freeTaskUsed: '✅ Бесплатная задача использована!',
        needPayment: '💳 Требуется оплата. Цена: {price} UZS',
        anotherTask: 'Хотите выполнить еще одну задачу?',
        yes: 'Да',
        no: 'Нет',
      },
      payment: {
        title: 'Оплата',
        processing: 'Обработка платежа...',
        success: '✅ Оплата успешна! Файл создается...',
        failed: '❌ Оплата не удалась.',
      },
      support: {
        title: '🆘 Поддержка',
        message: 'Если у вас есть вопросы, свяжитесь с администратором: @admin',
      },
      errors: {
        general: 'Произошла ошибка. Пожалуйста, попробуйте еще раз.',
        invalidInput: 'Неверные введенные данные.',
      },
    },
  };

  getTranslation(lang: string, key: string): string {
    const keys = key.split('.');
    let value: any = this.translations[lang] || this.translations['uz'];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return this.translations['uz'][keys[0]] || key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  }

  getMenu(lang: string) {
    return this.translations[lang]?.menu || this.translations['uz'].menu;
  }

  getPackages(lang: string) {
    return this.translations[lang]?.packages || this.translations['uz'].packages;
  }
}

