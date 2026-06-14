import { emailStyles } from './styles';

export function ResetPasswordOtp({
  apiUrl,
  otp,
  name,
}: {
  apiUrl: string;
  otp: string;
  name: string;
}) {
  return (
    <div style={emailStyles.container}>
      <div style={emailStyles.table}>
        <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
          <tr>
            <td>
              <img src={`${apiUrl}/images/logo.png`} alt="Short Link" style={emailStyles.logo} />
            </td>
          </tr>
          <tr>
            <td>
              <div style={emailStyles.card}>
                <h3 style={emailStyles.heading}>Your OTP Code</h3>

                <p style={emailStyles.otpCode}>
                  {otp.split('').map((digit, index) => (
                    <span key={index} style={emailStyles.otpDigit}>
                      {digit}
                    </span>
                  ))}
                </p>

                <p style={emailStyles.paragraph}>Hi {name},</p>
                <p style={emailStyles.paragraph}>
                  We received a request to reset the password associated with this email address. If
                  you made this request, please use the OTP code above to reset your password.
                </p>
                <p style={emailStyles.paragraph}>
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
                <p style={emailStyles.footer}>&copy; {new Date().getFullYear()} SHORT LINK</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  );
}
