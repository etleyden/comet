import { Entity, Column, CreateDateColumn, PrimaryColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import User from './User';

@Entity()
export default class PasswordResetToken {
  @PrimaryColumn()
  id!: string;

  /** SHA-256 hash of the token secret (never store the raw secret). */
  @Column()
  secretHash!: string;

  /** Token expires after this date. */
  @Column()
  expiresAt!: Date;

  /** Set to true after the token has been used to reset a password. */
  @Column({ default: false })
  used!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
