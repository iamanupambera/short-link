/**
 * @param length how much length otp you want
 * @returns given length otp
 */
export function generateOTP(length: number) {
  // Declare a digits variable which stores all digits
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}
