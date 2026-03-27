// utils/retry.ts
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Не retry'им, если это не сетевая ошибка
      if (attempt === maxRetries) break;
      
      // Экспоненциальная задержка: 1s, 2s, 4s, 8s...
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Попытка ${attempt + 1} не удалась. Повтор через ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};