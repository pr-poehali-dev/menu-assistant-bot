import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface SettingsProps {
  preferences: any;
  onUpdate: (preferences: any) => void;
  onBack: () => void;
}

const DIET_OPTIONS = [
  { id: 'none', label: 'Обычное питание', icon: 'Utensils' },
  { id: 'vegetarian', label: 'Вегетарианская', icon: 'Leaf' },
  { id: 'vegan', label: 'Веганская', icon: 'Sprout' },
  { id: 'keto', label: 'Кето', icon: 'Beef' },
  { id: 'paleo', label: 'Палео', icon: 'Apple' },
  { id: 'lowcarb', label: 'Низкоуглеводная', icon: 'Wheat' },
];

const ALLERGEN_OPTIONS = [
  'Молочные продукты',
  'Яйца',
  'Орехи',
  'Глютен',
  'Морепродукты',
  'Соя',
  'Мёд',
  'Цитрусовые',
];

const Settings = ({ preferences, onUpdate, onBack }: SettingsProps) => {
  const { toast } = useToast();
  const [diet, setDiet] = useState<string[]>(preferences.diet || []);
  const [allergens, setAllergens] = useState<string[]>(preferences.allergens || []);
  const [excludedFoods, setExcludedFoods] = useState<string[]>(preferences.excludedFoods || []);
  const [newExcludedFood, setNewExcludedFood] = useState('');
  const [budget, setBudget] = useState([preferences.budget || 5000]);
  const [cookingTime, setCookingTime] = useState(preferences.cookingTime || '30-60');
  const [servings, setServings] = useState([preferences.servings || 2]);
  const [mealsPerDay, setMealsPerDay] = useState([preferences.mealsPerDay || 3]);

  const handleDietToggle = (dietId: string) => {
    setDiet(prev =>
      prev.includes(dietId)
        ? prev.filter(d => d !== dietId)
        : [...prev, dietId]
    );
  };

  const handleAllergenToggle = (allergen: string) => {
    setAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleAddExcludedFood = () => {
    if (newExcludedFood.trim()) {
      setExcludedFoods(prev => [...prev, newExcludedFood.trim()]);
      setNewExcludedFood('');
    }
  };

  const handleRemoveExcludedFood = (food: string) => {
    setExcludedFoods(prev => prev.filter(f => f !== food));
  };

  const handleSave = () => {
    onUpdate({
      diet,
      allergens,
      budget: budget[0],
      cookingTime,
      excludedFoods,
      servings: servings[0],
      mealsPerDay: mealsPerDay[0],
    });
    toast({
      title: 'Настройки сохранены',
      description: 'Ваши предпочтения успешно обновлены',
    });
    onBack();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Icon name="Settings" size={36} className="text-primary" />
            Настройки
          </h2>
          <p className="text-muted-foreground mt-1">Управление предпочтениями и параметрами</p>
        </div>
        <Button onClick={onBack} variant="outline" className="gap-2">
          <Icon name="ArrowLeft" size={20} />
          Назад
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Utensils" size={24} className="text-primary" />
              Тип питания
            </CardTitle>
            <CardDescription>Выберите подходящие диеты</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {DIET_OPTIONS.map(option => (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    diet.includes(option.id) ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleDietToggle(option.id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Checkbox
                      checked={diet.includes(option.id)}
                      onCheckedChange={() => handleDietToggle(option.id)}
                    />
                    <Icon name={option.icon as any} size={20} className="text-primary" />
                    <span className="font-medium text-sm">{option.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="AlertCircle" size={24} className="text-primary" />
              Аллергены
            </CardTitle>
            <CardDescription>Отметьте продукты, которые нужно исключить</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ALLERGEN_OPTIONS.map(allergen => (
                <div
                  key={allergen}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={allergen}
                    checked={allergens.includes(allergen)}
                    onCheckedChange={() => handleAllergenToggle(allergen)}
                  />
                  <Label htmlFor={allergen} className="flex-1 cursor-pointer font-normal">
                    {allergen}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Ban" size={24} className="text-primary" />
              Исключённые продукты
            </CardTitle>
            <CardDescription>Добавьте продукты, которые вы не едите</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Например: грибы, рыба, кинза..."
                value={newExcludedFood}
                onChange={(e) => setNewExcludedFood(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExcludedFood()}
              />
              <Button onClick={handleAddExcludedFood} size="icon">
                <Icon name="Plus" size={20} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[80px] p-4 bg-muted/30 rounded-lg">
              {excludedFoods.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет исключённых продуктов</p>
              ) : (
                excludedFoods.map(food => (
                  <Badge key={food} variant="secondary" className="gap-1 py-1.5 px-3">
                    {food}
                    <button onClick={() => handleRemoveExcludedFood(food)}>
                      <Icon name="X" size={14} />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Wallet" size={24} className="text-primary" />
              Бюджет и время
            </CardTitle>
            <CardDescription>Настройте ограничения по стоимости и времени приготовления</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Бюджет на неделю</Label>
                <span className="text-lg font-semibold text-primary">{budget[0].toLocaleString('ru-RU')} ₽</span>
              </div>
              <Slider
                value={budget}
                onValueChange={setBudget}
                min={1000}
                max={20000}
                step={500}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 000 ₽</span>
                <span>20 000 ₽</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Время на приготовление одного блюда</Label>
              <RadioGroup value={cookingTime} onValueChange={setCookingTime}>
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="0-30" id="time1" />
                  <Label htmlFor="time1" className="flex-1 cursor-pointer font-normal">
                    <Icon name="Clock" size={18} className="inline mr-2 text-primary" />
                    До 30 минут
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="30-60" id="time2" />
                  <Label htmlFor="time2" className="flex-1 cursor-pointer font-normal">
                    <Icon name="Clock" size={18} className="inline mr-2 text-primary" />
                    30-60 минут
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="60+" id="time3" />
                  <Label htmlFor="time3" className="flex-1 cursor-pointer font-normal">
                    <Icon name="Clock" size={18} className="inline mr-2 text-primary" />
                    Более 60 минут
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Users" size={24} className="text-primary" />
              Размер порций
            </CardTitle>
            <CardDescription>Количество человек и приёмов пищи</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Количество порций</Label>
                <span className="text-lg font-semibold text-primary">
                  {servings[0]} {servings[0] === 1 ? 'человек' : servings[0] < 5 ? 'человека' : 'человек'}
                </span>
              </div>
              <Slider
                value={servings}
                onValueChange={setServings}
                min={1}
                max={8}
                step={1}
                className="py-4"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Приёмов пищи в день</Label>
                <span className="text-lg font-semibold text-primary">{mealsPerDay[0]}</span>
              </div>
              <Slider
                value={mealsPerDay}
                onValueChange={setMealsPerDay}
                min={2}
                max={5}
                step={1}
                className="py-4"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 sticky bottom-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Отмена
        </Button>
        <Button onClick={handleSave} className="flex-1 gap-2">
          <Icon name="Save" size={20} />
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
};

export default Settings;
