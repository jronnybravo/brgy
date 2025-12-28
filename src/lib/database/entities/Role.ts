import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BaseEntity } from 'typeorm';
import { User } from './User';
import { Permission } from '$lib/utils/Permission';

@Entity('roles')
export class Role extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', unique: true })
	name!: string;

	@Column({ type: 'text', nullable: true, default: null })
	description?: string | null;

    @Column('json')
    permissions: string[] = [];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	@OneToMany(() => User, (user) => user.role)
	users!: User[];

	can(permission: string): boolean {
		const permissionPath = Permission.getPermissionPath(permission);
        return this.permissions.some(permission => permissionPath.includes(permission)) ?? false;
	}
}
