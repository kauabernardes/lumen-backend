import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'bigint' })
  value!: string;

  //@OneToMany(() => Earn, (earn) => earn.reward)
  //earns!: Earn[];
}
