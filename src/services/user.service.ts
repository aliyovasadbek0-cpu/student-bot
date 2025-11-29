import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOrCreate(telegramId: number, language: string = 'uz'): Promise<User> {
    let user = await this.userRepository.findOne({ where: { telegramId } });
    
    if (!user) {
      user = this.userRepository.create({
        telegramId,
        language,
        usedFreeTask: false,
      });
      await this.userRepository.save(user);
    }
    
    return user;
  }

  async updateLanguage(telegramId: number, language: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (user) {
      user.language = language;
      await this.userRepository.save(user);
      return user;
    }
    return null;
  }

  async useFreeTask(telegramId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (user && !user.usedFreeTask) {
      user.usedFreeTask = true;
      await this.userRepository.save(user);
      return true;
    }
    return false;
  }

  async getUser(telegramId: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }
}

