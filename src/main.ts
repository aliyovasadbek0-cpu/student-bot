import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger documentation (optional - uncomment if needed)
  // try {
  //   const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
  //   const config = new DocumentBuilder()
  //     .setTitle('Student Assistant AI Bot API')
  //     .setDescription('API documentation for Student Assistant AI Telegram Bot')
  //     .setVersion('1.0')
  //     .addTag('bot')
  //     .build();
  //   const document = SwaggerModule.createDocument(app, config);
  //   SwaggerModule.setup('api', app, document);
  // } catch (error) {
  //   console.log('Swagger is not available');
  // }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Telegram bot is starting...`);
}
bootstrap();
