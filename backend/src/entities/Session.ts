import { Entity, Column, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity()
export default class Session {
    @PrimaryColumn()
    id!: string; // Secure random string

    @Column() // 24 bytes encoded as a base64 string
    secretHash!: string;

    @CreateDateColumn()
    createdAt!: Date;
}