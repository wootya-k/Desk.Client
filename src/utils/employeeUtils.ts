// Парсинг даты из разных форматов
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    let date: Date | null = null;
    
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('.');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      date = new Date(dateString);
    }
    
    if (date && !isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    return null;
  }
  
  return null;
};

// Вычисление возраста
export const calculateAge = (birthDateString: string): number | null => {
  const birthDate = parseDate(birthDateString);
  if (!birthDate) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Определение предельного возраста
export const getRetirementAge = (gender: string, rank: string): number | null => {
  const genderLower = (gender || '').toLowerCase();
  const rankLower = (rank || '').toLowerCase();
  
  const isMale = genderLower.includes('муж') || genderLower === 'м' || genderLower.includes('male');
  const isFemale = genderLower.includes('жен') || genderLower === 'ж' || genderLower.includes('female');
  
  if (isMale) {
    if (rankLower.includes('рядов') || rankLower.includes('солдат') || rankLower.includes('матрос') || 
        rankLower.includes('прапорщик') || rankLower.includes('мичман') || rankLower.includes('сержант') || 
        rankLower.includes('старшин')) {
      return 55;
    }
    if (rankLower.includes('младш') || rankLower.includes('лейтенант') || rankLower.includes('мл.')) {
      return 60;
    }
    if (rankLower.includes('майор') || rankLower.includes('подполковник') || rankLower.includes('полковник') || 
        rankLower.includes('ст.офицер') || rankLower.includes('старший офицер')) {
      return 65;
    }
    if (rankLower.includes('генерал') || rankLower.includes('адмирал') || rankLower.includes('маршал') || 
        rankLower.includes('высш.офицер') || rankLower.includes('высший офицер')) {
      return 70;
    }
  }
  
  if (isFemale) {
    if (rankLower.includes('рядов') || rankLower.includes('солдат') || rankLower.includes('матрос') || 
        rankLower.includes('прапорщик') || rankLower.includes('мичман') || rankLower.includes('сержант') || 
        rankLower.includes('старшин')) {
      return 45;
    }
    if (rankLower.includes('офицер') || rankLower.includes('лейтенант') || rankLower.includes('майор') || 
        rankLower.includes('подполковник') || rankLower.includes('полковник') || rankLower.includes('генерал') || 
        rankLower.includes('адмирал')) {
      return 50;
    }
  }
  
  return null;
};

// Проверка иногородний ли
// Проверка иногородний ли
export const isOutOfTown = (militaryCommission: string): boolean => {
  if (!militaryCommission) return false;
  const commissionLower = militaryCommission.toLowerCase();
  // Проверяем и "димитров", и "димитр" (сокращение)
  return !commissionLower.includes('димитров') && !commissionLower.includes('димитр');
};

// Формирование текста объяснения для tooltip
export const getAgeTooltip = (gender: string, rank: string, age: number): string => {
  const retirementAge = getRetirementAge(gender, rank);
  if (retirementAge === null) {
    return `Возраст: ${age} лет\nПредельный возраст не определён для данного звания/пола`;
  }
  const yearsLeft = retirementAge - age;
  let statusText = '';
  if (yearsLeft < 0) {
    statusText = `Превышен на ${Math.abs(yearsLeft)} ${getYearWord(Math.abs(yearsLeft))}`;
  } else if (yearsLeft === 0) {
    statusText = 'Предельный возраст достигнут';
  } else {
    statusText = `Осталось ${yearsLeft} ${getYearWord(yearsLeft)} до снятия с учёта`;
  }
  return `Возраст: ${age} ${getYearWord(age)}\nПол: ${gender || 'не указан'}\nЗвание: ${rank || 'не указано'}\nПредельный возраст: ${retirementAge} ${getYearWord(retirementAge)}\n${statusText}`;
};

export const getYearWord = (n: number): string => {
  const lastTwo = n % 100;
  const lastOne = n % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return 'лет';
  if (lastOne === 1) return 'год';
  if (lastOne >= 2 && lastOne <= 4) return 'года';
  return 'лет';
};