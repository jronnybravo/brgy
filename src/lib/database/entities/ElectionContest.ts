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
import { Election } from './Election';
import { Candidate } from './Candidate';

@Entity('election_contests')
export class ElectionContest extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', length: 200 })
	name!: string; // e.g., "PROVINCIAL GOVERNOR of SIQUIJOR"

	@Column({ type: 'varchar', length: 100 })
	position!: string; // e.g., "GOVERNOR", "MAYOR", "SENATOR"

	@Column({ type: 'varchar', length: 20 })
	scope!: string; // 'national' or 'local'

	@Column({ type: 'varchar', length: 200, nullable: true })
	jurisdiction?: string; // e.g., "SIQUIJOR", "SIQUIJOR - ENRIQUE VILLANUEVA"

	@Column({ type: 'int' })
	electionId!: number;

	@ManyToOne(() => Election, (election) => election.contests)
	@JoinColumn({ name: 'electionId' })
	election!: Election;

	@OneToMany(() => Candidate, (candidate) => candidate.contest)
	candidates?: Candidate[];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}

