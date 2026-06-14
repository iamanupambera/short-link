import { emailStyles } from './styles';

export function WelcomeMail({
  role,
  apiUrl,
  clientUrl,
  name,
}: {
  password: string;
  role: string;
  apiUrl: string;
  clientUrl: string;
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
                <h3 style={emailStyles.heading}>Welcome to SHORT LINK!</h3>
                <p style={emailStyles.paragraph}>Hi {name},</p>
                <p style={emailStyles.paragraph}>
                  We're thrilled to have you on board! Your account has been successfully created as{' '}
                  <strong>{role}</strong>, and you can now explore all the features and
                  opportunities SHORT LINK offers.
                </p>
                <p style={emailStyles.paragraph}>
                  If you have any questions, feel free to reach out to our support team.
                </p>
                <p style={emailStyles.paragraph}>Let's get started!</p>
                <a href={`${clientUrl}/login`} style={emailStyles.button}>
                  Login to Your Account
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
