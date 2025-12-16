import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { Person } from './Person';

@Entity('assistances')
export class Assistance extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int' })
	personId!: number;

	@ManyToOne(() => Person)
	person!: Person;

	@Column({ type: 'varchar', length: 50 })
	type!: 'AICS' | '4PS' | 'MAIP';

	@Column({ type: 'date' })
	date_disbursed!: Date;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	amount!: number;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
