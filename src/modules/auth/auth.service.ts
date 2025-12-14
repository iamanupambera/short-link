import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthUserInterface, Response as ApiResponse } from 'src/common/interfaces';
import { UserRegisterDto } from './dto/user-register.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthRepository } from './repository/auth.repository';
import { EmailService } from '../email/email.service';
import { type StorageService } from '../storage/interfaces/storage-service.interface';
import { OtpRepository } from './repository/otp.repository';
import { generateOTP } from 'src/common/utils/generateOTP';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpRepository: OtpRepository,
    private readonly jwtService: JwtService,
    @Inject('EMAIL_SERVICE') private readonly emailService: EmailService,
    @Inject('STORAGE_SERVICE') private readonly storageService: StorageService,
  ) {}

  async register(dto: UserRegisterDto): Promise<ApiResponse<User>> {
    const emailExist = await this.authRepository.findOne({
      where: { email: dto.email },
    });

    if (emailExist) {
      throw new ConflictException('Email already exist');
    }

    const user = await this.authRepository.createUser(dto);

    // create otp and send to email for verification
    const otp = await this.otpRepository.save({
      otp: generateOTP(6),
      email: dto.email,
    });

    await this.emailService.sendVerificationMessage({
      receiverId: user.email,
      otp: otp.otp,
      name: user.name,
    });

    return {
      statusCode: 201,
      response: user,
      message: '',
    };
  }

  async login({ email, password }: UserLoginDto, res: Response): Promise<ApiResponse> {
    const user = await this.authRepository.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    if (!(await user?.password?.validatePassword(password))) {
      throw new UnauthorizedException('Invalid credential');
    }

    const tokenPayload: AuthUserInterface = {
      email: user.email,
      userId: user.id,
    };

    const accessToken = this.jwtService.sign(tokenPayload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(tokenPayload);

    // TODO change this in production
    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    return {
      statusCode: 201,
      response: {
        accessToken,
        user: { ...user, password: undefined },
      },
      message: 'Login successful',
    };
  }

  async resendVerificationEmail({ email }: ResendVerificationEmailDto): Promise<ApiResponse> {
    const user = await this.authRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("User with this email doesn't exist");
    }

    // create otp and send to email for verification
    const otp = await this.otpRepository.save({
      email,
      otp: generateOTP(6),
    });

    await this.emailService.sendVerificationMessage({
      receiverId: user.email,
      otp: otp.otp,
      name: user.name,
    });

    return {
      statusCode: 200,
      response: {},
      message: 'Verification email sent successfully',
    };
  }

  async verifyEmail({ email, otp }: VerifyEmailDto): Promise<ApiResponse> {
    const otpDetails = await this.otpRepository.findOne({
      where: { email, otp },
    });

    if (!otpDetails) {
      throw new BadRequestException(
        "Woops! We couldn't verify your email. Please check the OTP and try again.",
      );
    }

    await this.authRepository.update(
      { email },
      {
        isEmailVerified: true,
      },
    );
    return {
      statusCode: 200,
      response: {},
      message: 'Email verified successfully',
    };
  }

  async getMe({ userId }: AuthUserInterface): Promise<ApiResponse<User>> {
    const user = await this.authRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      statusCode: 200,
      response: user,
      message: 'User information retrieved successfully',
    };
  }

  async getRefreshToken(res: Response, token: string) {
    let data: AuthUserInterface;
    try {
      data = this.jwtService.verify<AuthUserInterface>(token);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid or missing refresh token.');
    }

    const user = await this.authRepository.findOne({
      where: { email: data.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tokenPayload: AuthUserInterface = {
      email: user.email,
      userId: user.id,
    };

    const accessToken = this.jwtService.sign(tokenPayload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(tokenPayload);

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    return {
      statusCode: 201,
      response: {
        accessToken,
        user,
      },
      message: 'Access token refreshed successfully.',
    };
  }

  async updateUserDetails(user: AuthUserInterface, updateUserDto: UpdateUserDto) {
    const updateUser = await this.authRepository.update({ id: user.userId }, updateUserDto);

    return {
      statusCode: 201,
      response: updateUser,
      message: 'User details updated successfully',
    };
  }

  logout(res: Response) {
    res.clearCookie('refresh-token', {
      httpOnly: true,
      secure: true,
    });

    return {
      statusCode: 200,
      response: {},
      message: 'Logged out successfully',
    };
  }

  async updateProfilePicture(
    file: Express.Multer.File,
    user: AuthUserInterface,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const loginUser = await this.authRepository.findById(user.userId, [], []);

    if (!loginUser) {
      throw new NotFoundException('User not found');
    }

    const { url } = await this.storageService.uploadFile(file, {
      path: 'profile',
      isPublic: false,
      metadata: {
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    });

    await this.authRepository.update(user.userId, {
      profilePicture: url,
    });

    return {
      statusCode: 200,
      response: loginUser,
      message: 'Update profile picture successfully',
    };
  }
}
