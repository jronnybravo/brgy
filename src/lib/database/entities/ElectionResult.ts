import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	BaseEntity,
	Index
} from 'typeorm';
import { Candidate } from './Candidate';
import { Locality } from './Locality';

@Entity('election_results')
@Index(['localityId', 'candidateId'], { unique: true })
export class ElectionResult extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int' })
	votes!: number;

	@Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
	percentage?: number;

	@Column({ type: 'varchar', length: 20, nullable: true })
	precinctCode?: string; // Original precinct code from CSV

	@Column({ type: 'int' })
	candidateId!: number;

	@ManyToOne(() => Candidate, (candidate) => candidate.results)
	@JoinColumn({ name: 'candidateId' })
	candidate!: Candidate;

	@Column({ type: 'int' })
	localityId!: number;

	@ManyToOne(() => Locality)
	@JoinColumn({ name: 'localityId' })
	locality!: Locality;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}

