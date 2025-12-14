export function WelcomeMail({
  password,
  role,
  apiUrl,
  clientUrl,
  name,
}: {
  password: string;
  role: string;
  language: string;
  apiUrl: string;
  clientUrl: string;
  name: string;
}) {
  return (
    <>
      <div>your password {password}</div>
      <style
        dangerouslySetInnerHTML={{
          __html: `* {
            padding: 0;
            margin: 0;
        }
        body {
            background: #F3FCFE;
            font-family: 'Figtree', sans-serif;
        }
        p {
            text-align: center;
            color: #384860;
            font-size: 16px;
            font-weight: 400;
            line-height: 22px;
            padding-bottom: 15px;
            margin: 0;
        }
        h3 {
            padding: 0 0 15px;
            font-size: 26px;
            font-weight: 600;
            color: #000;
            text-align: center;
        }
        a {
            text-decoration: none;
        }

        .email_container {
            background: #f5f5f5;
            width: 100%;
            height: 100%;
            padding: 60px 0;
        }
        .email_table {
            margin: 20px auto 0;
            width: 100%;
            max-width: 700px;
        }
        .logo_con {
            padding: 0 0 40px;
            margin: 0 auto;
            display: table;
        }
        .email_body {
            padding: 50px 60px;
            background: #fff;
            border-radius: 26px;
            box-shadow: 0px 4px 20px 0px rgba(0, 0, 0, 0.03);
        }
        .main_btn {
            margin: 30px auto;
            font-size: 16px;
            background: #01CFFF;
            border-radius: 15px;
            color: #fff;
            padding: 15px 35px;
            display: table;
        }
        .last_sec {
            padding: 40px 0 0;
        }
        .last_sec ul {
            text-align: center;
        }
        .last_sec ul li {
            list-style: none;
            display: inline-block;
            margin: 0 10px;
        }

        @media (max-width: 1500px) {
            .email_table {
                margin: 30px auto 0;
            }
        }
        @media (max-width: 767px) {
            .emailer_table {
                max-width: 100% !important;
                margin: 0 auto;
            }
            .email_body {
                padding: 30px;
                width: 75%;
                margin: 0 auto;
            }
            .main_btn {
                padding: 15px !important;
            }
            .email_container {
                padding: 20px 0;
            }
        }`,
        }}
      ></style>
      <div>your role {role}</div>
      <div className="email_container">
        <div style={{ display: 'table' }} className="email_table">
          <table align="center" width="100%" className="emailer_table" border={0} cellSpacing={0}>
            <tr>
              <td>
                <img src={`${apiUrl}/images/logo.png`} alt="logo" className="logo_con" />
              </td>
            </tr>
            <tr>
              <td>
                <div className="email_body">
                  <h3>Welcome to FJOBS!</h3>
                  <p style={{ textAlign: 'left' }}>Hi {name},</p>
                  <p style={{ textAlign: 'left' }}>
                    We’re thrilled to have you on board! Your account has been successfully created,
                    and you can now explore all the features and opportunities FJOBS offers.
                  </p>
                  <p style={{ textAlign: 'left' }}>
                    If you have any questions, feel free to reach out to our support team.
                  </p>
                  <p style={{ textAlign: 'left' }}>Let’s get started!</p>
                  <a href={`${clientUrl}/admin/login`} className="main_btn">
                    Login to Your Account
                  </a>
                  <p>&copy; {new Date().getFullYear()} SORT LINK</p>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </>
  );
}
