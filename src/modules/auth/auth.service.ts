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
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User, UserStatus } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthRepository } from './repository/auth.repository';
import { EmailService } from '../email/email.service';
import { type StorageService } from '../storage/interfaces/storage-service.interface';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    // create otp in Redis and send to email for verification
    const otp = await this.otpService.createOtp(dto.email);

    await this.emailService.sendVerificationMessage({
      receiverId: user.email,
      otp,
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
      relations: ['password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    if (!(await user?.password?.validatePassword(password))) {
      throw new UnauthorizedException('Invalid credential');
    }

    const tokenPayload: AuthUserInterface = {
      email: user.email,
      userId: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.getOrThrow('ACCESS_TOKEN_EXPIRY'),
    });
    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.getOrThrow('REFRESH_TOKEN_EXPIRY'),
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    // Exclude password relation from response
    const userResponse = { ...user } as Record<string, unknown>;
    delete userResponse.password;

    return {
      statusCode: 201,
      response: {
        accessToken,
        user: userResponse,
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

    // create otp in Redis and send to email for verification
    const otp = await this.otpService.createOtp(email);

    await this.emailService.sendVerificationMessage({
      receiverId: user.email,
      otp,
      name: user.name,
    });

    return {
      statusCode: 200,
      response: {},
      message: 'Verification email sent successfully',
    };
  }

  async verifyEmail({ email, otp }: VerifyEmailDto): Promise<ApiResponse> {
    const isValid = await this.otpService.verifyOtp(email, otp);

    if (!isValid) {
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
      role: user.role,
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.getOrThrow('ACCESS_TOKEN_EXPIRY'),
    });
    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.getOrThrow('REFRESH_TOKEN_EXPIRY'),
    });

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

    // Return fresh user data after update
    loginUser.profilePicture = url;

    return {
      statusCode: 200,
      response: loginUser,
      message: 'Update profile picture successfully',
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto): Promise<ApiResponse> {
    const user = await this.authRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("User with this email doesn't exist");
    }

    const otp = await this.otpService.createOtp(email, 'reset_otp:');

    await this.emailService.sendResetPasswordOtp({
      receiverId: email,
      otp,
      name: user.name,
    });

    return {
      statusCode: 200,
      response: {},
      message: 'Password reset OTP sent successfully',
    };
  }

  async resetPassword({ email, otp, password }: ResetPasswordDto): Promise<ApiResponse> {
    const isValid = await this.otpService.verifyOtp(email, otp, 'reset_otp:');

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.authRepository.findOne({
      where: { email },
      relations: ['password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password.password = password;
    await this.authRepository.manager.save(user.password);

    return {
      statusCode: 200,
      response: {},
      message: 'Password reset successfully',
    };
  }
}
