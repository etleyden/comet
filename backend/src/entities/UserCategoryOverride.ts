/**
 * This entity represents a user's overridden description for a category, 
 * enabling personalization.
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    Unique,
} from 'typeorm';
import User from './User';
import Category from './Category';

@Entity()
@Unique(['user', 'category'])
export default class UserCategoryOverride {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { nullable: false })
    user!: User;

    @ManyToOne(() => Category, { nullable: false })
    category!: Category;

    @Column({ nullable: true })
    customDescription?: string;
}
