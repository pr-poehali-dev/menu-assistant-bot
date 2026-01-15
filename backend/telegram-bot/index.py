"""
Telegram бот для планирования недельного меню с учётом предпочтений пользователя
"""
import json
import os
import requests
import psycopg2
from typing import Dict, Any, Optional

TELEGRAM_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
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

def translate_to_russian(text: str) -> str:
    """Простой перевод через Google Translate API (бесплатно)"""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': 'en',
            'tl': 'ru',
            'dt': 't',
            'q': text
        }
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            result = response.json()
            if result and len(result) > 0 and len(result[0]) > 0:
                return result[0][0][0]
    except Exception as e:
        print(f"Translation error: {e}")
    return text

def fetch_meals_by_category(category: str, limit: int = 30) -> list:
    """Получение рецептов по категории из TheMealDB"""
    try:
        response = requests.get(
            f'https://www.themealdb.com/api/json/v1/1/filter.php?c={category}',
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            meals = data.get('meals', [])
            # Получаем детали для каждого блюда
            detailed_meals = []
            for meal in meals[:limit]:
                detail_response = requests.get(
                    f'https://www.themealdb.com/api/json/v1/1/lookup.php?i={meal["idMeal"]}',
                    timeout=5
                )
                if detail_response.status_code == 200:
                    detail_data = detail_response.json()
                    if detail_data.get('meals'):
                        m = detail_data['meals'][0]
                        detailed_meals.append({
                            'name': translate_to_russian(m['strMeal']),
                            'category': m['strCategory'],
                            'area': m['strArea'],
                            'instructions': m['strInstructions'],
                            'ingredients': [m.get(f'strIngredient{i}', '') for i in range(1, 21) if m.get(f'strIngredient{i}')]
                        })
            return detailed_meals
    except Exception as e:
        print(f"Error fetching category meals: {e}")
    return []

def fetch_random_meals_from_db(count: int = 21) -> list:
    """Получение случайных рецептов из TheMealDB (полностью бесплатно!)"""
    meals = []
    try:
        for _ in range(count):
            response = requests.get(
                'https://www.themealdb.com/api/json/v1/1/random.php',
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('meals'):
                    meal = data['meals'][0]
                    meals.append({
                        'name': translate_to_russian(meal['strMeal']),
                        'category': meal['strCategory'],
                        'area': meal['strArea'],
                        'instructions': meal['strInstructions'],
                        'ingredients': [meal.get(f'strIngredient{i}', '') for i in range(1, 21) if meal.get(f'strIngredient{i}')]
                    })
    except Exception as e:
        print(f"Error fetching meals: {e}")
    
    return meals

def generate_menu_with_ai(preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Генерация меню из базы TheMealDB с умной фильтрацией по диете"""
    
    diet_types = preferences.get('diet', [])
    allergens = preferences.get('allergens', [])
    excluded = preferences.get('excludedFoods', [])
    budget_per_meal = preferences.get('budget', 5000) / 21
    
    # Маппинг типов диет на категории TheMealDB
    diet_to_categories = {
        'vegetarian': ['Vegetarian'],
        'vegan': ['Vegan'],
        'none': ['Beef', 'Chicken', 'Pork', 'Seafood', 'Lamb', 'Pasta', 'Miscellaneous'],
        'keto': ['Beef', 'Chicken', 'Pork', 'Seafood', 'Lamb'],
        'paleo': ['Beef', 'Chicken', 'Pork', 'Seafood', 'Lamb'],
        'lowcarb': ['Beef', 'Chicken', 'Pork', 'Seafood', 'Lamb']
    }
    
    # Определяем категории для поиска на основе диеты
    target_categories = []
    if diet_types:
        for diet in diet_types:
            target_categories.extend(diet_to_categories.get(diet, []))
    else:
        target_categories = ['Beef', 'Chicken', 'Pork', 'Seafood', 'Vegetarian', 'Pasta', 'Dessert']
    
    # Убираем дубликаты
    target_categories = list(set(target_categories))
    
    # Получаем блюда из нужных категорий
    all_meals = []
    for category in target_categories:
        category_meals = fetch_meals_by_category(category, limit=10)
        all_meals.extend(category_meals)
    
    # Если недостаточно блюд, добавляем случайные
    if len(all_meals) < 30:
        random_meals = fetch_random_meals_from_db(30 - len(all_meals))
        all_meals.extend(random_meals)
    
    if len(all_meals) < 21:
        return {"error": "Не удалось загрузить достаточно рецептов из базы"}
    
    # Фильтруем по исключённым продуктам и аллергенам
    filtered_meals = []
    
    # Маппинг аллергенов на ингредиенты
    allergen_keywords = {
        'dairy': ['milk', 'cheese', 'cream', 'butter', 'yogurt'],
        'eggs': ['egg'],
        'nuts': ['nut', 'almond', 'peanut', 'walnut', 'cashew'],
        'gluten': ['flour', 'wheat', 'bread', 'pasta'],
        'seafood': ['fish', 'shrimp', 'crab', 'lobster', 'salmon'],
        'citrus': ['lemon', 'lime', 'orange', 'grapefruit']
    }
    
    for meal in all_meals:
        meal_text = f"{meal['name']} {meal['instructions']}".lower()
        meal_ingredients = ' '.join(meal.get('ingredients', [])).lower()
        
        skip = False
        
        # Проверяем исключённые продукты
        for excluded_food in excluded:
            if excluded_food.lower() in meal_text or excluded_food.lower() in meal_ingredients:
                skip = True
                break
        
        # Проверяем аллергены
        if not skip:
            for allergen in allergens:
                allergen_key = allergen.lower().replace('молочные продукты', 'dairy').replace('яйца', 'eggs').replace('орехи', 'nuts').replace('глютен', 'gluten').replace('морепродукты', 'seafood').replace('цитрусовые', 'citrus')
                keywords = allergen_keywords.get(allergen_key, [])
                for keyword in keywords:
                    if keyword in meal_ingredients or keyword in meal_text:
                        skip = True
                        break
                if skip:
                    break
        
        if not skip:
            filtered_meals.append(meal)
    
    # Если после фильтрации осталось мало блюд, добавляем ещё
    while len(filtered_meals) < 21:
        extra_meals = fetch_random_meals_from_db(5)
        for meal in extra_meals:
            if meal not in filtered_meals:
                filtered_meals.append(meal)
                if len(filtered_meals) >= 21:
                    break
    
    # Формируем меню на неделю
    days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
    menu = []
    
    meal_index = 0
    for day in days:
        if meal_index + 2 >= len(filtered_meals):
            break
            
        breakfast = filtered_meals[meal_index]
        lunch = filtered_meals[meal_index + 1]
        dinner = filtered_meals[meal_index + 2]
        meal_index += 3
        
        menu.append({
            'day': day,
            'meals': {
                'breakfast': {
                    'name': breakfast['name'],
                    'calories': 400,  # Примерные значения
                    'cost': int(budget_per_meal * 0.8),
                    'time': 20
                },
                'lunch': {
                    'name': lunch['name'],
                    'calories': 650,
                    'cost': int(budget_per_meal * 1.2),
                    'time': 35
                },
                'dinner': {
                    'name': dinner['name'],
                    'calories': 550,
                    'cost': int(budget_per_meal),
                    'time': 30
                }
            }
        })
    
    return {'menu': menu}

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