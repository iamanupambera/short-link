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
    <div className="email_container">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          background: #F3FCFE;
          font-family: 'Figtree', sans-serif;
          margin: 0;
          padding: 0;
        }
        p {
          text-align: left;
          color: #384860;
          font-size: 16px;
          font-weight: 400;
          line-height: 22px;
          margin: 0 0 15px;
        }
        h3 {
          font-size: 26px;
          font-weight: 600;
          color: #000;
          text-align: center;
          margin-bottom: 15px;
        }
        .email_container {
          background: #f5f5f5;
          padding: 60px 0;
          width: 100%;
        }
        .email_table {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }
        .logo_con {
          display: table;
          margin: 0 auto 40px;
        }
        .email_body {
          background: #fff;
          border-radius: 26px;
          padding: 50px 60px;
          box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.03);
        }
        .main_btn {
          display: table;
          background: #01CFFF;
          color: white;
          padding: 15px 35px;
          border-radius: 15px;
          text-decoration: none;
          margin: 30px auto;
          font-size: 16px;
        }
        .last_sec {
          padding-top: 40px;
          text-align: center;
        }
        .last_sec ul {
          padding: 0;
          margin: 0;
          list-style: none;
        }
        .last_sec ul li {
          display: inline-block;
          margin: 0 10px;
        }
      `,
        }}
      />
      <div className="email_table">
        <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
          <tr>
            <td>
              <img src={`${apiUrl}/images/logo.png`} alt="logo" className="logo_con" />
            </td>
          </tr>
          <tr>
            <td>
              <div className="email_body">
                <h3>Verify Your Email</h3>
                <p>Hi {name},</p>
                <p>
                  Thank you for signing up! To complete your registration and verify your email
                  address, please click the button below.
                </p>
                <p>If you did not create an account with us, you can safely ignore this email.</p>
                <a
                  href={`${clientUrl}/en/verify-otp/${otp}/${encodeURIComponent(email)}`}
                  className="main_btn"
                >
                  Verify Email
                </a>
                <p style={{ textAlign: 'center' }}>&copy; {new Date().getFullYear()} SORT LINK</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  );
}
