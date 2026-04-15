import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    Unique,
} from 'typeorm';
import User from './User';

@Entity()
@Unique('UQ_category_name_parent', ['name', 'parent'])
export default class Category {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @ManyToOne(() => Category, category => category.children, { nullable: true })
    parent?: Category | null;

    @OneToMany(() => Category, category => category.parent)
    children?: Category[];

    @Column({ nullable: true })
    defaultDescription?: string;

    @Column({ default: false })
    isDeprecated!: boolean;

    @ManyToOne(() => User)
    createdBy!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @ManyToOne(() => User, { nullable: true })
    updatedBy?: User;

    @UpdateDateColumn()
    updatedAt!: Date;
}
