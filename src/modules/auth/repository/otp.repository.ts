import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Otp } from '../entities/verification-otp.entity';

@Injectable()
export class OtpRepository extends Repository<Otp> {
  constructor(readonly dataSource: DataSource) {
    super(Otp, dataSource.createEntityManager());
  }
}
