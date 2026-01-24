import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from "typeorm";
import Account from "./Account";
import Session from "./Session";

@Entity()
export default class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string; // Changed to string to match UUID type

    @Column()
    name!: string; // Added definite assignment assertion

    @Column({ unique: true })
    email!: string; // Added definite assignment assertion

    @OneToMany(() => Session, session => session.user)
    sessions?: Session[];

    @ManyToMany(() => Account, account => account.users)
    @JoinTable()
    accounts!: Account[];
}