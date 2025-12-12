import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Locality } from './Locality';

@Entity('people')
export class People {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar' })
	lastName!: string;

	@Column({ type: 'varchar' })
	firstName!: string;

	@Column({ type: 'date' })
	birthdate!: Date;

	@Column({ type: 'varchar', length: 1 })
	sex!: string; // 'M' or 'F'

	@ManyToOne(() => Locality)
	barangay!: Locality;

	@Column({ type: 'int', nullable: true })
	barangayId!: number | null;

	@Column({ type: 'varchar', nullable: true })
	purok!: string | null;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
