import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import OnboardingStep from '@/components/OnboardingStep';
import WeeklyMenu from '@/components/WeeklyMenu';
import ShoppingList from '@/components/ShoppingList';
import Settings from '@/components/Settings';

type Screen = 'onboarding' | 'menu' | 'shopping' | 'settings';

interface UserPreferences {
  diet: string[];
  allergens: string[];
  budget: number;
  cookingTime: string;
  excludedFoods: string[];
  servings: number;
  mealsPerDay: number;
}

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
  const [preferences, setPreferences] = useState<UserPreferences>({
    diet: [],
    allergens: [],
    budget: 5000,
    cookingTime: '30-60',
    excludedFoods: [],
    servings: 2,
    mealsPerDay: 3,
  });

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    setCurrentScreen('menu');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'onboarding':
        return <OnboardingStep onComplete={handleOnboardingComplete} />;
      case 'menu':
        return <WeeklyMenu preferences={preferences} onNavigateToShopping={() => setCurrentScreen('shopping')} />;
      case 'shopping':
        return <ShoppingList onBack={() => setCurrentScreen('menu')} />;
      case 'settings':
        return <Settings preferences={preferences} onUpdate={setPreferences} onBack={() => setCurrentScreen('menu')} />;
      default:
        return null;
    }
  };

  const showNavigation = currentScreen !== 'onboarding';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {showNavigation && (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="ChefHat" size={28} className="text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Планировщик меню</h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={currentScreen === 'menu' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentScreen('menu')}
                  className="gap-2"
                >
                  <Icon name="CalendarDays" size={18} />
                  Меню
                </Button>
                <Button
                  variant={currentScreen === 'shopping' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentScreen('shopping')}
                  className="gap-2"
                >
                  <Icon name="ShoppingCart" size={18} />
                  Покупки
                </Button>
                <Button
                  variant={currentScreen === 'settings' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentScreen('settings')}
                  className="gap-2"
                >
                  <Icon name="Settings" size={18} />
                  Настройки
                </Button>
              </div>
            </div>
          </div>
        </nav>
      )}
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {renderScreen()}
      </main>
    </div>
  );
};

export default Index;
