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
import UploadRecord from './UploadRecord';

@Entity()
export default class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UploadRecord, upload => upload.id)
  upload!: UploadRecord;

  // Accounts are linked per transaction instead of per upload
  // since we'll probably need to retrieve account from transaction quite often
  // so this reduces joins
  @ManyToOne(() => Account, account => account.id)
  account!: Account;

  @Column('decimal', { precision: 20, scale: 2 })
  amount!: number;

  @Column()
  date!: Date;

  @ManyToOne(() => Category, { nullable: true })
  category?: Category;

  @Column({ nullable: true })
  vendorLabel?: string;

  @Column({ nullable: true })
  categoryLabel?: string;

  @Column({ nullable: true })
  description?: string;

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
