import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToMany,
	JoinColumn,
	BaseEntity
} from 'typeorm';
import { ElectionContest } from './ElectionContest';
import { ElectionResult } from './ElectionResult';

@Entity('candidates')
export class Candidate extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', length: 200 })
	name!: string; // e.g., "VILLA, JEC-JEC"

	@Column({ type: 'varchar', length: 100, nullable: true })
	party?: string; // e.g., "PFP", "AKSYON"

	@Column({ type: 'int', nullable: true })
	ballotNumber?: number; // Position on ballot

	@Column({ type: 'varchar', length: 10, nullable: true })
	color?: string; // Hex color for map display (e.g., "#FF0000")

	@Column({ type: 'int' })
	contestId!: number;

	@ManyToOne(() => ElectionContest, (contest) => contest.candidates)
	@JoinColumn({ name: 'contestId' })
	contest!: ElectionContest;

	@OneToMany(() => ElectionResult, (result) => result.candidate)
	results?: ElectionResult[];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}

