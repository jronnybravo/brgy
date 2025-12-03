import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	BaseEntity
} from 'typeorm';
import { Locality } from './Locality';

@Entity('voters')
export class Voter extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', length: 100 })
	firstName!: string;

	@Column({ type: 'varchar', length: 100 })
	lastName!: string;

	@Column({ type: 'varchar', length: 100, nullable: true })
	middleName?: string;

	// Association with locality
	@Column({ type: 'int' })
	localityId!: number;

	@ManyToOne(() => Locality)
	@JoinColumn({ name: 'localityId' })
	locality!: Locality;

	// Address information
	@Column({ type: 'text', nullable: true })
	address?: string;

	// Precise location if available (for mapping individual voters)
	@Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
	latitude?: number;

	@Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
	longitude?: number;

	// Voter information
	@Column({ type: 'varchar', length: 50, nullable: true, unique: true })
	voterId?: string; // Official voter ID

	@Column({ type: 'date', nullable: true })
	registeredDate?: Date;

	@Column({ type: 'varchar', length: 20, nullable: true })
	status?: string; // 'active', 'inactive', 'transferred', etc.

	// Additional metadata
	@Column({ type: 'varchar', length: 20, nullable: true })
	phoneNumber?: string;

	@Column({ type: 'varchar', length: 100, nullable: true })
	email?: string;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	// Helper method to get full name
	getFullName(): string {
		return this.middleName
			? `${this.firstName} ${this.middleName} ${this.lastName}`
			: `${this.firstName} ${this.lastName}`;
	}

	// Helper method to get coordinates for mapping
	getCoordinates(): [number, number] | null {
		if (this.latitude && this.longitude) {
			return [this.latitude, this.longitude];
		}
		return null;
	}
}

