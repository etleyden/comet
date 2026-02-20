import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import User from './User';

@Entity()
export default class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string; // Added definite assignment assertion

  @Column({ nullable: true })
  institution?: string;

  @Column({ unique: true })
  account?: string; // Added definite assignment assertion

  @Column()
  routing?: string; // Added definite assignment assertion

  @ManyToMany(() => User, user => user.accounts)
  users!: User[]; // Added definite assignment assertion
}
