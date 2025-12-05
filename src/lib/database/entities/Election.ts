import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	BaseEntity
} from 'typeorm';
import { ElectionContest } from './ElectionContest';

@Entity('elections')
export class Election extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', length: 100 })
	name!: string; // e.g., "2022 National and Local Elections"

	@Column({ type: 'int' })
	year!: number;

	@Column({ type: 'varchar', length: 50, nullable: true })
	type?: string; // 'national', 'local', 'barangay', 'special'

	@Column({ type: 'date', nullable: true })
	electionDate?: Date;

	@OneToMany(() => ElectionContest, (contest) => contest.election)
	contests?: ElectionContest[];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}

