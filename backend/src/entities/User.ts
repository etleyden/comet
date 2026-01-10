import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from "typeorm";
import { Account } from "./Account";

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string; // Changed to string to match UUID type

    @Column()
    name!: string; // Added definite assignment assertion

    @Column({ unique: true })
    email!: string; // Added definite assignment assertion

    @ManyToMany(() => Account, account => account.users)
    @JoinTable()
    accounts!: Account[];
}