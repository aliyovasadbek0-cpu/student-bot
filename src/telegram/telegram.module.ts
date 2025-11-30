import { Module } from '@nestjs/common';
import { TelegramBotService } from '../services/telegram-bot.service';
import { UserService } from '../services/user.service';
import { LanguageService } from '../services/language.service';
import { OpenAIService } from '../services/openai.service';
import { FileGenerationService } from '../services/file-generation.service';
import { PaymentService } from '../services/payment.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    TelegramBotService,
    UserService,
    LanguageService,
    OpenAIService,
    FileGenerationService,
    PaymentService,
  ],
  exports: [TelegramBotService],
})
export class TelegramModule {}

