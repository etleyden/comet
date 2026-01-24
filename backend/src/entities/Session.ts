import { Entity, Column, CreateDateColumn, PrimaryColumn, ManyToOne } from "typeorm";
import User from "./User";

@Entity()
export default class Session {
    @PrimaryColumn()
    id!: string; // Secure random string

    @Column() // 24 bytes encoded as a base64 string
    secretHash!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @ManyToOne(() => User, user => user.sessions)
    user!: User;
}