import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export default class Session {
    @PrimaryGeneratedColumn("uuid")
    id!: string; // Changed to string to match UUID type

    @Column({ type: "bytea" })
    secretHash!: Buffer;

    @CreateDateColumn()
    createdAt!: Date;
}