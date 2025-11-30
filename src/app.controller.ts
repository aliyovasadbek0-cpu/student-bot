import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { TelegramBotService } from './services/telegram-bot.service';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/webhook')
  async handleWebhook(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    // Telegram webhook'ni bot service'ga yuborish
    await this.telegramBotService.handleWebhookUpdate(body);
    res.status(200).send('OK');
  }
}
