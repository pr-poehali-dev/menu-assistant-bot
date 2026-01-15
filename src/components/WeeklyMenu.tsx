import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cookingTime: number;
  cost: number;
}

interface DayMenu {
  day: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
  };
}

interface WeeklyMenuProps {
  preferences: any;
  onNavigateToShopping: () => void;
}

const SAMPLE_MEALS: Record<string, Meal[]> = {
  breakfast: [
    { id: 'b1', name: 'Овсяная каша с ягодами', calories: 320, protein: 12, carbs: 54, fat: 8, cookingTime: 15, cost: 120 },
    { id: 'b2', name: 'Яичница с авокадо', calories: 380, protein: 18, carbs: 12, fat: 28, cookingTime: 10, cost: 150 },
    { id: 'b3', name: 'Смузи с бананом и орехами', calories: 290, protein: 10, carbs: 42, fat: 10, cookingTime: 5, cost: 100 },
  ],
  lunch: [
    { id: 'l1', name: 'Гречка с куриной грудкой', calories: 520, protein: 42, carbs: 58, fat: 12, cookingTime: 35, cost: 200 },
    { id: 'l2', name: 'Овощной салат с тунцом', calories: 380, protein: 32, carbs: 28, fat: 16, cookingTime: 20, cost: 250 },
    { id: 'l3', name: 'Рис с индейкой и овощами', calories: 480, protein: 38, carbs: 52, fat: 14, cookingTime: 40, cost: 220 },
  ],
  dinner: [
    { id: 'd1', name: 'Запечённая рыба с картофелем', calories: 450, protein: 36, carbs: 42, fat: 16, cookingTime: 45, cost: 300 },
    { id: 'd2', name: 'Куриное филе с киноа', calories: 420, protein: 40, carbs: 38, fat: 12, cookingTime: 35, cost: 250 },
    { id: 'd3', name: 'Овощное рагу с чечевицей', calories: 340, protein: 18, carbs: 48, fat: 10, cookingTime: 30, cost: 180 },
  ],
};

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const WeeklyMenu = ({ preferences, onNavigateToShopping }: WeeklyMenuProps) => {
  const { toast } = useToast();
  const [weekMenu, setWeekMenu] = useState<DayMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingMeal, setEditingMeal] = useState<{ day: number; mealType: keyof DayMenu['meals'] } | null>(null);

  useEffect(() => {
    generateMenu();
  }, []);

  const generateMenu = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/629210d8-597e-4851-8984-c9267cbae6d9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });
      
      if (!response.ok) throw new Error('Ошибка генерации меню');
      
      const data = await response.json();
      setWeekMenu(data.menu);
      toast({
        title: 'Меню готово!',
        description: 'Персональное меню создано с учётом всех ваших предпочтений',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сгенерировать меню. Попробуйте ещё раз.',
        variant: 'destructive',
      });
      setWeekMenu(
        DAYS.map((day, index) => ({
          day,
          meals: {
            breakfast: SAMPLE_MEALS.breakfast[index % 3],
            lunch: SAMPLE_MEALS.lunch[index % 3],
            dinner: SAMPLE_MEALS.dinner[index % 3],
          },
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMealChange = (mealType: keyof DayMenu['meals'], meal: Meal) => {
    if (editingMeal) {
      setWeekMenu(prev => {
        const updated = [...prev];
        updated[editingMeal.day].meals[mealType] = meal;
        return updated;
      });
      setEditingMeal(null);
    }
  };

  const totalWeeklyCost = weekMenu.length > 0 ? weekMenu.reduce(
    (sum, day) => sum + day.meals.breakfast.cost + day.meals.lunch.cost + day.meals.dinner.cost,
    0
  ) : 0;

  const averageDailyCalories = weekMenu.length > 0 ? Math.round(
    weekMenu.reduce(
      (sum, day) => sum + day.meals.breakfast.calories + day.meals.lunch.calories + day.meals.dinner.calories,
      0
    ) / 7
  ) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Icon name="Loader2" size={48} className="text-primary animate-spin" />
        <h3 className="text-xl font-medium">Генерирую персональное меню...</h3>
        <p className="text-muted-foreground">Учитываю ваши предпочтения и исключения</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Icon name="CalendarDays" size={36} className="text-primary" />
            Меню на неделю
          </h2>
          <p className="text-muted-foreground mt-1">Ваш персональный план питания</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateMenu} variant="outline" size="lg" className="gap-2">
            <Icon name="RefreshCw" size={20} />
            Пересоздать
          </Button>
          <Button onClick={onNavigateToShopping} size="lg" className="gap-2">
            <Icon name="ShoppingCart" size={20} />
            Список покупок
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Icon name="Wallet" size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Бюджет на неделю</p>
                <p className="text-2xl font-bold">{totalWeeklyCost.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/20 rounded-lg">
                <Icon name="Flame" size={24} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Средние калории/день</p>
                <p className="text-2xl font-bold">{averageDailyCalories} ккал</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-100 to-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-200 rounded-lg">
                <Icon name="Users" size={24} className="text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Порций</p>
                <p className="text-2xl font-bold">{preferences.servings} чел.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="0" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {DAYS.map((day, index) => (
            <TabsTrigger
              key={day}
              value={index.toString()}
              onClick={() => setSelectedDay(index)}
              className="flex-shrink-0"
            >
              {day}
            </TabsTrigger>
          ))}
        </TabsList>

        {weekMenu.map((dayMenu, dayIndex) => (
          <TabsContent key={dayMenu.day} value={dayIndex.toString()} className="space-y-4 mt-6">
            {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
              const meal = dayMenu.meals[mealType];
              const mealLabel = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' }[mealType];
              const mealIcon = { breakfast: 'Sunrise', lunch: 'Sun', dinner: 'Moon' }[mealType];

              return (
                <Card key={mealType} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon name={mealIcon as any} size={20} className="text-primary" />
                        {mealLabel}
                      </CardTitle>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMeal({ day: dayIndex, mealType })}
                          >
                            <Icon name="RefreshCw" size={16} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Выберите блюдо для {mealLabel.toLowerCase()}</DialogTitle>
                            <DialogDescription>
                              Нажмите на блюдо, чтобы заменить текущее
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 mt-4">
                            {SAMPLE_MEALS[mealType].map((option) => (
                              <Card
                                key={option.id}
                                className="cursor-pointer hover:border-primary transition-colors"
                                onClick={() => handleMealChange(mealType, option)}
                              >
                                <CardContent className="p-4">
                                  <p className="font-medium">{option.name}</p>
                                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>{option.calories} ккал</span>
                                    <span>{option.cookingTime} мин</span>
                                    <span>{option.cost} ₽</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold text-lg mb-3">{meal.name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <Icon name="Flame" size={16} className="text-orange-500" />
                        <span className="text-sm">{meal.calories} ккал</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Clock" size={16} className="text-blue-500" />
                        <span className="text-sm">{meal.cookingTime} мин</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Wallet" size={16} className="text-green-500" />
                        <span className="text-sm">{meal.cost} ₽</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Activity" size={16} className="text-purple-500" />
                        <span className="text-sm">Б{meal.protein} Ж{meal.fat} У{meal.carbs}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default WeeklyMenu;