import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, BaseEntity, ManyToOne, In } from 'typeorm';
import { Locality } from './Locality';
import { Role } from './Role';
import { Serializable } from './decorators/Serializable';
import { AppDataSource } from '../data-source';

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

	@ManyToMany(() => Locality, { eager: true })
	@JoinTable({
		name: 'user_jurisdictions',
		joinColumn: { name: 'user_id', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'locality_id', referencedColumnName: 'id' }
	})
	jurisdictions?: Locality[];

	@ManyToOne(() => Role, (role) => role.users, { eager: false })
	role!: Role;

	can(permission: string): boolean {
		return this.role.can(permission);
	}

	async getJurisdictionalBarangays(): Promise<Locality[]> {
		const allowedBarangays: Locality[] = [];
		for (const jurisdiction of this.jurisdictions || []) {
			const descendants = await AppDataSource.manager.getTreeRepository(Locality)
				.createQueryBuilder('locality')
				.innerJoin(
					'localities_closure',
					'closure',
					'closure.id_descendant = locality.id AND closure.id_ancestor = :ancestorId',
					{ ancestorId: jurisdiction.id }
				)
				.select(['locality.id', 'locality.name', 'locality.parentId'])
				.where('locality.type = :type', { type: 'barangay' })
				.orderBy('locality.name', 'ASC')
				.getMany();
			allowedBarangays.push(...descendants);
		}
		return allowedBarangays;
	}

	async getJurisdictionalTowns(): Promise<Locality[]> {
		const allowedBarangays = await this.getJurisdictionalBarangays();
		const allowedTownIds = Array.from(new Set(allowedBarangays.map(b => b.parentId)));
		return await Locality.find({
			where: { id: In(allowedTownIds) }
		});
	}
}
