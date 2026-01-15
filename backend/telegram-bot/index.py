"""
Telegram бот для планирования недельного меню с учётом предпочтений пользователя
"""
import json
import os
import requests
import psycopg2
from typing import Dict, Any, Optional

TELEGRAM_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_db_connection():
    """Подключение к базе данных"""
    return psycopg2.connect(DATABASE_URL)

def get_user_state(chat_id: int) -> Optional[Dict[str, Any]]:
    """Получить состояние пользователя из БД"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT step, preferences, menu FROM user_states WHERE chat_id = %s",
            (chat_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if row:
            return {
                'step': row[0],
                'preferences': row[1],
                'menu': row[2]
            }
        return None
    except Exception as e:
        print(f"Error getting user state: {e}")
        return None

def save_user_state(chat_id: int, state: Dict[str, Any]):
    """Сохранить состояние пользователя в БД"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_states (chat_id, step, preferences, menu, updated_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (chat_id) 
            DO UPDATE SET 
                step = EXCLUDED.step,
                preferences = EXCLUDED.preferences,
                menu = EXCLUDED.menu,
                updated_at = CURRENT_TIMESTAMP
        """, (
            chat_id,
            state.get('step', 'diet'),
            json.dumps(state.get('preferences', {})),
            json.dumps(state.get('menu')) if state.get('menu') else None
        ))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error saving user state: {e}")

def send_message(chat_id: int, text: str, reply_markup: Optional[Dict] = None) -> Dict:
    """Отправка сообщения в Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    response = requests.post(url, json=payload)
    return response.json()

