export interface MessagingService {
  sendVerificationMessage(data: {
    receiverId: string;
    otp: string;
    language: string;
    name: string;
  }): Promise<boolean>;

  sendResetPasswordOtp(data: {
    receiverId: string;
    otp: string;
    language: string;
    name: string;
  }): Promise<boolean>;

  sendWelcomeMessage(data: {
    receiverId: string;
    password: string;
    role: string;
    language: string;
    name: string;
  }): Promise<boolean>;
}
