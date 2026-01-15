import json
import os
from openai import OpenAI

def handler(event: dict, context) -> dict:
    '''Генерирует персонализированное недельное меню с учетом предпочтений пользователя через OpenAI GPT-4'''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        data = json.loads(event.get('body', '{}'))
        preferences = data.get('preferences', {})
        
        diet = preferences.get('diet', [])
        allergens = preferences.get('allergens', [])
        excluded_foods = preferences.get('excludedFoods', [])
        budget = preferences.get('budget', 5000)
        cooking_time = preferences.get('cookingTime', '30-60')
        servings = preferences.get('servings', 2)
        meals_per_day = preferences.get('mealsPerDay', 3)
        
        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
        prompt = f"""Составь недельное меню для {servings} человек(а) на 7 дней с учетом следующих требований:

ОБЯЗАТЕЛЬНЫЕ ИСКЛЮЧЕНИЯ (НЕ ИСПОЛЬЗОВАТЬ ЭТИ ПРОДУКТЫ И БЛЮДА):
{', '.join(excluded_foods) if excluded_foods else 'Нет исключений'}

Аллергены (исключить): {', '.join(allergens) if allergens else 'Нет'}
Тип диеты: {', '.join(diet) if diet else 'Обычное питание'}
Бюджет на неделю: {budget} рублей
Время приготовления одного блюда: {cooking_time} минут
Приемов пищи в день: {meals_per_day}

ВАЖНО: Проверь, чтобы НИ ОДНО блюдо не содержало продукты из списка исключений!

Верни JSON в ТОЧНО таком формате:
{{
  "menu": [
    {{
      "day": "Понедельник",
      "meals": {{
        "breakfast": {{"name": "Название", "calories": 320, "protein": 12, "carbs": 54, "fat": 8, "cookingTime": 15, "cost": 120}},
        "lunch": {{"name": "Название", "calories": 520, "protein": 42, "carbs": 58, "fat": 12, "cookingTime": 35, "cost": 200}},
        "dinner": {{"name": "Название", "calories": 450, "protein": 36, "carbs": 42, "fat": 16, "cookingTime": 45, "cost": 300}}
      }}
    }}
  ]
}}

Дни недели: Понедельник, Вторник, Среда, Четверг, Пятница, Суббота, Воскресенье
Используй сезонные продукты. Разнообразь меню. Укажи реалистичные цены для России."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты эксперт-диетолог. Строго следуй всем исключениям продуктов. Возвращай только валидный JSON без дополнительного текста."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            response_format={"type": "json_object"}
        )
        
        menu_data = json.loads(response.choices[0].message.content)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(menu_data)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
