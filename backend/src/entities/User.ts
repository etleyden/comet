import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Role } from 'shared';
import Account from './Account';
import Session from './Session';

@Entity()
export default class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // Changed to string to match UUID type

  @Column()
  name!: string; // Added definite assignment assertion

  @Column({ unique: true })
  email!: string; // Added definite assignment assertion

  @Column({ select: false }) // Don't select password by default for security
  passwordHash!: string;

  @Column({ type: 'varchar', default: Role.USER })
  role!: Role;

  @OneToMany(() => Session, session => session.user)
  sessions?: Session[];

  @ManyToMany(() => Account, account => account.users)
  @JoinTable()
  accounts!: Account[];
}
