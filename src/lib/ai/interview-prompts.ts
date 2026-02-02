// AI Prompts для Підготовки до Співбесіди (Українська)
// Ви можете змінювати ці промпти без зміни коду

export const INTERVIEW_PROMPTS = {
  // Генерація 8 питань для співбесіди на основі вакансії та резюме
  GENERATE_QUESTIONS: `Ти експерт-рекрутер для позиції {{ROLE}} в компанії {{COMPANY}}.

Опис вакансії:
{{JOB_DESCRIPTION}}

Досвід кандидата:
{{RESUME_SUMMARY}}

Згенеруй рівно 8 реалістичних питань для співбесіди на цю позицію.

Розподіл питань:
- 3 поведінкові питання (використовуй метод STAR, "Розкажіть про ситуацію, коли...")
- 3 технічні/спеціалізовані питання (знання, підходи, фреймворки)
- 1 ситуаційне питання ("Що б ви зробили, якби...")
- 1 питання про мотивацію/культурну відповідність

Зроби питання:
- Специфічними для цієї конкретної ролі та рівня сеньйорності
- Релевантними до досвіду кандидата
- Реалістичними (не загальні підручникові питання)

Поверни у форматі JSON з таким точним форматом:
{
  "questions": [
    {
      "type": "behavioral",
      "question": "Розкажіть про ситуацію, коли..."
    },
    {
      "type": "technical",
      "question": "Як би ви підійшли до..."
    }
  ]
}

ВАЖЛИВО: Поверни ТІЛЬКИ валідний JSON, без іншого тексту.`,

  // Аналіз однієї відповіді
  ANALYZE_ANSWER: `Ти досвідчений коуч по співбесідам, який оцінює відповідь кандидата.

Тип питання: {{QUESTION_TYPE}}
Питання: "{{QUESTION}}"

Відповідь кандидата:
{{ANSWER}}

Оціни відповідь за 3 критеріями (кожен від 0 до 10):

1. СТРУКТУРА (0-10):
   - Для поведінкових: Чіткий фреймворк STAR (Ситуація, Завдання, Дія, Результат)
   - Для технічних: Логічне пояснення, чітка аргументація
   - Для ситуаційних: Структурований підхід, покрокове мислення
   - Загалом: Ясність та організованість

2. РЕЛЕВАНТНІСТЬ (0-10):
   - Безпосередньо відповідає на питання
   - Відповідна глибина для ролі/сеньйорності
   - Демонструє розуміння того, що хоче почути інтерв'юер

3. ВПЛИВ (0-10):
   - Демонструє конкретні результати
   - Використовує специфічні приклади (не розпливчасті)
   - Показує бізнес/технічні результати
   - Кількісні показники, коли можливо

Потім надай:
- 2-3 конкретні СИЛЬНІ СТОРОНИ (що було зроблено добре)
- 2-3 конкретні СЛАБКІ СТОРОНИ (що відсутнє або можна покращити)
- 2-3 практичні РЕКОМЕНДАЦІЇ (конкретні способи покращити цю відповідь)

Загальний Бал = середнє з 3 критеріїв, конвертоване в шкалу 0-100

Поверни у форматі JSON:
{
  "score": 75,
  "structure_score": 8,
  "relevance_score": 7,
  "impact_score": 8,
  "strengths": ["конкретна сильна сторона 1", "сильна сторона 2"],
  "weaknesses": ["конкретний пробіл 1", "пробіл 2"],
  "suggestions": ["практична порада 1", "порада 2"]
}`,

  // Генерація фінального підсумку після всіх 8 питань
  FINAL_SUMMARY: `Ти кар'єрний коуч, який аналізує повну імітацію співбесіди.

Кандидат відповів на 8 питань з такими результатами:

{{ALL_RESPONSES}}

Середній Бал: {{AVERAGE_SCORE}}/100

Надай загальну оцінку:

1. ЗАГАЛЬНА ОЦІНКА (2-3 речення):
   - Загальний рівень виступу
   - Готовність до співбесіди
   - Одне ключове спостереження

2. ТОП-3 СИЛЬНІ СТОРОНИ (патерни у всіх відповідях):
   - Що кандидат послідовно робить добре
   - Конкретні продемонстровані навички

3. ТОП-3 ОБЛАСТІ ДЛЯ ПОКРАЩЕННЯ (патерни слабкостей):
   - Що потребує роботи у кількох відповідях
   - Загальні пробіли або відсутні елементи

4. ПЛАН ДІЙ (3 конкретні наступні кроки):
   - Конкретні речі для практики перед реальною співбесідою
   - Як усунути слабкості
   - Ресурси або вправи для спроби

Поверни у форматі JSON:
{
  "assessment": "...",
  "strengths": ["сильна сторона 1", "сильна сторона 2", "сильна сторона 3"],
  "weaknesses": ["область 1", "область 2", "область 3"],
  "actions": ["крок 1", "крок 2", "крок 3"]
}`,
};

// Helper function to replace variables in prompts
export function fillPrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

// Helper to extract resume summary (to reduce tokens) - SAFE VERSION
export function extractResumeSummary(resume: any): string {
  const summary = resume.summary || '';
  
  // Safe experience extraction
  const topExperiences = (resume.experience || []).slice(0, 3).map((exp: any) => {
    const role = exp.role || 'Position';
    const company = exp.company || 'Company';
    const bullets = Array.isArray(exp.bullets) ? exp.bullets.slice(0, 2).join('; ') : '';
    return `- ${role} at ${company}: ${bullets}`;
  }).join('\n');
  
  // Safe skills extraction - handle array, object, or string
  let skillsText = '';
  if (resume.skills) {
    if (Array.isArray(resume.skills)) {
      // Array: ['JavaScript', 'Python']
      skillsText = resume.skills.slice(0, 10).join(', ');
    } else if (typeof resume.skills === 'object') {
      // Object: {technical: [], soft: []}
      const allSkills = Object.values(resume.skills)
        .flat()
        .filter(Boolean)
        .slice(0, 10);
      skillsText = allSkills.join(', ');
    } else if (typeof resume.skills === 'string') {
      // String: "JavaScript, Python"
      skillsText = resume.skills;
    }
  }
  
  return `
Summary: ${summary}

Key Experience:
${topExperiences}

Skills: ${skillsText}
`.trim();
}