def generate_menu_with_ai(preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Генерация меню через OpenAI GPT-4"""
    if not OPENAI_API_KEY:
        return {"error": "OpenAI API key not configured"}
    
    diet_text = ', '.join(preferences.get('diet', ['обычная'])) if preferences.get('diet') else 'обычная'
    allergens_text = ', '.join(preferences.get('allergens', [])) if preferences.get('allergens') else 'нет'
    excluded_text = ', '.join(preferences.get('excludedFoods', [])) if preferences.get('excludedFoods') else 'нет'
    
    prompt = f"""Создай недельное меню на 7 дней с завтраком, обедом и ужином.

Требования:
- Бюджет: {preferences.get('budget', 5000)} руб/неделя
- Диета: {diet_text}
- Исключить аллергены: {allergens_text}
- Не использовать продукты: {excluded_text}
- Порций: {preferences.get('servings', 2)}
- Время готовки: до {preferences.get('cookingTime', '60')} минут

Верни JSON в формате:
{{
  "menu": [
    {{
      "day": "Понедельник",
      "meals": {{
        "breakfast": {{"name": "...", "calories": 400, "cost": 150, "time": 15}},
        "lunch": {{"name": "...", "calories": 600, "cost": 250, "time": 30}},
        "dinner": {{"name": "...", "calories": 500, "cost": 200, "time": 25}}
      }}
    }}
  ]
}}

Только JSON, без комментариев."""

    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4',
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.7
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return {"error": f"OpenAI API error: {response.status_code}"}
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Извлечение JSON из ответа
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        return json.loads(content)
    except Exception as e:
        return {"error": f"Ошибка генерации меню: {str(e)}"}

def format_menu_message(menu_data: Dict) -> str:
    """Форматирование меню для отправки в Telegram"""
    if "error" in menu_data:
        return f"❌ {menu_data['error']}"
    
    menu = menu_data.get('menu', [])
    if not menu:
        return "❌ Не удалось сгенерировать меню"
    
    message = "🍽 *Ваше меню на неделю:*\n\n"
    
    total_cost = 0
    for day_menu in menu:
        day = day_menu['day']
        meals = day_menu['meals']
        
        day_cost = meals['breakfast']['cost'] + meals['lunch']['cost'] + meals['dinner']['cost']
        total_cost += day_cost
        
        message += f"📅 *{day}*\n"
        message += f"🌅 Завтрак: {meals['breakfast']['name']} ({meals['breakfast']['calories']} ккал)\n"
        message += f"☀️ Обед: {meals['lunch']['name']} ({meals['lunch']['calories']} ккал)\n"
        message += f"🌙 Ужин: {meals['dinner']['name']} ({meals['dinner']['calories']} ккал)\n"
        message += f"💰 Стоимость дня: {day_cost} ₽\n\n"
    
    message += f"📊 *Итого на неделю: {total_cost} ₽*"
    return message

def handle_start(chat_id: int):
    """Обработка команды /start"""
    state = {
        'step': 'diet',
        'preferences': {
            'diet': [],
            'allergens': [],
            'excludedFoods': [],
            'budget': 5000,
            'cookingTime': '60',
            'servings': 2
        }
    }
    save_user_state(chat_id, state)
    
    keyboard = {
        "inline_keyboard": [
            [{"text": "🥗 Обычное", "callback_data": "diet_none"}, {"text": "🌱 Вегетарианское", "callback_data": "diet_vegetarian"}],
            [{"text": "🥑 Веганское", "callback_data": "diet_vegan"}, {"text": "🥩 Кето", "callback_data": "diet_keto"}],
            [{"text": "✅ Готово", "callback_data": "diet_done"}]
        ]
    }
    
    send_message(
        chat_id,
        "👋 Привет! Я помогу составить меню на неделю.\n\n"
        "🍽 *Шаг 1/4: Тип питания*\n"
        "Выберите предпочтения (можно несколько):",
        keyboard
    )

def handle_callback(chat_id: int, callback_data: str):
    """Обработка нажатий на кнопки"""
    state = get_user_state(chat_id)
    if not state:
        handle_start(chat_id)
        return
    
    preferences = state['preferences']
    
    # Обработка выбора диеты
    if callback_data.startswith('diet_'):
        if callback_data == 'diet_done':
            state['step'] = 'allergens'
            save_user_state(chat_id, state)
            
            keyboard = {
                "inline_keyboard": [
                    [{"text": "🥛 Молочные", "callback_data": "allergen_dairy"}, {"text": "🥚 Яйца", "callback_data": "allergen_eggs"}],
                    [{"text": "🥜 Орехи", "callback_data": "allergen_nuts"}, {"text": "🌾 Глютен", "callback_data": "allergen_gluten"}],
                    [{"text": "🦐 Морепродукты", "callback_data": "allergen_seafood"}, {"text": "🍋 Цитрусовые", "callback_data": "allergen_citrus"}],
                    [{"text": "✅ Готово", "callback_data": "allergen_done"}]
                ]
            }
            send_message(
                chat_id,
                "🚫 *Шаг 2/4: Аллергены*\n"
                "Что нужно исключить из меню?",
                keyboard
            )
        else:
            diet_type = callback_data.replace('diet_', '')
            if diet_type not in preferences['diet']:
                preferences['diet'].append(diet_type)
                state['preferences'] = preferences
                save_user_state(chat_id, state)
                send_message(chat_id, f"✅ Добавлено: {diet_type}")
    
    # Обработка аллергенов
    elif callback_data.startswith('allergen_'):
        if callback_data == 'allergen_done':
            state['step'] = 'budget'
            save_user_state(chat_id, state)
            
            keyboard = {
                "inline_keyboard": [
                    [{"text": "💰 3000 ₽", "callback_data": "budget_3000"}, {"text": "💰 5000 ₽", "callback_data": "budget_5000"}],
                    [{"text": "💰 7000 ₽", "callback_data": "budget_7000"}, {"text": "💰 10000 ₽", "callback_data": "budget_10000"}]
                ]
            }
            send_message(
                chat_id,
                "💵 *Шаг 3/4: Бюджет*\n"
                "Сколько готовы тратить на еду в неделю?",
                keyboard
            )
        else:
            allergen = callback_data.replace('allergen_', '')
            if allergen not in preferences['allergens']:
                preferences['allergens'].append(allergen)
                state['preferences'] = preferences
                save_user_state(chat_id, state)
                send_message(chat_id, f"✅ Исключено: {allergen}")
    
    # Обработка бюджета
    elif callback_data.startswith('budget_'):
        budget = int(callback_data.replace('budget_', ''))
        preferences['budget'] = budget
        state['preferences'] = preferences
        state['step'] = 'servings'
        save_user_state(chat_id, state)
        
        keyboard = {
            "inline_keyboard": [
                [{"text": "👤 1 человек", "callback_data": "servings_1"}, {"text": "👥 2 человека", "callback_data": "servings_2"}],
                [{"text": "👨‍👩‍👦 3 человека", "callback_data": "servings_3"}, {"text": "👨‍👩‍👧‍👦 4+ человека", "callback_data": "servings_4"}]
            ]
        }
        send_message(
            chat_id,
            "👥 *Шаг 4/4: Количество порций*\n"
            "На сколько человек готовить?",
            keyboard
        )
    
    # Обработка количества порций и генерация меню
    elif callback_data.startswith('servings_'):
        servings = int(callback_data.replace('servings_', ''))
        preferences['servings'] = servings
        state['preferences'] = preferences
        save_user_state(chat_id, state)
        
        send_message(chat_id, "⏳ Генерирую персональное меню... Это займёт ~30 секунд")
        
        menu_data = generate_menu_with_ai(preferences)
        menu_message = format_menu_message(menu_data)
        
        keyboard = {
            "inline_keyboard": [
                [{"text": "🔄 Пересоздать меню", "callback_data": "regenerate"}],
                [{"text": "🛒 Список покупок", "callback_data": "shopping_list"}]
            ]
        }
        send_message(chat_id, menu_message, keyboard)
        
        # Сохраняем меню для списка покупок
        state['menu'] = menu_data.get('menu', [])
        save_user_state(chat_id, state)
    
    # Пересоздание меню
    elif callback_data == 'regenerate':
        send_message(chat_id, "⏳ Создаю новое меню...")
        menu_data = generate_menu_with_ai(preferences)
        menu_message = format_menu_message(menu_data)
        
        keyboard = {
            "inline_keyboard": [
                [{"text": "🔄 Пересоздать меню", "callback_data": "regenerate"}],
                [{"text": "🛒 Список покупок", "callback_data": "shopping_list"}]
            ]
        }
        send_message(chat_id, menu_message, keyboard)
        state['menu'] = menu_data.get('menu', [])
        save_user_state(chat_id, state)
    
    # Список покупок
    elif callback_data == 'shopping_list':
        menu = state.get('menu', [])
        if not menu:
            send_message(chat_id, "❌ Сначала создайте меню!")
            return
        
        # Собираем все блюда
        all_dishes = []
        for day_menu in menu:
            meals = day_menu['meals']
            all_dishes.extend([
                meals['breakfast']['name'],
                meals['lunch']['name'],
                meals['dinner']['name']
            ])
        
        shopping_message = "🛒 *Список покупок на неделю:*\n\n"
        shopping_message += "Для приготовления блюд:\n"
        shopping_message += "\n".join([f"• {dish}" for dish in all_dishes])
        shopping_message += "\n\n💡 Проверьте, что есть дома, и купите недостающее!"
        
        send_message(chat_id, shopping_message)

def handler(event: dict, context) -> dict:
    """
    Основной обработчик webhook от Telegram
    """
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Обработка callback кнопок
        if 'callback_query' in body:
            callback = body['callback_query']
            chat_id = callback['message']['chat']['id']
            callback_data = callback['data']
            
            handle_callback(chat_id, callback_data)
            
            # Подтверждаем получение callback
            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/answerCallbackQuery",
                json={"callback_query_id": callback['id']}
            )
        
        # Обработка текстовых сообщений
        elif 'message' in body:
            message = body['message']
            chat_id = message['chat']['id']
            text = message.get('text', '')
            
            if text == '/start':
                handle_start(chat_id)
            elif text == '/menu':
                state = get_user_state(chat_id)
                if state and state.get('menu'):
                    menu_message = format_menu_message({'menu': state['menu']})
                    send_message(chat_id, menu_message)
                else:
                    send_message(chat_id, "❌ Сначала создайте меню командой /start")
            else:
                send_message(
                    chat_id,
                    "Используйте команду /start для создания меню"
                )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        print(f"Error in handler: {str(e)}")
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)}),
            'isBase64Encoded': False
        }
