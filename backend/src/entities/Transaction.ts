import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import Account from "./Account";

@Entity()
export default class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id!: string; 

    @ManyToOne(() => Account, account => account.id)
    account!: Account;
    
    @Column("decimal", { precision: 10, scale: 2 })
    amount!: number; 

    @Column()
    date!: Date;

    @Column()
    category!: string;

    @Column()
    notes?: string;

    @Column({
        type: "enum",
        enum: ["pending", "completed", "cancelled"],
        default: "completed"
    })
    status!: "pending" | "completed" | "cancelled";

    @CreateDateColumn()
    createdAt!: Date;
    
    @UpdateDateColumn()
    updatedAt!: Date;
}