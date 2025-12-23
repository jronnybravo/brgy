import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('roles')
export class Role {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', unique: true })
	name!: string;

	@Column({ type: 'text', nullable: true, default: null })
	description?: string | null;

    @Column('json')
    permissions: string[] = [];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
