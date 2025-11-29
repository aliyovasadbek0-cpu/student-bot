import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  telegramId: number;

  @Column({ default: 'uz' })
  language: string;

  @Column({ default: false })
  usedFreeTask: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

