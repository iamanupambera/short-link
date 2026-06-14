import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  HttpCode,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRegisterDto } from './dto/user-register.dto';
import { UserLoginDto } from './dto/user-login.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { type AuthUserInterface } from 'src/common/interfaces';
import { Cookies } from 'src/common/decorator/cookies.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'User registration',
    description: 'User successfully login',
  })
  @ApiResponse({ status: 201, description: 'User register successfully.' })
  @ApiResponse({ status: 409, description: 'User Email Already exist.' })
  register(@Body() userRegisterDto: UserRegisterDto) {
    return this.authService.register(userRegisterDto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'User Login',
    description: 'User successfully login',
  })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Given password is incorrect or email id is not verified',
  })
  @ApiResponse({ status: 404, description: 'Email or username not found.' })
  async login(@Body() userLoginDto: UserLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(userLoginDto, res);
  }

  @Post('resend-verification-mail')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resend registration verification mail',
    description: 'Successfully send verification mail',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully send verification mail.',
  })
  @ApiResponse({ status: 404, description: 'Email not found.' })
  resendVerificationEmail(@Body() resendVerificationEmailDto: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(resendVerificationEmailDto);
  }

  @Post('verify-mail')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify user email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or email' })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Get('get-me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user information' })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  getMe(@AuthUser() user: AuthUserInterface) {
    return this.authService.getMe(user);
  }

  @Get('refresh-token')
  @ApiOperation({
    summary: 'Refresh the access token',
    description: 'Refreshes the access token using the provided refresh token cookie.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing refresh token.',
  })
  getRefreshToken(
    @Res({ passthrough: true }) res: Response,
    @Cookies('refresh-token') refreshToken: string,
  ) {
    return this.authService.getRefreshToken(res, refreshToken);
  }

  @Patch('update-details')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update user details',
    description: 'Allows an authenticated user to update their details.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User details updated successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateUserDetails(@AuthUser() user: AuthUserInterface, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.updateUserDetails(user, updateUserDto);
  }

  @Get('logout')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Logout the user',
    description: 'Allows an user to logout.',
  })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Post('change-profile-picture')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid request.',
  })
  @ApiBody({
    description: 'Upload profile picture',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  updateProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() user: AuthUserInterface,
  ) {
    return this.authService.updateProfilePicture(file, user);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or data' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
