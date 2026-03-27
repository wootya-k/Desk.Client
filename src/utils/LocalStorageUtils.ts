// utils/LocalStorageUtils.ts

export const setExpiringItem = (key: string, value: string, days: number = 1): void => {
  const now = new Date().getTime();
  const expiry = now + days * 24 * 60 * 60 * 1000;
  const item = {
    value,
    expiry,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Failed to set item with expiry in localStorage:', error);
  }
};

export const getExpiringItem = (key: string): string | null => {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    const now = new Date().getTime();

    if (now > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return item.value;
  } catch (error) {
    console.error('Failed to get item with expiry from localStorage:', error);
    return null;
  }
};

export const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove item from localStorage:', error);
  }
};