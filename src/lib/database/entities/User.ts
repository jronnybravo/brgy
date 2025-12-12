import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', unique: true })
	username!: string;

	@Column({ type: 'varchar', unique: true })
	email!: string;

	@Column({ type: 'varchar' })
	password!: string;

	@Column({ type: 'varchar', default: 'user' })
	role!: string; // 'admin' or 'user'

	@Column({ type: 'boolean', default: true })
	isActive!: boolean;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
