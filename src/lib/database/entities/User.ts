import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, BaseEntity, ManyToOne } from 'typeorm';
import { Locality } from './Locality';
import { Role } from './Role';
import { Serializable } from './decorators/Serializable';

@Entity('users')
@Serializable()
export class User extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column('varchar', {unique: true })
	username!: string;

	@Column('varchar', {unique: true })
	email!: string;

	@Column('varchar')
	password!: string;

	@Column('int')
	roleId: number | null = null;

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

	@ManyToOne(() => Role, (role) => role.users, { eager: true })
	role!: Role;

	can(permission: string): boolean {
		return this.role.can(permission);
	}
}
