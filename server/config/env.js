export const env = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  autosaveMs: parseInt(process.env.AUTOSAVE_MS || '15000'),
  nodeEnv: process.env.NODE_ENV || 'development',
};
