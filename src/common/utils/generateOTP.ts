import { randomInt } from 'crypto';

/**
 * @param length how much length otp you want
 * @returns given length otp
 */
export function generateOTP(length: number) {
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += randomInt(0, 10).toString();
  }
  return OTP;
}
