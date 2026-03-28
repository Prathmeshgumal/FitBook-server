const { z } = require('zod');

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET_KEY: z.string().min(1),
  JWT_ALGORITHM: z.string().default('HS256'),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().default(30),
  OTP_HMAC_SECRET: z.string().min(1),
  OTP_EXPIRE_MINUTES: z.coerce.number().default(10),
  PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(15),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USERNAME: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM_EMAIL: z.string().email(),
  ONBOARDER_EMAIL: z.string().email(),
  APP_ENV: z.string().default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081'),
  PORT: z.coerce.number().default(3000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success && process.env.NODE_ENV !== 'test') {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

const env = parsed.success ? parsed.data : {
  DATABASE_URL: 'postgres://test',
  JWT_SECRET_KEY: 'test-secret-key-that-is-long-enough-for-tests',
  JWT_ALGORITHM: 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: 15,
  REFRESH_TOKEN_EXPIRE_DAYS: 30,
  OTP_HMAC_SECRET: 'test-otp-hmac-secret',
  OTP_EXPIRE_MINUTES: 10,
  PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: 15,
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 587,
  SMTP_USERNAME: 'test@example.com',
  SMTP_PASSWORD: 'test-password',
  SMTP_FROM_EMAIL: 'test@example.com',
  ONBOARDER_EMAIL: 'admin@example.com',
  APP_ENV: 'test',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  PORT: 3000,
};

const config = {
  databaseUrl: env.DATABASE_URL,
  jwtSecretKey: env.JWT_SECRET_KEY,
  jwtAlgorithm: env.JWT_ALGORITHM,
  accessTokenExpireMinutes: env.ACCESS_TOKEN_EXPIRE_MINUTES,
  refreshTokenExpireDays: env.REFRESH_TOKEN_EXPIRE_DAYS,
  otpHmacSecret: env.OTP_HMAC_SECRET,
  otpExpireMinutes: env.OTP_EXPIRE_MINUTES,
  passwordResetTokenExpireMinutes: env.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
  smtpHost: env.SMTP_HOST,
  smtpPort: env.SMTP_PORT,
  smtpUsername: env.SMTP_USERNAME,
  smtpPassword: env.SMTP_PASSWORD,
  smtpFromEmail: env.SMTP_FROM_EMAIL,
  onboarderEmail: env.ONBOARDER_EMAIL,
  appEnv: env.APP_ENV,
  originsList: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  port: env.PORT,
};

module.exports = { config };
