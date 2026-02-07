import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import Account from './Account';
import Category from './Category';

@Entity()
export default class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Account, account => account.id)
  account!: Account;

  @Column('decimal', { precision: 20, scale: 2 })
  amount!: number;

  @Column()
  date!: Date;

  @ManyToOne(() => Category, { nullable: true })
  category?: Category;

  @Column()
  notes?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed',
  })
  status!: 'pending' | 'completed' | 'cancelled';

  @Column('jsonb')
  raw!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
