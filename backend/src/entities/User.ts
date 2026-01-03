import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number; // Added definite assignment assertion

    @Column()
    name!: string; // Added definite assignment assertion

    @Column({ unique: true })
    email!: string; // Added definite assignment assertion
}