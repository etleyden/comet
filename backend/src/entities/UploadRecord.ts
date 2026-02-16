import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import User from './User';

/**
 * This entity represents a single upload of transaction data by a user. 
 * Primarily used to store the attribute mapping to support updating it later.
 **/
@Entity()
export default class UploadRecord {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    /** Maps app-level attribute names (date, vendor, etc.) to CSV column names */
    @Column('jsonb')
    mapping!: Record<string, string>;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
