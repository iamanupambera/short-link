import { emailStyles } from './styles';

export function VerifyEmail({
  email,
  otp,
  clientUrl,
  name,
  apiUrl,
}: {
  otp: string;
  clientUrl: string;
  email: string;
  apiUrl: string;
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
                <h3 style={emailStyles.heading}>Verify Your Email</h3>
                <p style={emailStyles.paragraph}>Hi {name},</p>
                <p style={emailStyles.paragraph}>
                  Thank you for signing up! To complete your registration and verify your email
                  address, please click the button below.
                </p>
                <p style={emailStyles.paragraph}>
                  If you did not create an account with us, you can safely ignore this email.
                </p>
                <a
                  href={`${clientUrl}/verify-otp/${otp}/${encodeURIComponent(email)}`}
                  style={emailStyles.button}
                >
                  Verify Email
                </a>
                <p style={emailStyles.footer}>&copy; {new Date().getFullYear()} SHORT LINK</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  );
}
