import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Locality } from './Locality';

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

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	@ManyToMany(() => Locality, { eager: false })
	@JoinTable({
		name: 'user_jurisdictions',
		joinColumn: { name: 'user_id', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'locality_id', referencedColumnName: 'id' }
	})
	jurisdictions?: Locality[];
}
