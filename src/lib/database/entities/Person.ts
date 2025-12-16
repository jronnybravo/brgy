import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { Locality } from './Locality';

export enum Sex {
	MALE = 'Male',
	FEMALE = 'Female'
}

@Entity('persons')
export class Person extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar' })
	lastName!: string;

	@Column({ type: 'varchar' })
	firstName!: string;

	@Column({ type: 'date' })
	birthdate!: Date;

	@Column({ type: 'enum', enum: Sex, nullable: true })
	sex: Sex | null = null;

	@ManyToOne(() => Locality, (locality) => locality.persons, { nullable: true })
	barangay: Locality | null = null;

	@Column({ type: 'int', nullable: true })
	barangayId!: number | null;

	@Column({ type: 'varchar', nullable: true })
	purok!: string | null;

	@Column({ type: 'boolean', nullable: true })
	isSupporter: boolean | null = null;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
