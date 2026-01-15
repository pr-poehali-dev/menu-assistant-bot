import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';

interface OnboardingStepProps {
  onComplete: (preferences: any) => void;
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

const OnboardingStep = ({ onComplete }: OnboardingStepProps) => {
  const [step, setStep] = useState(1);
  const [diet, setDiet] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [excludedFoods, setExcludedFoods] = useState<string[]>([]);
  const [newExcludedFood, setNewExcludedFood] = useState('');
  const [budget, setBudget] = useState([5000]);
  const [cookingTime, setCookingTime] = useState('30-60');
  const [servings, setServings] = useState([2]);
  const [mealsPerDay, setMealsPerDay] = useState([3]);

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

  const handleComplete = () => {
    onComplete({
      diet,
      allergens,
      budget: budget[0],
      cookingTime,
      excludedFoods,
      servings: servings[0],
      mealsPerDay: mealsPerDay[0],
    });
  };

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Шаг {step} из {totalSteps}</span>
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Icon name="ChefHat" size={32} className="text-primary" />
            {step === 1 && 'Выберите тип питания'}
            {step === 2 && 'Аллергены и непереносимости'}
            {step === 3 && 'Исключённые продукты'}
            {step === 4 && 'Бюджет и время'}
            {step === 5 && 'Размер порций'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Укажите предпочтения по диете (можно выбрать несколько)'}
            {step === 2 && 'Отметьте продукты, которые нужно исключить из меню'}
            {step === 3 && 'Добавьте блюда или продукты, которые вы не едите'}
            {step === 4 && 'Установите бюджет на неделю и время на приготовление'}
            {step === 5 && 'Сколько человек будут питаться и сколько приёмов пищи в день?'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {DIET_OPTIONS.map((option) => (
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
                    <Icon name={option.icon as any} size={24} className="text-primary" />
                    <span className="font-medium">{option.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <div key={allergen} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
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
          )}

          {step === 3 && (
            <div className="space-y-4">
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
              <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-muted/30 rounded-lg">
                {excludedFoods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет исключённых продуктов</p>
                ) : (
                  excludedFoods.map((food) => (
                    <div
                      key={food}
                      className="flex items-center gap-1.5 py-1 px-2.5 border border-border bg-transparent rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {food}
                      <button 
                        onClick={() => handleRemoveExcludedFood(food)}
                        className="hover:text-destructive transition-colors"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
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
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Количество порций</Label>
                  <span className="text-lg font-semibold text-primary">{servings[0]} {servings[0] === 1 ? 'человек' : servings[0] < 5 ? 'человека' : 'человек'}</span>
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
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
                <Icon name="ChevronLeft" size={18} />
                Назад
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1 gap-2">
                Далее
                <Icon name="ChevronRight" size={18} />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="flex-1 gap-2">
                <Icon name="Check" size={18} />
                Создать меню
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingStep;