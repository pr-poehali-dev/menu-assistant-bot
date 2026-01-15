import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ShoppingListProps {
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  quantity: string;
  category: string;
  estimated_cost: number;
  checked: boolean;
}

const SAMPLE_PRODUCTS: Product[] = [
  { id: '1', name: 'Овсяные хлопья', quantity: '500 г', category: 'Крупы', estimated_cost: 80, checked: false },
  { id: '2', name: 'Замороженные ягоды', quantity: '400 г', category: 'Заморозка', estimated_cost: 250, checked: false },
  { id: '3', name: 'Куриная грудка', quantity: '1.5 кг', category: 'Мясо', estimated_cost: 600, checked: false },
  { id: '4', name: 'Гречка', quantity: '800 г', category: 'Крупы', estimated_cost: 120, checked: false },
  { id: '5', name: 'Яйца', quantity: '20 шт', category: 'Молочные', estimated_cost: 180, checked: false },
  { id: '6', name: 'Авокадо', quantity: '3 шт', category: 'Овощи', estimated_cost: 300, checked: false },
  { id: '7', name: 'Помидоры', quantity: '1 кг', category: 'Овощи', estimated_cost: 200, checked: false },
  { id: '8', name: 'Огурцы', quantity: '700 г', category: 'Овощи', estimated_cost: 150, checked: false },
  { id: '9', name: 'Тунец консервированный', quantity: '3 банки', category: 'Консервы', estimated_cost: 450, checked: false },
  { id: '10', name: 'Рис белый', quantity: '1 кг', category: 'Крупы', estimated_cost: 100, checked: false },
  { id: '11', name: 'Филе индейки', quantity: '1 кг', category: 'Мясо', estimated_cost: 550, checked: false },
  { id: '12', name: 'Картофель', quantity: '2 кг', category: 'Овощи', estimated_cost: 120, checked: false },
  { id: '13', name: 'Лосось', quantity: '800 г', category: 'Рыба', estimated_cost: 900, checked: false },
  { id: '14', name: 'Киноа', quantity: '500 г', category: 'Крупы', estimated_cost: 280, checked: false },
  { id: '15', name: 'Чечевица', quantity: '600 г', category: 'Крупы', estimated_cost: 140, checked: false },
  { id: '16', name: 'Болгарский перец', quantity: '500 г', category: 'Овощи', estimated_cost: 180, checked: false },
  { id: '17', name: 'Лук репчатый', quantity: '1 кг', category: 'Овощи', estimated_cost: 50, checked: false },
  { id: '18', name: 'Чеснок', quantity: '100 г', category: 'Овощи', estimated_cost: 40, checked: false },
  { id: '19', name: 'Оливковое масло', quantity: '500 мл', category: 'Масла', estimated_cost: 350, checked: false },
  { id: '20', name: 'Морковь', quantity: '1 кг', category: 'Овощи', estimated_cost: 60, checked: false },
];

const ShoppingList = ({ onBack }: ShoppingListProps) => {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);

  const handleToggle = (id: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, checked: !p.checked } : p))
    );
  };

  const categories = Array.from(new Set(products.map(p => p.category)));
  
  const totalCost = products.reduce((sum, p) => sum + p.estimated_cost, 0);
  const checkedCost = products.filter(p => p.checked).reduce((sum, p) => sum + p.estimated_cost, 0);
  const remainingCost = totalCost - checkedCost;

  const categoryIcons: Record<string, string> = {
    'Крупы': 'Wheat',
    'Заморозка': 'Snowflake',
    'Мясо': 'Beef',
    'Молочные': 'Milk',
    'Овощи': 'Carrot',
    'Консервы': 'Package',
    'Рыба': 'Fish',
    'Масла': 'Droplet',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Icon name="ShoppingCart" size={36} className="text-primary" />
            Список покупок
          </h2>
          <p className="text-muted-foreground mt-1">Все продукты для меню на неделю</p>
        </div>
        <Button onClick={onBack} variant="outline" className="gap-2">
          <Icon name="ArrowLeft" size={20} />
          К меню
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Icon name="Wallet" size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Общая стоимость</p>
                <p className="text-2xl font-bold">{totalCost.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-100 to-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-200 rounded-lg">
                <Icon name="CheckCircle2" size={24} className="text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Куплено</p>
                <p className="text-2xl font-bold">{products.filter(p => p.checked).length} из {products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/20 rounded-lg">
                <Icon name="TrendingDown" size={24} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Осталось купить</p>
                <p className="text-2xl font-bold">{remainingCost.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.category === category);
          const categoryTotal = categoryProducts.reduce((sum, p) => sum + p.estimated_cost, 0);
          
          return (
            <Card key={category} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Icon name={categoryIcons[category] as any || 'Package'} size={24} className="text-primary" />
                    {category}
                  </CardTitle>
                  <Badge variant="secondary" className="text-base">
                    {categoryTotal.toLocaleString('ru-RU')} ₽
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {categoryProducts.map(product => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                        product.checked ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        id={product.id}
                        checked={product.checked}
                        onCheckedChange={() => handleToggle(product.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${product.checked ? 'line-through' : ''}`}>
                          {product.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${product.checked ? 'line-through' : ''}`}>
                          {product.estimated_cost} ₽
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium opacity-90">Итого к оплате</p>
              <p className="text-sm opacity-75">
                {products.filter(p => !p.checked).length} товаров в корзине
              </p>
            </div>
            <p className="text-4xl font-bold">{remainingCost.toLocaleString('ru-RU')} ₽</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShoppingList;
