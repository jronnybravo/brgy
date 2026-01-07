import { PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, BaseEntity, Entity } from 'typeorm';
import { User } from './User';

export enum NotificationType {
    SUCCESS = 'Success',
    WARNING = 'Warning',
    ERROR = 'Error',
}

@Entity('notifications')
export class Notification extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'enum', enum: NotificationType })
    type!: NotificationType;

    @ManyToOne(() => User, (user) => user.notifications)
    user!: User;

    @Column('text')
    message!: string;

    @Column('text', { nullable: true })
    link: string | null = null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Column('timestamp', { nullable: true })
    readAt: Date | null = null;
}
