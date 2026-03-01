import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import User from "./User";

@Entity()
export default class Vendor {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;
    
    @Column({ nullable: true })
    url?: string;

    @Column({ nullable: true })
    logoUrl?: string;

    // used when two vendors are merged
    @ManyToOne(() => Vendor, { nullable: true })
    mergedInto?: Vendor;

    @CreateDateColumn()
    createdAt!: Date; 

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => User)
    updatedBy!: User;
}