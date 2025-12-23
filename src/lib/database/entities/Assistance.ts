import { PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, BaseEntity, Entity } from 'typeorm';
import { Person } from './Person';

export enum FinancialAssistanceType {
	AICS = 'AICS',
	MAIP = 'MAIP',
	TUPAD = 'TUPAD',
	BURIAL_CASH_ASSISTANCE = 'BURIAL CASH ASSISTANCE',
	MEDICAL_CASH_ASSISTANCE = 'MEDICAL CASH ASSISTANCE',
}

export abstract class Assistance extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int' })
	personId!: number;

	@Column({ type: 'date' })
	disbursed_date!: Date;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	value!: number;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}

@Entity('financial_assistances')
export class FinancialAssistance extends Assistance {
	@Column({ type: 'enum', enum: FinancialAssistanceType })
	type!: FinancialAssistanceType;

	@ManyToOne(() => Person, (person) => person.financialAssistances)
	person!: Person;
}

@Entity('medicine_assistances')
export class MedicineAssistance extends Assistance {
	@Column({ type: 'varchar' })
	medicine_name!: string;

	@Column({ type: 'varchar', nullable: true })
	generic_name: string | null = null;

	@Column({ type: 'varchar', nullable: true })
	dosage!: string;

	@Column({ type: 'int' })
	quantity!: number;

	@Column({ type: 'varchar', nullable: true })
	unit!: string;

	@ManyToOne(() => Person, (person) => person.medicineAssistances)
	person!: Person;
}