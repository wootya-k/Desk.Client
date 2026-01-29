interface AppConfig {
  BASE_URL: string;
}

let config: AppConfig | null = null;


/**
 * Загрузка конфигурации — должна быть вызвана при запуске приложения
 */
export const initializeConfig = async () => {

  try {
    const response = await fetch('/config.json');
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    config = JSON.parse(text);
  } catch (error) {
    console.error('Error loading config:', error);
    throw error;
  }
};

/**
 * Получить весь конфиг
 */
export const getConfig = async (): Promise<AppConfig> => {
  if (!config) {
    await initializeConfig();
  }
  if (!config) {
    throw new Error('Configuration is not initialized');
  }
  return config;
};


/**
 * Получить URL
 */
export const getBaseUrl = async (): Promise<string> => {
  if (!config) {
    await initializeConfig();
  }
  if (!config) {
    throw new Error('Configuration is not initialized');
  }
  return config.BASE_URL;
};


export const buildUrl = async (path: string): Promise<string> => {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}${path}`;
};
