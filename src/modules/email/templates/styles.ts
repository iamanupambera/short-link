/**
 * Shared inline styles for email templates.
 * All styles must be inline for email client compatibility (Gmail strips <style> blocks).
 */
export const emailStyles = {
  body: {
    backgroundColor: '#f5f5f5',
    fontFamily: "'Figtree', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    margin: '0',
    padding: '0',
  },
  container: {
    backgroundColor: '#f5f5f5',
    padding: '60px 0',
    width: '100%',
  },
  table: {
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
  },
  logo: {
    display: 'block',
    margin: '0 auto 40px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '26px',
    padding: '50px 60px',
  },
  heading: {
    fontSize: '26px',
    fontWeight: '600' as const,
    color: '#000000',
    textAlign: 'center' as const,
    margin: '0 0 15px',
  },
  paragraph: {
    textAlign: 'left' as const,
    color: '#384860',
    fontSize: '16px',
    fontWeight: '400' as const,
    lineHeight: '22px',
    margin: '0 0 15px',
  },
  paragraphCenter: {
    textAlign: 'center' as const,
    color: '#384860',
    fontSize: '16px',
    fontWeight: '400' as const,
    lineHeight: '22px',
    margin: '0 0 15px',
  },
  button: {
    display: 'block',
    backgroundColor: '#01CFFF',
    color: '#ffffff',
    padding: '15px 35px',
    borderRadius: '15px',
    textDecoration: 'none',
    margin: '30px auto',
    fontSize: '16px',
    textAlign: 'center' as const,
    width: 'fit-content',
  },
  otpCode: {
    textAlign: 'center' as const,
    fontSize: '30px',
    fontWeight: 'bold' as const,
    letterSpacing: '10px',
    padding: '30px 0',
    color: '#000000',
  },
  otpDigit: {
    display: 'inline-block',
    margin: '0 6px',
  },
  footer: {
    textAlign: 'center' as const,
    color: '#384860',
    fontSize: '14px',
    margin: '20px 0 0',
  },
} as const;
