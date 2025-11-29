# Student Assistant AI Bot

Professional Telegram bot built with NestJS, TypeORM, and OpenAI API for student assistance services.

## Features

- 🌐 **Multilingual Support**: Uzbek (uz) and Russian (ru)
- 🎁 **Free Task**: Each new user gets 1 free task
- 💳 **Payment Integration**: Click payment gateway (Click.uz)
- 📄 **Multiple Services**: Referat, Mustaqil Ish, Slayd, Krossvord, AI Rasm, Kod yozish
- 📦 **Packages**: Mini Paket and Super Paket
- 🤖 **AI Powered**: OpenAI GPT-4 and DALL-E integration
- 📁 **File Generation**: PDF, PPTX, PNG, TXT files

## Services & Prices

- **Referat**: 3,000 UZS - 1-2 page PDF
- **Mustaqil Ish**: 3,000 UZS - 1-2 page PDF assignment
- **Slayd**: 2,500 UZS - 3-5 slides PPTX
- **Krossvord / Testlar**: 2,500 UZS - 5-10 questions PDF
- **AI Rasm**: 3,000 UZS - PNG image generation
- **Kod yozish**: 7,000 UZS - Code files (TXT, JS, PY, C++)

### Packages

- **Mini Paket**: 8,000 UZS (1 Referat, 1 Mustaqil Ish, 1 Slayd)
- **Super Paket**: 12,000 UZS (2 Referat, 2 Mustaqil Ish, 2 Slayd, 2 AI Rasm)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd student-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your `.env` file:
```env
BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
CLICK_MERCHANT_ID=your_click_merchant_id_here
CLICK_SECRET_KEY=your_click_secret_key_here
CLICK_SERVICE_ID=your_click_service_id_here
CLICK_RETURN_URL=https://t.me/your_bot
DATABASE_URL=database.sqlite
```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## Bot Commands

- `/start` - Start the bot and choose language
- `/menu` - Show main menu
- `/packages` - Show available packages
- `/support` - Contact support

## Project Structure

```
src/
├── entities/          # TypeORM entities
│   └── user.entity.ts
├── dto/              # Data Transfer Objects
│   ├── create-user.dto.ts
│   └── service-request.dto.ts
├── services/         # Business logic services
│   ├── telegram-bot.service.ts
│   ├── user.service.ts
│   ├── language.service.ts
│   ├── openai.service.ts
│   ├── file-generation.service.ts
│   └── payment.service.ts
├── database/         # Database configuration
│   └── database.module.ts
├── telegram/         # Telegram module
│   └── telegram.module.ts
├── app.module.ts     # Root module
└── main.ts           # Application entry point
```

## API Documentation

Swagger documentation is available at `http://localhost:3000/api` when the application is running.

## Database

The application uses TypeORM with PostgreSQL as the database.

### PostgreSQL Configuration

Configure PostgreSQL using connection URL:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/student_bot
```

**Examples:**
- Local without SSL: `postgresql://postgres:password123@localhost:5432/student_bot`
- With SSL: `postgresql://postgres:password123@localhost:5432/student_bot?sslmode=require`
- Remote server: `postgresql://user:pass@db.example.com:5432/student_bot`

### Database Setup

1. Install PostgreSQL on your system
2. Create a database:
```sql
CREATE DATABASE student_bot;
```
3. Update `.env` file with your PostgreSQL connection URL
4. The application will automatically create tables on first run

## Technologies

- **NestJS** - Progressive Node.js framework
- **TypeORM** - ORM for TypeScript
- **node-telegram-bot-api** - Telegram Bot API
- **OpenAI API** - GPT-4 and DALL-E
- **PDFKit** - PDF generation
- **PptxGenJS** - PowerPoint generation
- **Swagger** - API documentation

## License

Private - UNLICENSED
